require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const db = require("./db");

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
// contoh: http://localhost:8000/uploads/template_123.png
app.use("/uploads", express.static(uploadDir));

/* ================= HELPER: simpan base64 jadi file ================= */
const saveBase64Image = (base64String, prefix = "img") => {
  if (!base64String) return "";

  // buang header "data:image/png;base64," kalau ada
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

  // ini yang disimpan ke kolom file_path (bukan gambar mentahnya)
  return `/uploads/${fileName}`;
};

/* ================= LOGIN ================= */

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql =
    "SELECT * FROM admin WHERE BINARY username=? AND BINARY password=?";

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
  const sql = "SELECT * FROM status_mesin WHERE id=1";

  db.query(sql, (err, result) => {
    if (err) {
      console.log("GET STATUS MESIN ERROR:", err);
      return res.status(500).json({});
    }

    res.json(result[0] || {});
  });
});

app.post("/status_mesin", (req, res) => {
  const kontrolMesin = req.body.kontrol_mesin || req.body.power;

  if (!kontrolMesin) {
    return res.status(400).json({
      success: false,
      message: "kontrol_mesin wajib diisi",
    });
  }

  if (kontrolMesin !== "on" && kontrolMesin !== "off") {
    return res.status(400).json({
      success: false,
      message: "kontrol_mesin harus on atau off",
    });
  }

  const sql = "UPDATE status_mesin SET kontrol_mesin=? WHERE id=1";

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
      kontrol_mesin: kontrolMesin,
    });
  });
});

app.post("/sensor_mesin", (req, res) => {
  const { power, status } = req.body;

  if (!power || !status) {
    return res.status(400).json({
      success: false,
      message: "power dan status wajib diisi",
    });
  }

  if (power !== "on" && power !== "off") {
    return res.status(400).json({
      success: false,
      message: "power harus on atau off",
    });
  }

  if (status !== "idle" && status !== "running") {
    return res.status(400).json({
      success: false,
      message: "status harus idle atau running",
    });
  }

  const sql = "UPDATE status_mesin SET power=?, status=? WHERE id=1";

  db.query(sql, [power, status], (err) => {
    if (err) {
      console.log("UPDATE SENSOR MESIN ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Gagal update data sensor mesin",
      });
    }

    res.json({
      success: true,
      message: "Data sensor mesin berhasil diperbarui",
      power,
      status,
    });
  });
});

app.post("/status_proses", (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: "status wajib diisi",
    });
  }

  const sql = "UPDATE status_mesin SET status=? WHERE id=1";

  db.query(sql, [status], (err) => {
    if (err) {
      console.log("UPDATE STATUS PROSES ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Gagal mengubah status proses",
      });
    }

    res.json({
      success: true,
      message: "Status proses berhasil diubah",
    });
  });
});

/* ================= TEMPLATE ================= */

app.get("/templates", (req, res) => {
  const sql = "SELECT * FROM templates ORDER BY id DESC";

  db.query(sql, (err, result) => {
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
    preview_image, // base64 dari frontend, BUKAN yang disimpan langsung ke DB
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

  // === decode base64 preview jadi file, simpan pathnya ke file_path ===
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      name,
      finalFilePath, // <-- di sini path gambar preview disimpan
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
          message: err.sqlMessage || "Template gagal disimpan",
        });
      }

      res.json({
        success: true,
        message: "Template berhasil disimpan",
        id: result.insertId,
        file_path: finalFilePath,
      });
    }
  );
});

app.delete("/templates/:id", (req, res) => {
  const id = req.params.id;

  // ambil dulu file_path-nya supaya file lama bisa dihapus dari disk
  db.query("SELECT file_path FROM templates WHERE id=?", [id], (err, rows) => {
    if (!err && rows.length > 0 && rows[0].file_path) {
      const filePath = path.join(__dirname, rows[0].file_path);
      fs.unlink(filePath, () => {}); // abaikan kalau gagal/tidak ada
    }

    db.query("DELETE FROM templates WHERE id=?", [id], (err2) => {
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

  db.query(sql, (err, result) => {
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          message: err.sqlMessage || "Design gagal masuk antrian",
        });
      }

      res.json({
        success: true,
        message: "Design berhasil masuk antrian",
        id: result.insertId,
      });
    }
  );
});

app.put("/antrian/:id/proses", (req, res) => {
  const id = req.params.id;

  const sql = "UPDATE antrian SET status='proses' WHERE id=?";

  db.query(sql, [id], (err) => {
    if (err) {
      console.log("UPDATE ANTRIAN PROSES ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Status antrian gagal diubah menjadi proses",
      });
    }

    res.json({
      success: true,
      message: "Status antrian berhasil diubah menjadi proses",
    });
  });
});

app.put("/antrian/:id/selesai", (req, res) => {
  const id = req.params.id;

  const sql = "UPDATE antrian SET status='selesai' WHERE id=?";

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

  db.query("DELETE FROM antrian WHERE id=?", [id], (err) => {
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

const PORT = process.env.PORT || 8000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});