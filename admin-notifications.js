// ========================================
// МСК — УВЕДОМЛЕНИЯ ДЛЯ АДМИНОВ
// ========================================

let previousOrderCount = 0;
let notificationContainer = null;

// Создаём контейнер для уведомлений
function createNotificationContainer() {
    if (document.getElementById('adminNotificationContainer')) return;
    const container = document.createElement('div');
    container.id = 'adminNotificationContainer';
    container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 380px;
        width: 100%;
        pointer-events: none;
    `;
    document.body.appendChild(container);
    notificationContainer = container;
}

// Показывает уведомление
function showAdminNotification(order) {
    if (!notificationContainer) createNotificationContainer();

    const notification = document.createElement('div');
    notification.style.cssText = `
        background: #fff;
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        border-left: 4px solid #f7c948;
        pointer-events: auto;
        animation: slideInRight 0.4s ease;
        display: flex;
        flex-direction: column;
        gap: 6px;
    `;

    const title = document.createElement('div');
    title.style.cssText = 'font-weight:700;font-size:16px;color:#1e1e1e;';
    title.textContent = `🛒 Новый заказ #${order.id}`;

    const details = document.createElement('div');
    details.style.cssText = 'font-size:14px;color:#555;';
    details.innerHTML = `
        <span><strong>Клиент:</strong> ${order.name || 'Не указан'}</span>
        <span style="margin-left:12px;"><strong>Сумма:</strong> ${(order.total || 0).toLocaleString()} ₽</span>
    `;

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:10px;margin-top:4px;';

    const viewBtn = document.createElement('button');
    viewBtn.textContent = 'Перейти к заказу';
    viewBtn.style.cssText = `
        background: #f7c948;
        color: #000;
        border: none;
        padding: 6px 16px;
        border-radius: 30px;
        font-weight: 700;
        cursor: pointer;
        font-size: 13px;
        transition: 0.2s;
    `;
    viewBtn.onmouseover = () => viewBtn.style.background = '#e0b03a';
    viewBtn.onmouseout = () => viewBtn.style.background = '#f7c948';
    viewBtn.onclick = () => {
        window.location.href = 'orders.html';
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        background: transparent;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #888;
        padding: 0 4px;
    `;
    closeBtn.onclick = () => notification.remove();

    actions.appendChild(viewBtn);
    actions.appendChild(closeBtn);

    notification.appendChild(title);
    notification.appendChild(details);
    notification.appendChild(actions);
    notificationContainer.appendChild(notification);

    // Автоудаление через 8 секунд
    setTimeout(() => {
        if (notification.parentElement) notification.remove();
    }, 8000);
}

// Слушаем новые заказы
function listenNewOrders() {
    if (!window.database) {
        console.warn('Firebase не инициализирована');
        return;
    }

    window.database.ref('orders').on('value', snapshot => {
        const data = snapshot.val() || {};
        const orders = Object.values(data);
        const currentCount = orders.length;

        if (previousOrderCount > 0 && currentCount > previousOrderCount) {
            // Есть новые заказы – показываем последний
            const newOrders = orders.slice(previousOrderCount);
            newOrders.forEach(order => {
                showAdminNotification(order);
            });
        }
        previousOrderCount = currentCount;
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, что пользователь админ (для безопасности)
    if (window.isAdmin && window.isAdmin(window.auth?.currentUser)) {
        createNotificationContainer();
        listenNewOrders();
    }
});