// ========================================
// МСК — СТРАНИЦА ТОВАРА (Firebase)
// ========================================

let cart = [];

function loadCartFromFirebase() {
    if (window.database) {
        window.database.ref('cart').on('value', snapshot => {
            const data = snapshot.val() || [];
            cart = data;
            updateCartUI();
        });
    } else {
        const saved = localStorage.getItem('msk_cart');
        cart = saved ? JSON.parse(saved) : [];
        updateCartUI();
    }
}

function saveCartToFirebase() {
    if (window.database) {
        window.database.ref('cart').set(cart);
    } else {
        localStorage.setItem('msk_cart', JSON.stringify(cart));
    }
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
            <img src="${item.image}" alt="${item.name}" />
            <div class="item-details">
                <div class="name">${item.name}</div>
                <div class="options">${item.size} | ${item.film}</div>
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

    const totalSum = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    if (total) total.textContent = `Итого: ${totalSum.toLocaleString()} ₽`;
}

function addToCartFromDetail() {
    const product = window.currentProduct;
    const size = document.getElementById('sizeSelect').value;
    const film = document.getElementById('filmSelect').value;
    const variant = product.variants.find(v => v.size === size && v.film === film);
    if (!variant) { alert('Комбинация недоступна'); return; }

    const existing = cart.find(i => i.id === product.id && i.size === size && i.film === film);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1, size, film, price: variant.price, image: product.image || 'images/placeholder.png' });

    saveCartToFirebase();
    alert('✅ Товар добавлен в корзину');
}

function buyNow() {
    addToCartFromDetail();
    window.location.href = 'index.html';
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCartToFirebase();
}

function clearCart() {
    if (!cart.length) return;
    if (!confirm('Очистить корзину?')) return;
    cart = [];
    saveCartToFirebase();
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) removeFromCart(id);
    else saveCartToFirebase();
}

function toggleCart() {
    const overlay = document.getElementById('cartOverlay');
    if (overlay) overlay.classList.toggle('open');
    if (overlay.classList.contains('open')) updateCartUI();
}

// ===== ОФОРМЛЕНИЕ ЗАКАЗА =====
function showCheckoutForm() { /* ... (без изменений, как в script.js) */ }
function closeCheckoutForm() { /* ... */ }
function submitOrder() { /* ... использует window.getNextOrderId */ }

// ===== ЗАГРУЗКА ТОВАРА =====
function loadProduct() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));
    const saved = localStorage.getItem('msk_products');
    const products = saved ? JSON.parse(saved) : [];
    const product = products.find(p => p.id === id);
    if (!product) {
        document.getElementById('productDetail').innerHTML = '<h2>Товар не найден</h2><a href="index.html">Вернуться</a>';
        return;
    }
    renderProduct(product);
    loadCartFromFirebase();
}

function renderProduct(product) { /* ... (без изменений) */ }
function updateDetailPrice() { /* ... */ }

document.addEventListener('DOMContentLoaded', loadProduct);