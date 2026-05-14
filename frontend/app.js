const API_BASE = (() => {
  const isBackendOrigin = window.location.hostname === 'localhost' && window.location.port === '5000';
  if (isBackendOrigin) return '/api/v1';
  if (window.location.hostname !== 'localhost' && window.location.protocol !== 'file:') return '/api/v1';
  return 'http://localhost:5000/api/v1';
})();
const API_ORIGIN = API_BASE.replace(/\/api\/v1$/, '');
const PLACEHOLDER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#eef5f3"/><text x="50" y="54" text-anchor="middle" font-family="Arial" font-size="14" fill="#66737f">IMG</text></svg>';
const PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(PLACEHOLDER_SVG)}`;

const state = {
  token: localStorage.getItem('ims_token'),
  user: JSON.parse(localStorage.getItem('ims_user') || 'null'),
  products: [],
  orders: [],
  users: [],
  activeView: 'dashboard',
  editingProductId: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function showMessage(message, isError = false) {
  const box = $('#app-message');
  box.textContent = message;
  box.classList.remove('hidden');
  box.style.color = isError ? '#a32d42' : '#053329';
  box.style.background = isError ? '#ffe2e8' : '#ddf7ee';
  window.setTimeout(() => box.classList.add('hidden'), 4200);
}

function setLoading(form, isLoading) {
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = isLoading;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = 'Please wait...';
    return;
  }
  if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }
}

async function api(path, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  }).catch(() => {
    throw new Error('Cannot reach the backend API. Start it with npm run dev, then open http://localhost:5000');
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with ${response.status}`);
  }

  return payload;
}

function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('ims_token', token);
  localStorage.setItem('ims_user', JSON.stringify(user));
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('ims_token');
  localStorage.removeItem('ims_user');
}

function applyRoleVisibility() {
  const role = state.user?.role;
  $$('.admin-only').forEach((item) => item.classList.toggle('hidden', role !== 'ADMIN'));
  $$('.staff-admin-only').forEach((item) => item.classList.toggle('hidden', !['ADMIN', 'STAFF'].includes(role)));
  $('#session-role').textContent = state.user ? `${state.user.name} - ${state.user.role}` : 'Operations console';
}

function showAuth() {
  $('#auth-screen').classList.remove('hidden');
  $('#app-screen').classList.add('hidden');
}

async function showApp() {
  $('#auth-screen').classList.add('hidden');
  $('#app-screen').classList.remove('hidden');
  $('#today-label').textContent = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());
  applyRoleVisibility();
  await refreshAll();
}

function setView(viewName) {
  state.activeView = viewName;
  $$('.view').forEach((view) => view.classList.add('hidden'));
  $(`#${viewName}-view`).classList.remove('hidden');
  $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === viewName));
  $('#page-title').textContent = viewName[0].toUpperCase() + viewName.slice(1);
}

function productStatus(stock) {
  if (stock <= 0) return ['Out', 'bad'];
  if (stock <= 5) return ['Low', 'warn'];
  return ['In stock', 'good'];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function productImageUrl(product) {
  const url = product.images?.[0]?.url;
  if (!url) return PLACEHOLDER_IMAGE;
  if (window.location.hostname !== 'localhost' && url.startsWith('/uploads/')) {
    return PLACEHOLDER_IMAGE;
  }
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return url;
}

function applyImageFallbacks(root) {
  root.querySelectorAll('img[data-fallback-src]').forEach((image) => {
    image.addEventListener('error', () => {
      image.src = image.dataset.fallbackSrc;
    }, { once: true });
  });
}

function setProductFormMode(product = null) {
  const form = $('#product-form');
  const submitButton = $('#product-submit-button');
  state.editingProductId = product?.id || null;
  $('#product-form-title').textContent = product ? 'Update Product' : 'Create Product';
  submitButton.textContent = product ? 'Update Product' : 'Create Product';
  delete submitButton.dataset.originalText;
  $('#product-cancel-button').classList.toggle('hidden', !product);

  if (!product) {
    form.reset();
    return;
  }

  form.elements.title.value = product.title || '';
  form.elements.description.value = product.description || '';
  form.elements.price.value = product.price || '';
  form.elements.stock.value = product.stock ?? 0;
  form.elements.isActive.value = String(product.isActive !== false);
  form.elements.images.value = '';
}

function renderProducts(targetSelector, products = state.products) {
  const target = $(targetSelector);
  if (!products.length) {
    target.innerHTML = '<div class="empty-state">No products yet. Create one from the Products screen.</div>';
    return;
  }

  const canManageProducts = state.user?.role === 'ADMIN' && targetSelector === '#products-table';
  const columns = canManageProducts
    ? `
      <span>Product</span>
      <span>Stock</span>
      <span>Price</span>
      <span>Status</span>
      <span>Actions</span>
    `
    : `
      <span>Product</span>
      <span>Stock</span>
      <span>Price</span>
      <span>Status</span>
    `;

  target.innerHTML = `
    <div class="table-row table-head ${canManageProducts ? 'with-actions' : ''}">
      ${columns}
    </div>
    ${products.map((product) => {
      const [label, tone] = productStatus(product.stock);
      const image = productImageUrl(product);
      const title = escapeHtml(product.title);
      const description = escapeHtml(product.description || 'No description');
      return `
        <div class="table-row ${canManageProducts ? 'with-actions' : ''}">
          <span class="product-cell">
            <img src="${escapeHtml(image)}" alt="${title}" loading="lazy" data-fallback-src="${PLACEHOLDER_IMAGE}" />
            <span>
              <strong>${title}</strong>
              <small>${description}${product.isActive === false ? ' - Inactive' : ''}</small>
            </span>
          </span>
          <span><strong>${product.stock}</strong><small>units</small></span>
          <span>${money(product.price)}</span>
          <span class="status ${tone}">${label}</span>
          ${canManageProducts ? `
            <span class="row-actions">
              <button class="ghost-button small-button" data-product-edit="${product.id}" type="button">Edit</button>
              <button class="danger-button small-button" data-product-delete="${product.id}" type="button">Delete</button>
            </span>
          ` : ''}
        </div>
      `;
    }).join('')}
  `;
  applyImageFallbacks(target);
}

function renderProductSelects() {
  const options = state.products
    .map((product) => `<option value="${product.id}">${product.title} (${product.stock} in stock)</option>`)
    .join('');

  ['#stock-form select[name="productId"]', '#order-form select[name="productId"]'].forEach((selector) => {
    const select = $(selector);
    select.innerHTML = options || '<option value="">No products available</option>';
  });
}

function renderOrders(targetSelector, orders = state.orders) {
  const target = $(targetSelector);
  if (!orders.length) {
    target.innerHTML = '<div class="empty-state">No orders yet.</div>';
    return;
  }

  target.innerHTML = orders.map((order) => `
    <div class="order-item">
      <span><strong>#${order.id}</strong><small>${new Date(order.createdAt).toLocaleString()}</small></span>
      <span>${order.user?.name || 'Customer'}<small>${order.items?.length || 0} item(s)</small></span>
      <strong>${money(order.totalAmount)}</strong>
      <span class="status good">${order.status}</span>
    </div>
  `).join('');
}

function renderUsers() {
  const target = $('#users-list');
  if (!state.users.length) {
    target.innerHTML = '<div class="empty-state">No users found.</div>';
    return;
  }

  target.innerHTML = state.users.map((user) => {
    const isCurrentUser = user.id === state.user?.id;
    const nextStatus = !user.isActive;
    const actionLabel = user.isActive ? 'Deactivate' : 'Activate';
    const actionClass = user.isActive ? 'danger-button' : 'ghost-button';
    const disabled = isCurrentUser ? 'disabled title="You cannot deactivate your own account"' : '';

    return `
      <div class="user-item">
        <strong>${escapeHtml(user.name)}</strong>
        <span>${escapeHtml(user.email)}</span>
        <span class="status ${user.role === 'ADMIN' ? 'good' : 'warn'}">${escapeHtml(user.role)}</span>
        <span class="status ${user.isActive ? 'good' : 'bad'}">${user.isActive ? 'Active' : 'Disabled'}</span>
        <button
          class="${actionClass} small-button"
          data-user-status="${user.id}"
          data-user-next-status="${nextStatus}"
          type="button"
          ${disabled}
        >
          ${actionLabel}
        </button>
      </div>
    `;
  }).join('');
}

function renderDashboard(dashboard) {
  $('#metric-users').textContent = dashboard?.counts?.users ?? state.users.length;
  $('#metric-products').textContent = dashboard?.counts?.products ?? state.products.length;
  $('#metric-low-stock').textContent = dashboard?.counts?.lowStockProducts ?? state.products.filter((p) => p.stock <= 5).length;
  $('#metric-revenue').textContent = money(dashboard?.revenue || 0);
  renderProducts('#dashboard-products', state.products.slice(0, 5));
  renderOrders('#dashboard-orders', state.orders.slice(0, 5));
}

async function refreshAll() {
  try {
    const productsResponse = await api('/products?limit=100');
    state.products = productsResponse.data || [];

    const ordersResponse = await api('/orders?limit=25');
    state.orders = ordersResponse.data || [];

    let dashboard = null;
    if (state.user?.role === 'ADMIN') {
      dashboard = (await api('/dashboard')).data;
      state.users = (await api('/users?limit=100')).data || [];
    }

    renderProducts('#products-table');
    renderProductSelects();
    renderOrders('#orders-list');
    renderUsers();
    renderDashboard(dashboard);
  } catch (error) {
    if (error.message.includes('token') || error.message.includes('authorized')) {
      clearSession();
      showAuth();
    }
    showMessage(error.message, true);
  }
}

async function loadInventoryLogs(productId) {
  const target = $('#inventory-logs');
  if (!productId) {
    target.innerHTML = '<div class="empty-state">Select a product to view logs.</div>';
    return;
  }

  try {
    const response = await api(`/products/${productId}/inventory-logs`);
    const logs = response.data || [];
    target.innerHTML = logs.length ? logs.map((log) => `
      <div class="log-item">
        <span>${log.type}</span>
        <strong>${log.quantity}</strong>
        <span>${log.beforeStock} -> ${log.afterStock}</span>
        <small>${log.note || 'No note'}</small>
      </div>
    `).join('') : '<div class="empty-state">No inventory logs yet.</div>';
  } catch (error) {
    target.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

function bindAuth() {
  $('#login-tab').addEventListener('click', () => {
    $('#login-tab').classList.add('selected');
    $('#register-tab').classList.remove('selected');
    $('#login-form').classList.remove('hidden');
    $('#register-form').classList.add('hidden');
  });

  $('#register-tab').addEventListener('click', () => {
    $('#register-tab').classList.add('selected');
    $('#login-tab').classList.remove('selected');
    $('#register-form').classList.remove('hidden');
    $('#login-form').classList.add('hidden');
  });

  $('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(form, true);
    $('#auth-message').textContent = '';
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const response = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      saveSession(response.token, response.user);
      await showApp();
    } catch (error) {
      $('#auth-message').textContent = error.message;
    } finally {
      setLoading(form, false);
    }
  });

  $('#register-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(form, true);
    $('#auth-message').textContent = '';
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const response = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      saveSession(response.token, response.user);
      await showApp();
    } catch (error) {
      $('#auth-message').textContent = error.message;
    } finally {
      setLoading(form, false);
    }
  });
}

function bindApp() {
  $$('.nav-item').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });

  $$('[data-view-button]').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.viewButton));
  });

  $('#logout-button').addEventListener('click', () => {
    clearSession();
    showAuth();
  });

  $('#refresh-button').addEventListener('click', refreshAll);

  $('#search-input').addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase();
    const filtered = state.products.filter((product) =>
      `${product.title} ${product.description}`.toLowerCase().includes(query)
    );
    renderProducts('#products-table', filtered);
  });

  $('#product-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(form, true);
    try {
      const body = new FormData(form);
      const productId = state.editingProductId;
      await api(productId ? `/products/${productId}` : '/products', {
        method: productId ? 'PATCH' : 'POST',
        body
      });
      setProductFormMode();
      showMessage(productId ? 'Product updated successfully.' : 'Product created successfully.');
      await refreshAll();
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      setLoading(form, false);
    }
  });

  $('#product-cancel-button').addEventListener('click', () => {
    setProductFormMode();
  });

  $('#products-table').addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-product-edit]');
    const deleteButton = event.target.closest('[data-product-delete]');

    if (editButton) {
      const product = state.products.find((item) => item.id === Number(editButton.dataset.productEdit));
      if (!product) return;
      setProductFormMode(product);
      $('#product-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (!deleteButton) return;

    const product = state.products.find((item) => item.id === Number(deleteButton.dataset.productDelete));
    if (!product) return;

    const confirmed = window.confirm(`Delete "${product.title}"? This cannot be undone.`);
    if (!confirmed) return;

    deleteButton.disabled = true;
    try {
      await api(`/products/${product.id}`, { method: 'DELETE' });
      if (state.editingProductId === product.id) {
        setProductFormMode();
      }
      showMessage('Product deleted successfully.');
      await refreshAll();
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      deleteButton.disabled = false;
    }
  });

  $('#stock-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(form, true);
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await api(`/products/${data.productId}/stock-in`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: Number(data.quantity),
          note: data.note
        })
      });
      showMessage('Inventory updated.');
      await refreshAll();
      await loadInventoryLogs(data.productId);
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      setLoading(form, false);
    }
  });

  $('#stock-form select[name="productId"]').addEventListener('change', (event) => {
    loadInventoryLogs(event.target.value);
  });

  $('#order-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(form, true);
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ productId: Number(data.productId), quantity: Number(data.quantity) }]
        })
      });
      showMessage('Order placed. Stock was reduced automatically.');
      await refreshAll();
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      setLoading(form, false);
    }
  });

  $('#user-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(form, true);
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await api('/users', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      form.reset();
      showMessage('User created.');
      await refreshAll();
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      setLoading(form, false);
    }
  });

  $('#users-list').addEventListener('click', async (event) => {
    const statusButton = event.target.closest('[data-user-status]');
    if (!statusButton) return;

    const userId = Number(statusButton.dataset.userStatus);
    const user = state.users.find((item) => item.id === userId);
    if (!user) return;

    const isActive = statusButton.dataset.userNextStatus === 'true';
    const confirmed = window.confirm(`${isActive ? 'Activate' : 'Deactivate'} "${user.name}"?`);
    if (!confirmed) return;

    statusButton.disabled = true;
    try {
      await api(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive })
      });
      showMessage(`User ${isActive ? 'activated' : 'deactivated'} successfully.`);
      await refreshAll();
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      statusButton.disabled = false;
    }
  });
}

async function boot() {
  bindAuth();
  bindApp();
  setView('dashboard');

  if (!state.token) {
    showAuth();
    return;
  }

  try {
    const response = await api('/auth/me');
    state.user = response.user;
    localStorage.setItem('ims_user', JSON.stringify(response.user));
    await showApp();
  } catch (error) {
    clearSession();
    showAuth();
  }
}

boot();
