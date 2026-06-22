// ========================================
// МСК — УПРАВЛЕНИЕ ЗАКАЗАМИ
// ========================================

let orders = [];

function loadOrders() {
    const saved = localStorage.getItem('msk_orders');
    orders = saved ? JSON.parse(saved) : [];
    renderOrders();
    document.getElementById('orderCountNumber').textContent = orders.length;
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

function updateStatus(id, status) {
    const order = orders.find(o => o.id === id);
    if (order) {
        order.status = status;
        localStorage.setItem('msk_orders', JSON.stringify(orders));
        renderOrders();
    }
}

function deleteOrder(id) {
    if (!confirm('Удалить заказ?')) return;
    orders = orders.filter(o => o.id !== id);
    localStorage.setItem('msk_orders', JSON.stringify(orders));
    renderOrders();
    document.getElementById('orderCountNumber').textContent = orders.length;
}

function viewOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const modal = document.getElementById('orderModal');
    const content = document.getElementById('orderModalContent');
    const itemsHtml = order.items.map(i => `
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;">
            <span>${i.name} (${i.size}, ${i.film}) × ${i.quantity}</span>
            <span>${(i.price*i.quantity).toLocaleString()} ₽</span>
        </div>
    `).join('');

    content.innerHTML = `
        <h2>Заказ #${order.id}</h2>
        <div style="background:#f8f9fb;padding:15px;border-radius:12px;margin:15px 0;">
            <p><strong>Имя:</strong> ${order.name}</p>
            <p><strong>Телефон:</strong> ${order.phone}</p>
            <p><strong>Email:</strong> ${order.email}</p>
            <p><strong>Адрес:</strong> ${order.address}</p>
            <p><strong>Комментарий:</strong> ${order.comment}</p>
        </div>
        <div style="background:#f8f9fb;padding:15px;border-radius:12px;">
            <strong>Состав:</strong>
            ${itemsHtml}
            <div style="font-size:20px;font-weight:900;margin-top:10px;">Итого: ${order.total.toLocaleString()} ₽</div>
        </div>
        <div style="margin:15px 0;"><strong>Статус:</strong> ${order.status}</div>
        <button onclick="closeModal()" style="padding:12px 30px;background:#f7c948;border:none;border-radius:40px;font-weight:700;cursor:pointer;">Закрыть</button>
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