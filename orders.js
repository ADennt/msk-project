// ========================================
// МСК — УПРАВЛЕНИЕ ЗАКАЗАМИ (с Firebase)
// ========================================

let allOrders = [];
let filteredOrders = [];

function loadOrders() {
  database.ref('orders').on('value', snapshot => {
    const data = snapshot.val();
    if (data) {
      allOrders = Object.values(data);
    } else {
      allOrders = [];
    }
    applyFilters();
  });
}

function renderOrders(ordersToRender) {
  const tbody = document.getElementById('ordersTableBody');
  if (!ordersToRender || !ordersToRender.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#999;">Нет заказов</td></tr>';
    updateOrderCount(0);
    return;
  }
  ordersToRender.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  tbody.innerHTML = ordersToRender.map(o => {
    const statusClass = {
      'новый': 'new',
      'в обработке': 'processing',
      'отправлен': 'shipped',
      'доставлен': 'delivered',
      'отменён': 'cancelled'
    }[o.status] || '';
    return `
    <tr>
      <td><strong>#${o.id}</strong></td>
      <td>${o.name || 'Не указан'}</td>
      <td>${o.phone || 'Не указан'}</td>
      <td>${o.items?.length || 0}</td>
      <td><strong>${(o.total || 0).toLocaleString()} ₽</strong></td>
      <td>
        <span class="order-status ${statusClass}">${o.status}</span>
        <select class="status-select" onchange="updateStatus(${o.id}, this.value)">
          <option value="новый" ${o.status === 'новый' ? 'selected':''}>Новый</option>
          <option value="в обработке" ${o.status === 'в обработке' ? 'selected':''}>В обработке</option>
          <option value="отправлен" ${o.status === 'отправлен' ? 'selected':''}>Отправлен</option>
          <option value="доставлен" ${o.status === 'доставлен' ? 'selected':''}>Доставлен</option>
          <option value="отменён" ${o.status === 'отменён' ? 'selected':''}>Отменён</option>
        </select>
      </td>
      <td style="font-size:13px;color:#888;">${new Date(o.createdAt).toLocaleString('ru-RU')}</td>
      <td>
        <button class="btn-view" onclick="viewOrder(${o.id})"><i class="fas fa-eye"></i></button>
        <button class="btn-invoice" onclick="showInvoice(${o.id})"><i class="fas fa-file-invoice"></i></button>
        <button class="btn-delete" onclick="deleteOrder(${o.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
    `;
  }).join('');
  updateOrderCount(ordersToRender.length);
}

function updateOrderCount(count) {
  document.getElementById('orderCountNumber').textContent = count;
}

function applyFilters() {
  const statusFilter = document.getElementById('statusFilter').value;
  const searchQuery = document.getElementById('searchOrders').value.trim().toLowerCase();

  let statusFiltered = (statusFilter === 'all') ? [...allOrders] : allOrders.filter(o => o.status === statusFilter);

  if (searchQuery) {
    filteredOrders = statusFiltered.filter(o => {
      if (String(o.id).includes(searchQuery)) return true;
      if (o.name && o.name.toLowerCase().includes(searchQuery)) return true;
      if (o.phone && o.phone.includes(searchQuery)) return true;
      if (o.email && o.email.toLowerCase().includes(searchQuery)) return true;
      if (o.address && o.address.toLowerCase().includes(searchQuery)) return true;
      if (o.items && o.items.some(item => item.name && item.name.toLowerCase().includes(searchQuery))) return true;
      const dateStr = new Date(o.createdAt).toLocaleString('ru-RU');
      if (dateStr.toLowerCase().includes(searchQuery)) return true;
      return false;
    });
  } else {
    filteredOrders = statusFiltered;
  }

  renderOrders(filteredOrders);
}

function updateStatus(id, status) {
  const order = allOrders.find(o => o.id === id);
  if (order) {
    database.ref('orders').once('value').then(snapshot => {
      const data = snapshot.val();
      if (data) {
        let key = null;
        for (const k in data) {
          if (data[k].id === id) {
            key = k;
            break;
          }
        }
        if (key) {
          database.ref('orders/' + key).update({ status: status });
        }
      }
    });
  }
}

function deleteOrder(id) {
  if (!confirm('Удалить заказ?')) return;
  database.ref('orders').once('value').then(snapshot => {
    const data = snapshot.val();
    if (data) {
      for (const k in data) {
        if (data[k].id === id) {
          database.ref('orders/' + k).remove().then(() => {
            loadOrders();
          });
          return;
        }
      }
    }
  });
}

function viewOrder(id) {
  const order = allOrders.find(o => o.id === id);
  if (!order) return;
  const modal = document.getElementById('orderModal');
  const content = document.getElementById('orderModalContent');

  let itemsHtml = '';
  if (order.items && order.items.length) {
    itemsHtml = order.items.map(i => `
      <div class="item-row">
        <span>${i.name} (${i.size || '—'}, плёнка ${i.film || '—'}) × ${i.quantity}</span>
        <span>${(i.price * i.quantity).toLocaleString()} ₽</span>
      </div>
    `).join('');
  } else {
    itemsHtml = '<p style="color:#888;">Нет товаров</p>';
  }

  content.innerHTML = `
    <h2>Заказ #${order.id}</h2>
    <div class="info-block">
      <p><strong>Имя:</strong> ${order.name || 'Не указано'}</p>
      <p><strong>Телефон:</strong> ${order.phone || 'Не указан'}</p>
      <p><strong>Email:</strong> ${order.email || 'Не указан'}</p>
      <p><strong>Адрес:</strong> ${order.address || 'Не указан'}</p>
      ${order.comment ? `<p><strong>Комментарий:</strong> ${order.comment}</p>` : ''}
    </div>
    <div class="items-list">
      <strong>Состав заказа:</strong>
      ${itemsHtml}
      <div class="total">Итого: ${(order.total || 0).toLocaleString()} ₽</div>
    </div>
    <div style="margin:15px 0;">
      <strong>Статус:</strong> ${order.status}
      &nbsp;|&nbsp; <strong>Дата:</strong> ${new Date(order.createdAt).toLocaleString('ru-RU')}
    </div>
    <button class="close-btn" onclick="closeModal()">Закрыть</button>
  `;
  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('orderModal').style.display = 'none';
}

// ===== ФУНКЦИЯ ПОКАЗА НАКЛАДНОЙ =====
function showInvoice(id) {
  const order = allOrders.find(o => o.id === id);
  if (!order) return;

  const modal = document.getElementById('invoiceModal');
  const content = document.getElementById('invoiceContent');

  // Формируем таблицу товаров
  let itemsHtml = '';
  if (order.items && order.items.length) {
    itemsHtml = `
      <table class="invoice-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Наименование</th>
            <th>Размер</th>
            <th>Плёнка</th>
            <th>Кол-во</th>
            <th>Цена</th>
            <th>Сумма</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.name}</td>
              <td>${item.size || '—'}</td>
              <td>${item.film || '—'}</td>
              <td>${item.quantity}</td>
              <td>${item.price.toLocaleString()} ₽</td>
              <td>${(item.price * item.quantity).toLocaleString()} ₽</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6" style="text-align:right; font-weight:700;">Итого:</td>
            <td style="font-weight:900;">${order.total.toLocaleString()} ₽</td>
          </tr>
        </tfoot>
      </table>
    `;
  } else {
    itemsHtml = '<p style="color:#888;">Нет товаров</p>';
  }

  // Дата в формате ДД.ММ.ГГГГ
  const orderDate = new Date(order.createdAt);
  const dateStr = orderDate.toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const timeStr = orderDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit', minute: '2-digit'
  });

  // Документ накладной
  content.innerHTML = `
    <div class="invoice-document">
      <div class="invoice-header-block">
        <div class="invoice-company">
          <h1>ООО «МСК-Знак»</h1>
          <p>ИНН 1234567890 / КПП 123456789</p>
          <p>Лихачевский пр-д, 31, Долгопрудный, Московская обл., 141701</p>
          <p>Тел.: 8 (800) 555-22-33, email: info@msk.ru</p>
        </div>
        <div class="invoice-details">
          <p><strong>Накладная №</strong> ${order.id}</p>
          <p><strong>Дата:</strong> ${dateStr} ${timeStr}</p>
          <p><strong>Статус:</strong> ${order.status}</p>
        </div>
      </div>
      
      <div class="invoice-client">
        <p><strong>Клиент:</strong> ${order.name || 'Не указан'}</p>
        <p><strong>Телефон:</strong> ${order.phone || 'Не указан'}</p>
        <p><strong>Email:</strong> ${order.email || 'Не указан'}</p>
        <p><strong>Адрес доставки:</strong> ${order.address || 'Не указан'}</p>
        ${order.comment ? `<p><strong>Комментарий:</strong> ${order.comment}</p>` : ''}
      </div>

      <div class="invoice-items">
        ${itemsHtml}
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeInvoice() {
  document.getElementById('invoiceModal').style.display = 'none';
}

function logout() {
  sessionStorage.removeItem('adminAuth');
  window.location.href = 'login.html';
}

waitForFirebase(() => {
  loadOrders();
});

document.addEventListener('visibilitychange', function() {
  if (!document.hidden) {
    loadOrders();
  }
});