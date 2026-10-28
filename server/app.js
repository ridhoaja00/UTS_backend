import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, rows, transaction } from "./db.js";
import {
  fail,
  hashPassword,
  verifyPassword,
  digest,
  detectImage,
  validDate,
  today,
} from "./domain.js";
import {
  createBooking,
  bookingAction,
  submitProof,
  reviewPayment,
  listBookings,
  lockedBooking,
} from "./services.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const uploadDir = path.join(root, "server/uploads");
await mkdir(uploadDir, { recursive: true });
const production = process.env.NODE_ENV === "production";
const allowedOrigins = new Set([
  process.env.APP_ORIGIN || "http://localhost:5173",
  ...(production ? [] : ["http://127.0.0.1:5173"]),
]);
const id = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const months = z.coerce.number().int().min(1).max(12);
const text = (min, max) => z.string().trim().min(min).max(max);
const email = z
  .string()
  .trim()
  .email()
  .max(190)
  .transform((v) => v.toLowerCase());
const phone = z
  .string()
  .regex(/^\+?[0-9]{10,15}$/, "Nomor HP harus 10–15 digit.");
const parse = (schema, value) => schema.parse(value);
const app = express();
app.disable("x-powered-by");
if (production) app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: production ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
app.use("/api", async (req, res, next) => {
  try {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      !allowedOrigins.has(req.get("origin"))
    )
      fail(
        403,
        "Origin tidak diizinkan. Gunakan alamat aplikasi sesuai APP_ORIGIN.",
      );
    const token = req.cookies.sk_session;
    if (token) {
      const [record] = await rows(
        "SELECT u.id,u.name,u.email,u.phone,u.role,s.csrf_token FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()",
        [digest(token)],
      );
      if (record) {
        req.user = {
          id: record.id,
          name: record.name,
          email: record.email,
          phone: record.phone,
          role: record.role,
        };
        req.csrf = record.csrf_token;
      }
    }
    if (
      req.user &&
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      !["/auth/login", "/auth/register"].includes(req.path) &&
      req.get("x-csrf-token") !== req.csrf
    )
      fail(403, "Sesi keamanan tidak sesuai. Muat ulang halaman.");
    next();
  } catch (e) {
    next(e);
  }
});
const auth = (req, res, next) =>
  req.user
    ? next()
    : next(
        Object.assign(new Error("Silakan masuk terlebih dahulu."), {
          status: 401,
        }),
      );
const admin = (req, res, next) =>
  req.user?.role === "admin"
    ? next()
    : next(
        Object.assign(new Error("Akses khusus administrator."), {
          status: 403,
        }),
      );
const tenant = (req, res, next) =>
  req.user?.role === "tenant"
    ? next()
    : next(
        Object.assign(new Error("Fitur ini khusus akun penghuni."), {
          status: 403,
        }),
      );
const authLimit = rateLimit({
  windowMs: 15 * 60000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Terlalu banyak percobaan. Coba lagi 15 menit." },
});
async function session(res, user, oldToken) {
  if (oldToken)
    await rows("DELETE FROM sessions WHERE token_hash=?", [digest(oldToken)]);
  const token = randomBytes(32).toString("hex");
  const csrf = randomBytes(32).toString("hex");
  await rows(
    "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 7 DAY))",
    [digest(token), user.id, csrf],
  );
  res.cookie("sk_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: production,
    maxAge: 7 * 86400000,
    path: "/",
  });
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    csrf,
  };
}
app.get("/api/health", async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
});
app.get("/api/config", (req, res) =>
  res.json({
    bank: {
      name: process.env.BANK_NAME || "",
      account: process.env.BANK_ACCOUNT || "",
      holder: process.env.BANK_HOLDER || "",
    },
    contact: {
      email: process.env.CONTACT_EMAIL || "",
      phone: process.env.CONTACT_PHONE || "",
    },
  }),
);
app.get("/api/auth/me", (req, res) =>
  res.json({ user: req.user || null, csrf: req.csrf || null }),
);
app.post("/api/auth/register", authLimit, async (req, res) => {
  const v = parse(
    z.object({
      name: text(2, 100),
      email,
      phone,
      password: z.string().min(12).max(128),
    }),
    req.body,
  );
  const passwordHash = await hashPassword(v.password);
  try {
    const result = await rows(
      "INSERT INTO users(name,email,phone,password_hash,role) VALUES(?,?,?,?,'tenant')",
      [v.name, v.email, v.phone, passwordHash],
    );
    res
      .status(201)
      .json(
        await session(
          res,
          { ...v, id: result.insertId, role: "tenant" },
          req.cookies.sk_session,
        ),
      );
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY")
      fail(409, "Email sudah terdaftar. Silakan masuk.");
    throw e;
  }
});
app.post("/api/auth/login", authLimit, async (req, res) => {
  const v = parse(
    z.object({ email, password: z.string().min(1).max(128) }),
    req.body,
  );
  const [user] = await rows("SELECT * FROM users WHERE email=?", [v.email]);
  if (!user || !(await verifyPassword(v.password, user.password_hash)))
    fail(401, "Email atau password salah.");
  res.json(await session(res, user, req.cookies.sk_session));
});
app.post("/api/auth/logout", auth, async (req, res) => {
  await rows("DELETE FROM sessions WHERE token_hash=?", [
    digest(req.cookies.sk_session),
  ]);
  res.clearCookie("sk_session", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: production,
  });
  res.json({ ok: true });
});
app.patch("/api/profile", auth, async (req, res) => {
  const v = parse(z.object({ name: text(2, 100), phone }), req.body);
  await rows("UPDATE users SET name=?,phone=? WHERE id=?", [
    v.name,
    v.phone,
    req.user.id,
  ]);
  res.json({ ok: true });
});
app.post("/api/profile/password", auth, async (req, res) => {
  const v = parse(
    z.object({
      currentPassword: z.string().min(1).max(128),
      newPassword: z.string().min(12).max(128),
    }),
    req.body,
  );
  const [u] = await rows("SELECT password_hash FROM users WHERE id=?", [
    req.user.id,
  ]);
  if (!(await verifyPassword(v.currentPassword, u.password_hash)))
    fail(400, "Password lama salah.");
  await transaction(async (c) => {
    await rows(
      "UPDATE users SET password_hash=? WHERE id=?",
      [await hashPassword(v.newPassword), req.user.id],
      c,
    );
    await rows("DELETE FROM sessions WHERE user_id=?", [req.user.id], c);
  });
  res.clearCookie("sk_session", { path: "/" });
  res.json({ ok: true });
});

app.get("/api/rooms", async (req, res) => {
  const q = parse(
    z.object({
      search: z.string().max(100).default(""),
      type: z.enum(["", "Standar", "Deluxe", "Suite"]).default(""),
      maxPrice: z.coerce.number().min(0).max(100000000).default(100000000),
      available: z.enum(["", "true"]).default(""),
    }),
    req.query,
  );
  const occupied = `EXISTS(SELECT 1 FROM bookings b WHERE b.room_id=r.id AND (b.status IN ('active','checkout_requested') OR (b.status='pending' AND (b.expires_at>=UTC_TIMESTAMP() OR EXISTS(SELECT 1 FROM invoices i WHERE i.booking_id=b.id AND i.status='submitted')))))`;
  const rooms = await rows(
    `SELECT r.*,(${occupied}) AS occupied FROM rooms r WHERE r.status<>'hidden' AND (r.name LIKE ? OR r.number LIKE ?) AND (?='' OR r.type=?) AND r.price<=? ${q.available === "true" ? `AND r.status='available' AND NOT (${occupied})` : ""} ORDER BY r.price,r.number`,
    [`%${q.search}%`, `%${q.search}%`, q.type, q.type, q.maxPrice],
  );
  res.json(
    rooms.map((r) => ({
      ...r,
      facilities:
        typeof r.facilities === "string"
          ? JSON.parse(r.facilities)
          : r.facilities,
      available: r.status === "available" && !r.occupied,
    })),
  );
});
app.get("/api/bookings", auth, async (req, res) =>
  res.json(await listBookings(req.user)),
);
app.post("/api/bookings", auth, tenant, async (req, res) =>
  res
    .status(201)
    .json(
      await createBooking(
        req.user,
        parse(
          z.object({ roomId: id, startDate: text(10, 10), months }),
          req.body,
        ),
      ),
    ),
);
app.post("/api/bookings/:id/action", auth, async (req, res) => {
  const v = parse(
    z.object({
      action: z.enum(["cancel", "renew", "checkout", "complete"]),
      months: months.default(1),
    }),
    req.body,
  );
  if (v.action !== "complete" && req.user.role !== "tenant")
    fail(403, "Gunakan akun penghuni.");
  res.json(
    await bookingAction(req.user, parse(id, req.params.id), v.action, v.months),
  );
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
});
app.post(
  "/api/invoices/:id/proof",
  auth,
  tenant,
  upload.single("proof"),
  async (req, res) => {
    if (
      !process.env.BANK_ACCOUNT ||
      !process.env.BANK_NAME ||
      !process.env.BANK_HOLDER
    )
      fail(409, "Rekening belum diatur admin. Hubungi pengelola.");
    const type = req.file && detectImage(req.file.buffer);
    if (!type) fail(400, "Unggah gambar JPG atau PNG, maksimal 5 MB.");
    const name = `${randomBytes(24).toString("hex")}.${type.extension}`;
    await writeFile(path.join(uploadDir, name), req.file.buffer, {
      flag: "wx",
      mode: 0o600,
    });
    try {
      res.json(
        await submitProof(req.user, parse(id, req.params.id), {
          name,
          mime: type.mime,
        }),
      );
    } catch (e) {
      await unlink(path.join(uploadDir, name));
      throw e;
    }
  },
);
app.get("/api/invoices/:id/proof", auth, async (req, res) => {
  const [i] = await rows(
    "SELECT i.proof_file,i.proof_mime,b.user_id FROM invoices i JOIN bookings b ON b.id=i.booking_id WHERE i.id=?",
    [parse(id, req.params.id)],
  );
  if (
    !i ||
    !i.proof_file ||
    (req.user.role !== "admin" && i.user_id !== req.user.id)
  )
    fail(404, "Bukti tidak ditemukan.");
  res.set("Cache-Control", "private, no-store");
  res.set("Content-Type", i.proof_mime);
  res.sendFile(path.join(uploadDir, i.proof_file));
});
app.post("/api/admin/invoices/:id/review", auth, admin, async (req, res) => {
  const v = parse(
    z.object({ approved: z.boolean(), note: text(0, 500).default("") }),
    req.body,
  );
  if (!v.approved && !v.note.trim()) fail(400, "Isi alasan penolakan.");
  res.json(
    await reviewPayment(req.user, parse(id, req.params.id), v.approved, v.note),
  );
});

app.get("/api/complaints", auth, async (req, res) =>
  res.json(
    await rows(
      `SELECT c.*,b.code,r.number AS room_number,u.name AS tenant_name FROM complaints c JOIN bookings b ON b.id=c.booking_id JOIN rooms r ON r.id=b.room_id JOIN users u ON u.id=c.user_id ${req.user.role === "admin" ? "" : "WHERE c.user_id=?"} ORDER BY c.id DESC`,
      req.user.role === "admin" ? [] : [req.user.id],
    ),
  ),
);
app.post("/api/complaints", auth, tenant, async (req, res) => {
  const v = parse(
    z.object({
      bookingId: id,
      category: z.enum([
        "Listrik & Air",
        "Fasilitas",
        "Kebersihan",
        "Keamanan",
        "Lainnya",
      ]),
      title: text(3, 120),
      description: text(10, 3000),
    }),
    req.body,
  );
  const result = await transaction(async (c) => {
    const b = await lockedBooking(c, v.bookingId, req.user);
    if (
      !["active", "checkout_requested"].includes(b.status) ||
      b.start_date > today()
    )
      fail(409, "Laporan hanya untuk kamar yang sedang Anda huni.");
    return rows(
      "INSERT INTO complaints(booking_id,user_id,category,title,description) VALUES(?,?,?,?,?)",
      [v.bookingId, req.user.id, v.category, v.title, v.description],
      c,
    );
  });
  res.status(201).json({ id: result.insertId });
});
app.patch("/api/admin/complaints/:id", auth, admin, async (req, res) => {
  const v = parse(
    z.object({
      status: z.enum(["open", "in_progress", "resolved"]),
      reply: text(1, 3000),
    }),
    req.body,
  );
  const r = await rows("UPDATE complaints SET status=?,reply=? WHERE id=?", [
    v.status,
    v.reply,
    parse(id, req.params.id),
  ]);
  if (!r.affectedRows) fail(404, "Laporan tidak ditemukan.");
  res.json({ ok: true });
});
const roomSchema = z.object({
  name: text(3, 120),
  number: text(1, 20),
  type: z.enum(["Standar", "Deluxe", "Suite"]),
  price: z.coerce.number().int().min(10000).max(100000000),
  size: z.coerce.number().int().min(6).max(200),
  description: text(10, 3000),
  facilities: z.array(text(1, 50)).min(1).max(12),
  image: z.enum([
    "/images/room-standard.svg",
    "/images/room-deluxe.svg",
    "/images/room-suite.svg",
  ]),
  status: z.enum(["available", "maintenance", "hidden"]),
});
app.get("/api/admin/rooms", auth, admin, async (req, res) =>
  res.json(
    (await rows("SELECT * FROM rooms ORDER BY number")).map((r) => ({
      ...r,
      facilities:
        typeof r.facilities === "string"
          ? JSON.parse(r.facilities)
          : r.facilities,
    })),
  ),
);
app.post("/api/admin/rooms", auth, admin, async (req, res) => {
  const v = parse(roomSchema, req.body);
  const r = await rows(
    "INSERT INTO rooms(name,number,type,price,size,description,facilities,image,status) VALUES(?,?,?,?,?,?,?,?,?)",
    [
      v.name,
      v.number,
      v.type,
      v.price,
      v.size,
      v.description,
      JSON.stringify(v.facilities),
      v.image,
      v.status,
    ],
  );
  res.status(201).json({ id: r.insertId });
});
app.patch("/api/admin/rooms/:id", auth, admin, async (req, res) => {
  const v = parse(roomSchema, req.body);
  const roomId = parse(id, req.params.id);
  await transaction(async (c) => {
    const [r] = await rows(
      "SELECT id FROM rooms WHERE id=? FOR UPDATE",
      [roomId],
      c,
    );
    if (!r) fail(404, "Kamar tidak ditemukan.");
    await rows(
      "UPDATE rooms SET name=?,number=?,type=?,price=?,size=?,description=?,facilities=?,image=?,status=? WHERE id=?",
      [
        v.name,
        v.number,
        v.type,
        v.price,
        v.size,
        v.description,
        JSON.stringify(v.facilities),
        v.image,
        v.status,
        roomId,
      ],
      c,
    );
  });
  res.json({ ok: true });
});
app.get("/api/admin/finance", auth, admin, async (req, res) => {
  const [income] = await rows(
    "SELECT COALESCE(SUM(amount),0) AS total FROM invoices WHERE status='paid'",
  );
  const [expense] = await rows(
    "SELECT COALESCE(SUM(amount),0) AS total FROM expenses",
  );
  res.json({
    income: income.total,
    expense: expense.total,
    balance: income.total - expense.total,
    expenses: await rows(
      "SELECT * FROM expenses ORDER BY expense_date DESC,id DESC",
    ),
    payments: await rows(
      "SELECT i.id,i.amount,i.paid_at,b.code,u.name FROM invoices i JOIN bookings b ON b.id=i.booking_id JOIN users u ON u.id=b.user_id WHERE i.status='paid' ORDER BY i.paid_at DESC",
    ),
  });
});
app.post("/api/admin/expenses", auth, admin, async (req, res) => {
  const v = parse(
    z.object({
      description: text(3, 200),
      amount: z.coerce.number().int().min(1).max(1000000000),
      date: text(10, 10).refine(validDate, "Tanggal tidak valid."),
    }),
    req.body,
  );
  await rows(
    "INSERT INTO expenses(description,amount,expense_date,created_by) VALUES(?,?,?,?)",
    [v.description, v.amount, v.date, req.user.id],
  );
  res.status(201).json({ ok: true });
});
app.get("/api/admin/tenants", auth, admin, async (req, res) =>
  res.json(
    await rows(
      "SELECT u.id,u.name,u.email,u.phone,u.created_at FROM users u WHERE u.role='tenant' ORDER BY u.id DESC",
    ),
  ),
);
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Endpoint tidak ditemukan." }),
);
app.use(express.static(path.join(root, "client/dist")));
app.get("/{*path}", (req, res) =>
  res.sendFile(path.join(root, "client/dist/index.html")),
);
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof z.ZodError)
    return res
      .status(400)
      .json({
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
  if (error instanceof multer.MulterError)
    return res
      .status(400)
      .json({ error: "Bukti harus satu gambar JPG/PNG maksimal 5 MB." });
  if (error.code === "ER_DUP_ENTRY")
    return res
      .status(409)
      .json({ error: "Data sudah terdaftar. Gunakan nilai lain." });
  if (error.status)
    return res.status(error.status).json({ error: error.message });
  console.error(error.code || error.message);
  res
    .status(500)
    .json({
      error:
        "Server tidak dapat memproses permintaan. Periksa koneksi database.",
    });
});
export default app;
