import "dotenv/config";
import mysql from "mysql2/promise";
export const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "smartkos",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "smartkos_business",
  charset: "utf8mb4",
  dateStrings: true,
  timezone: "+00:00",
  decimalNumbers: true,
};
export const pool = mysql.createPool({
  ...dbConfig,
  connectionLimit: 10,
  waitForConnections: true,
});
export async function transaction(fn) {
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const value = await fn(c);
    await c.commit();
    return value;
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
export async function rows(sql, params = [], connection = pool) {
  const [result] = await connection.execute(sql, params);
  return result;
}
