import { randomBytes } from "node:crypto";
import { rows, transaction } from "./db.js";
import { fail, addMonths, today, validDate } from "./domain.js";

export async function expireRoom(c, roomId) {
  await rows(
    `UPDATE bookings b SET status='expired' WHERE b.room_id=? AND b.status='pending' AND b.expires_at < UTC_TIMESTAMP() AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.booking_id=b.id AND i.status='submitted')`,
    [roomId],
    c,
  );
  await rows(
    `UPDATE invoices i JOIN bookings b ON b.id=i.booking_id SET i.status='void' WHERE b.room_id=? AND b.status IN ('expired','cancelled') AND i.status IN ('unpaid','submitted')`,
    [roomId],
    c,
  );
}
export async function lockedBooking(c, id, user) {
  const [reference] = await rows(
    "SELECT room_id FROM bookings WHERE id=?",
    [id],
    c,
  );
  if (!reference) fail(404, "Pesanan tidak ditemukan.");
  await rows(
    "SELECT id FROM rooms WHERE id=? FOR UPDATE",
    [reference.room_id],
    c,
  );
  await expireRoom(c, reference.room_id);
  const [booking] = await rows(
    "SELECT * FROM bookings WHERE id=? FOR UPDATE",
    [id],
    c,
  );
  if (user.role !== "admin" && booking.user_id !== user.id)
    fail(404, "Pesanan tidak ditemukan.");
  return booking;
}
export async function createBooking(user, { roomId, startDate, months }) {
  if (
    !validDate(startDate) ||
    startDate < today() ||
    startDate > addMonths(today(), 3)
  )
    fail(400, "Tanggal masuk harus hari ini hingga 3 bulan ke depan.");
  return transaction(async (c) => {
    await rows("SELECT id FROM users WHERE id=? FOR UPDATE", [user.id], c);
    const [room] = await rows(
      "SELECT * FROM rooms WHERE id=? FOR UPDATE",
      [roomId],
      c,
    );
    if (!room || room.status !== "available")
      fail(409, "Kamar tidak tersedia.");
    await expireRoom(c, roomId);
    const occupied = await rows(
      `SELECT id FROM bookings WHERE room_id=? AND status IN ('pending','active','checkout_requested') LIMIT 1`,
      [roomId],
      c,
    );
    if (occupied.length)
      fail(409, "Kamar baru saja dipesan. Silakan pilih kamar lain.");
    // One ongoing stay per tenant; include any still-valid pending reservation.
    const existing = await rows(
      `SELECT b.id FROM bookings b WHERE user_id=? AND (status IN ('active','checkout_requested') OR (status='pending' AND (expires_at>=UTC_TIMESTAMP() OR EXISTS(SELECT 1 FROM invoices i WHERE i.booking_id=b.id AND i.status='submitted')))) LIMIT 1`,
      [user.id],
      c,
    );
    if (existing.length)
      fail(
        409,
        "Anda masih memiliki pesanan berjalan. Selesaikan atau batalkan terlebih dahulu.",
      );
    const end = addMonths(startDate, months);
    const code = `SK-${randomBytes(5).toString("hex").toUpperCase()}`;
    const result = await rows(
      `INSERT INTO bookings(code,user_id,room_id,start_date,end_date,monthly_price,expires_at) VALUES(?,?,?,?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 24 HOUR))`,
      [code, user.id, roomId, startDate, end, room.price],
      c,
    );
    await rows(
      `INSERT INTO invoices(booking_id,kind,months,period_start,period_end,amount) VALUES(?,'booking',?,?,?,?)`,
      [result.insertId, months, startDate, end, room.price * months],
      c,
    );
    return { id: result.insertId, code };
  });
}
export async function bookingAction(user, id, action, months) {
  return transaction(async (c) => {
    const b = await lockedBooking(c, id, user);
    if (action === "cancel") {
      if (b.status !== "pending")
        fail(409, "Hanya pesanan belum aktif yang dapat dibatalkan.");
      const proofs = await rows(
        "SELECT id FROM invoices WHERE booking_id=? AND status='submitted'",
        [id],
        c,
      );
      if (proofs.length)
        fail(
          409,
          "Bukti pembayaran sedang ditinjau. Hubungi admin untuk pembatalan.",
        );
      await rows("UPDATE bookings SET status='cancelled' WHERE id=?", [id], c);
      await rows(
        "UPDATE invoices SET status='void' WHERE booking_id=? AND status='unpaid'",
        [id],
        c,
      );
    } else if (action === "renew") {
      if (b.status !== "active" || b.start_date > today())
        fail(
          409,
          "Perpanjangan hanya untuk penghuni dengan sewa aktif yang sudah dimulai.",
        );
      if (b.end_date < today())
        fail(
          409,
          "Masa sewa telah berakhir. Hubungi admin sebelum memperpanjang.",
        );
      const open = await rows(
        "SELECT id FROM invoices WHERE booking_id=? AND status IN ('unpaid','submitted')",
        [id],
        c,
      );
      if (open.length)
        fail(409, "Selesaikan tagihan sebelumnya terlebih dahulu.");
      await rows(
        "INSERT INTO invoices(booking_id,kind,months,period_start,period_end,amount) VALUES(?,'renewal',?,?,?,?)",
        [
          id,
          months,
          b.end_date,
          addMonths(b.end_date, months),
          b.monthly_price * months,
        ],
        c,
      );
    } else if (action === "checkout") {
      if (b.status !== "active" || b.start_date > today())
        fail(409, "Checkout hanya untuk penghuni aktif yang sudah masuk.");
      const pending = await rows(
        "SELECT id FROM invoices WHERE booking_id=? AND status='submitted'",
        [id],
        c,
      );
      if (pending.length)
        fail(409, "Tunggu verifikasi pembayaran sebelum checkout.");
      await rows(
        "UPDATE invoices SET status='void' WHERE booking_id=? AND status='unpaid'",
        [id],
        c,
      );
      await rows(
        "UPDATE bookings SET status='checkout_requested' WHERE id=?",
        [id],
        c,
      );
    } else if (action === "complete" && user.role === "admin") {
      if (
        b.status !== "checkout_requested" &&
        !(b.status === "active" && b.end_date <= today())
      )
        fail(
          409,
          "Belum ada permintaan checkout atau masa sewa belum berakhir.",
        );
      await rows("UPDATE bookings SET status='completed' WHERE id=?", [id], c);
      await rows(
        "UPDATE invoices SET status='void' WHERE booking_id=? AND status IN ('unpaid','submitted')",
        [id],
        c,
      );
    } else fail(400, "Aksi tidak dikenal.");
    return { ok: true };
  });
}
export async function submitProof(user, invoiceId, file) {
  return transaction(async (c) => {
    const [reference] = await rows(
      "SELECT booking_id FROM invoices WHERE id=?",
      [invoiceId],
      c,
    );
    if (!reference) fail(404, "Tagihan tidak ditemukan.");
    const b = await lockedBooking(c, reference.booking_id, user);
    if (!["pending", "active"].includes(b.status))
      fail(409, "Pesanan tidak dapat dibayar.");
    const [i] = await rows(
      "SELECT * FROM invoices WHERE id=? FOR UPDATE",
      [invoiceId],
      c,
    );
    if (i.status !== "unpaid")
      fail(409, "Tagihan sudah dibayar atau sedang ditinjau.");
    await rows(
      "UPDATE invoices SET status='submitted', proof_file=?,proof_mime=?,review_note=NULL WHERE id=?",
      [file.name, file.mime, invoiceId],
      c,
    );
    return { ok: true };
  });
}
export async function reviewPayment(user, id, approved, note) {
  return transaction(async (c) => {
    const [ref] = await rows(
      "SELECT booking_id FROM invoices WHERE id=?",
      [id],
      c,
    );
    if (!ref) fail(404, "Tagihan tidak ditemukan.");
    const b = await lockedBooking(c, ref.booking_id, user);
    const [i] = await rows(
      "SELECT * FROM invoices WHERE id=? FOR UPDATE",
      [id],
      c,
    );
    if (i.status !== "submitted" || !["pending", "active"].includes(b.status))
      fail(409, "Pembayaran tidak dapat diverifikasi.");
    await rows(
      "UPDATE invoices SET status=?,review_note=?,reviewed_by=?,paid_at=IF(?=1,UTC_TIMESTAMP(),NULL) WHERE id=?",
      [approved ? "paid" : "unpaid", note, user.id, approved ? 1 : 0, id],
      c,
    );
    if (approved) {
      if (i.kind === "booking")
        await rows(
          "UPDATE bookings SET status='active',expires_at=NULL WHERE id=?",
          [b.id],
          c,
        );
      else {
        if (i.period_start !== b.end_date)
          fail(409, "Periode tagihan tidak sesuai masa sewa.");
        await rows(
          "UPDATE bookings SET end_date=? WHERE id=?",
          [i.period_end, b.id],
          c,
        );
      }
    } else if (b.status === "pending")
      await rows(
        "UPDATE bookings SET expires_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 24 HOUR) WHERE id=?",
        [b.id],
        c,
      );
    return { ok: true };
  });
}
export async function listBookings(user) {
  const bookings = await rows(
    `SELECT b.*,r.name AS room_name,r.number AS room_number,r.image,u.name AS tenant_name,u.email AS tenant_email,u.phone AS tenant_phone FROM bookings b JOIN rooms r ON r.id=b.room_id JOIN users u ON u.id=b.user_id ${user.role === "admin" ? "" : "WHERE b.user_id=?"} ORDER BY b.created_at DESC,b.id DESC`,
    user.role === "admin" ? [] : [user.id],
  );
  for (const b of bookings) {
    b.invoices = await rows(
      "SELECT id,kind,months,period_start,period_end,amount,status,review_note,paid_at,created_at,proof_file IS NOT NULL AS has_proof FROM invoices WHERE booking_id=? ORDER BY id DESC",
      [b.id],
    );
    if (
      b.status === "pending" &&
      new Date(b.expires_at.replace(" ", "T") + "Z") < new Date() &&
      !b.invoices.some((i) => i.status === "submitted")
    ) {
      b.status = "expired";
      for (const i of b.invoices) if (i.status === "unpaid") i.status = "void";
    }
  }
  return bookings;
}
