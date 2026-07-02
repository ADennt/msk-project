// ========================================
// МСК — АДМИНКА: УПРАВЛЕНИЕ ТЕХНИКОЙ (rental-admin.js)
// ========================================

let editingEquipmentId = null;
let selectedImageFile = null;
let currentImageUrl = null;

// ===== ЗАГРУЗКА СПИСКА ТЕХНИКИ =====
function loadEquipment() {
    if (!window.database) {
        showToast('Ошибка подключения к Firebase', 'error');
        return;
    }
    window.database.ref('equipment').on('value', snapshot => {
        const data = snapshot.val() || {};
        const items = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        renderEquipmentTable(items);
    });
}

// ===== ОТРИСОВКА ТАБЛИЦЫ =====
function renderEquipmentTable(items) {
    const tbody = document.getElementById('equipmentAdminBody');
    if (!tbody) return;
    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;">Техника не добавлена</td></tr>';
        return;
    }

    const statusMap = { 'available': 'Доступна', 'rented': 'В аренде', 'maintenance': 'На ремонте' };

    tbody.innerHTML = items.map(e => `
        <tr>
            <td><strong>${escapeHtml(e.name)}</strong></td>
            <td>${escapeHtml(e.category)}</td>
            <td>${e.dailyPrice.toLocaleString()} ₽</td>
            <td>
                <select class="status-select" onchange="updateEquipmentStatus('${e.id}', this.value)">
                    <option value="available" ${e.status === 'available' ? 'selected' : ''}>Доступна</option>
                    <option value="rented" ${e.status === 'rented' ? 'selected' : ''}>В аренде</option>
                    <option value="maintenance" ${e.status === 'maintenance' ? 'selected' : ''}>На ремонте</option>
                </select>
            </td>
            <td>
                <button class="btn-edit" onclick="editEquipment('${e.id}')"><i class="fas fa-pen"></i></button>
                <button class="btn-delete" onclick="deleteEquipment('${e.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// ===== ОБНОВЛЕНИЕ СТАТУСА =====
function updateEquipmentStatus(id, newStatus) {
    if (!window.database) {
        showToast('Ошибка подключения к Firebase', 'error');
        return;
    }
    window.database.ref('equipment/' + id).update({ status: newStatus })
        .then(() => showToast('✅ Статус обновлён', 'success'))
        .catch(err => {
            console.error('Ошибка обновления статуса:', err);
            showToast('Ошибка обновления статуса', 'error');
        });
}

// ===== ФОРМА =====
function showAddEquipmentForm() {
    document.getElementById('equipmentForm').style.display = 'block';
    document.getElementById('formTitle').textContent = '➕ Добавить технику';
    document.getElementById('editEquipmentId').value = '';
    clearEquipmentForm();
    removeEquipmentImage();
    document.getElementById('equipmentForm').scrollIntoView({ behavior: 'smooth' });
}

function editEquipment(id) {
    window.database.ref('equipment/' + id).once('value', snapshot => {
        const item = snapshot.val();
        if (!item) {
            showToast('Техника не найдена', 'error');
            return;
        }
        document.getElementById('equipmentForm').style.display = 'block';
        document.getElementById('formTitle').textContent = '✏️ Редактировать технику';
        document.getElementById('editEquipmentId').value = id; // ← сохраняем ID
        document.getElementById('fEqName').value = item.name || '';
        document.getElementById('fEqCategory').value = item.category || '';
        document.getElementById('fEqDailyPrice').value = item.dailyPrice || 0;
        document.getElementById('fEqDeposit').value = item.deposit || 0;
        document.getElementById('fEqStatus').value = item.status || 'available';
        document.getElementById('fEqDescription').value = item.description || '';
        document.getElementById('fEqSpecs').value = item.specs ? JSON.stringify(item.specs) : '';

        if (item.image) {
            currentImageUrl = item.image;
            updateEquipmentImagePreview(currentImageUrl);
            document.getElementById('removeEqImageBtn').style.display = 'inline-flex';
        } else {
            removeEquipmentImage();
        }
        document.getElementById('equipmentForm').scrollIntoView({ behavior: 'smooth' });
    });
}

function hideEquipmentForm() {
    document.getElementById('equipmentForm').style.display = 'none';
    clearEquipmentForm();
    removeEquipmentImage();
    editingEquipmentId = null;
}

function clearEquipmentForm() {
    document.getElementById('fEqName').value = '';
    document.getElementById('fEqCategory').value = '';
    document.getElementById('fEqDailyPrice').value = '0';
    document.getElementById('fEqDeposit').value = '0';
    document.getElementById('fEqStatus').value = 'available';
    document.getElementById('fEqDescription').value = '';
    document.getElementById('fEqSpecs').value = '';
}

// ===== ИЗОБРАЖЕНИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('fEqImageFile');
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                showToast('Файл > 5MB', 'error');
                this.value = '';
                return;
            }
            if (!file.type.startsWith('image/')) {
                showToast('Не изображение', 'error');
                this.value = '';
                return;
            }
            selectedImageFile = file;
            const reader = new FileReader();
            reader.onload = function(ev) {
                updateEquipmentImagePreview(ev.target.result);
                document.getElementById('removeEqImageBtn').style.display = 'inline-flex';
            };
            reader.readAsDataURL(file);
        });
    }
});

function updateEquipmentImagePreview(src) {
    const preview = document.getElementById('equipmentImagePreview');
    if (preview) {
        preview.innerHTML = `<img src="${src}" />`;
        preview.classList.add('has-image');
    }
}

function removeEquipmentImage() {
    selectedImageFile = null;
    currentImageUrl = null;
    const preview = document.getElementById('equipmentImagePreview');
    if (preview) {
        preview.innerHTML = `<i class="fas fa-image"></i><span>Выберите изображение</span>`;
        preview.classList.remove('has-image');
    }
    const input = document.getElementById('fEqImageFile');
    if (input) input.value = '';
    document.getElementById('removeEqImageBtn').style.display = 'none';
}

// ===== ЗАГРУЗКА ИЗОБРАЖЕНИЯ В STORAGE =====
function uploadEquipmentImage(file, equipmentId) {
    return new Promise((resolve, reject) => {
        if (!window.storage) {
            reject(new Error('Firebase Storage не инициализирован'));
            return;
        }
        const ref = window.storage.ref(`equipment/${equipmentId}_${Date.now()}.jpg`);
        const metadata = { contentType: file.type };
        const uploadTask = ref.put(file, metadata);
        uploadTask.on('state_changed',
            null,
            (error) => {
                console.error('Ошибка загрузки:', error);
                reject(error);
            },
            () => {
                ref.getDownloadURL().then(url => resolve(url))
                   .catch(err => reject(err));
            }
        );
    });
}

// ===== СОХРАНЕНИЕ (исправленное) =====
function saveEquipment() {
    console.log('🔧 saveEquipment вызвана');

    try {
        const editId = document.getElementById('editEquipmentId').value; // строка
        console.log('editId:', editId);

        const name = document.getElementById('fEqName').value.trim();
        const category = document.getElementById('fEqCategory').value.trim();
        const dailyPrice = parseFloat(document.getElementById('fEqDailyPrice').value) || 0;
        const deposit = parseFloat(document.getElementById('fEqDeposit').value) || 0;
        const status = document.getElementById('fEqStatus').value;
        const description = document.getElementById('fEqDescription').value.trim();
        const specsStr = document.getElementById('fEqSpecs').value.trim();

        let specs = {};
        try { specs = JSON.parse(specsStr); } catch(e) {
            console.warn('Ошибка парсинга характеристик:', e);
        }

        if (!name || !category || dailyPrice <= 0) {
            showToast('Заполните обязательные поля (название, категория, цена)', 'error');
            return;
        }

        // Функция сохранения с URL изображения
        function saveWithImage(imageUrl) {
            const data = {
                name,
                category,
                dailyPrice,
                deposit,
                status,
                image: imageUrl || null,
                description,
                specs,
                updatedAt: new Date().toISOString()
            };

            if (!window.database) {
                showToast('Ошибка подключения к Firebase', 'error');
                return;
            }

            const ref = window.database.ref('equipment');

            if (editId) {
                // РЕДАКТИРОВАНИЕ: обновляем существующую запись
                console.log('🔄 Обновление техники с ID:', editId);
                ref.child(editId).update(data)
                    .then(() => {
                        showToast('✅ Техника обновлена', 'success');
                        hideEquipmentForm();
                    })
                    .catch(err => {
                        console.error('❌ Ошибка обновления:', err);
                        showToast('Ошибка обновления: ' + err.message, 'error');
                    });
            } else {
                // ДОБАВЛЕНИЕ: создаём новую запись
                console.log('➕ Добавление новой техники');
                ref.push(data)
                    .then(() => {
                        showToast('✅ Техника добавлена', 'success');
                        hideEquipmentForm();
                    })
                    .catch(err => {
                        console.error('❌ Ошибка добавления:', err);
                        showToast('Ошибка добавления: ' + err.message, 'error');
                    });
            }
        }

        // Если есть новый файл – загружаем
        if (selectedImageFile) {
            const equipmentId = editId || Date.now().toString();
            console.log('📤 Загрузка изображения для:', equipmentId);
            uploadEquipmentImage(selectedImageFile, equipmentId)
                .then(url => {
                    console.log('✅ Изображение загружено:', url);
                    saveWithImage(url);
                })
                .catch(err => {
                    console.error('Ошибка загрузки изображения:', err);
                    showToast('Ошибка загрузки изображения, используем старое', 'warning');
                    saveWithImage(currentImageUrl || null);
                });
        } else {
            console.log('🖼️ Без нового изображения');
            saveWithImage(currentImageUrl || null);
        }

    } catch (err) {
        console.error('❌ Ошибка в saveEquipment:', err);
        showToast('Произошла ошибка при сохранении: ' + err.message, 'error');
    }
}

// ===== УДАЛЕНИЕ =====
function deleteEquipment(id) {
    if (!confirm('Удалить эту единицу техники?')) return;
    window.database.ref('equipment/' + id).remove()
        .then(() => showToast('🗑️ Техника удалена', 'info'))
        .catch(() => showToast('Ошибка удаления', 'error'));
}

// ===== ВСПОМОГАТЕЛЬНЫЕ =====
function escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function showToast(message, type = 'success') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        alert(message);
    }
}

document.addEventListener('DOMContentLoaded', loadEquipment);