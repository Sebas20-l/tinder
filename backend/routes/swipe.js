// routes/swipe.js
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 == null || lon1 == null ||
    lat2 == null || lon2 == null
  ) return null;

  const R = 6371; // Radio de la tierra
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Obtener siguiente perfil para swipe
router.get('/next', authMiddleware, (req, res) => {
  const userId = req.user.id;

  // Traer mi perfil primero
  db.get('SELECT * FROM profiles WHERE user_id = ?', [userId], (err, me) => {
    if (err || !me) {
      return res.status(500).json({ error: 'No se encontró tu perfil' });
    }

    // Buscar perfiles posibles (filtros básicos de edad/género, que no sea yo)
    db.all(
      `SELECT p.*, u.is_active
       FROM profiles p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id != ?
         AND u.is_active = 1
         AND (p.age IS NULL OR (p.age BETWEEN ? AND ?))
         AND (? IS NULL OR p.gender = ? OR p.gender IS NULL)
         AND p.user_id NOT IN (
           SELECT to_user_id FROM swipes WHERE from_user_id = ?
         )
       LIMIT 50`,
      [
        userId,
        me.min_age_pref || 18,
        me.max_age_pref || 99,
        me.interested_in_gender || null,
        me.interested_in_gender || null,
        userId
      ],
      (err2, candidates) => {
        if (err2) return res.status(500).json({ error: 'Error en BD' });

        if (!candidates || candidates.length === 0) {
          return res.json({ profile: null });
        }

        // Filtrar por distancia si aplica
        let filtered = candidates;

        if (me.location_lat != null && me.location_lng != null && me.distance_km != null) {
          filtered = candidates.filter((c) => {
            const d = calculateDistanceKm(
              me.location_lat,
              me.location_lng,
              c.location_lat,
              c.location_lng
            );
            if (d == null) return true; // si el otro no tiene ubicación, lo dejamos pasar
            return d <= me.distance_km;
          });
        }

        if (filtered.length === 0) {
          return res.json({ profile: null });
        }

        const candidate = filtered[0];

        // Traer fotos
        db.all(
          'SELECT * FROM profile_photos WHERE profile_id = ? ORDER BY sort_order ASC',
          [candidate.id],
          (err3, photos) => {
            if (err3) return res.status(500).json({ error: 'Error en BD' });
            res.json({ profile: candidate, photos });
          }
        );
      }
    );
  });
});

// Enviar swipe
router.post('/', authMiddleware, (req, res) => {
  const fromUserId = req.user.id;
  const { toUserId, action } = req.body;

  if (!['like', 'dislike', 'superlike'].includes(action)) {
    return res.status(400).json({ error: 'Acción inválida' });
  }

  db.run(
    `INSERT INTO swipes (from_user_id, to_user_id, action)
     VALUES (?, ?, ?)
     ON CONFLICT(from_user_id, to_user_id)
     DO UPDATE SET action = excluded.action`,
    [fromUserId, toUserId, action],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error guardando swipe' });
      }

      // Si es like / superlike, revisar si hay match
      if (action === 'like' || action === 'superlike') {
        db.get(
          `SELECT * FROM swipes 
           WHERE from_user_id = ? AND to_user_id = ? 
             AND (action = 'like' OR action = 'superlike')`,
          [toUserId, fromUserId],
          (err2, reciprocal) => {
            if (err2) {
              console.error(err2);
              return res.status(500).json({ error: 'Error comprobando match' });
            }

            if (reciprocal) {
              // Crear match (asegurando orden de IDs)
              const user1 = Math.min(fromUserId, toUserId);
              const user2 = Math.max(fromUserId, toUserId);

              db.run(
                `INSERT OR IGNORE INTO matches (user1_id, user2_id)
                 VALUES (?, ?)`,
                [user1, user2],
                function (err3) {
                  if (err3) {
                    console.error(err3);
                    return res.status(500).json({ error: 'Error creando match' });
                  }
                  return res.json({ message: 'Swipe registrado', match: true });
                }
              );
            } else {
              return res.json({ message: 'Swipe registrado', match: false });
            }
          }
        );
      } else {
        return res.json({ message: 'Swipe registrado', match: false });
      }
    }
  );
});

module.exports = router;
