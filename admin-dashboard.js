// ========================================
// МСК — ДАШБОРД (статистика и графики)
// ========================================

function loadDashboard() {
    if (!window.database) {
        window.showToast?.('Ошибка подключения к Firebase', 'error');
        return;
    }

    // Заказы
    window.database.ref('orders').on('value', snapshot => {
        const data = snapshot.val() || {};
        const orders = Object.values(data);
        updateStats(orders);
        updateStatusChart(orders);
        updateTopProducts(orders);
    });

    // Пользователи
    window.database.ref('users').on('value', snapshot => {
        const data = snapshot.val() || {};
        const users = Object.values(data);
        document.getElementById('totalUsers').textContent = users.length;
    });
}

function updateStats(orders) {
    const total = orders.length;
    const newOrders = orders.filter(o => o.status === 'новый').length;
    const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    document.getElementById('totalOrders').textContent = total;
    document.getElementById('newOrders').textContent = newOrders;
    document.getElementById('totalRevenue').textContent = revenue.toLocaleString() + ' ₽';
}

function updateStatusChart(orders) {
    const container = document.getElementById('statusChart');
    const statuses = ['новый', 'в обработке', 'отправлен', 'доставлен', 'отменён'];
    const labels = ['Новый', 'В обработке', 'Отправлен', 'Доставлен', 'Отменён'];
    const colors = ['#e3f2fd', '#fff3e0', '#e8f5e9', '#e0f7fa', '#ffebee'];
    const textColors = ['#0d47a1', '#e65100', '#1b5e20', '#006064', '#b71c1c'];

    const counts = statuses.map(s => orders.filter(o => o.status === s).length);

    container.innerHTML = labels.map((label, i) => `
        <div style="flex:1;min-width:100px;background:${colors[i]};padding:10px;border-radius:8px;text-align:center;">
            <div style="font-weight:700;font-size:22px;color:${textColors[i]}">${counts[i]}</div>
            <div style="font-size:13px;color:${textColors[i]}">${label}</div>
        </div>
    `).join('');
}

function updateTopProducts(orders) {
    const container = document.getElementById('topProducts');
    const productCount = {};

    orders.forEach(order => {
        (order.items || []).forEach(item => {
            const name = item.name;
            if (!productCount[name]) productCount[name] = 0;
            productCount[name] += item.quantity;
        });
    });

    const sorted = Object.entries(productCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sorted.length === 0) {
        container.innerHTML = '<li style="color:#888;">Нет данных</li>';
        return;
    }

    container.innerHTML = sorted.map(([name, count]) => `
        <li>
            <span>${name}</span>
            <span style="font-weight:700;color:#f7c948;">${count} шт.</span>
        </li>
    `).join('');
}

document.addEventListener('DOMContentLoaded', loadDashboard);