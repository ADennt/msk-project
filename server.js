// ========================================
// МСК — СЕРВЕР (ТОЛЬКО БЭКЕНД)
// ========================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Получение локального IP
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const DATA_FILE = path.join(__dirname, 'data.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// ---- Работа с data.json ----
function readDataFile() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        } else {
            const emptyData = { products: [] };
            fs.writeFileSync(DATA_FILE, JSON.stringify(emptyData, null, 2), 'utf8');
            return emptyData;
        }
    } catch (error) {
        console.error('❌ Ошибка чтения data.json:', error);
        return { products: [] };
    }
}

function writeDataFile(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('✅ data.json успешно обновлён!');
        return true;
    } catch (error) {
        console.error('❌ Ошибка записи data.json:', error);
        return false;
    }
}

// ---- Работа с orders.json ----
function readOrdersFile() {
    try {
        if (fs.existsSync(ORDERS_FILE)) {
            const data = fs.readFileSync(ORDERS_FILE, 'utf8');
            return JSON.parse(data);
        } else {
            const emptyData = { orders: [] };
            fs.writeFileSync(ORDERS_FILE, JSON.stringify(emptyData, null, 2), 'utf8');
            return emptyData;
        }
    } catch (error) {
        console.error('❌ Ошибка чтения orders.json:', error);
        return { orders: [] };
    }
}

function writeOrdersFile(data) {
    try {
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('✅ orders.json успешно обновлён!');
        return true;
    } catch (error) {
        console.error('❌ Ошибка записи orders.json:', error);
        return false;
    }
}

// ========== API для товаров ==========
app.get('/api/products', (req, res) => {
    try {
        const data = readDataFile();
        res.json({
            success: true,
            products: data.products || [],
            count: (data.products || []).length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/products/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = readDataFile();
        const product = (data.products || []).find(p => p.id === id);
        if (product) {
            res.json({ success: true, product });
        } else {
            res.status(404).json({ success: false, error: 'Товар не найден' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/products', (req, res) => {
    try {
        const newProduct = req.body;
        const data = readDataFile();
        const products = data.products || [];
        const maxId = products.length > 0 ? Math.max(...products.map(p => p.id)) : 0;
        newProduct.id = maxId + 1;
        products.push(newProduct);
        data.products = products;
        if (writeDataFile(data)) {
            res.json({ success: true, message: '✅ Товар добавлен', product: newProduct, id: newProduct.id });
        } else {
            res.status(500).json({ success: false, error: 'Ошибка сохранения' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/products/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updatedProduct = req.body;
        const data = readDataFile();
        const products = data.products || [];
        const index = products.findIndex(p => p.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Товар не найден' });
        }
        updatedProduct.id = id;
        products[index] = updatedProduct;
        data.products = products;
        if (writeDataFile(data)) {
            res.json({ success: true, message: '✅ Товар обновлён', product: updatedProduct });
        } else {
            res.status(500).json({ success: false, error: 'Ошибка сохранения' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/products/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = readDataFile();
        const products = data.products || [];
        const filtered = products.filter(p => p.id !== id);
        if (products.length === filtered.length) {
            return res.status(404).json({ success: false, error: 'Товар не найден' });
        }
        data.products = filtered;
        if (writeDataFile(data)) {
            res.json({ success: true, message: '🗑️ Товар удалён' });
        } else {
            res.status(500).json({ success: false, error: 'Ошибка сохранения' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/sync', (req, res) => {
    try {
        const data = req.body;
        if (writeDataFile(data)) {
            res.json({ success: true, message: '✅ Данные синхронизированы' });
        } else {
            res.status(500).json({ success: false, error: 'Ошибка сохранения' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== API для заказов ==========
app.get('/api/orders', (req, res) => {
    try {
        const data = readOrdersFile();
        res.json({ success: true, orders: data.orders || [], count: (data.orders || []).length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/orders/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = readOrdersFile();
        const order = (data.orders || []).find(o => o.id === id);
        if (order) {
            res.json({ success: true, order });
        } else {
            res.status(404).json({ success: false, error: 'Заказ не найден' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/orders', (req, res) => {
    try {
        const orderData = req.body;
        const data = readOrdersFile();
        const orders = data.orders || [];
        const maxId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) : 0;
        const newOrder = {
            id: maxId + 1,
            ...orderData,
            createdAt: new Date().toISOString(),
            status: 'новый'
        };
        orders.push(newOrder);
        data.orders = orders;
        if (writeOrdersFile(data)) {
            res.json({ success: true, message: '✅ Заказ создан', order: newOrder, id: newOrder.id });
        } else {
            res.status(500).json({ success: false, error: 'Ошибка сохранения' });
        }
    } catch (error) {
        console.error('❌ Ошибка создания заказа:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/orders/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        const data = readOrdersFile();
        const orders = data.orders || [];
        const index = orders.findIndex(o => o.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Заказ не найден' });
        }
        orders[index].status = status;
        orders[index].updatedAt = new Date().toISOString();
        data.orders = orders;
        if (writeOrdersFile(data)) {
            res.json({ success: true, message: `✅ Статус обновлён`, order: orders[index] });
        } else {
            res.status(500).json({ success: false, error: 'Ошибка сохранения' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/orders/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = readOrdersFile();
        const orders = data.orders || [];
        const filtered = orders.filter(o => o.id !== id);
        if (orders.length === filtered.length) {
            return res.status(404).json({ success: false, error: 'Заказ не найден' });
        }
        data.orders = filtered;
        if (writeOrdersFile(data)) {
            res.json({ success: true, message: `🗑️ Заказ удалён` });
        } else {
            res.status(500).json({ success: false, error: 'Ошибка сохранения' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== Запуск сервера ==========
const localIP = getLocalIP();

app.listen(PORT, '0.0.0.0', () => {
    console.log('\n========================================');
    console.log('🏗️  МСК — Сервер запущен!');
    console.log('========================================');
    console.log(`📍 Локальный адрес: http://localhost:${PORT}`);
    console.log(`📍 В сети (Wi-Fi): http://${localIP}:${PORT}`);
    console.log('========================================');
    console.log('📱 Для доступа с других устройств:');
    console.log(`   Откройте в браузере: http://${localIP}:${PORT}`);
    console.log('========================================\n');
});

process.on('uncaughtException', (error) => {
    console.error('❌ Необработанная ошибка:', error);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Сервер остановлен');
    process.exit(0);
});