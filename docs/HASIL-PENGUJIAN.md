# Hasil pengujian versi awal

Tanggal: 28 Oktober 2026.

- Pemeriksaan sintaks backend: lulus.
- Build produksi React/Vite: lulus.
- Tes unit: 5 lulus (perhitungan bulan kalender, validasi tanggal, hash password, signature gambar, digest sesi).
- Skenario integrasi: 9 lulus, mencakup katalog, register/login, role, origin/CSRF, pemesanan bersamaan, kepemilikan, bukti transfer, penolakan dan persetujuan, perpanjangan, komplain, keuangan, checkout, expiry, pengelolaan kamar, pembatalan dan pencabutan sesi.
- Database pengujian aktual: MariaDB 10.11.14 (InnoDB), protokol MySQL menggunakan mysql2. MySQL 8.4 belum dijalankan langsung di lingkungan ini; workflow .github/workflows/ci.yml disiapkan untuk menjalankannya di GitHub Actions.
- Audit dependency runtime sesudah pembaruan Zod: periksa hasil npm audit pada lingkungan Anda untuk temuan terbaru.
- Browser: beranda, tata letak desktop, navigasi hash FAQ, dan buka/tutup FAQ diperiksa. Pengujian interaksi akun, katalog berdata, pembayaran, serta layar ponsel melalui browser belum selesai. Database pengujian terisolasi dari proses preview; alur bisnis diverifikasi lewat tes API/database, bukan diklaim sebagai pengujian UI end-to-end.

Versi ini adalah fondasi fullstack yang dapat dijalankan, bukan hasil audit keamanan atau kesiapan operasional produksi penuh. Konfigurasikan rekening, identitas properti, aturan bisnis aktual, HTTPS, dan backup sebelum dipakai pelanggan nyata.
