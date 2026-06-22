// ========================================
// МСК — УПРАВЛЕНИЕ ЗАКАЗАМИ (с фильтром по статусу и поиском)
// ========================================

let orders = [];
let filteredOrders = [];

function loadOrders() {
    const saved = localStorage.getItem('msk_orders');
    orders = saved ? JSON.parse(saved) : [];
    applyFilters(); // применяем фильтры при загрузке
}

function renderOrders(ordersToRender) {
    const tbody = document.getElementById('ordersTableBody');
    if (!ordersToRender || !ordersToRender.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#999;">Нет заказов</td></tr>';
        updateOrderCount(0);
        return;
    }
    ordersToRender.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    tbody.innerHTML = ordersToRender.map(o => {
        const statusClass = {
            'новый': 'new',
            'в обработке': 'processing',
            'отправлен': 'shipped',
            'доставлен': 'delivered',
            'отменён': 'cancelled'
        }[o.status] || '';
        return `
        <tr>
            <td><strong>#${o.id}</strong></td>
            <td>${o.name || 'Не указан'}</td>
            <td>${o.phone || 'Не указан'}</td>
            <td>${o.items?.length || 0}</td>
            <td><strong>${(o.total || 0).toLocaleString()} ₽</strong></td>
            <td>
                <span class="order-status ${statusClass}">${o.status}</span>
                <select class="status-select" onchange="updateStatus(${o.id}, this.value)">
                    <option value="новый" ${o.status === 'новый' ? 'selected':''}>Новый</option>
                    <option value="в обработке" ${o.status === 'в обработке' ? 'selected':''}>В обработке</option>
                    <option value="отправлен" ${o.status === 'отправлен' ? 'selected':''}>Отправлен</option>
                    <option value="доставлен" ${o.status === 'доставлен' ? 'selected':''}>Доставлен</option>
                    <option value="отменён" ${o.status === 'отменён' ? 'selected':''}>Отменён</option>
                </select>
            </td>
            <td style="font-size:13px;color:#888;">${new Date(o.createdAt).toLocaleString('ru-RU')}</td>
            <td>
                <button class="btn-view" onclick="viewOrder(${o.id})"><i class="fas fa-eye"></i></button>
                <button class="btn-delete" onclick="deleteOrder(${o.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `}).join('');
    updateOrderCount(ordersToRender.length);
}

function updateOrderCount(count) {
    document.getElementById('orderCountNumber').textContent = count;
}

function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const searchQuery = document.getElementById('searchOrders').value.trim().toLowerCase();

    // Сначала фильтруем по статусу
    let statusFiltered = (statusFilter === 'all') ? [...orders] : orders.filter(o => o.status === statusFilter);

    // Затем применяем поиск
    if (searchQuery) {
        filteredOrders = statusFiltered.filter(o => {
            // 1. Поиск по ID
            if (String(o.id).includes(searchQuery)) return true;
            // 2. Поиск по имени
            if (o.name && o.name.toLowerCase().includes(searchQuery)) return true;
            // 3. Поиск по телефону
            if (o.phone && o.phone.includes(searchQuery)) return true;
            // 4. Поиск по email
            if (o.email && o.email.toLowerCase().includes(searchQuery)) return true;
            // 5. Поиск по адресу
            if (o.address && o.address.toLowerCase().includes(searchQuery)) return true;
            // 6. Поиск по товарам (название)
            if (o.items && o.items.some(item => item.name && item.name.toLowerCase().includes(searchQuery))) return true;
            
            // 7. ПОИСК ПО ДАТЕ (несколько форматов)
            const date = new Date(o.createdAt);
            // Формат 1: локальная дата с полным названием месяца (например, "20 июня 2026 14:30")
            const localDateStr = date.toLocaleDateString('ru-RU', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
            }) + ' ' + date.toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            if (localDateStr.toLowerCase().includes(searchQuery)) return true;
            
            // Формат 2: ISO-строка (например, "2026-06-20T14:30:00.000Z")
            if (o.createdAt && o.createdAt.toLowerCase().includes(searchQuery)) return true;
            
            // Формат 3: для удобства отдельно проверяем номер месяца (если ввели цифру месяца)
            const monthNum = String(date.getMonth() + 1).padStart(2, '0');
            if (searchQuery.includes(monthNum)) return true;
            
            return false;
        });
    } else {
        filteredOrders = statusFiltered;
    }

    renderOrders(filteredOrders);
}

function updateStatus(id, status) {
    const order = orders.find(o => o.id === id);
    if (order) {
        order.status = status;
        localStorage.setItem('msk_orders', JSON.stringify(orders));
        applyFilters(); // переприменяем фильтры после изменения
    }
}

function deleteOrder(id) {
    if (!confirm('Удалить заказ?')) return;
    orders = orders.filter(o => o.id !== id);
    localStorage.setItem('msk_orders', JSON.stringify(orders));
    applyFilters(); // переприменяем фильтры после удаления
}

function viewOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const modal = document.getElementById('orderModal');
    const content = document.getElementById('orderModalContent');

    let itemsHtml = '';
    if (order.items && order.items.length) {
        itemsHtml = order.items.map(i => `
            <div class="item-row">
                <span>${i.name} (${i.size || '—'}, плёнка ${i.film || '—'}) × ${i.quantity}</span>
                <span>${(i.price * i.quantity).toLocaleString()} ₽</span>
            </div>
        `).join('');
    } else {
        itemsHtml = '<p style="color:#888;">Нет товаров</p>';
    }

    content.innerHTML = `
        <h2>Заказ #${order.id}</h2>
        <div class="info-block">
            <p><strong>Имя:</strong> ${order.name || 'Не указано'}</p>
            <p><strong>Телефон:</strong> ${order.phone || 'Не указан'}</p>
            <p><strong>Email:</strong> ${order.email || 'Не указан'}</p>
            <p><strong>Адрес:</strong> ${order.address || 'Не указан'}</p>
            ${order.comment ? `<p><strong>Комментарий:</strong> ${order.comment}</p>` : ''}
        </div>
        <div class="items-list">
            <strong>Состав заказа:</strong>
            ${itemsHtml}
            <div class="total">Итого: ${(order.total || 0).toLocaleString()} ₽</div>
        </div>
        <div style="margin:15px 0;">
            <strong>Статус:</strong> ${order.status}
            &nbsp;|&nbsp; <strong>Дата:</strong> ${new Date(order.createdAt).toLocaleString('ru-RU')}
        </div>
        <button class="close-btn" onclick="closeModal()">Закрыть</button>
    `;
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('orderModal').style.display = 'none';
}

function logout() {
    sessionStorage.removeItem('adminAuth');
    window.location.href = 'login.html';
}

function getNextOrderId() {
    let lastId = parseInt(localStorage.getItem('msk_last_order_id') || '0');
    lastId++;
    localStorage.setItem('msk_last_order_id', String(lastId));
    return lastId;
}

// Автоматическое обновление при возврате на вкладку
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        loadOrders();
    }
});

document.addEventListener('DOMContentLoaded', loadOrders);