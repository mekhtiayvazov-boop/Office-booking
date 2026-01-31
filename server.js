const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

// Определяем, используем ли PostgreSQL (Render) или SQLite (локалка)
let db, usePostgres = !!process.env.DATABASE_URL;
if (usePostgres) {
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  db = {
    query: (...args) => pool.query(...args),
    cleanOldBookings: async () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const dateStr = twoWeeksAgo.toISOString().split("T")[0];
      await pool.query("DELETE FROM bookings WHERE day < $1", [dateStr]);
    },
  };
} else {
  const Database = require("better-sqlite3");
  db = new Database("database.db");
  // Создаем таблицу SQLite, если не существует
  db.prepare(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seat TEXT NOT NULL,
      employee TEXT NOT NULL,
      day TEXT NOT NULL
    )
  `).run();
  // SQLite "query" wrapper
  db.query = (sql, params) => {
    if (sql.trim().toLowerCase().startsWith("select")) {
      const stmt = db.prepare(sql);
      return { rows: stmt.all(params) };
    } else {
      const stmt = db.prepare(sql);
      const info = stmt.run(params);
      return { rows: info };
    }
  };
  db.cleanOldBookings = () => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const dateStr = twoWeeksAgo.toISOString().split("T")[0];
    db.prepare("DELETE FROM bookings WHERE day < ?").run(dateStr);
  };
}

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Инициализация таблицы для PostgreSQL
if (usePostgres) {
  db.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      seat TEXT NOT NULL,
      employee TEXT NOT NULL,
      day DATE NOT NULL
    )
  `);
}

// Автоочистка старых бронирований
db.cleanOldBookings();
setInterval(db.cleanOldBookings, 24*60*60*1000); // раз в день

// Получение бронирований с фильтрами
app.get("/api/bookings", async (req, res) => {
  const { employee, seat, day } = req.query;
  let sql, params = [];

  if (usePostgres) {
    const conditions = [];
    if (employee) { params.push(`%${employee}%`); conditions.push(`employee ILIKE $${params.length}`); }
    if (seat) { params.push(seat); conditions.push(`seat=$${params.length}`); }
    if (day) { params.push(day); conditions.push(`day=$${params.length}`); }
    sql = "SELECT * FROM bookings" + (conditions.length ? " WHERE " + conditions.join(" AND ") : "") + " ORDER BY day ASC";
    const result = await db.query(sql, params);
    res.json(result.rows);
  } else {
    const conditions = [];
    if (employee) conditions.push(`employee LIKE '%${employee}%'`);
    if (seat) conditions.push(`seat='${seat}'`);
    if (day) conditions.push(`day='${day}'`);
    sql = "SELECT * FROM bookings" + (conditions.length ? " WHERE " + conditions.join(" AND ") : "") + " ORDER BY day ASC";
    const result = db.query(sql);
    res.json(result.rows);
  }
});

// Создание бронирования
app.post("/api/bookings", async (req, res) => {
  const { seat, employee, day } = req.body;

  if (usePostgres) {
    const exists = await db.query("SELECT * FROM bookings WHERE seat=$1 AND day=$2", [seat, day]);
    if (exists.rows.length) return res.status(400).json({ error: "Место занято" });
    const result = await db.query(
      "INSERT INTO bookings (seat, employee, day) VALUES ($1,$2,$3) RETURNING *",
      [seat, employee, day]
    );
    res.json(result.rows[0]);
  } else {
    const exists = db.query("SELECT * FROM bookings WHERE seat=? AND day=?", [seat, day]);
    if (exists.rows.length) return res.status(400).json({ error: "Место занято" });
    const result = db.query("INSERT INTO bookings (seat, employee, day) VALUES (?,?,?)", [seat, employee, day]);
    res.json({ id: result.rows.lastInsertRowid, seat, employee, day });
  }
});

// Удаление бронирования
app.delete("/api/bookings/:id", async (req, res) => {
  const { id } = req.params;
  let result;
  if (usePostgres) {
    result = await db.query("DELETE FROM bookings WHERE id=$1 RETURNING *", [id]);
    if (!result.rows.length) return res.status(404).json({ error: "Бронирование не найдено" });
  } else {
    result = db.query("DELETE FROM bookings WHERE id=?", [id]);
    if (!result.rows.changes) return res.status(404).json({ error: "Бронирование не найдено" });
  }
  res.json({ message: "Бронирование удалено" });
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
