// ========================================
// МСК — ОСНОВНАЯ ЛОГИКА (без тёмной темы)
// ========================================

let products = [];
let cart = [];
let currentFilter = 'all';

// ===== ИНИЦИАЛИЗАЦИЯ =====
async function initData() {
    const saved = localStorage.getItem('msk_products');
    if (saved) {
        products = JSON.parse(saved);
    } else {
        // Пытаемся загрузить data.json, при ошибке используем расширенный fallback
        try {
            const resp = await fetch('data.json');
            if (!resp.ok) throw new Error('Сеть ответила ошибкой');
            const data = await resp.json();
            products = data.products || [];
        } catch (e) {
            console.warn('Не удалось загрузить data.json, используется fallback', e);
            products = getFallbackProducts();
        }
        localStorage.setItem('msk_products', JSON.stringify(products));
    }
    loadCart();
    renderCatalog();
    updateCartUI();
}

function getFallbackProducts() {
    // Расширенный fallback с несколькими товарами
    return [
        { id:1, name:'2.4 «Уступи дорогу»', type:'warning', typeLabel:'Предупреждающий', tag:'Хит', image:'images/placeholder.png', variants:[{ size:'700×700 мм', film:'Тип А', price:3250 }], inStock:10 },
        { id:2, name:'3.1 «Въезд запрещён»', type:'forbid', typeLabel:'Запрещающий', tag:'', image:'images/placeholder.png', variants:[{ size:'700×700 мм', film:'Тип А', price:2850 }], inStock:5 },
        { id:3, name:'4.1.1 «Движение прямо»', type:'mandatory', typeLabel:'Предписывающий', tag:'', image:'images/placeholder.png', variants:[{ size:'700×700 мм', film:'Тип А', price:3100 }], inStock:8 }
    ];
}

document.addEventListener('DOMContentLoaded', initData);

// ===== КАТАЛОГ =====
function renderCatalog() {
    const grid = document.getElementById('catalogGrid');
    if (!grid) return;

    let filtered = products.filter(p => currentFilter === 'all' || p.type === currentFilter);

    if (!filtered.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#888;">Товары не найдены</div>';
        return;
    }

    grid.innerHTML = filtered.map((p, idx) => {
        const sizes = [...new Set(p.variants.map(v => v.size))];
        const films = [...new Set(p.variants.map(v => v.film))];
        const defaultVariant = p.variants[0];
        const sizeOptions = sizes.map(s => `<option value="${s}" ${s === defaultVariant.size ? 'selected':''}>${s}</option>`).join('');
        const filmOptions = films.map(f => `<option value="${f}" ${f === defaultVariant.film ? 'selected':''}>${f}</option>`).join('');

        return `
        <div class="product-card" data-id="${p.id}" onclick="goToProduct(${p.id})">
            ${p.tag ? `<div class="tag">${p.tag}</div>` : ''}
            <div class="image-wrapper">
                <img src="${p.image || 'images/placeholder.png'}" alt="${p.name}" loading="lazy" />
            </div>
            <h3>${p.name}</h3>
            <div class="variant-selectors" onclick="event.stopPropagation();">
                <div class="selector-group">
                    <label>Размер:</label>
                    <select class="size-select" data-id="${p.id}" onchange="updateVariantPrice(this)">
                        ${sizeOptions}
                    </select>
                </div>
                <div class="selector-group">
                    <label>Плёнка:</label>
                    <select class="film-select" data-id="${p.id}" onchange="updateVariantPrice(this)">
                        ${filmOptions}
                    </select>
                </div>
            </div>
            <div class="price-row">
                <span class="price" id="price-${p.id}">${defaultVariant.price.toLocaleString()} ₽</span>
                <button class="btn-add" onclick="event.stopPropagation(); addToCart(${p.id}, this)">В корзину</button>
            </div>
        </div>
    `}).join('');
}

function updateVariantPrice(select) {
    const card = select.closest('.product-card');
    const id = parseInt(card.dataset.id);
    const product = products.find(p => p.id === id);
    if (!product) return;
    const size = card.querySelector('.size-select').value;
    const film = card.querySelector('.film-select').value;
    const variant = product.variants.find(v => v.size === size && v.film === film);
    const priceEl = document.getElementById(`price-${id}`);
    if (variant && priceEl) priceEl.innerHTML = `${variant.price.toLocaleString()} ₽`;
}

function goToProduct(id) {
    window.location.href = `product.html?id=${id}`;
}

// ===== КОРЗИНА =====
function addToCart(id, btn) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const card = btn.closest('.product-card');
    const size = card.querySelector('.size-select').value;
    const film = card.querySelector('.film-select').value;
    const variant = product.variants.find(v => v.size === size && v.film === film);
    if (!variant) { alert('Выбранная комбинация недоступна'); return; }

    const existing = cart.find(item => item.id === id && item.size === size && item.film === film);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity:1, size, film, price: variant.price, image: product.image || 'images/placeholder.png' });

    saveCart();
    updateCartUI();
    showAddedFeedback(id);
}

function showAddedFeedback(id) {
    const btn = document.querySelector(`.product-card[data-id="${id}"] .btn-add`);
    if (btn) {
        btn.innerHTML = '✅ Добавлено';
        btn.style.background = '#2e7d32';
        setTimeout(() => {
            btn.innerHTML = 'В корзину';
            btn.style.background = '';
        }, 1200);
    }
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCartUI();
}

function clearCart() {
    if (!cart.length) return;
    if (!confirm('Очистить корзину?')) return;
    cart = [];
    saveCart();
    updateCartUI();
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) removeFromCart(id);
    else { saveCart(); updateCartUI(); }
}

function saveCart() {
    localStorage.setItem('msk_cart', JSON.stringify(cart));
}

function loadCart() {
    const saved = localStorage.getItem('msk_cart');
    cart = saved ? JSON.parse(saved) : [];
}

function updateCartUI() {
    const count = document.getElementById('cartCount');
    const items = document.getElementById('cartItems');
    const total = document.getElementById('cartTotal');
    const clearBtn = document.getElementById('clearCartBtn');

    const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
    if (count) count.textContent = totalItems;
    if (clearBtn) clearBtn.disabled = cart.length === 0;

    if (!items) return;
    if (!cart.length) {
        items.innerHTML = '<div class="empty-cart">Корзина пуста</div>';
        if (total) total.textContent = 'Итого: 0 ₽';
        return;
    }

    items.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="item-info">
                <img src="${item.image}" alt="${item.name}" />
                <span>${item.name}</span>
                <span style="font-size:12px;color:#888;">${item.size} | ${item.film}</span>
            </div>
            <div class="qty">
                <button onclick="changeQty(${item.id}, -1)">−</button>
                <span>${item.quantity}</span>
                <button onclick="changeQty(${item.id}, 1)">+</button>
            </div>
            <span class="item-price">${(item.price * item.quantity).toLocaleString()} ₽</span>
            <button onclick="removeFromCart(${item.id})" style="background:none;border:none;color:#d32f2f;font-size:18px;cursor:pointer;">×</button>
        </div>
    `).join('');

    const totalSum = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    if (total) total.textContent = `Итого: ${totalSum.toLocaleString()} ₽`;
}

function toggleCart() {
    const overlay = document.getElementById('cartOverlay');
    if (overlay) overlay.classList.toggle('open');
    if (overlay.classList.contains('open')) updateCartUI();
}

// ===== ОФОРМЛЕНИЕ ЗАКАЗА =====
function showCheckoutForm() {
    if (!cart.length) { alert('Корзина пуста'); return; }
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
                ${cart.map(item => `<div>${item.name} (${item.size}, ${item.film}) × ${item.quantity} — ${(item.price*item.quantity).toLocaleString()} ₽</div>`).join('')}
                <div style="font-size:20px;font-weight:900;margin-top:10px;">Итого: ${cart.reduce((s,i) => s + i.price*i.quantity, 0).toLocaleString()} ₽</div>
            </div>
            <button onclick="submitOrder()" style="width:100%;padding:16px;background:#f7c948;border:none;border-radius:40px;font-weight:900;font-size:18px;cursor:pointer;">Оформить заказ</button>
            <button onclick="closeCheckoutForm()" style="width:100%;padding:12px;margin-top:10px;background:#0b0b0b;color:#fff;border:none;border-radius:40px;font-weight:700;font-size:16px;cursor:pointer;">Назад</button>
        </div>
    `;
    overlay.classList.add('open');
}

function closeCheckoutForm() {
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
}

function submitOrder() {
    const name = document.getElementById('orderName').value.trim();
    const phone = document.getElementById('orderPhone').value.trim();
    const email = document.getElementById('orderEmail').value.trim();
    const address = document.getElementById('orderAddress').value.trim();
    const comment = document.getElementById('orderComment').value.trim();

    if (!name || !phone || !address) {
        alert('Заполните обязательные поля (имя, телефон, адрес)');
        return;
    }

    const order = {
        id: Date.now(),
        name, phone, email: email || 'Не указан', address, comment: comment || 'Нет',
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, size: i.size, film: i.film, image: i.image })),
        total: cart.reduce((s, i) => s + i.price * i.quantity, 0),
        status: 'новый',
        createdAt: new Date().toISOString()
    };

    let orders = JSON.parse(localStorage.getItem('msk_orders') || '[]');
    orders.push(order);
    localStorage.setItem('msk_orders', JSON.stringify(orders));

    cart = [];
    saveCart();
    updateCartUI();

    alert(`✅ Заказ #${order.id} оформлен!`);
    toggleCart();
}

// ===== ФИЛЬТРЫ =====
document.querySelectorAll('.nav-categories button').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.nav-categories button').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        renderCatalog();
    });
});

// ===== ПОИСК =====
function searchProducts() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    const q = input.value.trim().toLowerCase();
    if (!q) { renderCatalog(); return; }
    const filtered = products.filter(p => p.name.toLowerCase().includes(q) || p.typeLabel?.toLowerCase().includes(q) || p.type?.includes(q));
    const grid = document.getElementById('catalogGrid');
    if (!filtered.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#888;">Ничего не найдено</div>';
        return;
    }
    const originalProducts = products;
    products = filtered;
    renderCatalog();
    products = originalProducts;
}

// ===== ЧАТ =====
function toggleChat() {
    const win = document.getElementById('chatWindow');
    const btn = document.getElementById('chatToggleBtn');
    const overlay = document.getElementById('chatOverlay');
    if (!win) return;
    const isOpen = win.classList.contains('open');
    if (isOpen) {
        closeChat();
    } else {
        win.classList.add('open');
        btn.style.display = 'none';
        overlay.classList.add('active');
        document.getElementById('chatInput').focus();
    }
}
function closeChat() {
    const win = document.getElementById('chatWindow');
    const btn = document.getElementById('chatToggleBtn');
    const overlay = document.getElementById('chatOverlay');
    if (win) win.classList.remove('open');
    if (btn) btn.style.display = 'flex';
    if (overlay) overlay.classList.remove('active');
}
document.getElementById('chatOverlay')?.addEventListener('click', closeChat);

function sendMessage() {
    const input = document.getElementById('chatInput');
    const messages = document.getElementById('chatMessages');
    if (!input || !messages) return;
    const text = input.value.trim();
    if (!text) return;
    const msg = document.createElement('div');
    msg.className = 'chat-message sent';
    msg.innerHTML = `<div class="chat-message-content"><p>${escapeHtml(text)}</p><span class="chat-message-time">${new Date().toLocaleTimeString()}</span></div>`;
    messages.appendChild(msg);
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    setTimeout(() => {
        const reply = document.createElement('div');
        reply.className = 'chat-message received';
        reply.innerHTML = `<div class="chat-message-content"><p>${getAutoReply(text)}</p><span class="chat-message-time">${new Date().toLocaleTimeString()}</span></div>`;
        messages.appendChild(reply);
        messages.scrollTop = messages.scrollHeight;
    }, 1000 + Math.random()*1500);
}
function handleChatKeyPress(e) { if (e.key === 'Enter') sendMessage(); }
function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}
function getAutoReply(text) {
    const lower = text.toLowerCase();
    if (lower.includes('привет')) return '👋 Здравствуйте! Чем помочь?';
    if (lower.includes('цена') || lower.includes('стоимость')) return '💰 Цены указаны в каталоге. Есть скидки для оптовых заказов!';
    if (lower.includes('доставка')) return '🚚 Доставка по всей России. Сроки зависят от региона.';
    if (lower.includes('адрес')) return '📍 Москва, Дорожный пр-д, 7';
    if (lower.includes('телефон') || lower.includes('номер')) return '📞 8 (800) 555-22-33';
    if (lower.includes('гост')) return '📄 Все знаки соответствуют ГОСТ 52290-2023';
    if (lower.includes('спасибо')) return '🙏 Спасибо за обращение!';
    return '📌 Спасибо за вопрос! Наши менеджеры скоро ответят.';
}