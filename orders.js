// ========================================
// МСК — УПРАВЛЕНИЕ ЗАКАЗАМИ (общие для всех пользователей)
// ========================================

let ordersData = [];
let filteredOrdersData = [];

function loadOrders() {
    if (typeof window.waitForFirebase === 'function') {
        window.waitForFirebase(() => {
            startListening();
        });
    } else if (window.database) {
        startListening();
    } else {
        console.error('Firebase не инициализирована');
        alert('Ошибка подключения к Firebase. Проверьте интернет.');
    }
}

function startListening() {
    if (!window.database) {
        console.error('Firebase database не доступна');
        return;
    }

    console.log('📡 Подключаемся к Firebase для заказов (общий узел)...');
    // Подписываемся на общий узел orders – все заказы всех пользователей
    window.database.ref('orders').on('value', snapshot => {
        const data = snapshot.val() || {};
        ordersData = Object.values(data);
        console.log(`📦 Загружено заказов: ${ordersData.length}`);
        applyOrdersFilters();
    }, error => {
        console.error('Ошибка при загрузке заказов:', error);
        alert('Не удалось загрузить заказы. Проверьте подключение.');
    });
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

function applyOrdersFilters() {
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const searchQuery = document.getElementById('searchOrders')?.value.trim().toLowerCase() || '';

    let statusFiltered = (statusFilter === 'all') ? [...ordersData] : ordersData.filter(o => o.status === statusFilter);

    if (searchQuery) {
        filteredOrdersData = statusFiltered.filter(o => {
            if (String(o.id).includes(searchQuery)) return true;
            if (o.name && o.name.toLowerCase().includes(searchQuery)) return true;
            if (o.phone && o.phone.includes(searchQuery)) return true;
            if (o.email && o.email.toLowerCase().includes(searchQuery)) return true;
            if (o.address && o.address.toLowerCase().includes(searchQuery)) return true;
            if (o.items && o.items.some(item => item.name && item.name.toLowerCase().includes(searchQuery))) return true;
            const dateStr = new Date(o.createdAt).toLocaleString('ru-RU');
            if (dateStr.toLowerCase().includes(searchQuery)) return true;
            return false;
        });
    } else {
        filteredOrdersData = statusFiltered;
    }

    renderOrders(filteredOrdersData);
}

function updateStatus(id, status) {
    if (!window.database) return;
    const ref = window.database.ref('orders');
    ref.orderByChild('id').equalTo(id).once('value', snapshot => {
        const data = snapshot.val();
        if (data) {
            const key = Object.keys(data)[0];
            ref.child(key).update({ status: status });
        }
    });
}

function deleteOrder(id) {
    if (!confirm('Удалить заказ?')) return;
    if (!window.database) return;
    const ref = window.database.ref('orders');
    ref.orderByChild('id').equalTo(id).once('value', snapshot => {
        const data = snapshot.val();
        if (data) {
            const key = Object.keys(data)[0];
            ref.child(key).remove();
        }
    });
}

function viewOrder(id) {
    const order = ordersData.find(o => o.id === id);
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

// События для фильтров
document.getElementById('statusFilter')?.addEventListener('change', applyOrdersFilters);
document.getElementById('searchOrders')?.addEventListener('input', applyOrdersFilters);

document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        applyOrdersFilters();
    }
});

document.addEventListener('DOMContentLoaded', loadOrders);