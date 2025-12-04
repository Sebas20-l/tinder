// routes/profiles.js
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Obtener mi perfil
router.get('/me', authMiddleware, (req, res) => {
  const userId = req.user.id;

  db.get(
    'SELECT * FROM profiles WHERE user_id = ?',
    [userId],
    (err, profile) => {
      if (err) return res.status(500).json({ error: 'Error en BD' });
      if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

      db.all(
        'SELECT * FROM profile_photos WHERE profile_id = ? ORDER BY sort_order ASC',
        [profile.id],
        (err2, photos) => {
          if (err2) return res.status(500).json({ error: 'Error en BD' });
          res.json({ profile, photos });
        }
      );
    }
  );
});

// Actualizar mi perfil
router.put('/me', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const {
    display_name,
    short_bio,
    age,
    gender,
    distance_km,
    min_age_pref,
    max_age_pref,
    interested_in_gender,
    interests,
    music,
    languages,
    location_lat,
    location_lng
  } = req.body;

  db.run(
    `UPDATE profiles SET 
      display_name = COALESCE(?, display_name),
      short_bio = COALESCE(?, short_bio),
      age = COALESCE(?, age),
      gender = COALESCE(?, gender),
      distance_km = COALESCE(?, distance_km),
      min_age_pref = COALESCE(?, min_age_pref),
      max_age_pref = COALESCE(?, max_age_pref),
      interested_in_gender = COALESCE(?, interested_in_gender),
      interests = COALESCE(?, interests),
      music = COALESCE(?, music),
      languages = COALESCE(?, languages),
      location_lat = COALESCE(?, location_lat),
      location_lng = COALESCE(?, location_lng),
      updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`,
    [
      display_name,
      short_bio,
      age,
      gender,
      distance_km,
      min_age_pref,
      max_age_pref,
      interested_in_gender,
      interests,
      music,
      languages,
      location_lat,
      location_lng,
      userId
    ],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error actualizando perfil' });
      }
      res.json({ message: 'Perfil actualizado correctamente' });
    }
  );
});

// Añadir foto (aquí asumimos que ya tienes URL, no upload real)
router.post('/me/photos', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { image_url, sort_order } = req.body;

  db.get('SELECT id FROM profiles WHERE user_id = ?', [userId], (err, profile) => {
    if (err || !profile) {
      return res.status(400).json({ error: 'Perfil no encontrado' });
    }

    db.run(
      'INSERT INTO profile_photos (profile_id, image_url, sort_order) VALUES (?, ?, ?)',
      [profile.id, image_url, sort_order || 0],
      function (err2) {
        if (err2) return res.status(500).json({ error: 'Error al guardar foto' });
        res.json({ id: this.lastID });
      }
    );
  });
});

// Eliminar foto
router.delete('/me/photos/:photoId', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const photoId = req.params.photoId;

  db.get(
    `SELECT pp.id FROM profile_photos pp
     JOIN profiles p ON pp.profile_id = p.id
     WHERE pp.id = ? AND p.user_id = ?`,
    [photoId, userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Error en BD' });
      if (!row) return res.status(404).json({ error: 'Foto no encontrada o no pertenece al usuario' });

      db.run('DELETE FROM profile_photos WHERE id = ?', [photoId], (err2) => {
        if (err2) return res.status(500).json({ error: 'Error al eliminar foto' });
        res.json({ message: 'Foto eliminada' });
      });
    }
  );
});

// Eliminar mi perfil (desactivar usuario)
router.delete('/me', authMiddleware, (req, res) => {
  const userId = req.user.id;

  db.run('UPDATE users SET is_active = 0 WHERE id = ?', [userId], (err) => {
    if (err) return res.status(500).json({ error: 'Error al desactivar usuario' });
    res.json({ message: 'Usuario desactivado' });
  });
});

module.exports = router;
