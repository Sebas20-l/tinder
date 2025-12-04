// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /auth/register
router.post('/register', (req, res) => {
  const { email, password, display_name, age } = req.body;

  if (!email || !password || !display_name) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const password_hash = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO users (email, password_hash) VALUES (?, ?)',
    [email, password_hash],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(400).json({ error: 'No se pudo registrar usuario (email quizá duplicado)' });
      }

      const userId = this.lastID;

      db.run(
        `INSERT INTO profiles (user_id, display_name, age, min_age_pref, max_age_pref, distance_km)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, display_name, age || null, 18, 99, 50],
        (err2) => {
          if (err2) {
            console.error(err2);
          }
        }
      );

      const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });

      res.json({ token, userId });
    }
  );
});

// POST /auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error en BD' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, userId: user.id });
  });
});

module.exports = router;
