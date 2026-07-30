const mysql = require("mysql2");

// =========================
// DEBUG ENV
// =========================
console.log("=================================");
console.log("DATABASE ENVIRONMENT VARIABLES");
console.log("=================================");
console.log("DB_HOST     :", process.env.DB_HOST);
console.log("DB_USER     :", process.env.DB_USER);
console.log(
  "DB_PASSWORD :",
  process.env.DB_PASSWORD ? "ADA" : "KOSONG"
);
console.log("DB_NAME     :", process.env.DB_NAME);
console.log("DB_PORT     :", process.env.DB_PORT);
console.log("=================================");

// =========================
// KONEKSI DATABASE
// =========================
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
});

// =========================
// CONNECT
// =========================
db.connect((err) => {
  if (err) {
    console.log("=================================");
    console.log("KONEKSI DATABASE GAGAL");
    console.log(err);
    console.log("=================================");
  } else {
    console.log("=================================");
    console.log("DATABASE BERHASIL TERHUBUNG");
    console.log("=================================");
  }
});

module.exports = db;