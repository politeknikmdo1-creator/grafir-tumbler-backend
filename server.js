require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { db } = require("./db");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// pastikan folder uploads ada
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// supaya file di /uploads bisa diakses lewat browser
app.use("/uploads", express.static(uploadDir));

/* ================= HELPER: simpan base64 jadi file ================= */
const saveBase64Image = (base64String, prefix = "img") => {
  if (!base64String) return "";

  const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);

  let ext = "png";
  let data = base64String;

  if (matches) {
    ext = matches[1];
    data = matches[2];
  }

  const fileName = `${prefix}_${Date.now()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);

  fs.writeFileSync(filePath, data, "base64");

  return `/uploads/${fileName}`;
};

/* ================= LOGIN ================= */

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM admin WHERE username=$1 AND password=$2";

  db.query(sql, [username, password], (err, result) => {
    if (err) {
      console.log("LOGIN ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Login gagal",
      });
    }

    if (result.length > 0) {
      res.json({
        success: true,
        message: "Login berhasil",
      });
    } else {
      res.json({
        success: false,
        message: "Username atau password salah",
      });
    }
  });
});

/* ================= STATUS MESIN ================= */

app.get("/status_mesin", (req, res) => {
  // Dashboard hanya membaca data mentah electrical yang terakhir diterima
  // oleh API PHP, ditambah nilai kontrol ON/OFF mesin.
  const sql = `
    SELECT
      id,
      CASE WHEN kontrol_mesin = 'on' THEN 1 ELSE 0 END AS switch,
      voltage,
      current_amp AS current,
      power_watt AS power,
      updated_at
    FROM status_mesin
    WHERE id=1
  `;

  db.query(sql, [], (err, result) => {
    if (err) {
      console.log("GET STATUS MESIN ERROR:", err);
      return res.status(500).json({});
    }

    res.json(result[0] || {});
  });
});

app.post("/status_mesin", (req, res) => {
  // Endpoint backend web ini hanya mengubah perintah switch untuk tombol
  // ON/OFF Dashboard. Nama field dibuat sama dengan kontrak alumni: switch.
  const switchValue = Number(req.body.switch);

  if (!Number.isInteger(switchValue) || ![0, 1].includes(switchValue)) {
    return res.status(400).json({
      success: false,
      message: "switch harus 0 atau 1",
    });
  }

  const kontrolMesin = switchValue === 1 ? "on" : "off";
  const sql = "UPDATE status_mesin SET kontrol_mesin=$1 WHERE id=1";

  db.query(sql, [kontrolMesin], (err) => {
    if (err) {
      console.log("UPDATE KONTROL MESIN ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Gagal mengubah kontrol mesin",
      });
    }

    res.json({
      success: true,
      message: "Kontrol mesin berhasil diubah",
      switch: switchValue,
    });
  });
});

// Data sensor mesin tidak diterima melalui backend Node.
// Semua data mentah switch/voltage/current/power masuk melalui:
// POST api/update_electrical.php


/* ================= TEMPLATE ================= */

app.get("/templates", (req, res) => {
  const sql = "SELECT * FROM templates ORDER BY id DESC";

  db.query(sql, [], (err, result) => {
    if (err) {
      console.log("GET TEMPLATES ERROR:", err);
      return res.status(500).json([]);
    }

    res.json(result);
  });
});

app.post("/templates", (req, res) => {
  const {
    name,
    text_value,
    design_json,
    preview_image,
    font_size,
    pos_x,
    pos_y,
    box_width,
    box_height,
    logo_path,
    logo_rotation,
    logo_x,
    logo_y,
    logo_width,
    logo_height,

    text,
    designJson,
    previewImage,
    fontSize,
    rotation,
    posX,
    posY,
    boxWidth,
    boxHeight,
    logo,
    logoRotation,
    logoX,
    logoY,
    logoWidth,
    logoHeight,
  } = req.body;

  const finalText = text_value ?? text ?? "";
  const finalDesignJson = design_json ?? designJson ?? "";
  const finalPreviewBase64 = preview_image ?? previewImage ?? "";
  const finalFontSize = font_size ?? fontSize ?? 18;
  const finalRotation = rotation ?? 0;
  const finalPosX = pos_x ?? posX ?? 50;
  const finalPosY = pos_y ?? posY ?? 100;
  const finalBoxWidth = box_width ?? boxWidth ?? 120;
  const finalBoxHeight = box_height ?? boxHeight ?? 50;

  const finalLogoPath = logo_path ?? logo ?? "";
  const finalLogoRotation = logo_rotation ?? logoRotation ?? 0;
  const finalLogoX = logo_x ?? logoX ?? 60;
  const finalLogoY = logo_y ?? logoY ?? 40;
  const finalLogoWidth = logo_width ?? logoWidth ?? 80;
  const finalLogoHeight = logo_height ?? logoHeight ?? 80;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Nama template wajib diisi",
    });
  }

  const finalFilePath = saveBase64Image(finalPreviewBase64, "template");

  const sql = `
    INSERT INTO templates
    (
      name,
      file_path,
      text_value,
      font_size,
      rotation,
      pos_x,
      pos_y,
      box_width,
      box_height,
      logo_path,
      logo_rotation,
      logo_x,
      logo_y,
      logo_width,
      logo_height,
      design_json
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    RETURNING id
  `;

  db.query(
    sql,
    [
      name,
      finalFilePath,
      finalText,
      finalFontSize,
      finalRotation,
      finalPosX,
      finalPosY,
      finalBoxWidth,
      finalBoxHeight,
      finalLogoPath,
      finalLogoRotation,
      finalLogoX,
      finalLogoY,
      finalLogoWidth,
      finalLogoHeight,
      finalDesignJson,
    ],
    (err, result) => {
      if (err) {
        console.log("POST TEMPLATES ERROR:", err);
        return res.status(500).json({
          success: false,
          message: err.message || "Template gagal disimpan",
        });
      }

      res.json({
        success: true,
        message: "Template berhasil disimpan",
        id: result[0].id,
        file_path: finalFilePath,
      });
    }
  );
});

app.delete("/templates/:id", (req, res) => {
  const id = req.params.id;

  db.query("SELECT file_path FROM templates WHERE id=$1", [id], (err, rows) => {
    if (!err && rows.length > 0 && rows[0].file_path) {
      const filePath = path.join(__dirname, rows[0].file_path);
      fs.unlink(filePath, () => {});
    }

    db.query("DELETE FROM templates WHERE id=$1", [id], (err2) => {
      if (err2) {
        console.log("DELETE TEMPLATE ERROR:", err2);
        return res.status(500).json({
          success: false,
          message: "Template gagal dihapus",
        });
      }

      res.json({
        success: true,
        message: "Template berhasil dihapus",
      });
    });
  });
});

/* ================= ANTRIAN ================= */

app.get("/antrian", (req, res) => {
  const sql = `
    SELECT *
    FROM antrian
    ORDER BY id DESC
  `;

  db.query(sql, [], (err, result) => {
    if (err) {
      console.log("GET ANTRIAN ERROR:", err);
      return res.status(500).json([]);
    }

    res.json(result);
  });
});

app.post("/antrian", (req, res) => {
  const {
    template_id,
    name,
    text,
    design_json,
    font_size,
    rotation,
    pos_x,
    pos_y,
    box_width,
    box_height,
    status,

    designJson,
    fontSize,
    posX,
    posY,
    boxWidth,
    boxHeight,
  } = req.body;

  const finalDesignJson = design_json ?? designJson ?? "";
  const finalFontSize = font_size ?? fontSize ?? 18;
  const finalRotation = rotation ?? 0;
  const finalPosX = pos_x ?? posX ?? 50;
  const finalPosY = pos_y ?? posY ?? 100;
  const finalBoxWidth = box_width ?? boxWidth ?? 120;
  const finalBoxHeight = box_height ?? boxHeight ?? 50;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Nama design wajib diisi",
    });
  }

  if (!finalDesignJson) {
    return res.status(400).json({
      success: false,
      message: "Design JSON kosong",
    });
  }

  const sql = `
    INSERT INTO antrian
    (
      template_id,
      name,
      text,
      design_json,
      font_size,
      rotation,
      pos_x,
      pos_y,
      box_width,
      box_height,
      status
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING id
  `;

  db.query(
    sql,
    [
      template_id || null,
      name,
      text || "",
      finalDesignJson,
      finalFontSize,
      finalRotation,
      finalPosX,
      finalPosY,
      finalBoxWidth,
      finalBoxHeight,
      status || "menunggu",
    ],
    (err, result) => {
      if (err) {
        console.log("POST ANTRIAN ERROR:", err);
        return res.status(500).json({
          success: false,
          message: err.message || "Design gagal masuk antrian",
        });
      }

      res.json({
        success: true,
        message: "Design berhasil masuk antrian",
        id: result[0].id,
      });
    }
  );
});

const startAntrianJob = (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: "ID job tidak valid" });
  }

  // Hanya satu job boleh berstatus proses. Partial unique index di PostgreSQL
  // menjadi pengaman kedua jika dua tombol Start ditekan hampir bersamaan.
  const sql = `
    UPDATE antrian
    SET status='proses'
    WHERE id=$1
      AND status='menunggu'
      AND NOT EXISTS (
        SELECT 1 FROM antrian WHERE status='proses'
      )
    RETURNING id
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.log("START ANTRIAN ERROR:", err);
      if (err.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "Masih ada job yang sedang diproses. Antrian lain terkunci.",
        });
      }
      return res.status(500).json({ success: false, message: "Gagal memulai job" });
    }

    if (!result || result.length === 0) {
      return res.status(409).json({
        success: false,
        message: "Job tidak dapat dimulai karena ada job aktif atau status job bukan Menunggu.",
      });
    }

    return res.json({
      success: true,
      message: "Job berhasil dimulai. Antrian lain sekarang terkunci.",
      id,
      status: "proses",
    });
  });
};

app.put("/antrian/:id/start", startAntrianJob);
// Route lama dipertahankan untuk kompatibilitas, tetapi memakai lock yang sama.
app.put("/antrian/:id/proses", startAntrianJob);

app.put("/antrian/:id/selesai", (req, res) => {
  const id = req.params.id;

  const sql = "UPDATE antrian SET status='selesai' WHERE id=$1";

  db.query(sql, [id], (err) => {
    if (err) {
      console.log("UPDATE ANTRIAN SELESAI ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Status antrian gagal diubah menjadi selesai",
      });
    }

    res.json({
      success: true,
      message: "Status antrian berhasil diubah menjadi selesai",
    });
  });
});

app.delete("/antrian/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM antrian WHERE id=$1", [id], (err) => {
    if (err) {
      console.log("DELETE ANTRIAN ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Antrian gagal dihapus",
      });
    }

    res.json({
      success: true,
      message: "Antrian berhasil dihapus",
    });
  });
});

/* ================= SERVER ================= */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend Grafir Tumbler berjalan",
    status: "Online",
  });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
