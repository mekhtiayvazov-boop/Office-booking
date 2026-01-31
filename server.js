const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const db = new sqlite3.Database("bookings.db");

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Создание таблицы, если её нет
db.run(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seat TEXT,
    employee TEXT,
    day TEXT
  )
`);

// ===== API =====

// Получение всех бронирований
app.get("/api/bookings", (req, res) => {
  db.all("SELECT * FROM bookings", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Создание бронирования
app.post("/api/bookings", (req, res) => {
  const { seat, employee, day } = req.body;
  if (!seat || !employee || !day) return res.status(400).json({ error: "Не все данные переданы" });

  // Проверяем, не занято ли место на выбранный день
  db.get("SELECT * FROM bookings WHERE seat=? AND day=?", [seat, day], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: "Место уже занято" });

    db.run(
      "INSERT INTO bookings (seat, employee, day) VALUES (?, ?, ?)",
      [seat, employee, day],
      function () {
        res.json({ success: true, id: this.lastID });
      }
    );
  });
});

// Удаление бронирования (без ограничений)
app.delete("/api/bookings/:id", (req, res) => {
  db.run("DELETE FROM bookings WHERE id = ?", req.params.id, () =>
    res.json({ success: true })
  );
});

// ===== Запуск сервера =====
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
});
