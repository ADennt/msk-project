// ========================================
// МСК — ОСНОВНАЯ ЛОГИКА (script.js)
// ========================================

let products = [];
let currentFilter = 'all';
let currentPage = 1;
const itemsPerPage = 20;
let filteredProducts = [];

// ========================================
// 1. СИСТЕМА ТОСТ-УВЕДОМЛЕНИЙ
// ========================================

window.showToast = function(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        // Создаём контейнер, если его нет
        const newContainer = document.createElement('div');
        newContainer.className = 'toast-container';
        newContainer.id = 'toastContainer';
        document.body.appendChild(newContainer);
    }
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        </div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    toastContainer.appendChild(toast);
    // Автоматическое закрытие
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 300);
        }
    }, duration);
    // Закрытие по клику
    toast.addEventListener('click', function(e) {
        if (e.target === this) this.remove();
    });
};

// ========================================
// 2. ЗАГРУЗКА ТОВАРОВ
// ========================================

function initCatalog() {
    if (!window.database) {
        console.error('Firebase не инициализирована');
        window.showToast('Ошибка подключения к базе данных', 'error', 5000);
        loadFromDataJson();
        return;
    }
    // Показываем кэш из localStorage, если есть
    const cached = localStorage.getItem('msk_products');
    if (cached) {
        products = JSON.parse(cached);
        // Если на главной — ничего не делаем, т.к. popularGrid удалён
        // Но для каталога — позже вызовется applyFiltersAndPagination
    }

    window.database.ref('products').on('value', snapshot => {
        const data = snapshot.val() || {};
        products = Object.values(data);
        if (products.length === 0) {
            loadFromDataJson();
        } else {
            localStorage.setItem('msk_products', JSON.stringify(products));
            afterProductsLoaded();
        }
    }, error => {
        console.error('Ошибка загрузки товаров из Firebase:', error);
        window.showToast('Ошибка загрузки товаров', 'error', 5000);
        loadFromDataJson();
    });
}

function loadFromDataJson() {
    fetch('data.json')
        .then(resp => {
            if (!resp.ok) throw new Error('Сеть ответила ошибкой');
            return resp.json();
        })
        .then(data => {
            products = data.products || [];
            if (window.database) {
                const ref = window.database.ref('products');
                ref.once('value', snapshot => {
                    if (!snapshot.exists()) {
                        products.forEach(p => ref.push(p));
                    }
                });
            }
            localStorage.setItem('msk_products', JSON.stringify(products));
            afterProductsLoaded();
        })
        .catch(e => {
            console.error('Ошибка загрузки data.json:', e);
            window.showToast('Ошибка загрузки данных', 'error', 5000);
            products = getFallbackProducts();
            afterProductsLoaded();
        });
}

function getFallbackProducts() {
    return [
        { id: 1, name: '2.4 «Уступи дорогу»', type: 'warning', typeLabel: 'Предупреждающий', tag: 'Хит', image: 'images/placeholder.png', variants: [{ size: '700×700 мм', film: 'Тип А', price: 3250 }], inStock: 10 },
        { id: 2, name: '3.1 «Въезд запрещён»', type: 'forbid', typeLabel: 'Запрещающий', tag: '', image: 'images/placeholder.png', variants: [{ size: '700×700 мм', film: 'Тип А', price: 2850 }], inStock: 5 },
        { id: 3, name: '4.1.1 «Движение прямо»', type: 'mandatory', typeLabel: 'Предписывающий', tag: '', image: 'images/placeholder.png', variants: [{ size: '700×700 мм', film: 'Тип А', price: 3100 }], inStock: 8 }
    ];
}

function afterProductsLoaded() {
    window.products = products;
    const grid = document.getElementById('catalogGrid');
    if (grid) {
        applyFiltersAndPagination();
    }
    renderPopularProducts(); // если есть на главной
}

// ========================================
// 3. КАТАЛОГ – ФИЛЬТРАЦИЯ И ПАГИНАЦИЯ
// ========================================

function applyFiltersAndPagination() {
    filteredProducts = (currentFilter === 'all') ? [...products] : products.filter(p => p.type === currentFilter);
    currentPage = 1;
    renderCatalog();
    renderPagination();
}

function renderCatalog() {
    const grid = document.getElementById('catalogGrid');
    if (!grid) return;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filteredProducts.slice(start, end);

    if (!filteredProducts.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#888;">Товары не найдены</div>';
        const info = document.getElementById('catalogInfo');
        if (info) info.textContent = 'Всего: 0 товаров';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    grid.innerHTML = pageItems.map((p, idx) => {
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
            <h3>${escapeHtml(p.name)}</h3>
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

    const info = document.getElementById('catalogInfo');
    if (info) info.textContent = `Всего: ${filteredProducts.length} товаров`;
}

function renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    let html = '';
    html += `<button onclick="goToPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button onclick="goToPage(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
    }
    html += `<button onclick="goToPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderCatalog();
    renderPagination();
    const header = document.querySelector('.catalog-header');
    if (header) header.scrollIntoView({ behavior: 'smooth' });
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

// ========================================
// 4. ФИЛЬТРЫ КАТЕГОРИЙ
// ========================================

document.querySelectorAll('.nav-categories button').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.nav-categories button').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        applyFiltersAndPagination();
    });
});

// ========================================
// 5. ПОИСК
// ========================================

function searchProducts() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    const q = input.value.trim().toLowerCase();
    if (!q) {
        applyFiltersAndPagination();
        return;
    }
    const searchResults = products.filter(p => {
        if (String(p.id).includes(q)) return true;
        if (p.name && p.name.toLowerCase().includes(q)) return true;
        if (p.typeLabel && p.typeLabel.toLowerCase().includes(q)) return true;
        if (p.tag && p.tag.toLowerCase().includes(q)) return true;
        if (p.description && p.description.toLowerCase().includes(q)) return true;
        if (p.characteristics && p.characteristics.material && p.characteristics.material.toLowerCase().includes(q)) return true;
        if (p.variants && p.variants.some(v => {
            const sizeMatch = v.size && v.size.toLowerCase().includes(q);
            const filmMatch = v.film && v.film.toLowerCase().includes(q);
            const priceMatch = String(v.price).includes(q);
            return sizeMatch || filmMatch || priceMatch;
        })) return true;
        return false;
    });
    filteredProducts = searchResults;
    currentPage = 1;
    renderCatalog();
    renderPagination();
    const info = document.getElementById('catalogInfo');
    if (info) info.textContent = `Найдено: ${filteredProducts.length} товаров`;
}

// Поиск из hero-блока (если есть)
function performHeroSearch() {
    const input = document.getElementById('heroSearchInput');
    if (!input) return;
    const query = input.value.trim();
    if (!query) {
        window.location.href = 'catalog.html';
        return;
    }
    window.location.href = `catalog.html?search=${encodeURIComponent(query)}`;
}

// Обработка Enter в поле поиска hero
document.addEventListener('DOMContentLoaded', function() {
    const heroInput = document.getElementById('heroSearchInput');
    if (heroInput) {
        heroInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performHeroSearch();
            }
        });
    }
});

// Автозаполнение поиска из URL (для страницы каталога)
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    if (searchQuery) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = searchQuery;
            searchProducts();
        }
    }
});

// ========================================
// 6. ПОПУЛЯРНЫЕ ТОВАРЫ (для главной)
// ========================================

function renderPopularProducts() {
    const grid = document.getElementById('popularGrid');
    if (!grid) return;
    const popular = products.slice(0, 8);
    if (!popular.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#888;">Товары загружаются...</div>';
        return;
    }
    grid.innerHTML = popular.map(p => {
        const defaultVariant = p.variants[0];
        return `
        <div class="product-card" onclick="location.href='product.html?id=${p.id}'">
            ${p.tag ? `<div class="tag">${p.tag}</div>` : ''}
            <div class="image-wrapper">
                <img src="${p.image || 'images/placeholder.png'}" alt="${p.name}" loading="lazy" />
            </div>
            <h3>${escapeHtml(p.name)}</h3>
            <div class="price-row">
                <span class="price">${defaultVariant.price.toLocaleString()} ₽</span>
                <button class="btn-add" onclick="event.stopPropagation(); addToCart(${p.id}, this)">В корзину</button>
            </div>
        </div>
    `}).join('');
}

// ========================================
// 7. АНИМАЦИИ
// ========================================

// Анимация при скролле (Intersection Observer)
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll, .advantage-item, .popular-products .product-card');
    if (animatedElements.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -20px 0px'
        });
        animatedElements.forEach(el => observer.observe(el));
    }
});

// Хедер при скролле
window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (header) {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
});

// Вращающийся текст в hero (если используется)
document.addEventListener('DOMContentLoaded', function() {
    const rotatingElement = document.getElementById('rotatingWord');
    if (!rotatingElement) return;
    
    const phrases = [
        'Качество по ГОСТ',
        'Доставка по России',
        'Цены от производителя',
        'Собственное производство',
        'Сертифицированная продукция'
    ];
    
    let index = 0;
    setInterval(() => {
        index = (index + 1) % phrases.length;
        rotatingElement.style.animation = 'none';
        setTimeout(() => {
            rotatingElement.textContent = phrases[index];
            rotatingElement.style.animation = 'fadeInOut 1.5s ease';
        }, 50);
    }, 3000);
});

// ========================================
// 8. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================================

function escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

// ========================================
// 9. ИНИЦИАЛИЗАЦИЯ
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    initCatalog();
    // Корзина инициализируется в cart.js
});

// ===== БЫСТРЫЙ ЗАКАЗ В HERO =====
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('heroQuickForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const input = this.querySelector('input[type="tel"]');
        const phone = input.value.trim();

        if (!phone || phone.length < 5) {
            window.showToast?.('❌ Введите корректный номер телефона', 'error');
            input.style.border = '1px solid #ff6b6b';
            setTimeout(() => input.style.border = 'none', 1500);
            return;
        }

        // Здесь можно отправить данные на сервер или в Firebase
        console.log('📞 Заявка на звонок:', phone);

        // Показываем успешное уведомление
        window.showToast?.('✅ Спасибо! Мы перезвоним в ближайшее время.', 'success');
        this.reset();
    });
});