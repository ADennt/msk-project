// ========================================
// МСК — СТРАНИЦА ТОВАРА (с глобальной корзиной)
// ========================================

let products = [];

function loadProduct() {
    if (!window.database) {
        window.showToast?.('Ошибка подключения к Firebase', 'error');
        return;
    }
    window.database.ref('products').on('value', snapshot => {
        products = Object.values(snapshot.val() || {});
        window.products = products;
        displayProduct();
    });
    loadCartFromFirebase();
}

function displayProduct() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));
    const product = products.find(p => p.id === id);
    if (!product) {
        document.getElementById('productDetail').innerHTML = '<h2>Товар не найден</h2><a href="index.html">Вернуться</a>';
        return;
    }
    renderProduct(product);
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

function addToCartFromDetail() {
    const product = window.currentProduct;
    const size = document.getElementById('sizeSelect').value;
    const film = document.getElementById('filmSelect').value;
    const variant = product.variants.find(v => v.size === size && v.film === film);
    if (!variant) {
        window.showToast?.('Комбинация недоступна', 'error');
        return;
    }
    const existing = window.cart.find(i => i.id === product.id && i.size === size && i.film === film);
    if (existing) existing.quantity += 1;
    else window.cart.push({ ...product, quantity: 1, size, film, price: variant.price, image: product.image || 'images/placeholder.png' });
    window.updateCartUI();
    window.saveCartToFirebase();
    window.showToast?.('✅ Товар добавлен в корзину', 'success');
}

function buyNow() {
    addToCartFromDetail();
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', loadProduct);