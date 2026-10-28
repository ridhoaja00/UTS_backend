# Panduan instalasi SmartKos Business

Panduan ini untuk proyek **baru** `smartkos-business`, bukan menimpa folder UTS_web lama. Frontend React + Vite, backend Node.js + Express, database MySQL 8.0+ (InnoDB). Node.js 22 LTS atau lebih baru dan npm diperlukan. Database kompatibel MariaDB 10.6+ juga bisa digunakan, termasuk paket bawaan Kali dan XAMPP.

## 1. Pasang dependensi

Ekstrak ZIP atau clone repositori, lalu masuk folder yang memiliki package.json:

```bash
cd smartkos-business
npm ci
cp .env.example .env
```

Pada Windows PowerShell, gunakan `Copy-Item .env.example .env` untuk perintah terakhir. Bila mendapatkan `vite: not found`, pastikan Anda berada di folder yang benar dan jalankan `npm ci` terlebih dahulu.

## 2. Pilih salah satu cara menyiapkan database

### Pilihan A — MySQL 8.4 dengan Docker (paling seragam)

Pasang Docker Engine dan Docker Compose terlebih dahulu. Edit `.env`:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=smartkos
DB_PASSWORD=isi-password-database-anda
DB_NAME=smartkos_business
MYSQL_ROOT_PASSWORD=isi-password-root-yang-berbeda
```

`MYSQL_ROOT_PASSWORD` perlu ditambahkan ke `.env`; hanya dipakai oleh Docker untuk inisialisasi MySQL. Lalu:

```bash
docker compose up -d db
docker compose ps
```

Tunggu hingga database berstatus **healthy**. Data tersimpan di volume `mysql_data`. Jangan menjalankan `docker compose down -v` jika ingin mempertahankan data. Password Docker hanya berlaku ketika volume database pertama kali dibuat; mengubah `.env` saja tidak mengganti password database yang sudah ada.

### Pilihan B — Kali / Debian dengan MariaDB

Kali menyediakan MariaDB yang kompatibel dengan skema ini:

```bash
sudo apt update
sudo apt install mariadb-server mariadb-client
sudo systemctl enable --now mariadb
sudo mariadb
```

Di konsol database, jalankan dan ganti contoh password:

```sql
CREATE DATABASE smartkos_business CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'smartkos'@'127.0.0.1' IDENTIFIED BY 'isi-password-database-anda';
GRANT ALL PRIVILEGES ON smartkos_business.* TO 'smartkos'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

Isi `.env` sesuai nama user dan password tersebut. Gunakan `DB_HOST=127.0.0.1`, bukan socket lokal. Jika instalasi database Anda me-resolve koneksi menjadi localhost dan menolak user, buat user yang sama untuk `'smartkos'@'localhost'` dengan hak pada database yang sama.

### Pilihan C — MySQL yang sudah terpasang / XAMPP

Nyalakan layanan database, lalu buat database dan user melalui konsol MySQL atau phpMyAdmin. Gunakan SQL yang sama pada pilihan B. Sesuaikan `DB_PORT`, biasanya 3306. XAMPP umumnya menggunakan MariaDB; gunakan versi yang masih didukung. Jangan memakai akun root tanpa password untuk deployment.

## 3. Atur admin, kontak, dan rekening

Edit `.env` sebelum mengisi database:

```dotenv
NODE_ENV=development
PORT=3001
APP_ORIGIN=http://localhost:5173
ADMIN_NAME=Administrator
ADMIN_EMAIL=admin@kosanda.id
ADMIN_PASSWORD=buat-password-unik-minimal-12-karakter
BANK_NAME=nama-bank-anda
BANK_ACCOUNT=nomor-rekening-anda
BANK_HOLDER=nama-pemilik-rekening
CONTACT_EMAIL=halo@kosanda.id
CONTACT_PHONE=081234567890
```

Jangan memakai password contoh. Admin dibuat dari konfigurasi Anda, **bukan Admin/Admin**. Rekening sengaja kosong pada file contoh. Pengunggahan bukti pembayaran dinonaktifkan sampai nama bank, nomor rekening, dan pemilik rekening terisi. Jangan memublikasikan file `.env`.

## 4. Buat tabel dan data awal

```bash
npm run db:setup
```

Perintah ini membuat database (jika memiliki izin), enam tabel bisnis dan satu tabel sesi, akun admin, serta enam kamar contoh. Aman dijalankan ulang: akun yang sudah ada tidak ditimpa dan contoh kamar hanya ditambahkan saat tabel kamar kosong. `database/schema.sql` menyediakan SQL struktur tabel untuk ditinjau atau diimpor manual. Setelah impor manual, tetap jalankan `npm run db:setup` untuk membuat admin dan data awal.

Jika `Access denied` muncul, periksa DB_USER/DB_PASSWORD/hak akses. Jika `ECONNREFUSED` muncul, nyalakan database dan cek host/port. Jika database sudah dibuat oleh admin database, akun aplikasi tetap perlu hak CREATE TABLE, SELECT, INSERT, UPDATE, DELETE, REFERENCES dan INDEX pada database itu untuk menjalankan setup. Untuk runtime sesudah setup, hak dapat dipersempit ke SELECT, INSERT, UPDATE, DELETE.

## 5. Jalankan aplikasi

```bash
npm run dev
```

Buka **http://localhost:5173**. API berada di http://127.0.0.1:3001/api. Proses dev menjalankan API dan Vite sekaligus. Gunakan Ctrl+C untuk menghentikan.

- Beranda `/` adalah halaman bisnis publik.
- `/kamar` untuk katalog, pencarian, filter tipe, harga dan ketersediaan.
- `/register` untuk membuat akun penghuni.
- `/login` untuk admin dan penghuni; sistem mengarahkan sesuai role dari server.
- `/akun` untuk masa tinggal penghuni.
- `/admin` untuk pengelola.

Akun admin memakai email/password yang Anda isi pada langkah 3. Akun penghuni dibuat lewat register. Nomor HP berisi 10–15 digit (awalan + diperbolehkan).

## 6. Uji alur bisnis

1. Login admin, edit katalog kamar, lalu logout.
2. Register penghuni, pilih kamar dan durasi, buat pesanan.
3. Buka Tagihan; pastikan rekening benar, transfer dan unggah bukti JPG/PNG maksimum 5 MB.
4. Logout dan login admin; buka Pesanan & pembayaran, lihat bukti dan cocokkan dengan mutasi bank. Setujui jika valid atau tolak dengan alasan.
5. Login penghuni: sewa menjadi aktif. Pada tanggal mulai tinggal, menu perpanjangan, komplain, dan checkout dapat digunakan.
6. Buat perpanjangan; tanggal akhir **belum berubah** sampai pembayaran tagihan perpanjangan disetujui.
7. Buat laporan; admin mengubah status serta membalasnya. Penghuni dapat membaca balasan.
8. Ajukan checkout; admin konfirmasi setelah pemeriksaan kamar. Kamar baru tersedia lagi setelah konfirmasi.
9. Admin dapat mencatat pengeluaran dan mengekspor laporan keuangan CSV.

Untuk mencoba tanpa transfer nyata, gunakan database pengujian terpisah dan data dummy. Jangan menyetujui bukti pelanggan nyata tanpa memeriksa mutasi rekening.

## 7. Build produksi / menjalankan hasil build

```bash
npm run build
npm start
```

Untuk uji lokal hasil build, set `APP_ORIGIN=http://localhost:3001`, biarkan `NODE_ENV=development`, lalu buka http://localhost:3001. Backend melayani file hasil build dan API di origin yang sama.

Untuk server publik:

- Atur `NODE_ENV=production` dan `APP_ORIGIN=https://domain-anda`.
- Jalankan `npm start` di belakang satu reverse proxy HTTPS (misalnya Nginx) yang meneruskan ke `127.0.0.1:3001`; jangan mengekspos database ke internet. Cookie secure memerlukan HTTPS. Sesuaikan `trust proxy` jika topologi proxy berubah.
- Jalankan backend dengan akun sistem non-root dan service manager. Contoh konfigurasi Nginx ada di `docs/nginx.conf.example`.
- Simpan volume database serta `server/uploads` secara persisten. Backup keduanya; bukti transfer tidak berada dalam tabel database sebagai file biner.
- Ganti konten contoh, ilustrasi, ketentuan, kontak, rincian biaya, dan aturan properti sebelum go-live. Gambar SVG adalah ilustrasi lokal tanpa ketergantungan layanan gambar eksternal.
- Tidak ada payment gateway, refund otomatis, verifikasi email, atau reset password via email. Akun pengguna perlu pengelolaan operasional yang sesuai sebelum menerima pelanggan luas.

## 8. Pengujian

```bash
npm test
npm run check
npm run build
```

Tes integrasi memodifikasi data, sehingga **harus** memakai database terpisah dengan nama berakhiran `_test`. Jangan menjalankannya pada database bisnis.

```bash
# Buat database pengujian dan beri user hak akses terlebih dahulu.
# Ubah DB_NAME pada .env menjadi smartkos_business_test untuk sesi tes.
npm run db:setup
npm run test:integration
```

Tes mencakup register/login, role, CSRF, pemesanan bersamaan, bukti transfer privat, penolakan/persetujuan pembayaran, perpanjangan, komplain, checkout, kedaluwarsa, keuangan, dan pencabutan sesi setelah ganti password. Setelah tes, kembalikan DB_NAME ke database bisnis. Jika memakai Docker, grant user ke database pengujian melalui akun root terlebih dahulu.
