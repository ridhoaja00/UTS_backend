# Menyimpan ke repositori GitHub baru

Jangan mengubah remote UTS_web lama. Gunakan direktori proyek baru ini. File .env, node_modules, hasil build, dan bukti transfer sudah dikecualikan melalui .gitignore.

Jika repositori baru belum dapat dibuat oleh asisten karena perlu login, Anda dapat menyelesaikan dari perangkat Anda:

1. Buat repositori GitHub baru bernama `smartkos-business`, pilih Private untuk awal pengembangan, dan jangan tambahkan README otomatis.
2. Jalankan dari folder smartkos-business:

```bash
git init
git add .
git commit -m "Build SmartKos business with tenant portal and MySQL backend"
git branch -M main
git remote add origin https://github.com/USERNAME/smartkos-business.git
git push -u origin main
```

Ganti USERNAME dengan username GitHub Anda. GitHub meminta metode autentikasi Git yang didukung, bukan password akun biasa. Jangan menempelkan token ke kode, chat, atau remote URL.

Alternatif dengan GitHub CLI yang sudah terpasang dan login:

```bash
gh repo create smartkos-business --private --source=. --remote=origin --push
```

Setelah push, Actions menjalankan build dan tes dengan layanan MySQL 8.4. Periksa hasilnya pada tab Actions. Jika repo Private, pastikan Actions diaktifkan dan akun memiliki kuota yang sesuai.
