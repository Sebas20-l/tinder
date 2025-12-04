// middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'super-secreto-cambialo';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Falta token de autorización' });
  }

  const token = authHeader.split(' ')[1]; // Bearer token

  if (!token) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token no válido o expirado' });
  }
}

module.exports = {
  authMiddleware,
  JWT_SECRET
};
