// ========================================
// МСК — СЕРВЕР (Express)
// Используется только для локальной разработки,
// если вы не хотите использовать Firebase напрямую.
// ========================================

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.'))); // раздаём все статические файлы

// Обработка ошибки 404
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// Запуск
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
    console.log(`📁 Статика из папки: ${__dirname}`);
});