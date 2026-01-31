const express = require('express');
const path = require('path');
const { Client } = require('pg');  // Подключаем библиотеку для работы с PostgreSQL
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

// Подключение к базе данных PostgreSQL
const client = new Client({
  connectionString: 'postgresql://office_booking_user:H0rmNIuUiyjpBiZdOnbXXZn92wcBmFpP@dpg-d5uutlsr85hc73drkqj0-a.frankfurt-postgres.render.com/office_booking',
  ssl: {
    rejectUnauthorized: false
  }
});

// Подключаемся к базе данных
client.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Connection error', err.stack));

// Подключение CORS для поддержки запросов с других доменов
app.use(cors());
app.use(bodyParser.json());

// Обработка статических файлов (например, index.html, css, js)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Моковые данные для сотрудников и мест
const seats = ["4D26", "4D27", "4D28", "4D31", "4D32", "4D33", "4D34", "4E29", "4E30", "4E32", "4E33", "4E34", "4EX1", "4EX2", "4EX3"];
const employees = Array.from({length: 22}, (_, i) => `Сотрудник ${i + 1}`);

// API для получения списка сотрудников и мест
app.get('/api/employee-seats', (req, res) => {
  res.json({ employees, seats });
});

// API для получения всех бронирований с фильтрацией
app.get('/api/bookings', async (req, res) => {
  const { employee, seat, day } = req.query;

  let query = 'SELECT * FROM bookings WHERE 1=1';
  const params = [];

  if (employee) {
    query += ' AND employee LIKE $1';
    params.push(`%${employee}%`);
  }

  if (seat) {
    query += ' AND seat LIKE $2';
    params.push(`%${seat}%`);
  }

  if (day) {
    query += ' AND day = $3';
    params.push(day);
  }

  try {
    const result = await client.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ message: 'Ошибка при получении данных' });
  }
});

// API для создания нового бронирования
app.post('/api/bookings', async (req, res) => {
  const { seat, employee, day } = req.body;

  // Проверка на уже существующее бронирование
  const checkQuery = 'SELECT * FROM bookings WHERE seat = $1 AND day = $2';
  const checkValues = [seat, day];
  const checkResult = await client.query(checkQuery, checkValues);

  if (checkResult.rows.length > 0) {
    return res.status(400).json({ message: `Место ${seat} уже занято в этот день!` });
  }

  // Добавление нового бронирования
  const insertQuery = 'INSERT INTO bookings (seat, employee, day) VALUES ($1, $2, $3) RETURNING *';
  const insertValues = [seat, employee, day];

  try {
    const result = await client.query(insertQuery, insertValues);
    res.status(201).json(result.rows[0]); // Возвращаем данные нового бронирования
  } catch (err) {
    console.error('Error inserting booking:', err);
    res.status(500).json({ message: 'Ошибка при создании бронирования' });
  }
});

// API для отмены бронирования
app.delete('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;

  const deleteQuery = 'DELETE FROM bookings WHERE id = $1 RETURNING *';
  try {
    const result = await client.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Бронирование не найдено' });
    }

    res.status(200).json({ message: 'Бронирование отменено' });
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ message: 'Ошибка при удалении бронирования' });
  }
});

// Настройка порта сервера
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
