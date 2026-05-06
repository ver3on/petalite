// ── Section routing ──

function showSection(name) {
  document.querySelectorAll('.console-section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.remove('hidden');
  document.querySelector(`[data-section="${name}"]`).classList.add('active');
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const sec = btn.dataset.section;
    showSection(sec);
    if (sec === 'arrangements') loadArrangements();
    if (sec === 'trash') loadTrash();
    if (sec === 'orders') loadOrders();
    if (sec === 'settings') loadSettings();
  });
});

// ── Init ──

async function initConsole() {
  loadArrangements();
}

// ── Arrangements ──

async function loadArrangements() {
  const grid = document.getElementById('arrangements-list');
  grid.innerHTML = '<div class="empty-state"><span>🌸</span>Loading...</div>';
  try {
    const rows = await fetchAllArrangements();
    if (!rows.length) {
      grid.innerHTML = '<div class="empty-state"><span>🌷</span>No arrangements yet. Add one!</div>';
      return;
    }
    grid.innerHTML = '';
    rows.forEach(a => grid.appendChild(buildArrangementCard(a)));
  } catch (err) {
    grid.innerHTML = '<div class="empty-state"><span>⚠️</span>Failed to load arrangements.</div>';
    showToast('Failed to load arrangements', 'error');
  }
}

function buildArrangementCard(a) {
  const card = document.createElement('div');
  card.className = 'arrangement-card animate-fade-in';

  const photo = a.photo_url
    ? `<img src="${a.photo_url}" alt="${a.name}" loading="lazy" />`
    : `<div class="no-photo">🌸</div>`;

  const statusBadge = a.status === 'published'
    ? `<span class="badge badge-available">Published</span>`
    : `<span class="badge badge-soldout">Draft</span>`;

  const availBadge = a.available
    ? `<span class="badge badge-available">Available</span>`
    : `<span class="badge badge-soldout">Sold out</span>`;

  card.innerHTML = `
    ${photo}
    <div class="arrangement-card-body">
      <div class="arrangement-card-name">${a.name}</div>
      <div class="arrangement-card-price">₱${parseFloat(a.price).toFixed(2)}</div>
      <div class="arrangement-card-badges">${statusBadge}${availBadge}</div>
      <div class="arrangement-card-actions">
        <button class="btn btn-outline btn-edit" data-id="${a.id}">Edit</button>
        <button class="btn btn-ghost btn-toggle-status" data-id="${a.id}" data-status="${a.status}">
          ${a.status === 'published' ? 'Unpublish' : 'Publish'}
        </button>
        <button class="btn btn-ghost btn-toggle-avail" data-id="${a.id}" data-avail="${a.available}">
          ${a.available ? 'Mark sold out' : 'Mark available'}
        </button>
        <button class="btn btn-danger btn-trash" data-id="${a.id}">Trash</button>
      </div>
    </div>
  `;

  card.querySelector('.btn-edit').addEventListener('click', () => openEditModal(a));
  card.querySelector('.btn-toggle-status').addEventListener('click', () => toggleStatus(a));
  card.querySelector('.btn-toggle-avail').addEventListener('click', () => toggleAvailability(a));
  card.querySelector('.btn-trash').addEventListener('click', () => trashArrangement(a.id));

  return card;
}

async function toggleStatus(a) {
  try {
    await updateArrangement(a.id, { status: a.status === 'published' ? 'draft' : 'published' });
    showToast(`Arrangement ${a.status === 'published' ? 'unpublished' : 'published'}.`, 'success');
    loadArrangements();
  } catch {
    showToast('Failed to update status.', 'error');
  }
}

async function toggleAvailability(a) {
  try {
    await updateArrangement(a.id, { available: !a.available });
    showToast(`Marked as ${!a.available ? 'available' : 'sold out'}.`, 'success');
    loadArrangements();
  } catch {
    showToast('Failed to update availability.', 'error');
  }
}

async function trashArrangement(id) {
  if (!confirm('Move to trash?')) return;
  try {
    await softDeleteArrangement(id);
    showToast('Moved to trash.', 'info');
    loadArrangements();
  } catch {
    showToast('Failed to trash arrangement.', 'error');
  }
}

// ── Trash ──

async function loadTrash() {
  const grid = document.getElementById('trash-list');
  grid.innerHTML = '<div class="empty-state"><span>🗑️</span>Loading...</div>';
  try {
    const rows = await fetchTrashedArrangements();
    if (!rows.length) {
      grid.innerHTML = '<div class="empty-state"><span>✨</span>Trash is empty.</div>';
      return;
    }
    grid.innerHTML = '';
    rows.forEach(a => grid.appendChild(buildTrashCard(a)));
  } catch {
    showToast('Failed to load trash.', 'error');
  }
}

function buildTrashCard(a) {
  const card = document.createElement('div');
  card.className = 'arrangement-card animate-fade-in';

  const photo = a.photo_url
    ? `<img src="${a.photo_url}" alt="${a.name}" loading="lazy" />`
    : `<div class="no-photo">🌸</div>`;

  card.innerHTML = `
    ${photo}
    <div class="arrangement-card-body">
      <div class="arrangement-card-name">${a.name}</div>
      <div class="arrangement-card-price">₱${parseFloat(a.price).toFixed(2)}</div>
      <div class="arrangement-card-actions">
        <button class="btn btn-outline btn-restore" data-id="${a.id}">Restore</button>
        <button class="btn btn-danger btn-perm-delete" data-id="${a.id}" data-photo="${a.photo_url || ''}">Delete forever</button>
      </div>
    </div>
  `;

  card.querySelector('.btn-restore').addEventListener('click', async () => {
    try {
      await restoreArrangement(a.id);
      showToast('Arrangement restored.', 'success');
      loadTrash();
    } catch {
      showToast('Failed to restore.', 'error');
    }
  });

  card.querySelector('.btn-perm-delete').addEventListener('click', async () => {
    if (!confirm('Permanently delete this arrangement and its photo? This cannot be undone.')) return;
    try {
      await deleteArrangementPhoto(a.photo_url);
      await permanentDeleteArrangement(a.id);
      showToast('Permanently deleted.', 'info');
      loadTrash();
    } catch {
      showToast('Failed to delete.', 'error');
    }
  });

  return card;
}

// ── Modal ──

const modal = document.getElementById('arrangement-modal');

function openAddModal() {
  document.getElementById('modal-title').textContent = 'Add arrangement';
  document.getElementById('arrangement-form').reset();
  document.getElementById('f-id').value = '';
  document.getElementById('f-existing-photo').value = '';
  document.getElementById('f-photo-preview').innerHTML = '';
  document.getElementById('f-published').checked = false;
  document.getElementById('f-available').checked = true;
  modal.classList.remove('hidden');
}

function openEditModal(a) {
  document.getElementById('modal-title').textContent = 'Edit arrangement';
  document.getElementById('f-id').value = a.id;
  document.getElementById('f-name').value = a.name;
  document.getElementById('f-price').value = a.price;
  document.getElementById('f-existing-photo').value = a.photo_url || '';
  document.getElementById('f-published').checked = a.status === 'published';
  document.getElementById('f-available').checked = a.available;

  const preview = document.getElementById('f-photo-preview');
  preview.innerHTML = a.photo_url
    ? `<img src="${a.photo_url}" alt="Current photo" />`
    : '';

  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
}

document.getElementById('open-add-modal').addEventListener('click', openAddModal);
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('cancel-modal').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

document.getElementById('f-photo').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  document.getElementById('f-photo-preview').innerHTML = `<img src="${url}" alt="Preview" />`;
});

document.getElementById('arrangement-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('save-arrangement-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const id = document.getElementById('f-id').value;
    const name = document.getElementById('f-name').value.trim();
    const price = parseFloat(document.getElementById('f-price').value);
    const status = document.getElementById('f-published').checked ? 'published' : 'draft';
    const available = document.getElementById('f-available').checked;
    const photoFile = document.getElementById('f-photo').files[0];
    const existingPhoto = document.getElementById('f-existing-photo').value;

    let photo_url = existingPhoto;

    if (photoFile) {
      photo_url = await uploadArrangementPhoto(photoFile, existingPhoto || null);
    }

    const payload = { name, price, status, available, photo_url };

    if (id) {
      await updateArrangement(id, payload);
      showToast('Arrangement updated.', 'success');
    } else {
      await insertArrangement(payload);
      showToast('Arrangement added.', 'success');
    }

    closeModal();
    loadArrangements();
  } catch (err) {
    showToast('Failed to save arrangement.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save';
  }
});

// ── Orders ──

async function loadOrders() {
  const list = document.getElementById('orders-list');
  list.innerHTML = '<div class="empty-state"><span>📋</span>Loading...</div>';
  try {
    const rows = await fetchOrders();
    if (!rows.length) {
      list.innerHTML = '<div class="empty-state"><span>🌸</span>No orders yet.</div>';
      return;
    }
    list.innerHTML = '';
    rows.forEach(o => list.appendChild(buildOrderRow(o)));
  } catch {
    showToast('Failed to load orders.', 'error');
  }
}

function buildOrderRow(o) {
  const row = document.createElement('div');
  row.className = 'order-row animate-fade-in';

  const statuses = ['new', 'confirmed', 'ready', 'done'];
  const opts = statuses.map(s =>
    `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
  ).join('');

  row.innerHTML = `
    <div class="order-row-left">
      <div class="order-row-name">${o.customer_name}</div>
      <div class="order-row-meta">${o.arrangements?.name || 'Unknown'} · ${o.fulfillment} · ${o.date_needed}</div>
    </div>
    <div class="order-row-right">
      <span class="badge badge-${o.status}">${o.status}</span>
      <select class="status-select" data-id="${o.id}">${opts}</select>
    </div>
  `;

  row.querySelector('.status-select').addEventListener('change', async e => {
    e.stopPropagation();
    try {
      await updateOrderStatus(o.id, e.target.value);
      showToast('Status updated.', 'success');
      const badge = row.querySelector('.badge');
      badge.className = `badge badge-${e.target.value}`;
      badge.textContent = e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1);
    } catch {
      showToast('Failed to update status.', 'error');
    }
  });

  row.addEventListener('click', () => openOrderModal(o));

  return row;
}

const orderModal = document.getElementById('order-modal');

function openOrderModal(o) {
  const body = document.getElementById('order-detail-body');
  body.innerHTML = `
    <div class="order-detail-row"><span class="order-detail-label">Customer</span><span class="order-detail-value">${o.customer_name}</span></div>
    <div class="order-detail-row"><span class="order-detail-label">Contact</span><span class="order-detail-value">${o.contact}</span></div>
    <div class="order-detail-row"><span class="order-detail-label">Arrangement</span><span class="order-detail-value">${o.arrangements?.name || 'Unknown'}</span></div>
    <div class="order-detail-row"><span class="order-detail-label">Fulfillment</span><span class="order-detail-value">${o.fulfillment}</span></div>
    <div class="order-detail-row"><span class="order-detail-label">Date needed</span><span class="order-detail-value">${o.date_needed}</span></div>
    <div class="order-detail-row"><span class="order-detail-label">Status</span><span class="order-detail-value">${o.status}</span></div>
    ${o.note ? `<div class="order-detail-row"><span class="order-detail-label">Note</span><span class="order-detail-value">${o.note}</span></div>` : ''}
    <div class="order-detail-row"><span class="order-detail-label">Order ID</span><span class="order-detail-value" style="font-size:12px;color:var(--text-muted)">${o.id}</span></div>
  `;
  orderModal.classList.remove('hidden');
}

document.getElementById('close-order-modal').addEventListener('click', () => orderModal.classList.add('hidden'));
orderModal.addEventListener('click', e => { if (e.target === orderModal) orderModal.classList.add('hidden'); });

// ── Settings ──

let currentSettingsId = null;

async function loadSettings() {
  try {
    const s = await fetchShopSettings();
    currentSettingsId = s.id;

    document.getElementById('s-shop-name').value = s.shop_name || '';
    document.getElementById('s-tagline').value = s.tagline || '';
    document.getElementById('s-about').value = s.about || '';
    document.getElementById('s-address').value = s.address || '';
    document.getElementById('s-phone').value = s.phone || '';
    document.getElementById('s-maps-url').value = s.maps_embed_url || '';
    document.getElementById('s-banner-text').value = s.banner_text || '';
    document.getElementById('s-banner-active').checked = s.banner_active || false;

    if (s.about_photo_url) {
      document.getElementById('s-about-photo-preview').innerHTML =
        `<img src="${s.about_photo_url}" alt="About photo" />`;
    }

    buildHoursEditor(s.hours_json);
  } catch {
    showToast('Failed to load settings.', 'error');
  }
}

function buildHoursEditor(hoursJson) {
  const editor = document.getElementById('hours-editor');
  editor.innerHTML = '';
  const hours = typeof hoursJson === 'string' ? JSON.parse(hoursJson) : hoursJson;

  hours.forEach((row, i) => {
    const div = document.createElement('div');
    div.className = 'hours-row';
    div.innerHTML = `
      <span class="hours-day">${row.day}</span>
      <input type="time" class="hours-open" data-i="${i}" value="${row.open}" ${row.closed ? 'disabled' : ''} />
      <span style="font-size:13px;color:var(--text-muted)">to</span>
      <input type="time" class="hours-close" data-i="${i}" value="${row.close}" ${row.closed ? 'disabled' : ''} />
      <label class="hours-closed-label">
        <input type="checkbox" class="hours-closed-chk" data-i="${i}" ${row.closed ? 'checked' : ''} />
        Closed
      </label>
    `;

    div.querySelector('.hours-closed-chk').addEventListener('change', e => {
      const closed = e.target.checked;
      div.querySelector('.hours-open').disabled = closed;
      div.querySelector('.hours-close').disabled = closed;
    });

    editor.appendChild(div);
  });
}

function readHoursFromEditor(original) {
  const hours = typeof original === 'string' ? JSON.parse(original) : JSON.parse(JSON.stringify(original));
  hours.forEach((row, i) => {
    const openEl = document.querySelector(`.hours-open[data-i="${i}"]`);
    const closeEl = document.querySelector(`.hours-close[data-i="${i}"]`);
    const closedEl = document.querySelector(`.hours-closed-chk[data-i="${i}"]`);
    row.open = openEl ? openEl.value : row.open;
    row.close = closeEl ? closeEl.value : row.close;
    row.closed = closedEl ? closedEl.checked : row.closed;
  });
  return hours;
}

document.getElementById('s-about-photo').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  document.getElementById('s-about-photo-preview').innerHTML = `<img src="${url}" alt="Preview" />`;
});

document.getElementById('settings-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const current = await fetchShopSettings();
    const photoFile = document.getElementById('s-about-photo').files[0];
    let about_photo_url = current.about_photo_url || '';

    if (photoFile) {
      about_photo_url = await uploadAboutPhoto(photoFile, current.about_photo_url || null);
    }

    const hours_json = readHoursFromEditor(current.hours_json);

    const payload = {
      shop_name: document.getElementById('s-shop-name').value.trim(),
      tagline: document.getElementById('s-tagline').value.trim(),
      about: document.getElementById('s-about').value.trim(),
      address: document.getElementById('s-address').value.trim(),
      phone: document.getElementById('s-phone').value.trim(),
      maps_embed_url: document.getElementById('s-maps-url').value.trim(),
      banner_text: document.getElementById('s-banner-text').value.trim(),
      banner_active: document.getElementById('s-banner-active').checked,
      about_photo_url,
      hours_json,
    };

    await updateShopSettings(currentSettingsId, payload);
    showToast('Settings saved.', 'success');
  } catch {
    showToast('Failed to save settings.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save settings';
  }
});