// server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const db = require('./db');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const swipeRoutes = require('./routes/swipe');
const matchRoutes = require('./routes/matches');
const { JWT_SECRET } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

// Middlewares HTTP
app.use(cors());
app.use(express.json());

// Rutas
app.use('/auth', authRoutes);
app.use('/profiles', profileRoutes);
app.use('/swipe', swipeRoutes);
app.use('/matches', matchRoutes);

// Socket.io: chat en tiempo real
io.use((socket, next) => {
  // Esperamos token en query: ?token=...
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Falta token'));
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.userId = payload.id;
    next();
  } catch (err) {
    next(new Error('Token inválido'));
  }
});

io.on('connection', (socket) => {
  console.log('Socket conectado usuario:', socket.userId);

  // Unirse a un "room" del match
  socket.on('join_match', (matchId) => {
    const room = `match_${matchId}`;
    socket.join(room);
  });

  // Enviar mensaje
  socket.on('send_message', ({ matchId, content, image_url }) => {
    const senderId = socket.userId;

    // Guardar en BD
    db.run(
      'INSERT INTO messages (match_id, sender_id, content, image_url) VALUES (?, ?, ?, ?)',
      [matchId, senderId, content, image_url || null],
      function (err) {
        if (err) {
          console.error('Error guardando mensaje:', err);
          return;
        }

        const msg = {
          id: this.lastID,
          match_id: matchId,
          sender_id: senderId,
          content,
          image_url: image_url || null,
          created_at: new Date().toISOString()
        };

        // Enviar a todos en el room del match
        io.to(`match_${matchId}`).emit('receive_message', msg);
      }
    );
  });

  socket.on('disconnect', () => {
    console.log('Socket desconectado usuario:', socket.userId);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
