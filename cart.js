// ========================================
// cart.js — общая логика корзины
// ========================================

let cart = [];
let cartListeners = [];

function loadCartFromFirebase() {
    if (!window.database) {
        console.warn('Firebase не инициализирована, корзина не загружена');
        return;
    }
    const userId = window.getCurrentUserId ? window.getCurrentUserId() : null;
    if (!userId) {
        console.warn('Пользователь не авторизован, корзина не загружена');
        return;
    }
    window.database.ref('cart/' + userId).on('value', snapshot => {
        const data = snapshot.val() || [];
        cart = data;
        cartListeners.forEach(fn => fn());
    });
}

function saveCartToFirebase() {
    if (!window.database) {
        console.warn('Firebase не инициализирована');
        return;
    }
    const userId = window.getCurrentUserId ? window.getCurrentUserId() : null;
    if (!userId) {
        console.warn('Пользователь не авторизован');
        return;
    }
    window.database.ref('cart/' + userId).set(cart);
}

function onCartUpdate(callback) {
    cartListeners.push(callback);
}

function getCart() {
    return cart;
}

function addToCart(product, size, film, quantity = 1) {
    if (!product || !size || !film) return false;
    const variant = product.variants.find(v => v.size === size && v.film === film);
    if (!variant) return false;

    const existing = cart.find(i => i.id === product.id && i.size === size && i.film === film);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: variant.price,
            quantity: quantity,
            size: size,
            film: film,
            image: product.image || 'images/placeholder.png'
        });
    }
    saveCartToFirebase();
    return true;
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCartToFirebase();
}

function clearCart() {
    cart = [];
    saveCartToFirebase();
}

function changeQuantity(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
        removeFromCart(id);
    } else {
        saveCartToFirebase();
    }
}

function getTotalItems() {
    return cart.reduce((s, i) => s + i.quantity, 0);
}

function getTotalPrice() {
    return cart.reduce((s, i) => s + i.price * i.quantity, 0);
}

function isCartEmpty() {
    return cart.length === 0;
}

// Экспортируем в глобальное пространство
window.cart = cart;
window.loadCartFromFirebase = loadCartFromFirebase;
window.saveCartToFirebase = saveCartToFirebase;
window.onCartUpdate = onCartUpdate;
window.getCart = getCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.changeQuantity = changeQuantity;
window.getTotalItems = getTotalItems;
window.getTotalPrice = getTotalPrice;
window.isCartEmpty = isCartEmpty;