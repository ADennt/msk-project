// ========================================
// МСК — АДМИН-ПАНЕЛЬ (с загрузкой в Storage)
// ========================================

let adminProducts = [];
let editingId = null;
let selectedImageFile = null; // храним файл для загрузки в Storage
const FILM_TYPES = ['Тип А', 'Тип Б', 'Тип В'];

// Пагинация
let adminCurrentPage = 1;
const adminItemsPerPage = 10;
let adminSortedProducts = [];
let sortField = 'id';
let sortAsc = true;

// ===== ЗАГРУЗКА ТОВАРОВ =====
function loadProducts() {
    if (!window.database) {
        console.warn('Firebase не инициализирована');
        window.showToast?.('Ошибка подключения к Firebase', 'error');
        return;
    }
    window.database.ref('products').on('value', snapshot => {
        const data = snapshot.val() || {};
        adminProducts = Object.values(data);
        if (adminProducts.length === 0) {
            loadFromDataJson();
        } else {
            applySortAndRender();
        }
    });
}

function loadFromDataJson() {
    fetch('data.json')
        .then(resp => {
            if (!resp.ok) throw new Error('Сеть ответила ошибкой');
            return resp.json();
        })
        .then(data => {
            adminProducts = data.products || [];
            if (window.database) {
                const ref = window.database.ref('products');
                ref.once('value', snapshot => {
                    if (!snapshot.exists()) {
                        adminProducts.forEach(p => ref.push(p));
                    }
                });
            }
            applySortAndRender();
        })
        .catch(e => {
            console.error('Ошибка загрузки data.json:', e);
            adminProducts = getFallbackProducts();
            applySortAndRender();
        });
}

function getFallbackProducts() {
    return [
        { id: 1, name: '2.4 «Уступи дорогу»', type: 'warning', typeLabel: 'Предупреждающий', tag: 'Хит', image: 'images/placeholder.png', variants: [{ size: '700×700 мм', film: 'Тип А', price: 3250 }], inStock: 10 },
        { id: 2, name: '3.1 «Въезд запрещён»', type: 'forbid', typeLabel: 'Запрещающий', tag: '', image: 'images/placeholder.png', variants: [{ size: '700×700 мм', film: 'Тип А', price: 2850 }], inStock: 5 },
        { id: 3, name: '4.1.1 «Движение прямо»', type: 'mandatory', typeLabel: 'Предписывающий', tag: '', image: 'images/placeholder.png', variants: [{ size: '700×700 мм', film: 'Тип А', price: 3100 }], inStock: 8 }
    ];
}

// ===== СОРТИРОВКА И ПАГИНАЦИЯ =====
function sortTable(field) {
    if (sortField === field) {
        sortAsc = !sortAsc;
    } else {
        sortField = field;
        sortAsc = true;
    }
    applySortAndRender();
}

function applySortAndRender() {
    adminSortedProducts = [...adminProducts];
    adminSortedProducts.sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
    });
    adminCurrentPage = 1;
    renderTable();
    renderPagination();
}

function renderTable() {
    const tbody = document.getElementById('adminTableBody');
    if (!tbody) return;
    const start = (adminCurrentPage - 1) * adminItemsPerPage;
    const end = start + adminItemsPerPage;
    const pageItems = adminSortedProducts.slice(start, end);

    if (!pageItems.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;">Нет товаров</td></tr>';
        const info = document.getElementById('tableInfo');
        if (info) info.textContent = 'Всего: 0 товаров';
        return;
    }

    const typeLabels = {
        warning: 'Предупреждающий',
        priority: 'Приоритета',
        forbid: 'Запрещающий',
        mandatory: 'Предписывающий',
        info: 'Информационный',
        special: 'Особых предписаний',
        service: 'Сервиса',
        additional: 'Дополнительной информации'
    };

    tbody.innerHTML = pageItems.map(p => {
        const imageSrc = p.image || 'images/placeholder.png';
        const displayPrice = p.variants?.[0]?.price ? `${p.variants[0].price.toLocaleString()} ₽` : '—';
        return `
        <tr>
            <td>${p.id}</td>
            <td><img src="${imageSrc}" class="table-image" onerror="this.src='images/placeholder.png'" /></td>
            <td><strong>${escapeHtml(p.name)}</strong></td>
            <td>${typeLabels[p.type] || p.type}</td>
            <td>${displayPrice}</td>
            <td>${p.inStock || 0}</td>
            <td>
                <div class="actions">
                    <button class="btn-edit" onclick="editProduct(${p.id})"><i class="fas fa-pen"></i></button>
                    <button class="btn-delete" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                    <button class="btn-view-order" onclick="window.open('product.html?id=${p.id}','_blank')" style="background:#f7c948;border:none;padding:4px 10px;border-radius:20px;font-weight:700;cursor:pointer;">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');

    const info = document.getElementById('tableInfo');
    if (info) info.textContent = `Всего: ${adminSortedProducts.length} товаров`;
}

function renderPagination() {
    const container = document.getElementById('adminPagination');
    if (!container) return;
    const totalPages = Math.ceil(adminSortedProducts.length / adminItemsPerPage);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    let html = '';
    html += `<button onclick="goToAdminPage(${adminCurrentPage - 1})" ${adminCurrentPage <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button onclick="goToAdminPage(${i})" class="${i === adminCurrentPage ? 'active' : ''}">${i}</button>`;
    }
    html += `<button onclick="goToAdminPage(${adminCurrentPage + 1})" ${adminCurrentPage >= totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

function goToAdminPage(page) {
    const totalPages = Math.ceil(adminSortedProducts.length / adminItemsPerPage);
    if (page < 1 || page > totalPages) return;
    adminCurrentPage = page;
    renderTable();
    renderPagination();
}

// ===== ФОРМА =====
function showAddForm() {
    document.getElementById('adminForm').style.display = 'block';
    document.getElementById('formTitle').textContent = '➕ Добавить товар';
    document.getElementById('editId').value = '';
    clearForm();
    removeImage();
    loadVariants([]);
    document.getElementById('adminForm').scrollIntoView({ behavior: 'smooth' });
}

function editProduct(id) {
    const product = adminProducts.find(p => p.id === id);
    if (!product) {
        window.showToast?.('Товар не найден', 'error');
        return;
    }
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

    // Если есть изображение – показываем превью, но не файл
    if (product.image && product.image !== 'images/placeholder.png') {
        updateImagePreview(product.image);
        document.getElementById('removeImageBtn').style.display = 'inline-flex';
        selectedImageFile = null; // не перезаписываем существующий файл
    } else {
        removeImage();
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
    selectedImageFile = null;
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
    else window.showToast?.('Должен быть хотя бы один вариант', 'error');
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
    const imageInput = document.getElementById('fImage');
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                window.showToast?.('Файл > 5MB', 'error');
                this.value = '';
                return;
            }
            if (!file.type.startsWith('image/')) {
                window.showToast?.('Не изображение', 'error');
                this.value = '';
                return;
            }
            selectedImageFile = file;
            const reader = new FileReader();
            reader.onload = function(ev) {
                updateImagePreview(ev.target.result);
                document.getElementById('removeImageBtn').style.display = 'inline-flex';
            };
            reader.readAsDataURL(file);
        });
    }
});

function updateImagePreview(src) {
    const preview = document.getElementById('imagePreview');
    if (preview) {
        preview.innerHTML = `<img src="${src}" />`;
        preview.classList.add('has-image');
    }
}

function removeImage() {
    selectedImageFile = null;
    const preview = document.getElementById('imagePreview');
    if (preview) {
        preview.innerHTML = `<i class="fas fa-image"></i><span>Выберите изображение</span>`;
        preview.classList.remove('has-image');
    }
    const input = document.getElementById('fImage');
    if (input) input.value = '';
    document.getElementById('removeImageBtn').style.display = 'none';
}

// ===== СОХРАНЕНИЕ (с загрузкой в Storage) =====
function saveProduct() {
    const editId = document.getElementById('editId').value;
    const name = document.getElementById('fName').value.trim();
    const type = document.getElementById('fType').value;
    const tag = document.getElementById('fTag').value.trim();
    const inStock = parseInt(document.getElementById('fStock').value) || 0;
    const description = document.getElementById('fDescription').value.trim();
    const material = document.getElementById('fMaterial').value.trim() || 'Оцинкованная сталь';
    const variants = getVariantsFromForm();

    if (!name) {
        window.showToast?.('Введите название', 'error');
        document.getElementById('fName').focus();
        return;
    }
    if (!variants.length) {
        window.showToast?.('Добавьте хотя бы один вариант', 'error');
        return;
    }

    let id = editId ? parseInt(editId) : Date.now();
    const typeLabels = {
        warning: 'Предупреждающий',
        priority: 'Приоритета',
        forbid: 'Запрещающий',
        mandatory: 'Предписывающий',
        info: 'Информационный',
        special: 'Особых предписаний',
        service: 'Сервиса',
        additional: 'Дополнительной информации'
    };

    // Функция сохранения с готовым URL изображения
    function saveProductWithImage(imageUrl) {
        const productData = {
            id,
            name,
            type,
            typeLabel: typeLabels[type] || type,
            tag,
            inStock,
            image: imageUrl || 'images/placeholder.png',
            description: description || 'Описание отсутствует',
            characteristics: { material },
            variants
        };

        if (!window.database) {
            window.showToast?.('Ошибка подключения к Firebase', 'error');
            return;
        }

        const ref = window.database.ref('products');
        if (editId) {
            ref.orderByChild('id').equalTo(id).once('value', snapshot => {
                const data = snapshot.val();
                if (data) {
                    const key = Object.keys(data)[0];
                    ref.child(key).update(productData)
                        .then(() => {
                            window.showToast?.('✅ Товар обновлён', 'success');
                            hideForm();
                        })
                        .catch(() => window.showToast?.('Ошибка обновления', 'error'));
                } else {
                    ref.push(productData)
                        .then(() => {
                            window.showToast?.('✅ Товар добавлен', 'success');
                            hideForm();
                        })
                        .catch(() => window.showToast?.('Ошибка добавления', 'error'));
                }
            });
        } else {
            ref.push(productData)
                .then(() => {
                    window.showToast?.('✅ Товар добавлен', 'success');
                    hideForm();
                })
                .catch(() => window.showToast?.('Ошибка добавления', 'error'));
        }
    }

    // Если есть новый файл – загружаем в Storage
    if (selectedImageFile) {
        window.uploadProductImage(selectedImageFile, id)
            .then(url => {
                saveProductWithImage(url);
            })
            .catch(err => {
                console.error('Ошибка загрузки изображения:', err);
                window.showToast?.('Ошибка загрузки изображения, используем заглушку', 'error');
                saveProductWithImage('images/placeholder.png');
            });
    } else {
        // Если файла нет – используем существующее (при редактировании) или заглушку
        let existingImage = 'images/placeholder.png';
        if (editId) {
            const existing = adminProducts.find(p => p.id === parseInt(editId));
            if (existing && existing.image) existingImage = existing.image;
        }
        saveProductWithImage(existingImage);
    }
}

// ===== УДАЛЕНИЕ =====
function deleteProduct(id) {
    if (!confirm('Удалить товар?')) return;
    if (!window.database) return;
    const ref = window.database.ref('products');
    ref.orderByChild('id').equalTo(id).once('value', snapshot => {
        const data = snapshot.val();
        if (data) {
            const key = Object.keys(data)[0];
            ref.child(key).remove()
                .then(() => {
                    window.showToast?.('🗑️ Товар удалён', 'info');
                })
                .catch(() => {
                    window.showToast?.('Ошибка удаления', 'error');
                });
        }
    });
}

// ===== ЭКСПОРТ / ИМПОРТ =====
function exportData() {
    const dataStr = JSON.stringify({ products: adminProducts }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
    window.showToast?.('✅ Данные экспортированы', 'success');
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
                if (!data.products || !Array.isArray(data.products)) {
                    window.showToast?.('Неверный формат', 'error');
                    return;
                }
                if (!window.database) {
                    window.showToast?.('Ошибка подключения к Firebase', 'error');
                    return;
                }
                const ref = window.database.ref('products');
                ref.remove().then(() => {
                    const promises = data.products.map(p => ref.push(p));
                    Promise.all(promises)
                        .then(() => {
                            window.showToast?.('✅ Данные импортированы', 'success');
                        })
                        .catch(() => {
                            window.showToast?.('Ошибка импорта', 'error');
                        });
                });
            } catch (err) {
                window.showToast?.('Ошибка чтения файла', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ===== ВСПОМОГАТЕЛЬНЫЕ =====
function escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function logout() {
    sessionStorage.removeItem('adminAuth');
    window.location.href = 'login.html';
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', loadProducts);

// Экспортируем функции глобально для onclick
window.showAddForm = showAddForm;
window.editProduct = editProduct;
window.hideForm = hideForm;
window.saveProduct = saveProduct;
window.deleteProduct = deleteProduct;
window.addVariantRow = addVariantRow;
window.removeVariantRow = removeVariantRow;
window.removeImage = removeImage;
window.sortTable = sortTable;
window.goToAdminPage = goToAdminPage;
window.exportData = exportData;
window.importData = importData;
window.logout = logout;