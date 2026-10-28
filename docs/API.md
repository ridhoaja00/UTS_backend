# Ringkasan API

Base URL `/api`. Frontend memakai Vite proxy pada development dan origin yang sama saat production. JSON untuk request biasa; upload menggunakan multipart/form-data. Error berbentuk `{ "error": "pesan" }`.

Untuk mutasi, header Origin harus cocok APP_ORIGIN. Setelah login/register, response mengembalikan token `csrf`; kirim melalui X-CSRF-Token pada mutasi berikutnya. Browser menerima cookie sesi HttpOnly. GET `/auth/me` memulihkan user dan CSRF ketika reload. Request tanpa sesi mendapat 401; role salah 403; kepemilikan salah umumnya 404; konflik status 409.

| Method | Path                                          | Akses / fungsi                                                            |
| ------ | --------------------------------------------- | ------------------------------------------------------------------------- |
| GET    | /health                                       | Cek koneksi database                                                      |
| GET    | /config                                       | Rekening dan kontak publik                                                |
| GET    | /rooms?search=&type=&maxPrice=&available=true | Katalog, fasilitas, ketersediaan efektif                                  |
| POST   | /auth/register                                | name, email, phone, password; role selalu tenant                          |
| POST   | /auth/login                                   | email, password                                                           |
| GET    | /auth/me                                      | User saat ini dan CSRF                                                    |
| POST   | /auth/logout                                  | Hapus sesi                                                                |
| PATCH  | /profile                                      | name, phone                                                               |
| POST   | /profile/password                             | currentPassword, newPassword; cabut semua sesi                            |
| GET    | /bookings                                     | Pesanan milik sendiri / semua untuk admin; termasuk invoices              |
| POST   | /bookings                                     | Tenant: roomId, startDate YYYY-MM-DD, months 1–12                         |
| POST   | /bookings/:id/action                          | Tenant: action cancel/renew/checkout, months untuk renew; admin: complete |
| POST   | /invoices/:id/proof                           | Tenant pemilik: file field proof, JPG/PNG <=5 MB                          |
| GET    | /invoices/:id/proof                           | Gambar privat, pemilik/admin                                              |
| GET    | /complaints                                   | Laporan sendiri / semua untuk admin                                       |
| POST   | /complaints                                   | Tenant: bookingId, category, title, description                           |
| GET    | /admin/rooms                                  | Admin: semua kamar termasuk hidden                                        |
| POST   | /admin/rooms                                  | Admin: buat kamar                                                         |
| PATCH  | /admin/rooms/:id                              | Admin: edit kamar dengan data lengkap                                     |
| POST   | /admin/invoices/:id/review                    | Admin: approved boolean, note; penolakan perlu alasan                     |
| PATCH  | /admin/complaints/:id                         | Admin: status, reply                                                      |
| GET    | /admin/tenants                                | Admin: akun penghuni                                                      |
| GET    | /admin/finance                                | Admin: total pemasukan disetujui, pengeluaran, saldo, riwayat             |
| POST   | /admin/expenses                               | Admin: description, amount integer, date YYYY-MM-DD                       |

Room payload lengkap: `name, number, type (Standar/Deluxe/Suite), price, size, description, facilities (array), image (salah satu aset lokal), status (available/maintenance/hidden)`.

Tidak ada endpoint untuk mengirim uang, mengubah role melalui register, atau mengambil password. CSV dibuat dari data keuangan yang telah diotorisasi di frontend.
