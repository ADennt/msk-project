// ========================================
// МСК — КОРЗИНА (с привязкой к пользователю)
// ========================================

window.cart = window.cart || [];

// ===== ПОЛУЧИТЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ =====
function getCurrentUid() {
    return window.auth?.currentUser?.uid || null;
}

// ===== ЗАГРУЗКА КОРЗИНЫ =====
function loadCart() {
    const uid = getCurrentUid();
    if (uid && window.database) {
        // Авторизован – грузим из Firebase
        window.database.ref(`users/${uid}/cart`).on('value', snapshot => {
            const data = snapshot.val() || [];
            window.cart = data;
            localStorage.setItem('msk_cart', JSON.stringify(data));
            updateCartUI();
        });
    } else {
        // Не авторизован – грузим из localStorage
        const saved = localStorage.getItem('msk_cart');
        window.cart = saved ? JSON.parse(saved) : [];
        updateCartUI();
    }
}

// ===== СОХРАНЕНИЕ КОРЗИНЫ =====
function saveCart() {
    const uid = getCurrentUid();
    if (uid && window.database) {
        window.database.ref(`users/${uid}/cart`).set(window.cart)
            .catch(err => console.warn('Ошибка сохранения корзины в Firebase:', err));
    }
    localStorage.setItem('msk_cart', JSON.stringify(window.cart));
}

// ===== ОБНОВЛЕНИЕ UI =====
function updateCartUI() {
    const count = document.getElementById('cartCount');
    const items = document.getElementById('cartItems');
    const total = document.getElementById('cartTotal');
    const clearBtn = document.getElementById('clearCartBtn');

    const totalItems = window.cart.reduce((s, i) => s + i.quantity, 0);
    if (count) count.textContent = totalItems;
    if (clearBtn) clearBtn.disabled = window.cart.length === 0;

    if (!items) return;
    if (!window.cart.length) {
        items.innerHTML = '<div class="empty-cart">Корзина пуста</div>';
        if (total) total.textContent = 'Итого: 0 ₽';
        return;
    }

    items.innerHTML = window.cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" />
            <div class="item-details">
                <div class="name">${escapeHtml(item.name)}</div>
                <div class="options">${escapeHtml(item.size)} | ${escapeHtml(item.film)}</div>
            </div>
            <div class="qty">
                <button onclick="changeQty(${item.id}, -1)">−</button>
                <span>${item.quantity}</span>
                <button onclick="changeQty(${item.id}, 1)">+</button>
            </div>
            <span class="item-price">${(item.price * item.quantity).toLocaleString()} ₽</span>
            <button class="remove-btn" onclick="removeFromCart(${item.id})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');

    const totalSum = window.cart.reduce((s, i) => s + i.price * i.quantity, 0);
    if (total) total.textContent = `Итого: ${totalSum.toLocaleString()} ₽`;
}

// ===== УПРАВЛЕНИЕ КОРЗИНОЙ =====
window.addToCart = function(id, btn) {
    const product = window.products?.find(p => p.id === id);
    if (!product) {
        window.showToast?.('Товар не найден', 'error');
        return;
    }
    addProductToCart(product, btn);
};

function addProductToCart(product, btn) {
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
    if (!variant) {
        window.showToast?.('Комбинация недоступна', 'error');
        return;
    }

    const existing = window.cart.find(i => i.id === product.id && i.size === size && i.film === film);
    if (existing) {
        existing.quantity += 1;
    } else {
        window.cart.push({ ...product, quantity: 1, size, film, price: variant.price, image: product.image || 'images/placeholder.png' });
    }

    updateCartUI();
    saveCart();
    window.showToast?.(`${product.name} добавлен в корзину`, 'success');

    if (btn) {
        btn.innerHTML = '✅ Добавлено';
        btn.style.background = '#2e7d32';
        setTimeout(() => {
            btn.innerHTML = 'В корзину';
            btn.style.background = '';
        }, 1200);
    }
}

window.removeFromCart = function(id) {
    window.cart = window.cart.filter(item => item.id !== id);
    updateCartUI();
    saveCart();
    window.showToast?.('Товар удалён из корзины', 'info');
};

window.clearCart = function() {
    if (!window.cart.length) return;
    if (!confirm('Очистить корзину?')) return;
    window.cart = [];
    updateCartUI();
    saveCart();
    window.showToast?.('Корзина очищена', 'info');
};

window.changeQty = function(id, delta) {
    const item = window.cart.find(i => i.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
        removeFromCart(id);
        return;
    }
    updateCartUI();
    saveCart();
};

window.toggleCart = function() {
    const overlay = document.getElementById('cartOverlay');
    if (overlay) {
        overlay.classList.toggle('open');
        if (overlay.classList.contains('open')) updateCartUI();
    }
};

// ===== ОФОРМЛЕНИЕ ЗАКАЗА =====
window.showCheckoutForm = function() {
    if (!window.cart.length) {
        window.showToast?.('Корзина пуста', 'error');
        return;
    }
    const overlay = document.getElementById('cartOverlay');
    const panel = overlay.querySelector('.cart-panel');
    panel.innerHTML = `
        <h2>📝 Оформление заказа <button onclick="closeCheckoutForm()">&times;</button></h2>
        <div class="checkout-form" style="margin-top:20px;">
            <div><label>Имя *</label><input type="text" id="orderName" placeholder="Иван Петров" style="width:100%;padding:12px;border:2px solid #ddd;border-radius:10px;margin-bottom:10px;"></div>
            <div><label>Телефон *</label><input type="tel" id="orderPhone" placeholder="+7 (999) 123-45-67" style="width:100%;padding:12px;border:2px solid #ddd;border-radius:10px;margin-bottom:10px;"></div>
            <div><label>Email</label><input type="email" id="orderEmail" placeholder="example@mail.ru" style="width:100%;padding:12px;border:2px solid #ddd;border-radius:10px;margin-bottom:10px;"></div>
            <div><label>Адрес *</label><input type="text" id="orderAddress" placeholder="Москва, ул. Дорожная, д. 15" style="width:100%;padding:12px;border:2px solid #ddd;border-radius:10px;margin-bottom:10px;"></div>
            <div><label>Комментарий</label><textarea id="orderComment" rows="3" style="width:100%;padding:12px;border:2px solid #ddd;border-radius:10px;"></textarea></div>
            <div style="background:#f8f9fb;padding:15px;border-radius:10px;margin:15px 0;">
                <strong>Состав:</strong>
                ${window.cart.map(item => `<div>${escapeHtml(item.name)} (${escapeHtml(item.size)}, ${escapeHtml(item.film)}) × ${item.quantity} — ${(item.price*item.quantity).toLocaleString()} ₽</div>`).join('')}
                <div style="font-size:20px;font-weight:900;margin-top:10px;">Итого: ${window.cart.reduce((s,i) => s + i.price*i.quantity, 0).toLocaleString()} ₽</div>
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

window.submitOrder = function() {
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

    if (typeof window.getNextOrderId === 'function') {
        window.getNextOrderId().then(id => {
            createOrder(id, name, phone, email, address, comment, uid);
        }).catch(() => {
            createOrder(Date.now(), name, phone, email, address, comment, uid);
        });
    } else {
        createOrder(Date.now(), name, phone, email, address, comment, uid);
    }
};

function createOrder(id, name, phone, email, address, comment, uid) {
    const order = {
        id,
        name,
        phone,
        email: email || 'Не указан',
        address,
        comment: comment || 'Нет',
        items: window.cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, size: i.size, film: i.film, image: i.image })),
        total: window.cart.reduce((s, i) => s + i.price * i.quantity, 0),
        status: 'новый',
        createdAt: new Date().toISOString(),
        userId: uid || null
    };

    if (window.database) {
        window.database.ref('orders').push(order)
            .then(() => {
                window.showToast?.(`✅ Заказ #${order.id} оформлен!`, 'success');
                window.cart = [];
                updateCartUI();
                saveCart();
                toggleCart();
            })
            .catch(() => window.showToast?.('Ошибка оформления заказа', 'error'));
    } else {
        window.showToast?.('Ошибка: нет подключения к Firebase', 'error');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', function() {
    loadCart();
});

window.loadCart = loadCart;
window.saveCart = saveCart;
window.updateCartUI = updateCartUI;