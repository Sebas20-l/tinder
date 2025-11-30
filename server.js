const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Conexión a SQLite (archivo tinder.db)
const db = new sqlite3.Database("./tinder.db");

// Crear tabla de perfiles si no existe
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER,
      bio TEXT,
      image TEXT
    )
  `);

  // Insertar ejemplos solo si la tabla está vacía
  db.get("SELECT COUNT(*) AS count FROM profiles", (err, row) => {
    if (err) {
      console.error("Error contando perfiles:", err);
      return;
    }

    if (row.count === 0) {
      console.log("Insertando perfiles de ejemplo...");

      const stmt = db.prepare(
        "INSERT INTO profiles (name, age, bio, image) VALUES (?, ?, ?, ?)"
      );

      stmt.run(
        "Ana",
        24,
        "Me gusta la montaña, los libros y el café.",
        "https://placekitten.com/400/300"
      );
      stmt.run(
        "Luis",
        27,
        "Fan del cine, la música y los viajes improvisados.",
        "https://placekitten.com/401/300"
      );
      stmt.run(
        "Carla",
        22,
        "Amo los perritos, correr y las noches de películas.",
        "https://placekitten.com/402/300"
      );

      stmt.finalize();
    }
  });
});

// 🔍 Ruta de debug para ver TODOS los perfiles (para comprobar que sí se guardan)
app.get("/api/profiles", (req, res) => {
  db.all("SELECT * FROM profiles ORDER BY id", [], (err, rows) => {
    if (err) {
      console.error("Error listando perfiles:", err);
      return res.status(500).json({ message: "Error al leer perfiles" });
    }
    res.json(rows);
  });
});

/**
 * GET /api/next-profile
 * Params:
 *   excludeId -> id del usuario actual (no se incluye en los resultados)
 *   offset    -> desde qué posición empezar (0,1,2,...)
 */
app.get("/api/next-profile", (req, res) => {
  const excludeId = parseInt(req.query.excludeId || "0", 10);
  const offset = parseInt(req.query.offset || "0", 10);

  console.log("Siguiente perfil -> excludeId:", excludeId, "offset:", offset);

  const params = [];
  let query = `
    SELECT id, name, age, bio, image
    FROM profiles
  `;

  if (excludeId) {
    query += " WHERE id != ?";
    params.push(excludeId);
  }

  query += `
    ORDER BY id
    LIMIT 1 OFFSET ?
  `;
  params.push(offset);

  db.get(query, params, (err, row) => {
    if (err) {
      console.error("Error obteniendo perfil:", err);
      return res
        .status(500)
        .json({ done: true, message: "Error en el servidor." });
    }

    if (!row) {
      console.log("No hay más perfiles para mostrar.");
      return res.json({
        done: true,
        message: "No hay más perfiles para mostrar."
      });
    }

    res.json({ done: false, profile: row });
  });
});

// LIKE (solo para efecto, no guarda aún nada)
app.post("/api/like", (req, res) => {
  console.log("LIKE recibido");
  res.json({ message: "Like registrado 💚" });
});

// DISLIKE (solo para efecto)
app.post("/api/dislike", (req, res) => {
  console.log("DISLIKE recibido");
  res.json({ message: "Dislike registrado ❌" });
});

// Crear perfil
app.post("/api/create-profile", (req, res) => {
  const { name, age, bio, image } = req.body;
  console.log("Datos recibidos para crear perfil:", req.body);

  if (!name) {
    return res.status(400).json({ message: "El nombre es obligatorio." });
  }

  db.run(
    `
    INSERT INTO profiles (name, age, bio, image)
    VALUES (?, ?, ?, ?)
  `,
    [name, age || null, bio || null, image || null],
    function (err) {
      if (err) {
        console.error("Error guardando perfil:", err);
        return res.status(500).json({ message: "Error guardando el perfil." });
      }

      console.log("Perfil creado con id:", this.lastID);
      res.json({
        message: "Perfil creado correctamente 🎉",
        id: this.lastID
      });
    }
  );
});

// Frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
