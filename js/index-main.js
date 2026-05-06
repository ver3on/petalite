// ── Boot ──

async function initPublicSite() {
  await Promise.all([
    loadShopSettings(),
    loadCatalog(),
  ]);
  initOrderForm();
  initNav();
}

// ── Shop settings ──

async function loadShopSettings() {
  try {
    const s = await fetchShopSettings();

    // banner
    if (s.banner_active && s.banner_text) {
      const banner = document.getElementById('closure-banner');
      document.getElementById('banner-text').textContent = s.banner_text;
      banner.classList.remove('hidden');
    }

    // nav + hero
    const shopName = s.shop_name || 'Petal';
    document.getElementById('nav-shop-name').textContent = shopName;
    document.getElementById('hero-shop-name').textContent = shopName;
    document.getElementById('hero-tagline').textContent = s.tagline || '';
    document.getElementById('footer-shop-name').textContent = `© ${new Date().getFullYear()} ${shopName}`;
    document.title = shopName;

    // about
    document.getElementById('about-body').textContent = s.about || '';
    if (s.about_photo_url) {
      const wrap = document.getElementById('about-photo-wrap');
      document.getElementById('about-photo').src = s.about_photo_url;
      wrap.classList.remove('hidden');
    }

    // contact
    if (s.address) {
      document.getElementById('contact-address').textContent = '📍 ' + s.address;
    }
    if (s.phone) {
      document.getElementById('contact-phone').textContent = '📞 ' + s.phone;
    }
    if (s.maps_embed_url) {
      const wrap = document.getElementById('maps-wrap');
      document.getElementById('maps-iframe').src = s.maps_embed_url;
      wrap.classList.remove('hidden');
    }

    // hours
    buildPublicHours(s.hours_json);

  } catch {
    showToast('Could not load shop info.', 'error');
  }
}

function buildPublicHours(hoursJson) {
  const table = document.getElementById('hours-table');
  const hours = typeof hoursJson === 'string' ? JSON.parse(hoursJson) : hoursJson;

  hours.forEach(row => {
    const div = document.createElement('div');
    div.className = 'hours-row-pub';
    div.innerHTML = `
      <span class="day-name">${row.day}</span>
      <span class="day-hours">${row.closed ? 'Closed' : `${row.open} - ${row.close}`}</span>
    `;
    table.appendChild(div);
  });
}

// ── Catalog ──

async function loadCatalog() {
  const grid = document.getElementById('catalog-grid');
  const select = document.getElementById('o-arrangement');

  try {
    const rows = await fetchPublishedArrangements();

    if (!rows.length) {
      grid.innerHTML = '<p style="color:var(--text-muted);font-size:15px;">No arrangements available right now. Check back soon!</p>';
      return;
    }

    rows.forEach(a => {
      grid.appendChild(buildCatalogCard(a));

      if (a.available) {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = `${a.name} — ₱${parseFloat(a.price).toFixed(2)}`;
        select.appendChild(opt);
      }
    });

  } catch {
    grid.innerHTML = '<p style="color:var(--text-muted);">Could not load arrangements.</p>';
  }
}

function buildCatalogCard(a) {
  const card = document.createElement('div');
  card.className = 'catalog-card animate-fade-in';

  const photo = a.photo_url
    ? `<img src="${a.photo_url}" alt="${a.name}" loading="lazy" />`
    : `<div class="catalog-card-no-photo">🌸</div>`;

  const badge = a.available
    ? `<span class="badge badge-available">Available</span>`
    : `<span class="badge badge-soldout">Sold out</span>`;

  card.innerHTML = `
    ${photo}
    <div class="catalog-card-body">
      <div class="catalog-card-name">${a.name}</div>
      <div class="catalog-card-price">₱${parseFloat(a.price).toFixed(2)}</div>
      ${badge}
    </div>
  `;

  return card;
}

// ── Order form ──

function initOrderForm() {
  // set min date to today
  const dateInput = document.getElementById('o-date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;

  // fulfillment toggle
  document.querySelectorAll('.fulfillment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fulfillment-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('o-fulfillment').value = btn.dataset.value;
    });
  });

  document.getElementById('order-form').addEventListener('submit', handleOrderSubmit);

  document.getElementById('order-again-btn').addEventListener('click', () => {
    document.getElementById('order-confirmation').classList.add('hidden');
    document.getElementById('order-form').classList.remove('hidden');
    document.getElementById('order-form').reset();
    document.getElementById('o-fulfillment').value = 'pickup';
    document.querySelectorAll('.fulfillment-btn').forEach((b, i) => {
      b.classList.toggle('active', i === 0);
    });
  });
}

async function handleOrderSubmit(e) {
  e.preventDefault();

  const btn = document.getElementById('order-submit-btn');
  const errEl = document.getElementById('order-error');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Placing order...';

  const arrangement_id = document.getElementById('o-arrangement').value;
  const customer_name = document.getElementById('o-name').value.trim();
  const contact = document.getElementById('o-contact').value.trim();
  const fulfillment = document.getElementById('o-fulfillment').value;
  const date_needed = document.getElementById('o-date').value;
  const note = document.getElementById('o-note').value.trim();

  if (!arrangement_id) {
    errEl.textContent = 'Please select an arrangement.';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Place order';
    return;
  }

  try {
    const order = await insertOrder({
      customer_name,
      contact,
      arrangement_id,
      fulfillment,
      date_needed,
      note: note || null,
    });

    // fire notify edge function (non-blocking)
    const arrangementName = document.getElementById('o-arrangement')
      .selectedOptions[0]?.textContent.split(' —')[0] || '';

    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.id,
        customer_name,
        contact,
        arrangement_name: arrangementName,
        fulfillment,
        date_needed,
        note: note || '',
      }),
    }).catch(() => {});

    document.getElementById('order-form').classList.add('hidden');
    document.getElementById('order-confirmation').classList.remove('hidden');

  } catch {
    errEl.textContent = 'Something went wrong. Please try again.';
    errEl.classList.remove('hidden');
    showToast('Order failed. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Place order';
  }
}

// ── Nav (mobile) ──

function initNav() {
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('nav-mobile-menu');

  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });

  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => mobileMenu.classList.add('hidden'));
  });
}

// ── Run ──

initPublicSite();