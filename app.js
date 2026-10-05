const seed = {
  products: [
    { id: 1, name: 'Remera básica', category: 'Indumentaria', cost: 8500, price: 18000, stock: 24, min: 5, emoji: '👕' },
    { id: 2, name: 'Jean clásico', category: 'Indumentaria', cost: 22000, price: 42000, stock: 8, min: 4, emoji: '👖' },
    { id: 3, name: 'Taza cerámica', category: 'Hogar', cost: 3800, price: 9500, stock: 3, min: 5, emoji: '☕' },
    { id: 4, name: 'Bolso urbano', category: 'Accesorios', cost: 14500, price: 29000, stock: 12, min: 3, emoji: '👜' },
    { id: 5, name: 'Medias deportivas', category: 'Accesorios', cost: 2100, price: 5500, stock: 0, min: 6, emoji: '🧦' },
    { id: 6, name: 'Botella térmica', category: 'Hogar', cost: 7900, price: 16500, stock: 16, min: 4, emoji: '🧴' }
  ],
  sales: [
    { id: 1001, date: new Date().toISOString(), items: [{ productId: 1, name: 'Remera básica', qty: 2, price: 18000, cost: 8500 }], total: 36000, payment: 'Efectivo' },
    { id: 1002, date: new Date(Date.now() - 3600000).toISOString(), items: [{ productId: 4, name: 'Bolso urbano', qty: 1, price: 29000, cost: 14500 }], total: 29000, payment: 'Transferencia' },
    { id: 1003, date: new Date(Date.now() - 7200000).toISOString(), items: [{ productId: 6, name: 'Botella térmica', qty: 1, price: 16500, cost: 7900 }], total: 16500, payment: 'Débito' }
  ],
  expenses: [{ id: 1, date: new Date().toISOString(), name: 'Limpieza del local', amount: 8500 }],
  purchases: [{ id: 1, date: new Date(Date.now() - 86400000).toISOString(), supplier: 'Distribuidora Centro', items: [{ name: 'Remera básica', qty: 10 }], total: 85000 }],
  suppliers: [{ id: 1, name: 'Distribuidora Centro', phone: '11 4455-6677', contact: 'Lucía', priceList: [
    { productId: 1, name: 'Remera básica', price: 10000 },
    { productId: 2, name: 'Jean clásico', price: 26000 },
    { productId: 3, name: 'Taza cerámica', price: 4500 }
  ] }],
  alerts: [], cash: {}, dark: false, currency: 'ARS', business: 'Mi comercio'
};

let state;
try { state = JSON.parse(localStorage.getItem('comercio-data')) || structuredClone(seed); }
catch { state = structuredClone(seed); }

// Keep existing browser data while removing the retired client and SKU fields.
state.products ||= [];
state.products.forEach(product => delete product.sku);
state.sales ||= [];
state.sales.forEach(sale => delete sale.client);
state.expenses = (state.expenses || []).map(expense => ({ id: expense.id, date: expense.date, name: expense.name, amount: expense.amount, recordedAt: expense.recordedAt || expense.createdAt || expense.date }));
state.purchases ||= [];
state.suppliers = (state.suppliers || []).map(supplier => ({ ...supplier, priceList: supplier.priceList || [] }));
state.alerts ||= [];
delete state.clients;
state.currency ||= 'ARS';
state.business ||= 'Mi comercio';
const currentDate = dateKey(new Date());
const oldCash = state.cash || {};
if (!oldCash.status) {
  const openedToday = oldCash.date === new Date().toDateString() && oldCash.opening > 0;
  state.cash = { date: currentDate, status: openedToday ? 'open' : 'closed', opening: openedToday ? oldCash.opening : 0, counted: null, expectedOnClose: null, difference: null };
} else if (oldCash.date !== currentDate) {
  state.cash = { date: currentDate, status: 'closed', opening: 0, counted: null, expectedOnClose: null, difference: null };
}
save();

let page = 'Inicio';
let query = '';
let cart = [];
let expenseDraft = null;
const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('es-AR', { style: 'currency', currency: state.currency || 'ARS', maximumFractionDigits: 0 }).format(value || 0);
const todayKey = () => dateKey(new Date());
function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
const parseDateKey = value => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day, 12); };
const isToday = value => dateKey(value) === todayKey();
const dayDistance = value => Math.round((parseDateKey(value) - parseDateKey(todayKey())) / 86400000);
const salesToday = () => state.sales.filter(sale => isToday(sale.date));
const soldToday = () => salesToday().reduce((sum, sale) => sum + sale.items.reduce((count, item) => count + item.qty, 0), 0);
const revenueToday = () => salesToday().reduce((sum, sale) => sum + sale.total, 0);
const expensesToday = () => state.expenses.filter(expense => isToday(expense.date)).reduce((sum, expense) => sum + expense.amount, 0);
const afterCashOpen = value => !state.cash.openedAt || new Date(value).getTime() >= new Date(state.cash.openedAt).getTime();
const cashExpected = () => {
  if (state.cash.status !== 'open') return state.cash.expectedOnClose ?? 0;
  const cashSales = state.sales.filter(sale => dateKey(sale.date) === state.cash.date && sale.payment === 'Efectivo' && afterCashOpen(sale.date)).reduce((sum, sale) => sum + sale.total, 0);
  const expenses = state.expenses.filter(expense => dateKey(expense.date) === state.cash.date && afterCashOpen(expense.recordedAt || expense.date)).reduce((sum, expense) => sum + expense.amount, 0);
  const purchases = state.purchases.filter(purchase => dateKey(purchase.date) === state.cash.date && afterCashOpen(purchase.date)).reduce((sum, purchase) => sum + purchase.total, 0);
  return state.cash.opening + cashSales - expenses - purchases;
};
function save() { try { localStorage.setItem('comercio-data', JSON.stringify(state)); } catch { /* Keep the screen usable if this browser blocks local storage. */ } }
function setPage(nextPage) { page = nextPage; query = ''; expenseDraft = null; render(); }
function lowProducts() { return state.products.filter(product => product.stock <= product.min); }

const menuGroups = [
  { name: 'Productos', icon: '📦', pages: [['Stock', '▦'], ['Compras', '⇣'], ['Proveedores', '⇄']] },
  { name: 'Dinero', icon: '💵', pages: [['Caja', '▤'], ['Gastos', '$'], ['Finanzas', '◷'], ['Estadísticas', '▥']] }
];
const mainPages = [['Inicio', '⌂'], ['Ventas', '🛒'], ['Recordatorios', '🔔']];

function render() {
  document.body.classList.toggle('dark', state.dark);
  const root = $('#app');
  root.innerHTML = `<aside class="sidebar"><div class="brand"><div class="brandmark">↗</div><div>comercio<small>gestión simple</small></div></div><div class="navlabel">TU NEGOCIO</div><nav class="nav">${mainPages.map(([name, icon]) => navButton(name, icon)).join('')}${menuGroups.map(group => { const expanded = group.pages.some(([name]) => name === page); return `<div class="navgroup"><button class="navgroup-toggle ${expanded ? 'active' : ''}" data-action="toggle-nav-group" data-group="${group.name}" aria-expanded="${expanded}"><span class="ico">${group.icon}</span>${group.name}<span class="nav-chevron">${expanded ? '⌄' : '›'}</span></button><div class="navchildren" ${expanded ? '' : 'hidden'}>${group.pages.map(([name, icon]) => navButton(name, icon, true)).join('')}</div></div>`; }).join('')}</nav><div class="sidebar-footer"><div class="nav navsettings">${navButton('Configuración', '⚙')}</div><div class="sidebottom"><div class="store"><div class="storeicon">🏪</div><div><b>${esc(state.business)}</b><small>Tu comercio</small></div></div></div></div></aside><main class="main"><header class="topbar"><div class="crumb"><span>Mi negocio</span><span class="crumb-slash">/</span><strong>${page}</strong></div><div class="topright"><span class="today">${new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span><button class="toggle" id="theme" title="Cambiar tema" aria-label="Cambiar tema">${state.dark ? '☀️' : '☾'}</button><div class="avatar">${esc((state.business || 'M').slice(0, 1).toUpperCase())}</div></div></header><section class="content">${pageContent()}</section></main><nav class="mobilebar">${[['Inicio', '⌂'], ['Ventas', '＋'], ['Stock', '▦'], ['Recordatorios', '🔔'], ['Más', '•••']].map(([name, icon]) => `<button class="${page === name ? 'active' : ''} ${name === 'Ventas' ? 'sell' : ''}" ${name === 'Más' ? 'data-action="more"' : `data-page="${name}"`}><span>${icon}</span>${name === 'Recordatorios' ? 'Alertas' : name}</button>`).join('')}</nav>`;
  root.querySelectorAll('[data-page]').forEach(button => button.onclick = () => setPage(button.dataset.page));
  root.querySelectorAll('[data-action="toggle-nav-group"]').forEach(button => button.onclick = () => { const children = button.nextElementSibling; const expanded = button.getAttribute('aria-expanded') === 'true'; button.setAttribute('aria-expanded', String(!expanded)); button.classList.toggle('active', !expanded); children.hidden = expanded; button.querySelector('.nav-chevron').textContent = expanded ? '›' : '⌄'; });
  $('#theme').onclick = () => { state.dark = !state.dark; save(); render(); };
  bind();
}

function navButton(name, icon, nested = false) {
  return `<button class="${page === name ? 'active' : ''} ${nested ? 'nested' : ''}" data-page="${name}"><span class="ico">${icon}</span>${name}${name === 'Recordatorios' && activeAlerts().length ? `<span class="badge">${activeAlerts().length}</span>` : ''}</button>`;
}

function pageContent() {
  switch (page) {
    case 'Inicio': return home();
    case 'Ventas': return salesPage();
    case 'Stock': return stockPage();
    case 'Compras': return purchasesPage();
    case 'Caja': return cashPage();
    case 'Gastos': return expensesPage();
    case 'Finanzas': return financePage();
    case 'Estadísticas': return statsPage();
    case 'Proveedores': return suppliersPage();
    case 'Recordatorios': return alertsPage();
    case 'Configuración': return settingsPage();
    default: return home();
  }
}

function heading(title, description, button = '', actionName = '') {
  return `<div class="heading"><div><h1>${title}</h1><p>${description}</p></div>${button ? `<div class="actions"><button class="btn primary" data-action="${actionName}">${button}</button></div>` : ''}</div>`;
}
function metric(label, value, icon, foot = '', color = '') {
  return `<article class="card metric"><div class="metric-head">${label}<span class="metric-icon">${icon}</span></div><div class="metric-value ${color}">${value}</div><div class="metric-foot">${foot}</div></article>`;
}
function home() {
  const latest = [...salesToday()].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  const reminders = activeAlerts().map(alert => ({ alert, notice: nextReminder(alert) })).filter(item => item.notice.days <= 7).sort((a, b) => a.notice.date.localeCompare(b.notice.date)).slice(0, 3);
  return `${heading(`${greeting()}, 👋`, 'Lo importante de hoy, en un vistazo.')}
    <div class="grid metrics home-metrics">${metric('Ventas de hoy', money(revenueToday()), '↗', `${salesToday().length} ventas`)}${metric('Productos vendidos', soldToday(), '▦', 'Unidades en el día')}${metric('Gastos de hoy', money(expensesToday()), '−', 'Registrados hasta ahora')}${metric('Caja', state.cash.status === 'open' ? money(cashExpected()) : 'Cerrada', '◷', state.cash.status === 'open' ? 'Dinero esperado' : 'Abrí para empezar')}</div>
    <div class="grid dashboard-grid"><article class="card"><div class="card-title"><h2>Acciones rápidas</h2><a data-page="Caja" class="cash-status">${state.cash.status === 'open' ? `Caja · ${money(cashExpected())}` : 'Caja cerrada · Abrir →'}</a></div><div class="quick"><button data-action="sale"><i>🛒</i>Nueva venta</button><button data-action="product"><i>📦</i>Agregar producto</button><button data-action="expense"><i>💸</i>Registrar gasto</button><button data-action="purchase"><i>📥</i>Registrar compra</button></div></article>
    <article class="card"><div class="card-title"><h2>Tenés ${activeAlerts().length} ${activeAlerts().length === 1 ? 'pendiente' : 'pendientes'}</h2><a data-page="Recordatorios">Ver recordatorios →</a></div>${reminders.length ? reminders.map(item => reminderLine(item.alert, item.notice)).join('') : '<div class="alertline"><span>✓</span>No tenés recordatorios próximos.</div>'}</article></div>
    <article class="card"><div class="card-title"><h2>Últimas ventas de hoy</h2><a data-page="Ventas">Ver todas →</a></div><div class="activity">${latest.length ? latest.map(sale => `<div class="row"><span class="dot">🛍️</span><div class="rowmain"><b>${esc(sale.items.map(item => item.name).join(', '))}</b><small>${time(sale.date)} · ${esc(sale.payment)}</small></div><span class="rowval">${money(sale.total)}</span></div>`).join('') : '<div class="empty">Todavía no hay ventas hoy.</div>'}</div></article>
    ${lowProducts().length ? `<p class="hint">📦 ${lowProducts().length} productos necesitan reposición. <a data-page="Stock">Revisar stock →</a></p>` : ''}`;
}
function greeting() { const hour = new Date().getHours(); return hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'; }

function stockPage() {
  const products = state.products.filter(product => `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase()));
  return `${heading('Stock', 'Buscá productos y revisá cuánto queda.', '＋ Agregar producto', 'product')}<div class="card section-card"><div class="toolbar"><input class="search" id="search" placeholder="🔍  Buscar producto…" value="${esc(query)}"><select class="filter" id="stockfilter"><option value="all">Todos los productos</option><option value="low">Stock bajo</option><option value="none">Sin stock</option></select><span class="spacer"></span><span class="muted" style="font-size:10px">${state.products.length} productos</span></div><div class="tablewrap"><table><thead><tr><th>Producto</th><th>Categoría</th><th>Compra</th><th>Venta</th><th>Disponible</th><th></th></tr></thead><tbody>${products.map(product => `<tr data-stock="${product.stock}" data-min="${product.min}"><td><div class="prod"><div class="thumb">${product.emoji || '📦'}</div><strong>${esc(product.name)}</strong></div></td><td>${esc(product.category || 'General')}</td><td>${money(product.cost)}</td><td><strong>${money(product.price)}</strong></td><td><span class="pill ${product.stock === 0 ? 'none' : product.stock <= product.min ? 'low' : ''}">${product.stock === 0 ? 'Sin stock' : `${product.stock} un.`}</span></td><td><button class="btn small" data-action="edit-product" data-id="${product.id}">Editar</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No encontramos productos con esa búsqueda.</td></tr>'}</tbody></table></div></div>`;
}
function salesPage() {
  return `${heading('Ventas', 'Una venta y el sistema se ocupa del resto.', '＋ Nueva venta', 'sale')}<div class="grid metrics" style="grid-template-columns:repeat(3,minmax(0,1fr))">${metric('Vendido hoy', money(revenueToday()), '💰', `${salesToday().length} ventas`)}${metric('Productos vendidos', soldToday(), '📦', 'Unidades')}${metric('En efectivo', money(salesToday().filter(sale => sale.payment === 'Efectivo').reduce((sum, sale) => sum + sale.total, 0)), '💵', 'Suma para la caja')}</div><div class="card section-card"><div class="card-title"><h2>Historial de ventas</h2><span class="muted" style="font-size:10px">El stock se descuenta al cobrar</span></div><div class="tablewrap"><table><thead><tr><th>Hora</th><th>Productos</th><th>Pago</th><th>Total</th></tr></thead><tbody>${[...state.sales].sort((a, b) => new Date(b.date) - new Date(a.date)).map(sale => `<tr><td>${dateTime(sale.date)}</td><td>${sale.items.map(item => `${item.qty} × ${esc(item.name)}`).join(', ')}</td><td>${esc(sale.payment)}</td><td><strong>${money(sale.total)}</strong></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Todavía no hay ventas.</td></tr>'}</tbody></table></div></div>`;
}
function purchasesPage() {
  return `${heading('Compras', 'Sumá mercadería y el stock se actualiza solo.', '＋ Registrar compra', 'purchase')}<div class="card section-card"><div class="card-title"><h2>Compras recientes</h2></div><div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Proveedor</th><th>Productos</th><th>Total</th></tr></thead><tbody>${[...state.purchases].sort((a, b) => new Date(b.date) - new Date(a.date)).map(purchase => `<tr><td>${dateTime(purchase.date)}</td><td><strong>${esc(purchase.supplier)}</strong></td><td>${purchase.items.map(item => `${item.qty} × ${esc(item.name)}`).join(', ')}</td><td><strong>${money(purchase.total)}</strong></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Todavía no hay compras registradas.</td></tr>'}</tbody></table></div></div>`;
}

function cashPage() {
  const isOpen = state.cash.status === 'open';
  if (!isOpen && state.cash.counted == null) return `${heading('Caja', 'Abrí la caja al empezar el día y cerrala al terminar.', '＋ Abrir caja', 'open-cash')}<div class="card"><div class="card-title"><h2>La caja está cerrada</h2></div><div class="empty">Al abrir, anotás el dinero inicial. Durante el día sumamos ventas y restamos gastos automáticamente.</div></div>`;
  if (!isOpen) return `${heading('Caja', 'Cierre de hoy')}<div class="grid metrics" style="grid-template-columns:repeat(3,minmax(0,1fr))">${metric('Dinero esperado', money(state.cash.expectedOnClose), '🧮', 'Según las operaciones registradas')}${metric('Dinero contado', money(state.cash.counted), '💵', 'Lo que había al cerrar')}${metric('Diferencia', money(state.cash.difference), '📊', state.cash.difference === 0 ? 'La caja coincide' : 'Contado menos esperado', state.cash.difference === 0 ? 'positive' : state.cash.difference < 0 ? 'negative' : 'warn')}</div><div class="hero-note">Caja cerrada. Podés volver a abrirla si necesitás registrar un nuevo turno.</div><button class="btn primary" data-action="open-cash">＋ Abrir caja</button>`;
  const cashSales = state.sales.filter(sale => dateKey(sale.date) === state.cash.date && sale.payment === 'Efectivo' && afterCashOpen(sale.date)).reduce((sum, sale) => sum + sale.total, 0);
  const cashExpenses = state.expenses.filter(expense => dateKey(expense.date) === state.cash.date && afterCashOpen(expense.recordedAt || expense.date)).reduce((sum, expense) => sum + expense.amount, 0);
  const cashPurchases = state.purchases.filter(purchase => dateKey(purchase.date) === state.cash.date && afterCashOpen(purchase.date)).reduce((sum, purchase) => sum + purchase.total, 0);
  return `${heading('Caja', 'Abrí, trabajá y cerrá. El cálculo se hace solo.', 'Cerrar caja', 'close-cash')}<div class="hero-note">🟢 Caja abierta · ${formatDate(state.cash.date)}</div><div class="grid metrics" style="grid-template-columns:repeat(2,minmax(0,1fr))">${metric('Dinero inicial', money(state.cash.opening), '🌅', 'Al abrir')}${metric('Ventas en efectivo', money(cashSales), '💵', 'Se suman a la caja')}${metric('Gastos', money(cashExpenses), '💸', 'Se restan de la caja')}${metric('Compras', money(cashPurchases), '📥', 'Se restan de la caja')}</div><div class="card"><div class="card-title"><h2>Dinero esperado ahora</h2><span class="metric-value" style="font-size:22px;margin:0">${money(cashExpected())}</span></div><div class="activity"><div class="row"><div class="rowmain"><b>Inicial + ventas − gastos − compras</b><small>El efectivo de la caja, sin hacer cuentas</small></div></div></div></div>`;
}

function expensesPage() {
  const recent = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  return `${heading('Gastos', 'Anotá qué gastaste, cuánto y cuándo. Se refleja en caja y finanzas.', '＋ Registrar gasto', 'expense')}<div class="grid dashboard-grid"><article class="card expense-chat"><div class="card-title"><h2>Registrar con una frase</h2><span>💬</span></div><p class="hint" style="padding:0 18px">Por ejemplo: “Gasté 25 mil pesos en luz hoy”.</p><div class="chat-input"><input id="expense-message" placeholder="Escribí el gasto como te salga…"><button class="btn primary" data-action="interpret-expense">Entender</button></div>${expenseDraft ? expensePreview() : ''}</article><article class="card"><div class="card-title"><h2>Gastos de hoy</h2></div><div style="padding:0 18px 18px"><div class="metric-value" style="margin:0">${money(expensesToday())}</div><div class="metric-foot">${state.cash.status === 'open' ? 'Los gastos desde la apertura se restan de Caja.' : 'Se incluyen en las finanzas.'}</div></div></article></div><div class="card section-card"><div class="card-title"><h2>Gastos recientes</h2></div><div class="tablewrap"><table><thead><tr><th>Qué gastaste</th><th>Cuándo</th><th>Cuánto</th></tr></thead><tbody>${recent.map(expense => `<tr><td><strong>${esc(expense.name)}</strong></td><td>${formatDate(dateKey(expense.date))}</td><td class="neg">− ${money(expense.amount)}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">Todavía no hay gastos.</td></tr>'}</tbody></table></div></div>`;
}
function expensePreview() {
  const draft = expenseDraft;
  return `<div class="expense-preview"><div class="preview-chat">${esc(draft.message)}</div>${draft.missing.length ? `<p class="hint">Me falta ${draft.missing.join(' y ')}.</p><div class="form-grid">${draft.missing.includes('el importe') ? '<div class="field"><label>¿Cuánto gastaste?</label><input id="draft-amount" type="number" min="1" placeholder="25000"></div>' : ''}${draft.missing.includes('el detalle') ? '<div class="field"><label>¿Qué gastaste?</label><input id="draft-name" placeholder="Ej. Luz"></div>' : ''}</div><button class="btn primary" data-action="complete-expense">Continuar</button>` : `<div class="parsed-expense"><b>${esc(draft.name)}</b><strong>${money(draft.amount)}</strong><span>${formatDate(draft.date)}</span></div><button class="btn primary" data-action="confirm-expense">Registrar gasto</button>`}</div>`;
}

function financePage() {
  const month = new Date().getMonth(), year = new Date().getFullYear();
  const sales = state.sales.filter(sale => { const date = new Date(sale.date); return date.getMonth() === month && date.getFullYear() === year; });
  const expenses = state.expenses.filter(item => { const date = new Date(item.date); return date.getMonth() === month && date.getFullYear() === year; });
  const purchases = state.purchases.filter(item => { const date = new Date(item.date); return date.getMonth() === month && date.getFullYear() === year; });
  const salesTotal = sales.reduce((sum, sale) => sum + sale.total, 0);
  const expensesTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const purchasesTotal = purchases.reduce((sum, item) => sum + item.total, 0);
  const profit = sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + (item.price - item.cost) * item.qty, 0), 0) - expensesTotal;
  return `${heading('Finanzas', 'Un resumen claro de este mes.')}<div class="hero-note">La ganancia aproximada resta el costo de lo vendido y los gastos. Las compras se muestran aparte.</div><div class="grid metrics" style="grid-template-columns:repeat(3,minmax(0,1fr))">${metric('Ventas', money(salesTotal), '💰', `${sales.length} ventas`)}${metric('Gastos', money(expensesTotal), '💸', 'Registrados este mes')}${metric('Compras', money(purchasesTotal), '📥', 'Mercadería ingresada')}</div><div class="card"><div class="card-title"><h2>Ganancia aproximada</h2><span class="metric-value ${profit >= 0 ? 'positive' : 'negative'}" style="font-size:22px;margin:0">${money(profit)}</span></div><div class="activity"><div class="row"><div class="rowmain"><b>Ventas − costo de lo vendido − gastos</b><small>Un estimado sencillo, no un informe contable.</small></div></div></div></div>`;
}
function statsPage() {
  const sold = {};
  salesToday().forEach(sale => sale.items.forEach(item => sold[item.name] = (sold[item.name] || 0) + item.qty));
  const top = Object.entries(sold).sort((a, b) => b[1] - a[1])[0];
  return `${heading('Estadísticas', 'Solo lo importante de hoy.')}<div class="grid metrics" style="grid-template-columns:repeat(3,minmax(0,1fr))">${metric('Vendido hoy', money(revenueToday()), '💰', `${salesToday().length} ventas`)}${metric('Productos vendidos', soldToday(), '📦', 'Unidades')}${metric('Gastos de hoy', money(expensesToday()), '💸', 'Registrados')}</div><div class="grid bottom-grid"><article class="card"><div class="card-title"><h2>Lo más vendido hoy</h2></div><div class="alertline"><span>🏆</span><b>${top ? esc(top[0]) : 'Todavía no hay ventas'}</b>${top ? `<span class="low-stock">${top[1]} un.</span>` : ''}</div></article><article class="card"><div class="card-title"><h2>Stock para revisar</h2><a data-page="Stock">Ver stock →</a></div><div class="alertline"><span>📦</span><b>${lowProducts().length ? `${lowProducts().length} productos con poco o sin stock` : 'Todo tiene stock suficiente'}</b></div></article></div>`;
}

function suppliersPage() {
  return `${heading('Proveedores', 'Consultá precios y actualizalos en un paso.', '＋ Agregar proveedor', 'supplier')}<div class="supplier-list">${state.suppliers.map(supplier => `<article class="card supplier-card"><div class="card-title"><div><h2>${esc(supplier.name)}</h2><span class="muted" style="font-size:10px">${esc(supplier.contact || supplier.phone || 'Sin contacto agregado')}</span></div><div class="actions"><button class="btn small" data-action="supplier-price" data-id="${supplier.id}">＋ Precio</button><button class="btn small" data-action="increase-prices" data-id="${supplier.id}">Actualizar precios</button></div></div><div class="tablewrap"><table><thead><tr><th>Producto</th><th>Precio del proveedor</th></tr></thead><tbody>${supplier.priceList.length ? supplier.priceList.map(item => `<tr><td><strong>${esc(item.name)}</strong></td><td>${money(item.price)}</td></tr>`).join('') : '<tr><td colspan="2" class="empty">Todavía no guardaste precios para este proveedor.</td></tr>'}</tbody></table></div></article>`).join('') || '<div class="card empty">Agregá tu primer proveedor para guardar su lista de precios.</div>'}</div>`;
}

function alertsPage() {
  const open = activeAlerts();
  const overdue = open.filter(alert => dayDistance(alert.date) < 0);
  const dueToday = open.filter(alert => dayDistance(alert.date) === 0);
  const upcoming = open.filter(alert => dayDistance(alert.date) > 0).sort((a, b) => a.date.localeCompare(b.date));
  const completed = state.alerts.filter(alert => alert.done);
  return `${heading('Recordatorios', 'Anotá lo que no querés olvidarte.', '＋ Nueva alerta', 'alert')}<div class="reminder-groups">${reminderGroup('Vencidas', overdue)}${reminderGroup('Hoy', dueToday)}${reminderGroup('Próximas', upcoming)}${completed.length ? `<details class="card completed"><summary>Listas (${completed.length})</summary>${completed.map(alert => `<div class="alertline"><span>✅</span><b>${esc(alert.title)}</b><span>${formatDate(alert.date)}</span></div>`).join('')}</details>` : ''}${!open.length ? '<div class="card empty">No tenés recordatorios pendientes. Cuando agregues uno, lo vas a ver acá y en Inicio.</div>' : ''}</div>`;
}
function reminderGroup(title, alerts) {
  if (!alerts.length) return '';
  return `<section class="reminder-group"><h2>${title}</h2>${alerts.map(alert => `<article class="card reminder-card"><div class="reminder-main"><span class="reminder-bell">🔔</span><div><b>${esc(alert.title)}</b><small>${title === 'Vencidas' ? `Venció el ${formatDate(alert.date)}` : title === 'Hoy' ? 'Es para hoy' : `En ${dayDistance(alert.date)} ${dayDistance(alert.date) === 1 ? 'día' : 'días'} · ${formatDate(alert.date)}`}</small>${alert.offsets.length > 1 ? `<small>${alert.offsets.length} avisos: ${alert.offsets.slice(0, -1).map(days => `${days} días antes`).join(', ')} y el mismo día</small>` : ''}</div></div><button class="btn small" data-action="complete-alert" data-id="${alert.id}">Listo</button></article>`).join('')}</section>`;
}
function activeAlerts() { return state.alerts.filter(alert => !alert.done); }
function nextReminder(alert) {
  const due = parseDateKey(alert.date);
  const dates = (alert.offsets?.length ? alert.offsets : [0]).map(offset => {
    const date = new Date(due); date.setDate(date.getDate() - offset); return { date: dateKey(date), offset };
  }).filter(item => item.date >= todayKey()).sort((a, b) => a.date.localeCompare(b.date));
  return dates.length ? { ...dates[0], days: dayDistance(dates[0].date) } : { date: alert.date, offset: 0, days: dayDistance(alert.date) };
}
function reminderLine(alert, notice = nextReminder(alert)) {
  const dueDays = dayDistance(alert.date);
  const label = dueDays < 0 ? 'Vencida' : notice.offset > 0 ? (notice.days === 0 ? 'Aviso hoy' : `Aviso en ${notice.days} d`) : dueDays === 0 ? 'Hoy' : `En ${dueDays} d`;
  return `<div class="alertline"><span>🔔</span><b>${esc(alert.title)}</b><span class="low-stock">${label}</span></div>`;
}
function settingsPage() {
  return `${heading('Configuración', 'Ajustá lo básico para que el sistema se sienta tuyo.')}<div class="settingsgrid"><article class="card settingcard"><h3>Tu negocio</h3><p>Este nombre aparece en el sistema.</p><div class="field"><label>Nombre del comercio</label><input id="business" value="${esc(state.business)}"></div><button class="btn primary" style="margin-top:12px" data-action="save-business">Guardar nombre</button></article><article class="card settingcard"><h3>Tu experiencia</h3><p>Elegí cómo preferís ver el sistema.</p><div class="switchrow"><span>Modo oscuro</span><button class="btn small" data-action="theme">${state.dark ? 'Activado' : 'Desactivado'}</button></div><div class="switchrow"><span>Moneda</span><select class="filter" id="currency"><option value="ARS" ${state.currency === 'ARS' ? 'selected' : ''}>Peso argentino ($)</option><option value="USD" ${state.currency === 'USD' ? 'selected' : ''}>Dólar (US$)</option><option value="UYU" ${state.currency === 'UYU' ? 'selected' : ''}>Peso uruguayo</option><option value="CLP" ${state.currency === 'CLP' ? 'selected' : ''}>Peso chileno</option></select></div></article><article class="card settingcard"><h3>Tus datos</h3><p>Se guardan en este dispositivo. Descargá una copia cuando quieras.</p><button class="btn" data-action="export">Descargar copia de datos</button></article><article class="card settingcard"><h3>Adaptable a tu rubro</h3><p>La base usa productos y categorías generales. Más adelante se pueden sumar talles, medidas o vencimientos.</p><span class="pill">Base general</span></article></div>`;
}

function bind() {
  document.querySelectorAll('[data-action]:not([data-action="toggle-nav-group"])').forEach(button => button.onclick = () => action(button.dataset.action, button.dataset.id));
  document.querySelectorAll('[data-page]').forEach(button => button.onclick = () => setPage(button.dataset.page));
  $('#search')?.addEventListener('input', event => { query = event.target.value; const cursor = event.target.selectionStart; render(); $('#search')?.focus(); $('#search')?.setSelectionRange(cursor, cursor); });
  $('#stockfilter')?.addEventListener('change', event => {
    const filter = event.target.value;
    document.querySelectorAll('tbody tr[data-stock]').forEach(row => { const stock = +row.dataset.stock, min = +row.dataset.min; row.style.display = filter === 'none' ? (stock === 0 ? '' : 'none') : filter === 'low' ? (stock > 0 && stock <= min ? '' : 'none') : ''; });
  });
  $('#currency')?.addEventListener('change', event => { state.currency = event.target.value; save(); render(); });
  $('#expense-message')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); interpretExpense(); } });
}
function action(name, id) {
  if (name === 'sale') saleModal();
  if (name === 'product') productModal();
  if (name === 'edit-product') productModal(Number(id));
  if (name === 'expense') expenseModal();
  if (name === 'interpret-expense') interpretExpense();
  if (name === 'complete-expense') completeExpenseDraft();
  if (name === 'confirm-expense') confirmExpenseDraft();
  if (name === 'purchase') purchaseModal();
  if (name === 'open-cash') cashModal('open');
  if (name === 'close-cash') cashModal('close');
  if (name === 'supplier') supplierModal();
  if (name === 'supplier-price') supplierPriceModal(Number(id));
  if (name === 'increase-prices') increasePricesModal(Number(id));
  if (name === 'alert') alertModal();
  if (name === 'complete-alert') completeAlert(Number(id));
  if (name === 'more') moreModal();
  if (name === 'theme') { state.dark = !state.dark; save(); render(); }
  if (name === 'save-business') { state.business = $('#business').value.trim() || 'Mi comercio'; save(); render(); toast('Nombre actualizado.'); }
  if (name === 'export') exportData();
}

function modal(title, description, body, footer = '', wide = false) {
  $('#overlay').innerHTML = `<div class="modal-backdrop"><section class="modal ${wide ? 'wide' : ''}"><div class="modal-head"><div><h2>${title}</h2><p>${description}</p></div><button class="close" id="closemodal">×</button></div><div class="modal-body">${body}</div>${footer ? `<div class="modal-foot">${footer}</div>` : ''}</section></div>`;
  $('#closemodal').onclick = closeModal;
  $('.modal-backdrop').onclick = event => { if (event.target.classList.contains('modal-backdrop')) closeModal(); };
  document.onkeydown = event => { if (event.key === 'Escape') closeModal(); };
}
function closeModal() { $('#overlay').innerHTML = ''; document.onkeydown = null; }
const input = (label, name, placeholder = '', type = 'text', value = '') => `<div class="field"><label>${label}</label><input name="${name}" type="${type}" placeholder="${placeholder}" value="${esc(String(value))}" ${type === 'number' ? 'min="0" step="0.01"' : ''}></div>`;
const select = (label, name, options) => `<div class="field"><label>${label}</label><select name="${name}">${options.map(option => `<option value="${esc(option.value ?? option)}">${esc(option.label ?? option)}</option>`).join('')}</select></div>`;

function productModal(id) {
  const product = id ? state.products.find(item => item.id === id) : {};
  modal(id ? 'Editar producto' : 'Agregar producto', 'Empezá por lo necesario. Podés completar la categoría después.', `<form id="form" class="form-grid">${input('Nombre del producto', 'name', 'Ej. Remera básica')}${input('Precio de venta', 'price', '0', 'number', product.price ?? '')}${input('Cantidad disponible', 'stock', '0', 'number', product.stock ?? 0)}${input('Precio de compra (opcional)', 'cost', '0', 'number', product.cost ?? '')}${input('Categoría (opcional)', 'category', 'Ej. Indumentaria', 'text', product.category ?? '')}</form>`, `<button class="btn" id="cancel">Cancelar</button>${id ? '<button class="btn" id="delete" style="margin-right:auto;color:#b94343">Eliminar</button>' : ''}<button class="btn primary" id="submit">Guardar producto</button>`);
  $('#cancel').onclick = closeModal;
  if (id) $('#delete').onclick = () => { if (!confirm(`¿Eliminar ${product.name} del stock?`)) return; state.products = state.products.filter(item => item.id !== id); save(); closeModal(); render(); toast('Producto eliminado.'); };
  $('#submit').onclick = () => {
    const form = new FormData($('#form')), name = form.get('name').trim();
    if (!name) return toast('Escribí el nombre del producto.');
    const values = { name, price: +form.get('price'), stock: +form.get('stock'), cost: +form.get('cost'), category: form.get('category') || 'General', min: product.min ?? 5, emoji: product.emoji || '📦' };
    if (id) Object.assign(product, values); else state.products.unshift({ id: Date.now(), ...values });
    save(); closeModal(); render(); toast(id ? 'Producto actualizado.' : 'Producto agregado.');
  };
}

function saleModal() {
  cart = [];
  const body = `<div class="pos-layout"><section class="pos-products"><div class="pos-section-title"><b>Elegí los productos</b><span>Se agregan al carrito</span></div><div class="field"><label for="saleprod">Buscar producto disponible</label><div class="pos-picker"><select id="saleprod"><option value="">Elegir producto…</option>${state.products.filter(product => product.stock > 0).map(product => `<option value="${product.id}">${esc(product.name)} · ${money(product.price)} · quedan ${product.stock}</option>`).join('')}</select><button class="btn" id="addcart">Agregar</button></div></div><p class="pos-hint">El stock se actualiza al cobrar.</p></section><section class="pos-cart-panel"><div class="pos-section-title"><b>Carrito</b><span>Venta actual</span></div><div id="cartlist" class="cart-list"><div class="empty">Todavía no hay productos.</div></div><div class="pos-payment">${select('Forma de pago', 'payment', ['Efectivo', 'Débito', 'Crédito', 'Transferencia'])}</div><div id="sale-total" class="carttotal"><span>Total</span><span>${money(0)}</span></div></section></div>`;
  modal('Nueva venta', 'Producto, cantidad, pago y listo.', body, '<button class="btn" id="cancel">Cancelar</button><button class="btn primary" id="checkout">Cobrar y finalizar</button>', true);
  $('#cancel').onclick = closeModal;
  $('#addcart').onclick = () => {
    const id = +$('#saleprod').value, product = state.products.find(item => item.id === id);
    if (!product) return toast('Elegí un producto primero.');
    const row = cart.find(item => item.id === id);
    if (row) { if (row.qty >= product.stock) return toast('No quedan más unidades disponibles.'); row.qty++; }
    else cart.push({ id, qty: 1 });
    $('#saleprod').value = ''; drawCart();
  };
  function drawCart() {
    const list = $('#cartlist');
    list.innerHTML = cart.length ? cart.map(row => { const product = state.products.find(item => item.id === row.id); return `<div class="cartitem"><span class="thumb">${product.emoji || '📦'}</span><span class="grow"><b>${esc(product.name)}</b><div class="muted">${money(product.price)} c/u</div></span><span class="qtyctrl"><button data-q="-" data-id="${row.id}">−</button><b>${row.qty}</b><button data-q="+" data-id="${row.id}">+</button></span><b style="min-width:62px;text-align:right">${money(row.qty * product.price)}</b></div>`; }).join('') : '<div class="empty">Agregá el primer producto a la venta.</div>';
    const total = cart.reduce((sum, row) => sum + row.qty * state.products.find(item => item.id === row.id).price, 0);
    $('#sale-total').innerHTML = `<span>Total</span><span>${money(total)}</span>`;
    $('#checkout').textContent = cart.length ? `Cobrar ${money(total)}` : 'Cobrar y finalizar';
    list.querySelectorAll('[data-q]').forEach(button => button.onclick = () => { const row = cart.find(item => item.id === +button.dataset.id), product = state.products.find(item => item.id === row.id); if (button.dataset.q === '+') { if (row.qty >= product.stock) return toast('No quedan más unidades.'); row.qty++; } else if (--row.qty <= 0) cart = cart.filter(item => item !== row); drawCart(); });
  }
  $('#checkout').onclick = () => {
    if (!cart.length) return toast('Agregá al menos un producto.');
    const sale = { id: Date.now(), date: new Date().toISOString(), items: cart.map(row => { const product = state.products.find(item => item.id === row.id); return { productId: product.id, name: product.name, qty: row.qty, price: product.price, cost: product.cost }; }), total: cart.reduce((sum, row) => sum + row.qty * state.products.find(item => item.id === row.id).price, 0), payment: $('[name=payment]').value };
    sale.items.forEach(item => { state.products.find(product => product.id === item.productId).stock -= item.qty; });
    state.sales.push(sale); save(); closeModal(); setPage('Ventas'); toast('Venta lista. Stock, caja y resumen actualizados.');
  };
}

function expenseModal() {
  modal('Registrar gasto', 'Anotá qué, cuánto y cuándo. Se refleja en caja y finanzas.', `<form id="form" class="form-grid">${input('¿Qué gastaste?', 'name', 'Ej. Luz')}${input('¿Cuánto?', 'amount', '25000', 'number')}${input('¿Cuándo?', 'date', '', 'date', todayKey())}</form>`, '<button class="btn" id="cancel">Cancelar</button><button class="btn primary" id="submit">Guardar gasto</button>');
  $('#cancel').onclick = closeModal;
  $('#submit').onclick = () => { const form = new FormData($('#form')); saveExpense(form.get('name'), +form.get('amount'), form.get('date')); };
}
function saveExpense(name, amount, date) {
  if (!name?.trim()) return toast('Escribí qué gastaste.');
  if (!(amount > 0)) return toast('Escribí cuánto gastaste.');
  if (!date) return toast('Elegí cuándo fue el gasto.');
  state.expenses.push({ id: Date.now(), date: parseDateKey(date).toISOString(), recordedAt: new Date().toISOString(), name: name.trim(), amount });
  save(); closeModal(); expenseDraft = null; render(); toast('Gasto guardado en caja y finanzas.');
}
function parseExpenseMessage(message) {
  const withoutDates = message.replace(/\b(?:el\s+)?\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, ' ');
  const amountMatch = withoutDates.match(/\$?\s*(\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s*(mil)?\s*(?:pesos?)?/i);
  let amount = null;
  if (amountMatch) { amount = Number(amountMatch[1].replace(/[.,]/g, '')) * (amountMatch[2] ? 1000 : 1); }
  let name = message.replace(amountMatch?.[0] || '', ' ')
    .replace(/\b(?:gast(?:e|é)|pagu(?:e|é)|abon(?:e|é)|compr(?:e|é))/gi, ' ')
    .replace(/\b(hoy|ayer|mañana|pesos?)\b/gi, ' ')
    .replace(/\b(?:el\s+)?\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, ' ')
    .replace(/\b(?:en|de|por|la|el|un|una)\b/gi, ' ')
    .replace(/[.,;:!?]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!name) name = null;
  let date = todayKey();
  if (/\bayer\b/i.test(message)) { const d = parseDateKey(date); d.setDate(d.getDate() - 1); date = dateKey(d); }
  if (/\bmañana\b/i.test(message)) { const d = parseDateKey(date); d.setDate(d.getDate() + 1); date = dateKey(d); }
  const dateMatch = message.match(/\b(?:el\s+)?(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (dateMatch) { const year = dateMatch[3] ? (+dateMatch[3] < 100 ? 2000 + +dateMatch[3] : +dateMatch[3]) : new Date().getFullYear(); date = dateKey(new Date(year, +dateMatch[2] - 1, +dateMatch[1], 12)); }
  return { name, amount, date };
}
function interpretExpense() {
  const message = $('#expense-message')?.value.trim();
  if (!message) return toast('Escribí el gasto con tus palabras.');
  const parsed = parseExpenseMessage(message);
  expenseDraft = { ...parsed, message, missing: [] };
  if (!expenseDraft.amount) expenseDraft.missing.push('el importe');
  if (!expenseDraft.name) expenseDraft.missing.push('el detalle');
  render();
}
function completeExpenseDraft() {
  if (!expenseDraft) return;
  if (expenseDraft.missing.includes('el importe')) expenseDraft.amount = +$('#draft-amount').value || null;
  if (expenseDraft.missing.includes('el detalle')) expenseDraft.name = $('#draft-name').value.trim() || null;
  expenseDraft.missing = [];
  if (!expenseDraft.amount) expenseDraft.missing.push('el importe');
  if (!expenseDraft.name) expenseDraft.missing.push('el detalle');
  render();
}
function confirmExpenseDraft() { if (expenseDraft) saveExpense(expenseDraft.name, expenseDraft.amount, expenseDraft.date); }

function purchaseModal() {
  const supplierOptions = state.suppliers.map(supplier => ({ value: supplier.name, label: supplier.name }));
  modal('Registrar compra', 'La compra queda en el historial y suma al stock.', `<form id="form" class="form-grid">${supplierOptions.length ? select('Proveedor', 'supplier', supplierOptions) : input('Proveedor', 'supplier', 'Nombre del proveedor')}${input('Producto', 'product', 'Nombre del producto')}${input('Cantidad', 'qty', '1', 'number')}${input('Costo por unidad', 'cost', '0', 'number')}</form>`, '<button class="btn" id="cancel">Cancelar</button><button class="btn primary" id="submit">Registrar compra</button>');
  $('#cancel').onclick = closeModal;
  $('#submit').onclick = () => {
    const form = new FormData($('#form')), name = form.get('product').trim(), qty = +form.get('qty'), cost = +form.get('cost'), supplierName = form.get('supplier').trim();
    if (!name || qty <= 0 || cost < 0 || !supplierName) return toast('Revisá el proveedor, el producto, la cantidad y el costo.');
    let product = state.products.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (product) { product.stock += qty; product.cost = cost || product.cost; }
    else { product = { id: Date.now(), name, category: 'General', cost, price: cost, stock: qty, min: 5, emoji: '📦' }; state.products.unshift(product); }
    state.purchases.push({ id: Date.now(), date: new Date().toISOString(), supplier: supplierName, items: [{ name, qty, cost }], total: qty * cost });
    const supplier = state.suppliers.find(item => item.name === supplierName);
    if (supplier) upsertSupplierPrice(supplier, product, cost);
    save(); closeModal(); setPage('Compras'); toast('Compra registrada y stock actualizado.');
  };
}

function cashModal(mode) {
  if (mode === 'open') {
    modal('Abrir caja', '¿Con cuánto dinero abrís hoy?', `<form id="form">${input('Dinero inicial', 'amount', '100000', 'number')}</form>`, '<button class="btn" id="cancel">Cancelar</button><button class="btn primary" id="submit">Abrir caja</button>');
    $('#cancel').onclick = closeModal;
    $('#submit').onclick = () => { const opening = +new FormData($('#form')).get('amount'); if (opening < 0) return toast('Escribí un importe válido.'); state.cash = { date: todayKey(), status: 'open', opening, counted: null, expectedOnClose: null, difference: null, openedAt: new Date().toISOString() }; save(); closeModal(); render(); toast('Caja abierta.'); };
    return;
  }
  modal('Cerrar caja', `Esperamos ${money(cashExpected())}. ¿Con cuánto dinero te vas?`, `<form id="form"><div class="hero-note">Dinero esperado: <strong>${money(cashExpected())}</strong></div>${input('Dinero contado', 'counted', '0', 'number')}</form>`, '<button class="btn" id="cancel">Seguir trabajando</button><button class="btn primary" id="submit">Cerrar caja</button>');
  $('#cancel').onclick = closeModal;
  $('#submit').onclick = () => { const counted = +new FormData($('#form')).get('counted'); if (counted < 0) return toast('Escribí un importe válido.'); const expected = cashExpected(); state.cash.status = 'closed'; state.cash.counted = counted; state.cash.expectedOnClose = expected; state.cash.difference = counted - expected; state.cash.closedAt = new Date().toISOString(); save(); closeModal(); render(); toast('Caja cerrada.'); };
}

function supplierModal() {
  modal('Agregar proveedor', 'Guardá el nombre. Los precios se agregan después.', `<form id="form" class="form-grid">${input('Nombre', 'name', 'Ej. Distribuidora Norte')}${input('Teléfono (opcional)', 'phone', 'Teléfono', 'tel')}${input('Contacto (opcional)', 'contact', 'Persona de contacto')}</form>`, '<button class="btn" id="cancel">Cancelar</button><button class="btn primary" id="submit">Guardar proveedor</button>');
  $('#cancel').onclick = closeModal;
  $('#submit').onclick = () => { const form = new FormData($('#form')), name = form.get('name').trim(); if (!name) return toast('Escribí el nombre del proveedor.'); state.suppliers.push({ id: Date.now(), name, phone: form.get('phone'), contact: form.get('contact'), priceList: [] }); save(); closeModal(); render(); toast('Proveedor guardado.'); };
}
function supplierPriceModal(supplierId) {
  const supplier = state.suppliers.find(item => item.id === supplierId);
  if (!supplier) return;
  const options = state.products.map(product => ({ value: product.id, label: product.name }));
  modal(`Precio · ${esc(supplier.name)}`, 'Asociá un producto y anotá cuánto cobra.', options.length ? `<form id="form" class="form-grid">${select('Producto', 'productId', options)}${input('Precio por unidad', 'price', '10000', 'number')}</form>` : '<p class="hint">Primero agregá un producto en Stock.</p>', `<button class="btn" id="cancel">Cerrar</button>${options.length ? '<button class="btn primary" id="submit">Guardar precio</button>' : ''}`);
  $('#cancel').onclick = closeModal;
  if (options.length) $('#submit').onclick = () => { const form = new FormData($('#form')), product = state.products.find(item => item.id === +form.get('productId')), price = +form.get('price'); if (!(price > 0)) return toast('Escribí un precio válido.'); upsertSupplierPrice(supplier, product, price); save(); closeModal(); render(); toast('Precio guardado.'); };
}
function upsertSupplierPrice(supplier, product, price) {
  const current = supplier.priceList.find(item => item.productId === product.id);
  if (current) { current.name = product.name; current.price = price; }
  else supplier.priceList.push({ productId: product.id, name: product.name, price });
}
function increasePricesModal(supplierId) {
  const supplier = state.suppliers.find(item => item.id === supplierId);
  if (!supplier?.priceList.length) return toast('Agregá primero los precios de este proveedor.');
  modal('Actualizar precios', `Los precios de ${esc(supplier.name)} subirán juntos.`, `<form id="form">${input('Aumentar todos los precios un', 'percent', '5', 'number', 5)}<p class="hint">Ejemplo: ${money(supplier.priceList[0].price)} con un 5% pasa a ${money(Math.round(supplier.priceList[0].price * 1.05))}.</p></form>`, '<button class="btn" id="cancel">Cancelar</button><button class="btn primary" id="submit">Actualizar precios</button>');
  $('#cancel').onclick = closeModal;
  $('#submit').onclick = () => { const percent = +new FormData($('#form')).get('percent'); if (!(percent >= 0)) return toast('Escribí un porcentaje válido.'); supplier.priceList.forEach(item => { item.price = Math.round(item.price * (1 + percent / 100)); }); save(); closeModal(); render(); toast(`Lista actualizada: +${percent}%.`); };
}

function alertModal() {
  modal('Nueva alerta', 'Qué tenés que hacer y cuándo.', `<form id="form" class="form-grid">${input('¿Qué tenés que hacer?', 'title', 'Ej. Pagar la luz')}${input('¿Cuándo?', 'date', '', 'date', todayKey())}${select('¿Cuántas veces querés que te avise?', 'times', [{ value: 1, label: 'Una vez · el mismo día' }, { value: 2, label: '2 veces · 2 días antes y ese día' }, { value: 3, label: '3 veces · 7 y 2 días antes, y ese día' }])}</form>`, '<button class="btn" id="cancel">Cancelar</button><button class="btn primary" id="submit">Guardar alerta</button>');
  $('#cancel').onclick = closeModal;
  $('#submit').onclick = () => { const form = new FormData($('#form')), title = form.get('title').trim(), date = form.get('date'), count = +form.get('times'); if (!title) return toast('Escribí qué tenés que hacer.'); if (!date) return toast('Elegí una fecha.'); const offsets = count === 3 ? [7, 2, 0] : count === 2 ? [2, 0] : [0]; state.alerts.unshift({ id: Date.now(), title, date, offsets, done: false, createdAt: new Date().toISOString() }); save(); closeModal(); setPage('Alertas'); toast('Recordatorio guardado.'); };
}
function completeAlert(id) { const alert = state.alerts.find(item => item.id === id); if (alert) { alert.done = true; alert.completedAt = new Date().toISOString(); save(); render(); toast('Recordatorio marcado como listo.'); } }

function moreModal() {
  const extras = [['Configuración', '⚙']];
  modal('Más opciones', 'Elegí una categoría.', `<div class="more-categories">${menuGroups.map(group => `<section><h3>${group.icon} ${group.name}</h3><div class="quick">${group.pages.filter(([name]) => name !== 'Stock').map(([name, icon]) => `<button data-more-page="${name}"><i>${icon}</i>${name}</button>`).join('')}</div></section>`).join('')}<section><h3>Otros</h3><div class="quick">${extras.map(([name, icon]) => `<button data-more-page="${name}"><i>${icon}</i>${name}</button>`).join('')}</div></section></div>`);
  document.querySelectorAll('[data-more-page]').forEach(button => button.onclick = () => { closeModal(); setPage(button.dataset.morePage); });
}
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), link = document.createElement('a');
  link.href = URL.createObjectURL(blob); link.download = 'copia-mi-comercio.json'; link.click(); URL.revokeObjectURL(link.href); toast('Copia de tus datos descargada.');
}
function dateTime(value) { return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function formatDate(value) { return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parseDateKey(value)); }
function time(value) { return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function esc(value = '') { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function toast(message) { $('#toast-root').innerHTML = `<div class="toast">${esc(message)}</div>`; setTimeout(() => { $('#toast-root').innerHTML = ''; }, 2900); }

render();

