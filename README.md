# SmartKos Business

Versi pengembangan ulang dari konsep [UTS_web](https://github.com/ridhoaja00/UTS_web): website bisnis kos dengan portal penghuni dan admin, React + Express + MySQL. Data bisnis dan akun menggunakan database backend, bukan localStorage. Ikon menggunakan Lucide SVG, tanpa emoji.

## Mulai

```bash
npm ci
cp .env.example .env
# Isi koneksi MySQL, admin, dan rekening pada .env.
npm run db:setup
npm run dev
```

Buka http://localhost:5173. **Panduan lengkap database dan instalasi: [docs/INSTALASI.md](docs/INSTALASI.md).** Gunakan Node.js 22+ dan MySQL 8.0+ atau MariaDB 10.6+.

## Fitur

| Akses    | Kemampuan                                                                                                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Publik   | Beranda bisnis, katalog, pencarian nama/nomor, filter tipe/harga/ketersediaan, detail kamar, about, FAQ, kontak, ketentuan                                                                    |
| Penghuni | Register/login/logout, profil, ganti password, pesan kamar, batalkan pesanan pending, tagihan, unggah bukti transfer, perpanjang sewa, ajukan checkout, komplain dan balasan                  |
| Admin    | Ringkasan, tambah/edit/sembunyikan kamar, data penghuni, daftar pesanan, setujui/tolak pembayaran, konfirmasi checkout, tanggapi komplain, catat pengeluaran, laporan keuangan dan ekspor CSV |

Pembayaran **transfer manual**, diverifikasi admin dari mutasi bank. Tidak ada payment gateway atau debit sungguhan di kode. Saldo bersih hijau, pemasukan biru, pengeluaran merah. Penghuni hanya dapat mengakses data miliknya. Admin diperiksa di server; register tidak dapat membuat admin.

## Aturan bisnis

- Satu pesanan berjalan per penghuni; satu kamar tidak dapat dipesan dua penghuni bersamaan. Transaksi database dan kunci baris kamar digunakan untuk pemesanan, pembayaran, dan checkout.
- Durasi sewa 1–12 bulan kalender. Tanggal masuk hari ini hingga tiga bulan ke depan; tanggal akhir tidak termasuk.
- Pesanan pending menahan kamar 24 jam. Bukti yang dikirim menahan kamar selama peninjauan. Jika ditolak, penghuni diberi 24 jam baru untuk memperbaiki pembayaran awal.
- Sewa awal aktif hanya setelah verifikasi. Tanggal akhir perpanjangan berubah hanya setelah verifikasi tagihan perpanjangan.
- Penghuni bisa membuat laporan, memperpanjang, dan checkout setelah tanggal masuk. Checkout perlu konfirmasi admin; kamar tidak otomatis dianggap kosong ketika tanggal akhir lewat.
- Pembatalan setelah pembayaran aktif dan refund ditangani manual dengan pengelola. Sistem tidak mengirim uang.
- Harga kamar yang diedit tidak mengubah harga pesanan berjalan; perpanjangan memakai snapshot harga bulanan pesanan.

## Struktur

```text
client/             React UI, styling, aset ilustrasi lokal
server/             Express API, autentikasi, transaksi bisnis, setup database
database/schema.sql Skema MySQL
tests/              Unit dan integrasi API + database
docs/               Instalasi, model data, API, konfigurasi Nginx
compose.yaml        MySQL 8.4 opsional melalui Docker
.env.example        Contoh konfigurasi; tidak berisi kredensial produksi
```

## Keamanan dan batas versi awal

Password di-hash dengan scrypt dan salt acak. Sesi opaque disimpan sebagai hash dalam MySQL dengan cookie HttpOnly/SameSite, secure pada produksi. Mutasi memakai pemeriksaan origin dan token CSRF, query berparameter, validasi input, pembatasan permintaan, serta otorisasi kepemilikan. Bukti JPG/PNG maksimal 5 MB diperiksa signature-nya dan dilayani lewat endpoint terautentikasi.

Konten, harga, dan kamar adalah data contoh. Gambar katalog merupakan ilustrasi SVG. Ubah identitas properti, rekening, kontak, ketentuan, serta biaya aktual sebelum digunakan. Tidak ada reset password via email, email otomatis, payment gateway, refund otomatis, atau migrasi otomatis dari data lokal versi lama. Panduan produksi, backup dan batas fitur ada di dokumen instalasi.

## Perintah

| Perintah                   | Tujuan                                            |
| -------------------------- | ------------------------------------------------- |
| `npm run db:setup`         | Buat tabel, akun admin dari env, dan kamar contoh |
| `npm run dev`              | Jalankan API dan frontend bersama                 |
| `npm run build`            | Build frontend ke client/dist                     |
| `npm start`                | API dan hasil build pada port 3001                |
| `npm test`                 | Tes unit domain                                   |
| `npm run test:integration` | Tes API/database; wajib database *_test terpisah  |
| `npm run check`            | Periksa sintaks backend                           |

Model data: [docs/DATABASE.md](docs/DATABASE.md). API: [docs/API.md](docs/API.md).
