const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const Database = require("better-sqlite3");

// Создаем сервер
const app = express();
const port = process.env.PORT || 3000;

// Подключаем парсер для тела запроса
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Создаем и открываем базу данных
const db = new Database("database.db", { verbose: console.log });

// Создаем таблицу, если она не существует
db.prepare(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seat TEXT NOT NULL,
    employee TEXT NOT NULL,
    day TEXT NOT NULL
  )
`).run();

// API для получения всех бронирований
app.get("/api/bookings", (req, res) => {
  const rows = db.prepare("SELECT * FROM bookings").all();
  res.json(rows);
});

// API для создания нового бронирования
app.post("/api/bookings", (req, res) => {
  const { seat, employee, day } = req.body;

  // Проверяем, забронировано ли место на эту дату
  const existingBooking = db.prepare("SELECT * FROM bookings WHERE seat = ? AND day = ?").get(seat, day);

  if (existingBooking) {
    return res.status(400).json({ error: "Место уже забронировано на этот день." });
  }

  // Если место свободно, создаем новое бронирование
  const result = db.prepare("INSERT INTO bookings (seat, employee, day) VALUES (?, ?, ?)").run(seat, employee, day);
  res.status(201).json({ id: result.lastInsertRowid, seat, employee, day });
});

// API для отмены бронирования
app.delete("/api/bookings/:id", (req, res) => {
  const { id } = req.params;
  const result = db.prepare("DELETE FROM bookings WHERE id = ?").run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Бронирование не найдено." });
  }

  res.status(200).json({ message: "Бронирование отменено." });
});

// Статическая раздача файлов (для фронтенда)
app.use(express.static(path.join(__dirname, "public")));

// Запускаем сервер
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
