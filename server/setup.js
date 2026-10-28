import "dotenv/config";
import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { dbConfig, pool } from "./db.js";
import { hashPassword } from "./domain.js";
const name = dbConfig.database;
if (!/^[a-zA-Z0-9_]+$/.test(name))
  throw Error("DB_NAME hanya boleh huruf, angka, underscore");
if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12)
  throw Error("Set ADMIN_PASSWORD minimal 12 karakter di .env");
const connection = await mysql.createConnection({
  ...dbConfig,
  database: undefined,
  multipleStatements: true,
});
try {
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.changeUser({ database: name });
  await connection.query(
    await readFile(new URL("../database/schema.sql", import.meta.url), "utf8"),
  );
  const [users] = await connection.execute(
    "SELECT id FROM users WHERE email=?",
    [process.env.ADMIN_EMAIL || "admin@smartkos.local"],
  );
  if (!users.length)
    await connection.execute(
      "INSERT INTO users(name,email,phone,password_hash,role) VALUES (?,?,?,?,?)",
      [
        process.env.ADMIN_NAME || "Administrator",
        process.env.ADMIN_EMAIL || "admin@smartkos.local",
        "",
        await hashPassword(process.env.ADMIN_PASSWORD),
        "admin",
      ],
    );
  const [[{ count }]] = await connection.query(
    "SELECT COUNT(*) AS count FROM rooms",
  );
  if (!count) {
    const rooms = [
      [
        "Essential 101",
        "101",
        "Standar",
        950000,
        12,
        "Ruang praktis dengan pencahayaan hangat untuk rutinitas yang lebih nyaman.",
        ["WiFi", "Kamar mandi dalam", "Meja belajar"],
        "standard",
      ],
      [
        "Essential 102",
        "102",
        "Standar",
        950000,
        12,
        "Kamar nyaman dengan fasilitas esensial untuk belajar dan beristirahat.",
        ["WiFi", "Kamar mandi dalam", "Meja belajar"],
        "standard",
      ],
      [
        "Comfort 201",
        "201",
        "Deluxe",
        1450000,
        18,
        "Lebih lega, lebih tenang. Dilengkapi AC dan area kerja pribadi.",
        ["WiFi", "AC", "Kamar mandi dalam", "Meja kerja"],
        "deluxe",
      ],
      [
        "Comfort 202",
        "202",
        "Deluxe",
        1450000,
        18,
        "Pilihan seimbang untuk Anda yang mengutamakan kenyamanan sehari-hari.",
        ["WiFi", "AC", "Kamar mandi dalam", "Lemari"],
        "deluxe",
      ],
      [
        "Signature 301",
        "301",
        "Suite",
        2100000,
        24,
        "Ruang lapang dengan area duduk untuk pengalaman tinggal yang lebih personal.",
        ["WiFi", "AC", "Kamar mandi dalam", "Area duduk", "Air panas"],
        "suite",
      ],
      [
        "Signature 302",
        "302",
        "Suite",
        2100000,
        24,
        "Hunian premium dengan ruang untuk beristirahat, bekerja, dan bertumbuh.",
        ["WiFi", "AC", "Kamar mandi dalam", "Area duduk", "Air panas"],
        "suite",
      ],
    ];
    for (const [
      title,
      number,
      type,
      price,
      size,
      description,
      facilities,
      image,
    ] of rooms)
      await connection.execute(
        "INSERT INTO rooms(name,number,type,price,size,description,facilities,image) VALUES (?,?,?,?,?,?,?,?)",
        [
          title,
          number,
          type,
          price,
          size,
          description,
          JSON.stringify(facilities),
          `/images/room-${image}.svg`,
        ],
      );
  }
  console.log(
    "Database siap. Login admin dengan ADMIN_EMAIL dan ADMIN_PASSWORD dari .env.",
  );
} finally {
  await connection.end();
  await pool.end();
}
