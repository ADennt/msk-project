// ========================================
// МСК — УПРАВЛЕНИЕ ЗАКАЗАМИ (улучшен вывод)
// ========================================

let orders = [];

function loadOrders() {
    const saved = localStorage.getItem('msk_orders');
    orders = saved ? JSON.parse(saved) : [];
    renderOrders();
    updateOrderCount();
}

function renderOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#999;">Нет заказов</td></tr>';
        return;
    }
    orders.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    tbody.innerHTML = orders.map(o => {
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
}

function updateOrderCount() {
    document.getElementById('orderCountNumber').textContent = orders.length;
}

function updateStatus(id, status) {
    const order = orders.find(o => o.id === id);
    if (order) {
        order.status = status;
        localStorage.setItem('msk_orders', JSON.stringify(orders));
        renderOrders();
        updateOrderCount(); // обновляем счётчик
    }
}

function deleteOrder(id) {
    if (!confirm('Удалить заказ?')) return;
    orders = orders.filter(o => o.id !== id);
    localStorage.setItem('msk_orders', JSON.stringify(orders));
    renderOrders();
    updateOrderCount();
}

function viewOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const modal = document.getElementById('orderModal');
    const content = document.getElementById('orderModalContent');

    // Формируем читаемый список товаров с размерами и плёнками
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

document.addEventListener('DOMContentLoaded', loadOrders);