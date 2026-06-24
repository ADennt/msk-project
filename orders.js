// ========================================
// МСК — УПРАВЛЕНИЕ ЗАКАЗАМИ (с Firebase)
// ========================================

let orders = [];
let filteredOrders = [];

// ===== ЗАГРУЗКА ЗАКАЗОВ С СИНХРОНИЗАЦИЕЙ =====
function loadOrders() {
    // Ждём готовности Firebase
    if (window.waitForFirebase) {
        window.waitForFirebase(() => {
            const uid = window.getCurrentUserId ? window.getCurrentUserId() : null;
            if (!uid) {
                console.warn('❌ Не удалось получить UID, загружаем из localStorage');
                loadFromLocalStorage();
                return;
            }
            console.log('📦 Загружаем заказы для пользователя:', uid);
            const ordersRef = database.ref(`users/${uid}/orders`);
            ordersRef.once('value').then(snapshot => {
                const data = snapshot.val();
                if (data) {
                    // Преобразуем объект в массив
                    const firebaseOrders = Object.values(data);
                    // Сравниваем с localStorage, чтобы не затереть новые заказы
                    const localOrders = JSON.parse(localStorage.getItem('msk_orders') || '[]');
                    // Если в Firebase есть заказы, используем их (они приоритетнее)
                    // Но если в localStorage есть заказы, которых нет в Firebase, добавляем их
                    // (это может быть, если пользователь оформлял заказы до подключения Firebase)
                    const mergedOrders = mergeOrders(firebaseOrders, localOrders);
                    orders = mergedOrders;
                    localStorage.setItem('msk_orders', JSON.stringify(orders));
                    // Сохраняем в Firebase, если были добавлены новые из localStorage
                    if (mergedOrders.length > firebaseOrders.length) {
                        ordersRef.set(orders).catch(e => console.error('Ошибка сохранения объединённых заказов в Firebase', e));
                    }
                } else {
                    // В Firebase нет заказов – загружаем из localStorage и сохраняем в Firebase
                    const saved = localStorage.getItem('msk_orders');
                    orders = saved ? JSON.parse(saved) : [];
                    if (orders.length) {
                        ordersRef.set(orders).catch(e => console.error('Ошибка сохранения заказов в Firebase', e));
                        console.log('✅ Заказы из localStorage перенесены в Firebase');
                    }
                }
                // Применяем фильтры и рендерим
                applyFilters();
                // Настраиваем слушатель изменений в реальном времени
                ordersRef.on('value', snap => {
                    const val = snap.val();
                    if (val) {
                        orders = Object.values(val);
                        localStorage.setItem('msk_orders', JSON.stringify(orders));
                        applyFilters();
                    }
                });
            }).catch(e => {
                console.error('❌ Ошибка загрузки заказов из Firebase:', e);
                loadFromLocalStorage();
            });
        });
    } else {
        // Если Firebase не доступна, загружаем из localStorage
        loadFromLocalStorage();
    }
}

// ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ОБЪЕДИНЕНИЯ ЗАКАЗОВ =====
function mergeOrders(firebaseOrders, localOrders) {
    // Используем Map для быстрого поиска по ID
    const ordersMap = new Map();
    firebaseOrders.forEach(o => ordersMap.set(o.id, o));
    let added = 0;
    localOrders.forEach(o => {
        if (!ordersMap.has(o.id)) {
            ordersMap.set(o.id, o);
            added++;
        }
    });
    if (added > 0) {
        console.log(`➕ Добавлено ${added} заказов из localStorage в Firebase`);
    }
    return Array.from(ordersMap.values());
}

// ===== ЗАГРУЗКА ИЗ LOCALSTORAGE (FALLBACK) =====
function loadFromLocalStorage() {
    const saved = localStorage.getItem('msk_orders');
    orders = saved ? JSON.parse(saved) : [];
    applyFilters();
}

// ===== СОХРАНЕНИЕ ЗАКАЗОВ В FIREBASE И LOCALSTORAGE =====
function saveOrders() {
    localStorage.setItem('msk_orders', JSON.stringify(orders));
    const uid = window.getCurrentUserId ? window.getCurrentUserId() : null;
    if (uid && window.database) {
        database.ref(`users/${uid}/orders`).set(orders).catch(e => {
            console.error('❌ Ошибка сохранения заказов в Firebase:', e);
            alert('⚠️ Не удалось сохранить заказ в облаке, но данные сохранены локально.');
        });
    }
}

// ===== ОТОБРАЖЕНИЕ ЗАКАЗОВ =====
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

// ===== ФИЛЬТРЫ И ПОИСК =====
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const searchQuery = document.getElementById('searchOrders').value.trim().toLowerCase();

    let statusFiltered = (statusFilter === 'all') ? [...orders] : orders.filter(o => o.status === statusFilter);

    if (searchQuery) {
        filteredOrders = statusFiltered.filter(o => {
            if (String(o.id).includes(searchQuery)) return true;
            if (o.name && o.name.toLowerCase().includes(searchQuery)) return true;
            if (o.phone && o.phone.includes(searchQuery)) return true;
            if (o.email && o.email.toLowerCase().includes(searchQuery)) return true;
            if (o.address && o.address.toLowerCase().includes(searchQuery)) return true;
            if (o.items && o.items.some(item => item.name && item.name.toLowerCase().includes(searchQuery))) return true;
            const dateStr = new Date(o.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }) + ' ' + new Date(o.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            if (dateStr.toLowerCase().includes(searchQuery)) return true;
            return false;
        });
    } else {
        filteredOrders = statusFiltered;
    }

    renderOrders(filteredOrders);
}

// ===== ОБНОВЛЕНИЕ СТАТУСА =====
function updateStatus(id, status) {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    saveOrders(); // Сохраняем в Firebase и localStorage
    applyFilters();
}

// ===== УДАЛЕНИЕ ЗАКАЗА =====
function deleteOrder(id) {
    if (!confirm('Удалить заказ?')) return;
    orders = orders.filter(o => o.id !== id);
    saveOrders();
    applyFilters();
}

// ===== ПРОСМОТР ЗАКАЗА =====
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

// ===== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ =====
document.addEventListener('DOMContentLoaded', function() {
    loadOrders();
});