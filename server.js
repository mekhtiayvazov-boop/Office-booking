const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Создаем базу данных SQLite для хранения бронирований
const db = new sqlite3.Database('./bookings.db');

// Создаем таблицу бронирований, если ее нет
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seat TEXT,
      employee TEXT,
      day TEXT
    )
  `);
});

// Настройка статических файлов для фронтенда
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Получение всех бронирований
app.get('/api/bookings', (req, res) => {
  db.all('SELECT * FROM bookings', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Создание нового бронирования
app.post('/api/bookings', (req, res) => {
  const { seat, employee, day } = req.body;
  const stmt = db.prepare('INSERT INTO bookings (seat, employee, day) VALUES (?, ?, ?)');
  
  stmt.run(seat, employee, day, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ id: this.lastID, seat, employee, day });
    }
  });

  stmt.finalize();
});

// Удаление бронирования
app.delete('/api/bookings/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM bookings WHERE id = ?', id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(200).json({ message: 'Booking canceled successfully' });
    }
  });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
