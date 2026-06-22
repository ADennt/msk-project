// ========================================
// МСК — АДМИН-ПАНЕЛЬ (GitHub Pages)
// ========================================

let products = [];
let editingId = null;
let selectedImageData = null; // null – не выбрано, '' – удалено, строка – новое изображение
const FILM_TYPES = ['Тип А', 'Тип Б', 'Тип В'];

// ===== ЗАГРУЗКА =====
function loadProducts() {
    const saved = localStorage.getItem('msk_products');
    products = saved ? JSON.parse(saved) : [];
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('adminTableBody');
    if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;">Нет товаров</td></tr>';
        return;
    }
    tbody.innerHTML = products.map(p => {
        const imageSrc = p.image || 'images/placeholder.png';
        const typeLabels = { warning:'Предупреждающий', forbid:'Запрещающий', mandatory:'Предписывающий', info:'Информационный' };
        const displayPrice = p.variants?.[0]?.price ? `${p.variants[0].price.toLocaleString()} ₽` : '—';
        return `
        <tr>
            <td>${p.id}</td>
            <td><img src="${imageSrc}" class="table-image" onerror="this.src='images/placeholder.png'" /></td>
            <td><strong>${p.name}</strong></td>
            <td>${typeLabels[p.type] || p.type}</td>
            <td>${displayPrice}</td>
            <td>${p.inStock || 0}</td>
            <td>
                <div class="actions">
                    <button class="btn-edit" onclick="editProduct(${p.id})"><i class="fas fa-pen"></i></button>
                    <button class="btn-delete" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `}).join('');
}

// ===== ФОРМА =====
function showAddForm() {
    document.getElementById('adminForm').style.display = 'block';
    document.getElementById('formTitle').textContent = '➕ Добавить товар';
    document.getElementById('editId').value = '';
    clearForm();
    removeImage(); // сбрасываем изображение
    loadVariants([]);
    document.getElementById('adminForm').scrollIntoView({ behavior: 'smooth' });
}

function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    editingId = id;
    document.getElementById('adminForm').style.display = 'block';
    document.getElementById('formTitle').textContent = '✏️ Редактировать товар';
    document.getElementById('editId').value = id;

    document.getElementById('fName').value = product.name;
    document.getElementById('fType').value = product.type;
    document.getElementById('fTag').value = product.tag || '';
    document.getElementById('fStock').value = product.inStock || 0;
    document.getElementById('fDescription').value = product.description || '';
    document.getElementById('fMaterial').value = product.characteristics?.material || 'Оцинкованная сталь';

    // Загружаем изображение, если есть
    if (product.image && product.image !== 'images/placeholder.png') {
        selectedImageData = product.image; // храним строку
        updateImagePreview(product.image);
        document.getElementById('removeImageBtn').style.display = 'inline-flex';
    } else {
        removeImage(); // установит selectedImageData = null и сбросит preview
    }

    if (product.variants) loadVariants(product.variants);
    else loadVariants([]);
    document.getElementById('adminForm').scrollIntoView({ behavior: 'smooth' });
}

function hideForm() {
    document.getElementById('adminForm').style.display = 'none';
    clearForm();
    removeImage();
    clearVariants();
    editingId = null;
}

function clearForm() {
    document.getElementById('fName').value = '';
    document.getElementById('fType').value = 'warning';
    document.getElementById('fTag').value = '';
    document.getElementById('fStock').value = '0';
    document.getElementById('fDescription').value = '';
    document.getElementById('fMaterial').value = 'Оцинкованная сталь';
}

// ===== ВАРИАНТЫ =====
function addVariantRow(size = '', film = '', price = '') {
    const container = document.getElementById('variantsContainer');
    const row = document.createElement('div');
    row.className = 'variant-row';
    const filmOptions = FILM_TYPES.map(f => `<option value="${f}" ${f === film ? 'selected':''}>${f}</option>`).join('');
    row.innerHTML = `
        <div class="variant-input-group">
            <input type="text" class="variant-size" placeholder="Размер" value="${size}" />
            <select class="variant-film">${filmOptions}</select>
            <input type="number" class="variant-price" placeholder="Цена" value="${price}" />
            <button type="button" class="btn-remove-variant" onclick="removeVariantRow(this)"><i class="fas fa-times"></i></button>
        </div>
    `;
    container.appendChild(row);
}

function removeVariantRow(btn) {
    const rows = document.querySelectorAll('.variant-row');
    if (rows.length > 1) btn.closest('.variant-row').remove();
    else alert('Должен быть хотя бы один вариант');
}

function clearVariants() {
    document.getElementById('variantsContainer').innerHTML = '';
}

function loadVariants(variants) {
    clearVariants();
    if (variants.length) variants.forEach(v => addVariantRow(v.size, v.film, v.price));
    else addVariantRow();
}

function getVariantsFromForm() {
    const rows = document.querySelectorAll('.variant-row');
    const variants = [];
    rows.forEach(row => {
        const size = row.querySelector('.variant-size').value.trim();
        const film = row.querySelector('.variant-film').value;
        const price = parseFloat(row.querySelector('.variant-price').value);
        if (size && film && !isNaN(price) && price > 0) variants.push({ size, film, price });
    });
    return variants;
}

// ===== ИЗОБРАЖЕНИЕ =====
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('fImage').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5*1024*1024) { alert('Файл > 5MB'); this.value=''; return; }
        if (!file.type.startsWith('image/')) { alert('Не изображение'); this.value=''; return; }
        const reader = new FileReader();
        reader.onload = function(ev) {
            selectedImageData = ev.target.result; // сохраняем base64
            updateImagePreview(selectedImageData);
            document.getElementById('removeImageBtn').style.display = 'inline-flex';
        };
        reader.readAsDataURL(file);
    });
});

function updateImagePreview(src) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = `<img src="${src}" />`;
    preview.classList.add('has-image');
}

function removeImage() {
    selectedImageData = null; // null означает "не выбрано новое, оставить как было"
    // Визуально сбрасываем на заглушку
    document.getElementById('imagePreview').innerHTML = `<i class="fas fa-image"></i><span>Выберите изображение</span>`;
    document.getElementById('imagePreview').classList.remove('has-image');
    document.getElementById('fImage').value = '';
    document.getElementById('removeImageBtn').style.display = 'none';
}

// Функция для явного удаления изображения (кнопка "Удалить")
function deleteImage() {
    selectedImageData = ''; // пустая строка означает "удалить"
    document.getElementById('imagePreview').innerHTML = `<i class="fas fa-image"></i><span>Изображение удалено</span>`;
    document.getElementById('imagePreview').classList.remove('has-image');
    document.getElementById('fImage').value = '';
    document.getElementById('removeImageBtn').style.display = 'none';
}

// ===== СОХРАНЕНИЕ =====
function saveProduct() {
    const editId = document.getElementById('editId').value;
    const name = document.getElementById('fName').value.trim();
    const type = document.getElementById('fType').value;
    const tag = document.getElementById('fTag').value.trim();
    const inStock = parseInt(document.getElementById('fStock').value) || 0;
    const description = document.getElementById('fDescription').value.trim();
    const material = document.getElementById('fMaterial').value.trim() || 'Оцинкованная сталь';
    const variants = getVariantsFromForm();

    if (!name) { alert('Введите название'); document.getElementById('fName').focus(); return; }
    if (!variants.length) { alert('Добавьте хотя бы один вариант'); return; }

    let image = '';
    // Приоритет: если выбран новый файл (selectedImageData – строка base64) – используем его
    if (typeof selectedImageData === 'string' && selectedImageData.startsWith('data:image')) {
        image = selectedImageData;
    } else if (selectedImageData === '') {
        // Явно удалено – ставим заглушку
        image = 'images/placeholder.png';
    } else if (editId) {
        // Иначе оставляем старое изображение, если оно есть
        const existing = products.find(p => p.id === parseInt(editId));
        if (existing && existing.image) {
            image = existing.image;
        } else {
            image = 'images/placeholder.png';
        }
    } else {
        image = 'images/placeholder.png';
    }

    let id = editId ? parseInt(editId) : Date.now();
    const typeLabels = { warning:'Предупреждающий', forbid:'Запрещающий', mandatory:'Предписывающий', info:'Информационный' };

    const productData = {
        id, name, type, typeLabel: typeLabels[type] || type,
        tag, inStock, image, description: description || 'Описание отсутствует',
        characteristics: { material },
        variants
    };

    const idx = products.findIndex(p => p.id === id);
    if (idx >= 0) products[idx] = productData;
    else products.push(productData);

    localStorage.setItem('msk_products', JSON.stringify(products));
    renderTable();
    hideForm();
    alert('✅ Товар сохранён!');
}

// ===== УДАЛЕНИЕ =====
function deleteProduct(id) {
    if (!confirm('Удалить товар?')) return;
    products = products.filter(p => p.id !== id);
    localStorage.setItem('msk_products', JSON.stringify(products));
    renderTable();
}

// ===== ЭКСПОРТ / ИМПОРТ =====
function exportData() {
    const dataStr = JSON.stringify({ products }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.products) {
                    products = data.products;
                    localStorage.setItem('msk_products', JSON.stringify(products));
                    renderTable();
                    alert('✅ Данные импортированы');
                } else alert('Неверный формат');
            } catch(err) { alert('Ошибка чтения'); }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ===== ВЫХОД =====
function logout() {
    sessionStorage.removeItem('adminAuth');
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', loadProducts);