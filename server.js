const express = require('express');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');

// Подключение CORS для поддержки запросов с других доменов
app.use(cors());
app.use(bodyParser.json());

// Обработка статических файлов (например, index.html, css, js)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Моковые данные для бронирований
const bookings = [
  { id: 1, seat: '4D26', employee: 'Сотрудник 1', day: '2023-01-01' },
  { id: 2, seat: '4D27', employee: 'Сотрудник 2', day: '2023-01-02' },
  { id: 3, seat: '4D28', employee: 'Сотрудник 3', day: '2023-01-03' },
];

const seats = ["4D26","4D27","4D28","4D31","4D32","4D33","4D34","4E29","4E30","4E32","4E33","4E34","4EX1","4EX2","4EX3"];
const employees = Array.from({length: 22}, (_, i) => `Сотрудник ${i + 1}`);

// API для получения списка сотрудников и мест
app.get('/api/employee-seats', (req, res) => {
  res.json({ employees, seats });
});

// API для получения всех бронирований с фильтрацией
app.get('/api/bookings', (req, res) => {
  const { employee, seat, day } = req.query;

  let filteredBookings = bookings;

  if (employee) filteredBookings = filteredBookings.filter(b => b.employee.includes(employee));
  if (seat) filteredBookings = filteredBookings.filter(b => b.seat.includes(seat));
  if (day) filteredBookings = filteredBookings.filter(b => b.day === day);

  res.json(filteredBookings); // Возвращаем фильтрованные данные
});

// API для создания нового бронирования
app.post('/api/bookings', (req, res) => {
  const { seat, employee, day } = req.body;

  // Проверка на уже существующее бронирование
  const existingBooking = bookings.find(b => b.seat === seat && b.day === day);
  if (existingBooking) {
    return res.status(400).json({ message: `Место ${seat} уже занято в этот день!` });
  }

  const newBooking = {
    id: bookings.length + 1,
    seat,
    employee,
    day
  };

  bookings.push(newBooking);  // Добавляем новое бронирование в "базу данных"
  res.status(201).json(newBooking);  // Возвращаем данные нового бронирования
});

// API для отмены бронирования
app.delete('/api/bookings/:id', (req, res) => {
  const { id } = req.params;
  const index = bookings.findIndex(b => b.id == id);

  if (index === -1) {
    return res.status(404).json({ message: "Бронирование не найдено!" });
  }

  bookings.splice(index, 1);  // Удаляем бронирование из "базы данных"
  res.status(200).json({ message: "Бронирование отменено" });
});

// Настройка порта сервера
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
