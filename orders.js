// ========================================
// МСК — УПРАВЛЕНИЕ ЗАКАЗАМИ (расширенное с уведомлениями)
// ========================================

let orders = [];
let filteredOrders = [];
let selectedOrders = new Set();
let previousOrdersCount = 0;

// ===== ЗАГРУЗКА =====
function loadOrders() {
    if (!window.database) {
        window.showToast?.('Ошибка подключения к Firebase', 'error');
        return;
    }

    window.database.ref('orders').on('value', snapshot => {
        const data = snapshot.val() || {};
        const newOrders = Object.values(data);

        // Проверка на новые заказы (уведомление)
        if (previousOrdersCount > 0 && newOrders.length > previousOrdersCount) {
            // Есть новые заказы
            const newCount = newOrders.length - previousOrdersCount;
            window.showToast?.(`🔔 Новый заказ! (${newCount})`, 'success', 4000);
            // Звуковой сигнал
            try {
                const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
                audio.play().catch(() => {});
            } catch (e) {
                console.log('Звук не воспроизведён');
            }
        }

        // Обновляем счётчик для следующего сравнения
        previousOrdersCount = newOrders.length;

        // Сохраняем заказы и обновляем таблицу
        orders = newOrders;
        applyFilters();
    });
}

// ===== ФИЛЬТРАЦИЯ =====
function applyFilters() {
    const status = document.getElementById('statusFilter')?.value || 'all';
    const search = document.getElementById('searchOrders')?.value.trim().toLowerCase() || '';
    const dateFrom = document.getElementById('dateFrom')?.value;
    const dateTo = document.getElementById('dateTo')?.value;
    const minAmount = parseFloat(document.getElementById('minAmount')?.value) || 0;
    const maxAmount = parseFloat(document.getElementById('maxAmount')?.value) || Infinity;

    let result = orders.filter(o => {
        if (status !== 'all' && o.status !== status) return false;
        if (search) {
            const match = o.id?.toString().includes(search) ||
                         (o.name && o.name.toLowerCase().includes(search)) ||
                         (o.phone && o.phone.includes(search)) ||
                         (o.email && o.email.toLowerCase().includes(search)) ||
                         (o.address && o.address.toLowerCase().includes(search));
            if (!match) return false;
        }
        if (dateFrom && o.createdAt < new Date(dateFrom).toISOString()) return false;
        if (dateTo && o.createdAt > new Date(dateTo + 'T23:59:59').toISOString()) return false;
        const total = o.total || 0;
        if (total < minAmount || total > maxAmount) return false;
        return true;
    });

    filteredOrders = result;
    renderOrders(filteredOrders);
    updateSelectedCount();
}

// ===== ОТРИСОВКА С ЧЕКБОКСАМИ =====
function renderOrders(ordersToRender) {
    const tbody = document.getElementById('ordersTableBody');
    if (!ordersToRender || !ordersToRender.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#999;">Нет заказов</td></tr>';
        return;
    }
    ordersToRender.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    tbody.innerHTML = ordersToRender.map(o => {
        const checked = selectedOrders.has(o.id) ? 'checked' : '';
        const statusClass = o.status || 'новый';
        return `
        <tr>
            <td><input type="checkbox" class="order-checkbox" data-id="${o.id}" ${checked} onchange="toggleOrder(${o.id})" /></td>
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

// ===== МАССОВЫЕ ОПЕРАЦИИ =====
function toggleOrder(id) {
    if (selectedOrders.has(id)) selectedOrders.delete(id);
    else selectedOrders.add(id);
    updateSelectedCount();
}

function toggleAllOrders() {
    const checked = document.getElementById('selectAll').checked;
    if (checked) {
        filteredOrders.forEach(o => selectedOrders.add(o.id));
    } else {
        selectedOrders.clear();
    }
    document.querySelectorAll('.order-checkbox').forEach(cb => {
        cb.checked = checked;
    });
    updateSelectedCount();
}

function updateSelectedCount() {
    document.getElementById('selectedCount').textContent = `Выбрано: ${selectedOrders.size}`;
}

function massUpdateStatus() {
    if (selectedOrders.size === 0) {
        window.showToast?.('Выберите заказы', 'error');
        return;
    }
    const newStatus = prompt('Введите новый статус (новый, в обработке, отправлен, доставлен, отменён):');
    if (!newStatus) return;
    const valid = ['новый', 'в обработке', 'отправлен', 'доставлен', 'отменён'];
    if (!valid.includes(newStatus)) {
        window.showToast?.('Неверный статус', 'error');
        return;
    }
    const ref = window.database.ref('orders');
    selectedOrders.forEach(id => {
        ref.orderByChild('id').equalTo(id).once('value', snapshot => {
            const data = snapshot.val();
            if (data) {
                const key = Object.keys(data)[0];
                ref.child(key).update({ status: newStatus });
            }
        });
    });
    selectedOrders.clear();
    window.showToast?.(`✅ Статус обновлён для ${selectedOrders.size} заказов`, 'success');
    updateSelectedCount();
}

function massDeleteOrders() {
    if (selectedOrders.size === 0) {
        window.showToast?.('Выберите заказы', 'error');
        return;
    }
    if (!confirm(`Удалить ${selectedOrders.size} заказов?`)) return;
    const ref = window.database.ref('orders');
    const deletePromises = [];

    selectedOrders.forEach(id => {
        const promise = new Promise((resolve, reject) => {
            ref.orderByChild('id').equalTo(id).once('value', snapshot => {
                const data = snapshot.val();
                if (data) {
                    const key = Object.keys(data)[0];
                    ref.child(key).remove()
                        .then(() => resolve())
                        .catch(err => reject(err));
                } else {
                    resolve(); // если не найден – просто идём дальше
                }
            });
        });
        deletePromises.push(promise);
    });

    Promise.all(deletePromises)
        .then(() => {
            selectedOrders.clear();
            window.showToast?.('🗑️ Заказы удалены', 'info');
            updateOrderCounter(); // 👈 обновляем счётчик после всех удалений
            updateSelectedCount();
        })
        .catch(err => {
            console.error('Ошибка при массовом удалении:', err);
            window.showToast?.('Ошибка при удалении', 'error');
        });
}

// ===== ЭКСПОРТ CSV =====
function exportOrdersCSV() {
    if (!filteredOrders.length) {
        window.showToast?.('Нет заказов для экспорта', 'error');
        return;
    }
    const headers = ['ID', 'Клиент', 'Телефон', 'Email', 'Адрес', 'Сумма', 'Статус', 'Дата', 'Товары'];
    const rows = filteredOrders.map(o => [
        o.id,
        o.name || '',
        o.phone || '',
        o.email || '',
        o.address || '',
        o.total || 0,
        o.status,
        new Date(o.createdAt).toLocaleString('ru-RU'),
        (o.items || []).map(i => `${i.name} (${i.quantity})`).join('; ')
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orders_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    window.showToast?.('✅ CSV экспортирован', 'success');
}

// ===== ОБНОВЛЕНИЕ СТАТУСА =====
function updateStatus(id, status) {
    if (!window.database) return;
    const ref = window.database.ref('orders');
    ref.orderByChild('id').equalTo(id).once('value', snapshot => {
        const data = snapshot.val();
        if (data) {
            const key = Object.keys(data)[0];
            ref.child(key).update({ status: status })
                .then(() => window.showToast?.('✅ Статус обновлён', 'success'))
                .catch(() => window.showToast?.('Ошибка обновления статуса', 'error'));
        }
    });
}

// ===== УДАЛЕНИЕ ЗАКАЗА =====
function deleteOrder(id) {
    if (!confirm('Удалить заказ?')) return;
    if (!window.database) return;
    const ref = window.database.ref('orders');
    ref.orderByChild('id').equalTo(id).once('value', snapshot => {
        const data = snapshot.val();
        if (data) {
            const key = Object.keys(data)[0];
            ref.child(key).remove()
                .then(() => {
                    window.showToast?.('🗑️ Заказ удалён', 'info');
                    updateOrderCounter(); // 👈 добавляем
                })
                .catch(() => {
                    window.showToast?.('Ошибка удаления', 'error');
                });
        }
    });
}
// ===== ОБНОВЛЕНИЕ СЧЁТЧИКА ЗАКАЗОВ =====
function updateOrderCounter() {
    if (!window.database) {
        console.warn('Firebase не инициализирована');
        return;
    }
    window.database.ref('orders').once('value', snapshot => {
        const data = snapshot.val() || {};
        const orders = Object.values(data);
        let maxId = 0;
        orders.forEach(o => {
            if (o.id && o.id > maxId) maxId = o.id;
        });
        const newCounter = maxId + 1;
        window.database.ref('meta/orderCounter').set(newCounter)
            .then(() => {
                console.log(`✅ Счётчик обновлён: ${newCounter}`);
            })
            .catch(err => {
                console.warn('Ошибка обновления счётчика:', err);
            });
    }).catch(err => {
        console.warn('Ошибка загрузки заказов для обновления счётчика:', err);
    });
}

// ===== ПРОСМОТР ЗАКАЗА =====
function viewOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order) {
        window.showToast?.('Заказ не найден', 'error');
        return;
    }
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

document.addEventListener('DOMContentLoaded', loadOrders);