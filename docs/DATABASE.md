# Model data

Seluruh tabel memakai InnoDB dan foreign key. Nilai uang adalah integer rupiah tanpa desimal. Tanggal sewa bertipe DATE; periode akhir bersifat eksklusif. Waktu sesi dan pembayaran memakai UTC; UI menampilkan tanggal lokal Indonesia.

| Tabel      | Isi dan hubungan                                                                     |
| ---------- | ------------------------------------------------------------------------------------ |
| users      | Identitas, email unik, telepon, hash password, role tenant/admin                     |
| sessions   | Hash token sesi, token CSRF, expiry; terkait user; token asli hanya di cookie        |
| rooms      | Identitas unit unik, tipe, harga, luas, fasilitas JSON, gambar, status penawaran     |
| bookings   | User, kamar, kode unik, awal/akhir, snapshot harga bulanan, status, batas pembayaran |
| invoices   | Tagihan booking/renewal, durasi, periode, nominal, bukti privat, hasil verifikasi    |
| complaints | Pesanan, user, kategori, judul, isi, status dan tanggapan admin                      |
| expenses   | Catatan biaya operasional dan admin pencatat                                         |

Terdapat **7 tabel** seluruhnya; tabel bisnis berjumlah 6 ditambah sessions.

## Status

- Booking: pending → active → checkout_requested → completed. Pending tanpa pembayaran dapat menjadi cancelled atau expired. Active yang sudah mencapai tanggal akhir juga bisa diselesaikan admin.
- Invoice: unpaid → submitted → paid. Penolakan mengembalikan ke unpaid dengan catatan; pesanan selesai/batal/kedaluwarsa membuat tagihan belum lunas menjadi void.
- Complaint: open, in_progress, resolved; admin boleh memperbarui status disertai balasan.
- Room: available, maintenance, hidden. `available` berarti ditawarkan; ketersediaan pemesanan juga mensyaratkan tidak ada booking yang memblokir.

## Konsistensi transaksi

Pemesanan mengunci baris user dan kamar menggunakan SELECT FOR UPDATE, memeriksa ketersediaan lalu membuat booking dan invoice dalam satu transaksi. Aksi pembayaran, perpanjangan dan checkout mengunci kamar lalu booking dan tagihan. Pengujian menjalankan dua pemesanan bersamaan dan memastikan hanya satu berhasil.

Pending dengan batas waktu lewat tidak memblokir katalog kecuali bukti sedang ditinjau. Status expired diselesaikan saat operasi berikutnya mengunci kamar; API daftar juga menampilkan expiry efektif dan menonaktifkan pembayaran. Tidak memerlukan cron untuk membuka ketersediaan pending yang habis waktu.

Perpanjangan tidak membuka pesanan kamar lain: selama booking active/checkout_requested, kamar tetap diblokir. Model ini sengaja belum mengizinkan pemesanan beruntun beberapa penghuni di tanggal masa depan, untuk menghindari konflik perpanjangan dan checkout. Satu penghuni hanya satu pesanan berjalan.

## Penyimpanan dan backup

Bukti transfer disimpan di server/uploads dengan nama acak; tabel hanya menyimpan referensinya. Tidak ada direktori upload publik. Backup database dan folder tersebut bersamaan. Jangan commit bukti pelanggan, dump database produksi, .env, atau token sesi.

Akun awal dibuat oleh server/setup.js dari ADMIN_EMAIL/ADMIN_PASSWORD. Menjalankan setup ulang tidak mengganti akun yang sudah ada. Ubah password melalui profil admin. Tidak ada akun default Admin/Admin.
