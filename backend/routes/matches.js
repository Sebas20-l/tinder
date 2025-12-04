// routes/matches.js
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Obtener todos mis matches
router.get('/', authMiddleware, (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT m.id as match_id,
            CASE 
              WHEN m.user1_id = ? THEN m.user2_id
              ELSE m.user1_id
            END AS other_user_id,
            p.display_name
     FROM matches m
     JOIN profiles p
       ON p.user_id = CASE 
                        WHEN m.user1_id = ? THEN m.user2_id
                        ELSE m.user1_id
                      END
     WHERE m.user1_id = ? OR m.user2_id = ?`,
    [userId, userId, userId, userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error en BD' });
      res.json(rows);
    }
  );
});

// Obtener mensajes de un match
router.get('/:matchId/messages', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const matchId = req.params.matchId;

  db.get(
    'SELECT * FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
    [matchId, userId, userId],
    (err, match) => {
      if (err) return res.status(500).json({ error: 'Error en BD' });
      if (!match) return res.status(403).json({ error: 'No tienes acceso a este match' });

      db.all(
        'SELECT * FROM messages WHERE match_id = ? ORDER BY created_at ASC',
        [matchId],
        (err2, msgs) => {
          if (err2) return res.status(500).json({ error: 'Error en BD' });
          res.json(msgs);
        }
      );
    }
  );
});

// Crear mensaje (para chat normal HTTP; WebSocket lo usará también)
router.post('/:matchId/messages', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const matchId = req.params.matchId;
  const { content, image_url } = req.body;

  db.get(
    'SELECT * FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
    [matchId, userId, userId],
    (err, match) => {
      if (err) return res.status(500).json({ error: 'Error en BD' });
      if (!match) return res.status(403).json({ error: 'No tienes acceso a este match' });

      db.run(
        'INSERT INTO messages (match_id, sender_id, content, image_url) VALUES (?, ?, ?, ?)',
        [matchId, userId, content, image_url || null],
        function (err2) {
          if (err2) return res.status(500).json({ error: 'Error guardando mensaje' });
          res.json({ id: this.lastID });
        }
      );
    }
  );
});

module.exports = router;
