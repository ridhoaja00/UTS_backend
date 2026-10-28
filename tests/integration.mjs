// Destructive only within an explicitly named *_test database.
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { pool, rows } from "../server/db.js";
import { today, addMonths } from "../server/domain.js";
import { readdir, unlink } from "node:fs/promises";
if (!process.env.DB_NAME?.endsWith("_test"))
  throw Error(
    "Integration tests require DB_NAME ending in _test. Use a separate database.",
  );
const { default: app } = await import("../server/app.js");
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}/api`;
class Client {
  cookie = "";
  csrf = "";
  async call(
    path,
    {
      method = "GET",
      body,
      status = 200,
      csrf = true,
      origin = process.env.APP_ORIGIN || "http://localhost:5173",
    } = {},
  ) {
    const form = body instanceof FormData;
    const r = await fetch(base + path, {
      method,
      headers: {
        origin,
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...(csrf && this.csrf ? { "X-CSRF-Token": this.csrf } : {}),
        ...(body && !form ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? (form ? body : JSON.stringify(body)) : undefined,
    });
    if (r.headers.get("set-cookie"))
      this.cookie = r.headers.get("set-cookie").split(";")[0];
    const type = r.headers.get("content-type") || "";
    const data = type.includes("application/json")
      ? await r.json()
      : await r.arrayBuffer();
    assert.equal(
      r.status,
      status,
      `${method} ${path}: ${JSON.stringify(data)}`,
    );
    if (data.csrf) this.csrf = data.csrf;
    return data;
  }
}
const makeProof = () => {
  const f = new FormData();
  f.set(
    "proof",
    new Blob(
      [
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
          "base64",
        ),
      ],
      { type: "image/png" },
    ),
    "proof.png",
  );
  return f;
};
test("MySQL integration: complete tenant and admin lifecycle", async (t) => {
  try {
    for (const table of [
      "complaints",
      "invoices",
      "bookings",
      "expenses",
      "sessions",
    ])
      await rows(`DELETE FROM ${table}`);
    await rows("DELETE FROM users WHERE role='tenant'");
    await rows("DELETE FROM rooms WHERE number LIKE 'QA-%'");
    const admin = new Client(),
      a = new Client(),
      b = new Client(),
      anon = new Client();
    await t.test("public catalog, registration and authorization", async () => {
      assert.equal((await anon.call("/rooms")).length, 6);
      await anon.call("/bookings", { status: 401 });
      await a.call("/auth/register", {
        method: "POST",
        status: 201,
        body: {
          name: "Penghuni A",
          email: "a@example.test",
          phone: "081234567890",
          password: "PasswordTenant!123",
          role: "admin",
        },
      });
      assert.equal((await a.call("/auth/me")).user.role, "tenant");
      await a.call("/admin/finance", { status: 403 });
      await b.call("/auth/register", {
        method: "POST",
        status: 201,
        body: {
          name: "Penghuni B",
          email: "b@example.test",
          phone: "081234567891",
          password: "PasswordTenant!123",
        },
      });
      await admin.call("/auth/login", {
        method: "POST",
        body: {
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD,
        },
      });
      await a.call("/profile", {
        method: "PATCH",
        body: { name: "A", phone: "081234567890" },
        csrf: false,
        status: 403,
      });
      await a.call("/profile", {
        method: "PATCH",
        body: { name: "AA", phone: "081234567890" },
        origin: "https://evil.example",
        status: 403,
      });
      await anon.call("/auth/login", {
        method: "POST",
        body: { email: "a@example.test", password: "wrong" },
        status: 401,
      });
    });
    const catalog = await anon.call("/rooms");
    const roomId = catalog[0].id;
    let tenant, other, bookingId, invoiceId;
    await t.test(
      "concurrent reservation locks a room for exactly one tenant",
      async () => {
        const payload = {
          method: "POST",
          body: { roomId, startDate: today(), months: 1 },
        };
        const responses = await Promise.all([
          fetch(base + "/bookings", {
            method: "POST",
            headers: {
              origin: process.env.APP_ORIGIN,
              "Content-Type": "application/json",
              Cookie: a.cookie,
              "X-CSRF-Token": a.csrf,
            },
            body: JSON.stringify(payload.body),
          }),
          fetch(base + "/bookings", {
            method: "POST",
            headers: {
              origin: process.env.APP_ORIGIN,
              "Content-Type": "application/json",
              Cookie: b.cookie,
              "X-CSRF-Token": b.csrf,
            },
            body: JSON.stringify(payload.body),
          }),
        ]);
        assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
        const winner = responses[0].status === 201 ? 0 : 1;
        tenant = winner === 0 ? a : b;
        other = winner === 0 ? b : a;
        bookingId = (await responses[winner].json()).id;
        const [booking] = await tenant.call("/bookings");
        invoiceId = booking.invoices[0].id;
        assert.equal(booking.end_date, addMonths(today(), 1));
        assert.equal(
          (await anon.call("/rooms?available=true")).some(
            (r) => r.id === roomId,
          ),
          false,
        );
        await other.call(`/bookings/${bookingId}/action`, {
          method: "POST",
          body: { action: "cancel" },
          status: 404,
        });
        await tenant.call("/bookings", {
          method: "POST",
          body: { roomId: catalog[1].id, startDate: today(), months: 1 },
          status: 409,
        });
      },
    );
    await t.test(
      "payment proof ownership, rejection, resubmission and one-time approval",
      async () => {
        const invalid = new FormData();
        invalid.set(
          "proof",
          new Blob(["<html>"], { type: "image/png" }),
          "fake.png",
        );
        await tenant.call(`/invoices/${invoiceId}/proof`, {
          method: "POST",
          body: invalid,
          status: 400,
        });
        await tenant.call(`/invoices/${invoiceId}/proof`, {
          method: "POST",
          body: makeProof(),
        });
        await other.call(`/invoices/${invoiceId}/proof`, { status: 404 });
        await anon.call(`/invoices/${invoiceId}/proof`, { status: 401 });
        await admin.call(`/invoices/${invoiceId}/proof`);
        await tenant.call(`/bookings/${bookingId}/action`, {
          method: "POST",
          body: { action: "cancel" },
          status: 409,
        });
        await admin.call(`/admin/invoices/${invoiceId}/review`, {
          method: "POST",
          body: { approved: false, note: "Nominal belum sesuai" },
        });
        await tenant.call(`/invoices/${invoiceId}/proof`, {
          method: "POST",
          body: makeProof(),
        });
        await admin.call(`/admin/invoices/${invoiceId}/review`, {
          method: "POST",
          body: { approved: true, note: "Sesuai mutasi bank" },
        });
        await admin.call(`/admin/invoices/${invoiceId}/review`, {
          method: "POST",
          body: { approved: true },
          status: 409,
        });
        assert.equal((await tenant.call("/bookings"))[0].status, "active");
      },
    );
    await t.test("complaints are private and admin can respond", async () => {
      const { id } = await tenant.call("/complaints", {
        method: "POST",
        status: 201,
        body: {
          bookingId,
          category: "Listrik & Air",
          title: "Air tidak mengalir",
          description: "Air kamar tidak mengalir sejak pagi hari.",
        },
      });
      assert.equal((await other.call("/complaints")).length, 0);
      await admin.call(`/admin/complaints/${id}`, {
        method: "PATCH",
        body: { status: "in_progress", reply: "Teknisi sedang menuju lokasi." },
      });
      assert.equal((await tenant.call("/complaints"))[0].status, "in_progress");
    });
    await t.test("renewal does not extend until payment approval", async () => {
      const before = (await tenant.call("/bookings"))[0].end_date;
      await tenant.call(`/bookings/${bookingId}/action`, {
        method: "POST",
        body: { action: "renew", months: 2 },
      });
      let booking = (await tenant.call("/bookings"))[0];
      assert.equal(booking.end_date, before);
      const renewal = booking.invoices.find((i) => i.kind === "renewal");
      assert.equal(renewal.amount, booking.monthly_price * 2);
      await tenant.call(`/bookings/${bookingId}/action`, {
        method: "POST",
        body: { action: "renew", months: 1 },
        status: 409,
      });
      await tenant.call(`/invoices/${renewal.id}/proof`, {
        method: "POST",
        body: makeProof(),
      });
      await admin.call(`/admin/invoices/${renewal.id}/review`, {
        method: "POST",
        body: { approved: true },
      });
      assert.equal(
        (await tenant.call("/bookings"))[0].end_date,
        addMonths(before, 2),
      );
    });
    await t.test(
      "finance counts approved invoices, expenses, then checkout releases room",
      async () => {
        const total = (await tenant.call("/bookings"))[0].monthly_price * 3;
        await admin.call("/admin/expenses", {
          method: "POST",
          status: 201,
          body: {
            description: "Perbaikan pompa air",
            amount: 150000,
            date: today(),
          },
        });
        const finance = await admin.call("/admin/finance");
        assert.equal(finance.income, total);
        assert.equal(finance.balance, total - 150000);
        await tenant.call(`/bookings/${bookingId}/action`, {
          method: "POST",
          body: { action: "checkout" },
        });
        await tenant.call(`/bookings/${bookingId}/action`, {
          method: "POST",
          body: { action: "complete" },
          status: 400,
        });
        await admin.call(`/bookings/${bookingId}/action`, {
          method: "POST",
          body: { action: "complete" },
        });
        assert.equal((await tenant.call("/bookings"))[0].status, "completed");
        assert.equal(
          (await anon.call("/rooms?available=true")).some(
            (r) => r.id === roomId,
          ),
          true,
        );
      },
    );
    await t.test(
      "expired reservations free the room and cannot accept payment",
      async () => {
        const booking = await other.call("/bookings", {
          method: "POST",
          status: 201,
          body: { roomId, startDate: today(), months: 1 },
        });
        await rows(
          "UPDATE bookings SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 HOUR) WHERE id=?",
          [booking.id],
        );
        const previous = (await other.call("/bookings"))[0];
        assert.equal(previous.status, "expired");
        assert.equal(
          (await anon.call("/rooms?available=true")).some(
            (r) => r.id === roomId,
          ),
          true,
        );
        await other.call(`/invoices/${previous.invoices[0].id}/proof`, {
          method: "POST",
          body: makeProof(),
          status: 409,
        });
        await tenant.call("/bookings", {
          method: "POST",
          status: 201,
          body: { roomId, startDate: today(), months: 1 },
        });
      },
    );
    await t.test("admin room management and pending cancellation", async () => {
      const room = {
        name: "QA maintenance room",
        number: "QA-900",
        type: "Deluxe",
        price: 1300000,
        size: 16,
        description: "Kamar khusus pengujian operasional.",
        facilities: ["WiFi"],
        image: "/images/room-deluxe.svg",
        status: "maintenance",
      };
      const created = await admin.call("/admin/rooms", {
        method: "POST",
        body: room,
        status: 201,
      });
      await other.call("/bookings", {
        method: "POST",
        body: { roomId: created.id, startDate: today(), months: 1 },
        status: 409,
      });
      await admin.call(`/admin/rooms/${created.id}`, {
        method: "PATCH",
        body: { ...room, status: "available" },
      });
      const booked = await other.call("/bookings", {
        method: "POST",
        body: { roomId: created.id, startDate: today(), months: 1 },
        status: 201,
      });
      await other.call(`/bookings/${booked.id}/action`, {
        method: "POST",
        body: { action: "cancel" },
      });
      assert.equal(
        (await anon.call("/rooms?available=true")).some(
          (r) => r.id === created.id,
        ),
        true,
      );
      await admin.call(`/admin/rooms/${created.id}`, {
        method: "PATCH",
        body: { ...room, status: "hidden" },
      });
      assert.equal(
        (await anon.call("/rooms")).some((r) => r.id === created.id),
        false,
      );
      await admin.call("/admin/expenses", {
        method: "POST",
        body: { description: "Invalid expense", amount: -1, date: today() },
        status: 400,
      });
    });
    await t.test(
      "profile update and password change invalidates session",
      async () => {
        await tenant.call("/profile", {
          method: "PATCH",
          body: { name: "Penghuni Diperbarui", phone: "081234567899" },
        });
        assert.equal(
          (await tenant.call("/auth/me")).user.name,
          "Penghuni Diperbarui",
        );
        await tenant.call("/profile/password", {
          method: "POST",
          body: {
            currentPassword: "PasswordTenant!123",
            newPassword: "NewSecurePassword!456",
          },
        });
        await tenant.call("/bookings", { status: 401 });
      },
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
});
