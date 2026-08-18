const { Pool } = require("pg");

console.log("=================================");
console.log("DATABASE ENVIRONMENT VARIABLES");
console.log("=================================");
console.log("DATABASE_URL ADA?:", process.env.DATABASE_URL ? "ADA" : "KOSONG");
console.log("=================================");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect((err, client, release) => {
  if (err) {
    console.log("=================================");
    console.log("KONEKSI DATABASE GAGAL");
    console.log(err);
    console.log("=================================");
  } else {
    console.log("=================================");
    console.log("DATABASE BERHASIL TERHUBUNG");
    console.log("=================================");
    release();
  }
});

// Wrapper supaya cara pakainya mirip mysql2: db.query(sql, params, callback)
const db = {
  query: (sql, paramsOrCallback, callback) => {
    let params = [];
    let cb = paramsOrCallback;

    if (typeof paramsOrCallback !== "function") {
      params = paramsOrCallback || [];
      cb = callback;
    }

    pool.query(sql, params, (err, result) => {
      if (err) return cb(err);
      cb(null, result.rows);
    });
  },
};

module.exports = { pool, db };
