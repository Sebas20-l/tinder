// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// BD local tinder.db
const dbPath = path.join(__dirname, 'tinder.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error abriendo la BD:', err);
  } else {
    console.log('Base de datos SQLite conectada:', dbPath);
  }
});

module.exports = db;
