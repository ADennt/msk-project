// ========================================
// МСК — СТРАНИЦА ТОВАРА (с Firebase)
// ========================================

let cart = [];

// ===== ЗАГРУЗКА КОРЗИНЫ =====
function loadCart() {
  const uid = getCurrentUserId();
  if (!uid) return;
  database.ref('users/' + uid + '/cart').on('value', snapshot => {
    const data = snapshot.val();
    cart = data || [];
    updateCartUI();
  });
}

function saveCartToFirebase() {
  const uid = getCurrentUserId();
  if (!uid) return;
  database.ref('users/' + uid + '/cart').set(cart);
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

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) removeFromCart(id);
  else saveCartToFirebase();
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

function toggleCart() {
  const overlay = document.getElementById('cartOverlay');
  if (overlay) overlay.classList.toggle('open');
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

async function submitOrder() {
  const name = document.getElementById('orderName').value.trim();
  const phone = document.getElementById('orderPhone').value.trim();
  const email = document.getElementById('orderEmail').value.trim();
  const address = document.getElementById('orderAddress').value.trim();
  const comment = document.getElementById('orderComment').value.trim();

  if (!name || !phone || !address) {
    alert('Заполните обязательные поля (имя, телефон, адрес)');
    return;
  }

  try {
    const orderId = await getNextOrderId();
    if (!orderId) {
      alert('Ошибка генерации ID заказа');
      return;
    }

    const order = {
      id: orderId,
      name, phone, email: email || 'Не указан', address, comment: comment || 'Нет',
      items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, size: i.size, film: i.film, image: i.image })),
      total: cart.reduce((s, i) => s + i.price * i.quantity, 0),
      status: 'новый',
      createdAt: new Date().toISOString()
    };

    const uid = getCurrentUserId();
    if (!uid) { alert('Ошибка аутентификации'); return; }

    await database.ref('orders').push(order);
    await database.ref('users/' + uid + '/orders').push(order);

    cart = [];
    saveCartToFirebase();
    updateCartUI();
    alert(`✅ Заказ #${order.id} оформлен!`);
    toggleCart();
  } catch (error) {
    console.error('Ошибка оформления заказа:', error);
    alert('❌ Произошла ошибка при оформлении заказа. Попробуйте позже.');
  }
}

// ===== ЗАГРУЗКА ТОВАРА =====
function loadProduct() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));
  
  waitForFirebase(() => {
    database.ref('products').once('value').then(snapshot => {
      const data = snapshot.val();
      if (data) {
        const products = Object.values(data);
        const product = products.find(p => p.id === id);
        if (!product) {
          document.getElementById('productDetail').innerHTML = '<h2>Товар не найден</h2><a href="index.html">Вернуться</a>';
          return;
        }
        renderProduct(product);
        loadCart();
      }
    });
  });
}

function renderProduct(product) {
  const container = document.getElementById('productDetail');
  const sizes = [...new Set(product.variants.map(v => v.size))];
  const films = [...new Set(product.variants.map(v => v.film))];
  const defaultVariant = product.variants[0];
  const sizeOptions = sizes.map(s => `<option value="${s}" ${s === defaultVariant.size ? 'selected':''}>${s}</option>`).join('');
  const filmOptions = films.map(f => `<option value="${f}" ${f === defaultVariant.film ? 'selected':''}>${f}</option>`).join('');

  container.innerHTML = `
    <div class="detail-header">
      <div class="detail-image">
        <img src="${product.image || 'images/placeholder.png'}" alt="${product.name}" />
      </div>
      <div class="detail-info">
        <div style="display:flex;gap:10px;margin-bottom:10px;">
          <span style="color:#888;font-weight:600;">${product.typeLabel}</span>
          ${product.tag ? `<span style="background:#f7c948;padding:4px 16px;border-radius:20px;font-weight:700;font-size:12px;">${product.tag}</span>` : ''}
        </div>
        <h1>${product.name}</h1>
        <div class="detail-price" id="detailPrice">${defaultVariant.price.toLocaleString()} ₽</div>
        <div class="detail-stock">В наличии: ${product.inStock || 0} шт.</div>

        <div class="selector-group">
          <div>
            <label for="sizeSelect">Размер:</label>
            <select id="sizeSelect" onchange="updateDetailPrice()">
              ${sizeOptions}
            </select>
          </div>
          <div>
            <label for="filmSelect">Плёнка:</label>
            <select id="filmSelect" onchange="updateDetailPrice()">
              ${filmOptions}
            </select>
          </div>
        </div>

        <div class="btn-group">
          <button class="btn-add" onclick="addToCartFromDetail()">В корзину</button>
          <button class="btn-buy" onclick="buyNow()">Купить сейчас</button>
        </div>
      </div>
    </div>
    <div class="detail-desc">
      <h3>📋 Описание</h3>
      <p>${product.description || 'Описание отсутствует'}</p>
    </div>
    <div class="detail-chars">
      <div class="char-item"><strong>Материал</strong><span>${product.characteristics?.material || 'Не указано'}</span></div>
    </div>
    <a href="index.html" style="color:#f7c948;font-weight:700;text-decoration:none;display:inline-block;margin-top:20px;">← Вернуться в каталог</a>
  `;
  window.currentProduct = product;
}

function updateDetailPrice() {
  const size = document.getElementById('sizeSelect').value;
  const film = document.getElementById('filmSelect').value;
  const product = window.currentProduct;
  const variant = product.variants.find(v => v.size === size && v.film === film);
  const priceEl = document.getElementById('detailPrice');
  if (variant && priceEl) priceEl.textContent = `${variant.price.toLocaleString()} ₽`;
}

document.addEventListener('DOMContentLoaded', loadProduct);