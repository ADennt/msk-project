// ========================================
// МСК — КОРЗИНЫ (покупки + аренда, раздельно)
// ========================================

window.purchaseCart = window.purchaseCart || [];
window.rentalCart = window.rentalCart || [];

// Для обратной совместимости
Object.defineProperty(window, 'cart', {
    get: function() {
        return [...window.purchaseCart, ...window.rentalCart];
    },
    set: function(value) {
        window.purchaseCart = value.filter(i => i.type !== 'rental');
        window.rentalCart = value.filter(i => i.type === 'rental');
    }
});

// ===== ПОЛУЧИТЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ =====
function getCurrentUid() {
    return window.auth?.currentUser?.uid || '';
}

// ===== ЗАГРУЗКА КОРЗИН =====
function loadCarts() {
    const uid = getCurrentUid();
    if (uid && window.database) {
        window.database.ref(`users/${uid}/purchaseCart`).on('value', snapshot => {
            window.purchaseCart = snapshot.val() || [];
            localStorage.setItem('msk_purchase_cart', JSON.stringify(window.purchaseCart));
            updateCartUI();
        });
        window.database.ref(`users/${uid}/rentalCart`).on('value', snapshot => {
            window.rentalCart = snapshot.val() || [];
            localStorage.setItem('msk_rental_cart', JSON.stringify(window.rentalCart));
            updateCartUI();
        });
    } else {
        const savedPurchase = localStorage.getItem('msk_purchase_cart');
        window.purchaseCart = savedPurchase ? JSON.parse(savedPurchase) : [];
        const savedRental = localStorage.getItem('msk_rental_cart');
        window.rentalCart = savedRental ? JSON.parse(savedRental) : [];
        updateCartUI();
    }
}

// ===== СОХРАНЕНИЕ КОРЗИН =====
function saveCarts() {
    const uid = getCurrentUid();
    if (uid && window.database) {
        window.database.ref(`users/${uid}/purchaseCart`).set(window.purchaseCart)
            .catch(err => console.warn('Ошибка сохранения корзины покупок:', err));
        window.database.ref(`users/${uid}/rentalCart`).set(window.rentalCart)
            .catch(err => console.warn('Ошибка сохранения корзины аренды:', err));
    }
    localStorage.setItem('msk_purchase_cart', JSON.stringify(window.purchaseCart));
    localStorage.setItem('msk_rental_cart', JSON.stringify(window.rentalCart));
}

// ===== ОБНОВЛЕНИЕ UI =====
function updateCartUI() {
    const count = document.getElementById('cartCount');
    const items = document.getElementById('cartItems');
    const total = document.getElementById('cartTotal');
    const clearBtn = document.getElementById('clearCartBtn');

    const totalItems = window.purchaseCart.reduce((s, i) => s + i.quantity, 0) +
                       window.rentalCart.reduce((s, i) => s + i.days, 0);
    if (count) count.textContent = totalItems;
    if (clearBtn) clearBtn.disabled = (window.purchaseCart.length + window.rentalCart.length) === 0;

    if (!items) return;
    if (!window.purchaseCart.length && !window.rentalCart.length) {
        items.innerHTML = '<div class="empty-cart">Корзина пуста</div>';
        if (total) total.textContent = 'Итого: 0 ₽';
        return;
    }

    let html = '';
    if (window.purchaseCart.length) {
        html += `<h4 style="margin:10px 0 5px;">🛍️ Товары</h4>`;
        html += window.purchaseCart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" />
                <div class="item-details">
                    <div class="name">${escapeHtml(item.name)}</div>
                    <div class="options">${escapeHtml(item.size)} | ${escapeHtml(item.film)}</div>
                </div>
                <div class="qty">
                    <button onclick="changePurchaseQty(${item.id}, -1)">−</button>
                    <span>${item.quantity}</span>
                    <button onclick="changePurchaseQty(${item.id}, 1)">+</button>
                </div>
                <span class="item-price">${(item.price * item.quantity).toLocaleString()} ₽</span>
                <button class="remove-btn" onclick="removeFromPurchaseCart(${item.id})"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    }
    if (window.rentalCart.length) {
        html += `<h4 style="margin:10px 0 5px;">🚜 Аренда</h4>`;
        html += window.rentalCart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" />
                <div class="item-details">
                    <div class="name">${escapeHtml(item.name)}</div>
                    <div class="options">${item.days} суток (${item.start} – ${item.end})</div>
                </div>
                <span class="item-price">${item.total.toLocaleString()} ₽</span>
                <button class="remove-btn" onclick="removeFromRentalCart('${item.id}')"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    }

    items.innerHTML = html;

    const totalSum = window.purchaseCart.reduce((sum, i) => sum + i.price * i.quantity, 0) +
                     window.rentalCart.reduce((sum, i) => sum + i.total, 0);
    if (total) total.textContent = `Итого: ${totalSum.toLocaleString()} ₽`;
}

// ===== УПРАВЛЕНИЕ КОРЗИНОЙ ПОКУПОК =====
window.addToCart = function(id, btn) {
    const product = window.products?.find(p => p.id === id);
    if (!product) { window.showToast?.('Товар не найден', 'error'); return; }
    let size, film;
    const card = btn?.closest('.product-card');
    if (card) {
        size = card.querySelector('.size-select')?.value || product.variants[0].size;
        film = card.querySelector('.film-select')?.value || product.variants[0].film;
    } else {
        size = product.variants[0].size;
        film = product.variants[0].film;
    }
    const variant = product.variants.find(v => v.size === size && v.film === film);
    if (!variant) { window.showToast?.('Комбинация недоступна', 'error'); return; }

    const existing = window.purchaseCart.find(i => i.id === product.id && i.size === size && i.film === film);
    if (existing) {
        existing.quantity += 1;
    } else {
        window.purchaseCart.push({ ...product, quantity: 1, size, film, price: variant.price, image: product.image || 'images/placeholder.png', type: 'purchase' });
    }
    updateCartUI();
    saveCarts();
    window.showToast?.(`${product.name} добавлен в корзину`, 'success');
    if (btn) {
        btn.innerHTML = '✅ Добавлено';
        btn.style.background = '#2e7d32';
        setTimeout(() => { btn.innerHTML = 'В корзину'; btn.style.background = ''; }, 1200);
    }
};

window.removeFromPurchaseCart = function(id) {
    window.purchaseCart = window.purchaseCart.filter(item => item.id !== id);
    updateCartUI();
    saveCarts();
    window.showToast?.('Товар удалён из корзины', 'info');
};

window.changePurchaseQty = function(id, delta) {
    const item = window.purchaseCart.find(i => i.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) { removeFromPurchaseCart(id); return; }
    updateCartUI();
    saveCarts();
};

// ===== УПРАВЛЕНИЕ КОРЗИНОЙ АРЕНДЫ =====
window.addRentalToCart = function(item, start, end) {
    const days = Math.ceil((new Date(end) - new Date(start)) / (1000*60*60*24));
    if (days <= 0) { window.showToast?.('Даты некорректны', 'error'); return; }
    const rentalItem = {
        id: item.id,
        name: item.name,
        dailyPrice: item.dailyPrice,
        start: start,
        end: end,
        days: days,
        total: item.dailyPrice * days,
        image: item.image || 'images/placeholder.png',
        type: 'rental'
    };
    const existing = window.rentalCart.find(i => i.id === rentalItem.id);
    if (existing) { window.showToast?.('Эта техника уже в корзине', 'warning'); return; }
    window.rentalCart.push(rentalItem);
    updateCartUI();
    saveCarts();
    window.showToast?.('Техника добавлена в корзину аренды', 'success');
};

window.removeFromRentalCart = function(id) {
    window.rentalCart = window.rentalCart.filter(item => item.id !== id);
    updateCartUI();
    saveCarts();
    window.showToast?.('Техника удалена из корзины аренды', 'info');
};

// ===== ОЧИСТКА КОРЗИН =====
window.clearCart = function() {
    if (!window.purchaseCart.length && !window.rentalCart.length) return;
    if (!confirm('Очистить корзину?')) return;
    window.purchaseCart = [];
    window.rentalCart = [];
    updateCartUI();
    saveCarts();
    window.showToast?.('Корзина очищена', 'info');
};

// ===== ОФОРМЛЕНИЕ ЗАКАЗА =====
window.showCheckoutForm = function() {
    const totalItems = window.purchaseCart.length + window.rentalCart.length;
    if (!totalItems) {
        window.showToast?.('Корзина пуста', 'error');
        return;
    }

    // Проверяем, есть ли аренда
    const hasRental = window.rentalCart.length > 0;

    // Формируем баннер предупреждения, если есть аренда
    const warningBanner = hasRental ? `
        <div style="background:#fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; border-radius: 8px; margin: 10px 0 20px; display: flex; align-items: center; gap: 12px;">
            <i class="fas fa-exclamation-triangle" style="color:#856404; font-size: 24px;"></i>
            <div style="color:#856404; font-size: 15px; font-weight: 500;">
                <strong>Внимание!</strong> При аренде техники требуется <strong>100% предоплата</strong>.
                Оплата производится после оформления заказа.
            </div>
        </div>
    ` : '';

    const overlay = document.getElementById('cartOverlay');
    const panel = overlay.querySelector('.cart-panel');
    panel.innerHTML = `
        <h2>📝 Оформление заказа <button onclick="closeCheckoutForm()">&times;</button></h2>
        ${warningBanner}
        <div class="checkout-form" style="margin-top:20px;">
            <div><label>Имя *</label><input type="text" id="orderName" placeholder="Иван Петров" style="width:100%;padding:12px;border:2px solid #ddd;border-radius:10px;margin-bottom:10px;"></div>
            <div><label>Телефон *</label><input type="tel" id="orderPhone" placeholder="+7 (999) 123-45-67" style="width:100%;padding:12px;border:2px solid #ddd;border-radius:10px;margin-bottom:10px;"></div>
            <div><label>Email</label><input type="email" id="orderEmail" placeholder="example@mail.ru" style="width:100%;padding:12px;border:2px solid #ddd;border-radius:10px;margin-bottom:10px;"></div>
            <div><label>Адрес *</label><input type="text" id="orderAddress" placeholder="Москва, ул. Дорожная, д. 15" style="width:100%;padding:12px;border:2px solid #ddd;border-radius:10px;margin-bottom:10px;"></div>
            <div><label>Комментарий</label><textarea id="orderComment" rows="3" style="width:100%;padding:12px;border:2px solid #ddd;border-radius:10px;"></textarea></div>
            <div style="background:#f8f9fb;padding:15px;border-radius:10px;margin:15px 0;">
                <strong>Состав:</strong>
                ${window.purchaseCart.map(item => `<div>${escapeHtml(item.name)} (${escapeHtml(item.size)}, ${escapeHtml(item.film)}) × ${item.quantity} — ${(item.price*item.quantity).toLocaleString()} ₽</div>`).join('')}
                ${window.rentalCart.map(item => `<div>${escapeHtml(item.name)} (аренда, ${item.days} суток, ${item.start} – ${item.end}) — ${item.total.toLocaleString()} ₽</div>`).join('')}
                <div style="font-size:20px;font-weight:900;margin-top:10px;">Итого: ${(window.purchaseCart.reduce((s,i) => s + i.price*i.quantity, 0) + window.rentalCart.reduce((s,i) => s + i.total, 0)).toLocaleString()} ₽</div>
            </div>
            <button onclick="submitOrder()" style="width:100%;padding:16px;background:#f7c948;border:none;border-radius:40px;font-weight:900;font-size:18px;cursor:pointer;">Оформить заказ</button>
            <button onclick="closeCheckoutForm()" style="width:100%;padding:12px;margin-top:10px;background:#0b0b0b;color:#fff;border:none;border-radius:40px;font-weight:700;font-size:16px;cursor:pointer;">Назад</button>
        </div>
    `;
    overlay.classList.add('open');
};

window.closeCheckoutForm = function() {
    const overlay = document.getElementById('cartOverlay');
    const panel = overlay.querySelector('.cart-panel');
    panel.innerHTML = `
        <h2>🛒 Корзина <button onclick="toggleCart()">&times;</button></h2>
        <div id="cartItems"></div>
        <div class="cart-total" id="cartTotal">Итого: 0 ₽</div>
        <div class="cart-actions">
            <button class="btn-checkout" onclick="showCheckoutForm()">Оформить заказ</button>
            <button class="btn-clear" onclick="clearCart()" id="clearCartBtn">Очистить</button>
        </div>
    `;
    overlay.classList.remove('open');
    overlay.classList.add('open');
    updateCartUI();
};

// ===== ОФОРМЛЕНИЕ ЗАКАЗА (с инкрементальным ID) =====
window.submitOrder = function() {
    console.log('🔄 Начинаем оформление заказа...');

    const name = document.getElementById('orderName').value.trim();
    const phone = document.getElementById('orderPhone').value.trim();
    const email = document.getElementById('orderEmail').value.trim();
    const address = document.getElementById('orderAddress').value.trim();
    const comment = document.getElementById('orderComment').value.trim();

    if (!name || !phone || !address) {
        window.showToast?.('Заполните обязательные поля (имя, телефон, адрес)', 'error');
        return;
    }

    const uid = getCurrentUid();
    const purchaseItems = [...window.purchaseCart];
    const rentalItems = [...window.rentalCart];

    if (!purchaseItems.length && !rentalItems.length) {
        window.showToast?.('Корзина пуста', 'error');
        return;
    }

    const hasRental = rentalItems.length > 0;
    const type = hasRental ? 'rental' : 'purchase';

    const items = [
        ...purchaseItems.map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            size: i.size || null,
            film: i.film || null,
            image: i.image || 'images/placeholder.png',
            type: 'purchase'
        })),
        ...rentalItems.map(i => ({
            id: i.id,
            name: i.name,
            price: i.dailyPrice,
            quantity: i.days,
            size: null,
            film: null,
            image: i.image || 'images/placeholder.png',
            type: 'rental'
        }))
    ];

    const total = purchaseItems.reduce((s, i) => s + i.price * i.quantity, 0) +
                  rentalItems.reduce((s, i) => s + i.total, 0);

    // Функция создания заказа с ID
    function createOrderWithId(orderId) {
        const order = {
            id: orderId,
            name,
            phone,
            email: email || 'Не указан',
            address,
            comment: comment || 'Нет',
            items: items,
            total: total,
            status: 'новый',
            createdAt: new Date().toISOString(),
            userId: uid,
            type: type
        };

        if (hasRental) {
            const firstRental = rentalItems[0];
            order.equipmentId = firstRental.id;
            order.rentalStart = firstRental.start;
            order.rentalEnd = firstRental.end;
        }

        console.log('📦 Отправляемый заказ:', JSON.stringify(order, null, 2));

        if (!window.database) {
            window.showToast?.('Ошибка: Firebase не инициализирована', 'error');
            return;
        }

        window.database.ref('orders').push(order)
            .then(() => {
                console.log('✅ Заказ успешно сохранён!');
                window.showToast?.(`✅ Заказ #${order.id} оформлен!`, 'success');
                window.purchaseCart = [];
                window.rentalCart = [];
                updateCartUI();
                saveCarts();
                toggleCart();
            })
            .catch(err => {
                console.error('❌ Ошибка оформления заказа:', err);
                window.showToast?.('Ошибка оформления заказа: ' + err.message, 'error');
            });
    }

    // Получаем следующий ID через счётчик
    if (typeof window.getNextOrderId === 'function') {
        window.getNextOrderId()
            .then(id => {
                if (id !== null && id !== undefined && typeof id === 'number') {
                    createOrderWithId(id);
                } else {
                    const fallback = Date.now() + Math.floor(Math.random() * 10000);
                    createOrderWithId(fallback);
                }
            })
            .catch(err => {
                console.warn('Ошибка получения ID, fallback:', err);
                const fallback = Date.now() + Math.floor(Math.random() * 10000);
                createOrderWithId(fallback);
            });
    } else {
        const fallback = Date.now() + Math.floor(Math.random() * 10000);
        createOrderWithId(fallback);
    }
};

// ===== ВСПОМОГАТЕЛЬНЫЕ =====
function escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

// ===== ТОГГЛ КОРЗИНЫ =====
window.toggleCart = function() {
    const overlay = document.getElementById('cartOverlay');
    if (overlay) {
        overlay.classList.toggle('open');
        if (overlay.classList.contains('open')) updateCartUI();
    }
};

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    loadCarts();
});

window.loadCarts = loadCarts;
window.saveCarts = saveCarts;
window.updateCartUI = updateCartUI;