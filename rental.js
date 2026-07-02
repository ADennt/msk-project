// ========================================
// МСК — АРЕНДА ТЕХНИКИ (rental.js)
// ========================================

let equipment = [];
let rentalCurrentCategory = 'all';
let rentalCurrentPage = 1;
const rentalItemsPerPage = 12;
let filteredEquipment = [];
let rentalSearchQuery = '';

// ===== ЗАГРУЗКА КАТАЛОГА =====
function loadRentalCatalog() {
    if (!window.database) {
        window.showToast?.('Ошибка подключения к Firebase', 'error');
        return;
    }
    window.database.ref('equipment').on('value', snapshot => {
        const data = snapshot.val() || {};
        equipment = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        applyRentalFiltersAndRender();
    });
}

// ===== ФИЛЬТРАЦИЯ И ПОИСК =====
function filterRentalCatalog(category) {
    rentalCurrentCategory = category;
    applyRentalFiltersAndRender();
}

function searchRental() {
    const input = document.getElementById('rentalSearch');
    if (!input) return;
    rentalSearchQuery = input.value.trim().toLowerCase();
    applyRentalFiltersAndRender();
}

function applyRentalFiltersAndRender() {
    let filtered = equipment;
    if (rentalCurrentCategory !== 'all') {
        filtered = filtered.filter(e => e.category === rentalCurrentCategory);
    }
    if (rentalSearchQuery) {
        filtered = filtered.filter(e => 
            e.name.toLowerCase().includes(rentalSearchQuery) ||
            e.category.toLowerCase().includes(rentalSearchQuery) ||
            e.description?.toLowerCase().includes(rentalSearchQuery)
        );
    }
    filteredEquipment = filtered;
    rentalCurrentPage = 1;
    renderRentalCatalog();
    renderRentalPagination();
}

// ===== ОТРИСОВКА КАТАЛОГА =====
function renderRentalCatalog() {
    const grid = document.getElementById('equipmentGrid');
    if (!grid) return;
    const start = (rentalCurrentPage - 1) * rentalItemsPerPage;
    const end = start + rentalItemsPerPage;
    const pageItems = filteredEquipment.slice(start, end);

    if (!filteredEquipment.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#888;">Техника не найдена</div>';
        document.getElementById('catalogInfo').textContent = 'Всего: 0 единиц';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    grid.innerHTML = pageItems.map(e => {
        const statusClass = e.status === 'available' ? 'available' : (e.status === 'rented' ? 'rented' : 'maintenance');
        const statusText = e.status === 'available' ? '✅ Доступна' : (e.status === 'rented' ? '🔴 Занята' : '🔧 На ремонте');
        // Тег, если техника занята или на ремонте
        const tag = (e.status !== 'available') ? `<div class="tag">${e.status === 'rented' ? 'Занята' : 'На ремонте'}</div>` : '';
        return `
        <div class="product-card" onclick="location.href='equipment.html?id=${e.id}'">
            ${tag}
            <div class="image-wrapper">
                <img src="${e.image || 'images/placeholder.png'}" alt="${e.name}" />
            </div>
            <h3>${escapeHtml(e.name)}</h3>
            <div class="variant-selectors" onclick="event.stopPropagation();">
                <div class="selector-group">
                    <label>Категория:</label>
                    <span style="font-weight:600;color:#555;">${escapeHtml(e.category)}</span>
                </div>
                <div class="selector-group">
                    <label>Статус:</label>
                    <span class="rental-status ${statusClass}">${statusText}</span>
                </div>
            </div>
            <div class="price-row">
                <span class="rental-price">${e.dailyPrice.toLocaleString()} ₽ <small>/ сутки</small></span>
                <button class="btn-rent" onclick="event.stopPropagation(); showRentalModal('${e.id}')">Забронировать</button>
            </div>
        </div>
        `;
    }).join('');

    document.getElementById('catalogInfo').textContent = `Всего: ${filteredEquipment.length} единиц`;
}

function renderRentalPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;
    const totalPages = Math.ceil(filteredEquipment.length / rentalItemsPerPage);
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    let html = '';
    html += `<button onclick="goToRentalPage(${rentalCurrentPage - 1})" ${rentalCurrentPage <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button onclick="goToRentalPage(${i})" class="${i === rentalCurrentPage ? 'active' : ''}">${i}</button>`;
    }
    html += `<button onclick="goToRentalPage(${rentalCurrentPage + 1})" ${rentalCurrentPage >= totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

function goToRentalPage(page) {
    const totalPages = Math.ceil(filteredEquipment.length / rentalItemsPerPage);
    if (page < 1 || page > totalPages) return;
    rentalCurrentPage = page;
    renderRentalCatalog();
    renderRentalPagination();
}

// ===== СТРАНИЦА ТЕХНИКИ =====
function loadEquipmentPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        document.getElementById('equipmentDetail').innerHTML = '<h2>Техника не найдена</h2>';
        return;
    }
    window.database.ref('equipment/' + id).once('value', snapshot => {
        const item = snapshot.val();
        if (!item) {
            document.getElementById('equipmentDetail').innerHTML = '<h2>Техника не найдена</h2>';
            return;
        }
        renderEquipmentDetail({ ...item, id }, id);
    });
}

function renderEquipmentDetail(item, id) {
    const container = document.getElementById('equipmentDetail');
    const statusText = item.status === 'available' ? '✅ Доступна' : '🔴 Занята';
    container.innerHTML = `
        <div class="detail-header">
            <div class="detail-image">
                <img src="${item.image || 'images/placeholder.png'}" alt="${item.name}" />
            </div>
            <div class="detail-info">
                <h1>${escapeHtml(item.name)}</h1>
                <div class="detail-price">${item.dailyPrice.toLocaleString()} ₽/сутки</div>
                <p><strong>Категория:</strong> ${item.category}</p>
                <p><strong>Статус:</strong> ${statusText}</p>
                <div class="rental-dates" style="margin:15px 0;">
                    <label>Дата начала: <input type="date" id="rentalStart" /></label><br>
                    <label>Дата окончания: <input type="date" id="rentalEnd" /></label>
                </div>
                <div id="rentalPricePreview" style="font-size:20px;font-weight:700;margin:10px 0;">Стоимость: 0 ₽</div>
                <button class="btn-add" onclick="addRentalToCartFromPage('${id}')">Добавить в корзину аренды</button>
            </div>
        </div>
        <div class="detail-desc">
            <h3>📋 Описание</h3>
            <p>${item.description || 'Описание отсутствует'}</p>
        </div>
        <div class="detail-chars">
            ${Object.entries(item.specs || {}).map(([k,v]) => `
                <div class="char-item"><strong>${escapeHtml(k)}</strong><span>${escapeHtml(v)}</span></div>
            `).join('')}
        </div>
        <a href="catalog-rental.html" style="color:#f7c948;font-weight:700;text-decoration:none;">← Вернуться в каталог</a>
    `;

    const startInput = document.getElementById('rentalStart');
    const endInput = document.getElementById('rentalEnd');
    const pricePreview = document.getElementById('rentalPricePreview');

    function updatePrice() {
        const start = startInput.value;
        const end = endInput.value;
        if (start && end) {
            const days = Math.ceil((new Date(end) - new Date(start)) / (1000*60*60*24));
            if (days > 0) {
                const total = days * item.dailyPrice;
                pricePreview.textContent = `Стоимость: ${total.toLocaleString()} ₽ (${days} суток)`;
                return;
            }
        }
        pricePreview.textContent = 'Стоимость: 0 ₽';
    }

    startInput.addEventListener('change', updatePrice);
    endInput.addEventListener('change', updatePrice);
}

// ===== ДОБАВЛЕНИЕ АРЕНДЫ С СТРАНИЦЫ ТЕХНИКИ (с датами из полей) =====
function addRentalToCartFromPage(equipmentId) {
    const start = document.getElementById('rentalStart')?.value;
    const end = document.getElementById('rentalEnd')?.value;
    if (!start || !end) {
        window.showToast?.('Выберите даты аренды', 'error');
        return;
    }
    const days = Math.ceil((new Date(end) - new Date(start)) / (1000*60*60*24));
    if (days <= 0) {
        window.showToast?.('Даты некорректны', 'error');
        return;
    }
    window.database.ref('equipment/' + equipmentId).once('value', snapshot => {
        const item = snapshot.val();
        if (!item) {
            window.showToast?.('Техника не найдена', 'error');
            return;
        }
        if (typeof window.addRentalToCart === 'function') {
            window.addRentalToCart({ ...item, id: equipmentId }, start, end);
        } else {
            window.showToast?.('Ошибка: функция добавления в корзину не найдена', 'error');
        }
    });
}

// ===== МОДАЛЬНОЕ ОКНО ДЛЯ ВЫБОРА ДАТ (из каталога) =====
let rentalModalData = null; // для хранения ID техники

function showRentalModal(equipmentId) {
    // Проверяем, существует ли модальное окно, если нет – создаём
    let modal = document.getElementById('rentalModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'rentalModal';
        modal.className = 'rental-modal';
        modal.innerHTML = `
            <div class="rental-modal-content">
                <span class="rental-modal-close" onclick="closeRentalModal()">&times;</span>
                <h3>Выберите даты аренды</h3>
                <div class="rental-modal-fields">
                    <label>Дата начала: <input type="date" id="rentalModalStart" /></label>
                    <label>Дата окончания: <input type="date" id="rentalModalEnd" /></label>
                </div>
                <div id="rentalModalPrice" style="font-size:18px;font-weight:700;margin:10px 0;">Стоимость: 0 ₽</div>
                <button class="btn-add" onclick="addRentalFromModal()">Добавить в корзину</button>
            </div>
        `;
        document.body.appendChild(modal);

        // Обработчики для расчёта цены
        const startInput = document.getElementById('rentalModalStart');
        const endInput = document.getElementById('rentalModalEnd');
        const pricePreview = document.getElementById('rentalModalPrice');

        function updateModalPrice() {
            const start = startInput.value;
            const end = endInput.value;
            if (start && end && rentalModalData) {
                const days = Math.ceil((new Date(end) - new Date(start)) / (1000*60*60*24));
                if (days > 0) {
                    const total = days * rentalModalData.dailyPrice;
                    pricePreview.textContent = `Стоимость: ${total.toLocaleString()} ₽ (${days} суток)`;
                    return;
                }
            }
            pricePreview.textContent = 'Стоимость: 0 ₽';
        }

        startInput.addEventListener('change', updateModalPrice);
        endInput.addEventListener('change', updateModalPrice);

        // Закрытие по клику на фон
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeRentalModal();
        });
    }

    // Загружаем данные техники
    window.database.ref('equipment/' + equipmentId).once('value', snapshot => {
        const item = snapshot.val();
        if (!item) {
            window.showToast?.('Техника не найдена', 'error');
            return;
        }
        rentalModalData = { ...item, id: equipmentId };
        // Сбрасываем поля
        document.getElementById('rentalModalStart').value = '';
        document.getElementById('rentalModalEnd').value = '';
        document.getElementById('rentalModalPrice').textContent = 'Стоимость: 0 ₽';
        // Показываем модальное окно
        modal.style.display = 'flex';
    });
}

function closeRentalModal() {
    const modal = document.getElementById('rentalModal');
    if (modal) modal.style.display = 'none';
}

function addRentalFromModal() {
    if (!rentalModalData) {
        window.showToast?.('Ошибка: данные техники не загружены', 'error');
        return;
    }
    const start = document.getElementById('rentalModalStart')?.value;
    const end = document.getElementById('rentalModalEnd')?.value;
    if (!start || !end) {
        window.showToast?.('Выберите даты аренды', 'error');
        return;
    }
    const days = Math.ceil((new Date(end) - new Date(start)) / (1000*60*60*24));
    if (days <= 0) {
        window.showToast?.('Даты некорректны', 'error');
        return;
    }
    if (typeof window.addRentalToCart === 'function') {
        window.addRentalToCart(rentalModalData, start, end);
        closeRentalModal();
    } else {
        window.showToast?.('Ошибка: функция добавления в корзину не найдена', 'error');
    }
}

// ===== ВСПОМОГАТЕЛЬНЫЕ =====
function escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}