const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const db = new sqlite3.Database("./bookings.db");

const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

// Создаем таблицу бронирований, если не существует
db.run(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seat TEXT,
    employee TEXT,
    date TEXT
  )
`);

// Получить все бронирования
app.get("/api/bookings", (req, res) => {
  db.all("SELECT * FROM bookings", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Создать бронирование
app.post("/api/bookings", (req, res) => {
  const { seat, employee, date } = req.body;

  db.get(
    "SELECT * FROM bookings WHERE seat = ? AND date = ?",
    [seat, date],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) return res.status(400).json({ error: "Место уже занято" });

      db.run(
        "INSERT INTO bookings (seat, employee, date) VALUES (?, ?, ?)",
        [seat, employee, date],
        function () {
          res.json({ success: true, id: this.lastID });
        }
      );
    }
  );
});

// Отмена бронирования
app.delete("/api/bookings/:id", (req, res) => {
  db.run("DELETE FROM bookings WHERE id = ?", req.params.id, () =>
    res.json({ success: true })
  );
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
});
