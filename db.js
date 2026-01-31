const { Pool } = require('pg'); // Импортируем Pool из библиотеки pg

// Создаем подключение к базе данных с параметрами SSL
const pool = new Pool({
  user: 'office_booking_user', // Ваше имя пользователя
  host: 'dpg-d5uutlsr85hc73drkqj0-a.frankfurt-postgres.render.com', // Хост базы данных
  database: 'office_booking', // Имя вашей базы данных
  password: 'H0rmNIuUiyjpBiZdOnbXXZn92wcBmFpP', // Ваш пароль
  port: 5432, // Порт базы данных
  ssl: {
    rejectUnauthorized: false, // Убираем требование для проверки сертификатов, если сервер использует самоподписанный сертификат
  },
});

// Экспортируем pool для использования в других частях приложения
module.exports = pool;
