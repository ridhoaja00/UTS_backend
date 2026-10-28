# Referensi implementasi

- MySQL InnoDB locking reads: https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html
- Express security practices: https://expressjs.com/advanced/best-practice-security/

Implementasi sesi proyek ini memakai tabel sessions sendiri dengan token acak yang di-hash, bukan MemoryStore express-session.
