/* ============================================
   INDOSPICY — Bulk Order JS
   Renders dish cards from window.DISHES and handles
   add / qty stepper / submit / success popup.
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {

  const selected = new Map();

  const grid         = document.getElementById('bulkMenuGrid');
  const summaryList  = document.getElementById('summaryList');
  const summaryCount = document.getElementById('summaryCount');
  const summaryTotal = document.getElementById('summaryTotal');
  const errorEl      = document.getElementById('bulkError');
  const placeBtn     = document.getElementById('placeOrderBtn');
  const popup        = document.getElementById('myForm');
  const closeBtn     = document.querySelector('.btn.cancel');
  const form         = document.getElementById('bulkOrderForm');
  const dateInput    = document.getElementById('orderDate');

  if (dateInput) {
    dateInput.min = new Date().toISOString().split('T')[0];
  }

  // Open native date/time picker on any click inside the field (not just the icon)
  ['orderDate', 'orderTime'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function () {
      if (typeof el.showPicker === 'function') {
        try { el.showPicker(); } catch (e) { /* unsupported context */ }
      }
    });
  });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function renderGrid() {
    if (!grid || !window.DISHES) return;
    const html = window.DISHES.map(function (cat) {
      const cards = cat.items.map(function (dish, idx) {
        const id = slugify(cat.category) + '-' + idx;
        return (
          '<article class="dish-card dish-card--overlay" data-name="' + escapeHtml(dish.name) + '" data-price="' + dish.price + '" data-id="' + id + '">' +
            '<div class="dish-card-img">' +
              '<img src="' + escapeHtml(dish.image) + '" alt="' + escapeHtml(dish.name) + '" loading="lazy">' +
              '<div class="dish-card-actions">' +
                '<button type="button" class="bulk-add-btn">ADD</button>' +
                '<div class="bulk-qty-stepper" hidden>' +
                  '<button type="button" class="bulk-qty-minus" aria-label="Decrease">−</button>' +
                  '<input type="number" class="bulk-qty-input" value="1" min="1" max="999" aria-label="Quantity">' +
                  '<button type="button" class="bulk-qty-plus" aria-label="Increase">+</button>' +
                '</div>' +
              '</div>' +
              '<div class="dish-card-overlay">' +
                '<span class="dish-card-name">' + escapeHtml(dish.name) + '</span>' +
                '<span class="dish-card-price">RM ' + dish.price + '</span>' +
              '</div>' +
            '</div>' +
          '</article>'
        );
      }).join('');
      return (
        '<div class="bulk-category">' +
          '<h3>' + escapeHtml(cat.category) + '</h3>' +
          '<div class="dish-card-grid">' + cards + '</div>' +
        '</div>'
      );
    }).join('');
    grid.innerHTML = html;
    grid.querySelectorAll('.dish-card').forEach(wireCard);
  }

  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function wireCard(card) {
    const name    = card.dataset.name;
    const price   = Number(card.dataset.price);
    const addBtn  = card.querySelector('.bulk-add-btn');
    const stepper = card.querySelector('.bulk-qty-stepper');
    const minus   = card.querySelector('.bulk-qty-minus');
    const plus    = card.querySelector('.bulk-qty-plus');
    const input   = card.querySelector('.bulk-qty-input');

    function showStepper(qty) {
      input.value = qty;
      addBtn.hidden = true;
      stepper.hidden = false;
      card.classList.add('selected');
    }

    function showAddButton() {
      input.value = 1;
      addBtn.hidden = false;
      stepper.hidden = true;
      card.classList.remove('selected');
    }

    function removeFromOrder() {
      selected.delete(name);
      showAddButton();
      renderSummary();
    }

    addBtn.addEventListener('click', function () {
      const qty = Number(input.value) || 1;
      selected.set(name, { name: name, price: price, qty: qty });
      showStepper(qty);
      renderSummary();
    });

    minus.addEventListener('click', function () {
      let v = Number(input.value) || 1;
      v -= 1;
      if (v < 1) {
        removeFromOrder();
        return;
      }
      input.value = v;
      updateQty(name, v);
    });

    plus.addEventListener('click', function () {
      let v = Number(input.value) || 1;
      if (v < 999) {
        v += 1;
        input.value = v;
        updateQty(name, v);
      }
    });

    input.addEventListener('input', function () {
      let v = parseInt(input.value, 10);
      if (isNaN(v) || v < 1) {
        removeFromOrder();
        return;
      }
      if (v > 999) v = 999;
      input.value = v;
      updateQty(name, v);
    });

    // expose reset for global resetOrder()
    card._reset = showAddButton;
  }

  function updateQty(name, qty) {
    const item = selected.get(name);
    if (item) {
      item.qty = qty;
      selected.set(name, item);
      renderSummary();
    }
  }

  function renderSummary() {
    if (!summaryList) return;
    if (selected.size === 0) {
      summaryList.innerHTML = '<li class="bulk-summary-empty">No dishes selected yet.</li>';
      summaryCount.textContent = '0 items';
      summaryTotal.textContent = 'RM 0';
      return;
    }
    let total = 0, itemCount = 0;
    const rows = [];
    selected.forEach(function (item) {
      const line = item.price * item.qty;
      total += line;
      itemCount += item.qty;
      rows.push(
        '<li class="bulk-summary-row">' +
          '<span class="bulk-summary-name">' + escapeHtml(item.name) + '</span>' +
          '<span class="bulk-summary-qty">× ' + item.qty + '</span>' +
          '<span class="bulk-summary-line">RM ' + line + '</span>' +
        '</li>'
      );
    });
    summaryList.innerHTML = rows.join('');
    summaryCount.textContent = selected.size + (selected.size === 1 ? ' dish' : ' dishes') + ' · ' + itemCount + ' qty';
    summaryTotal.textContent = 'RM ' + total;
  }

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function resetOrder() {
    selected.clear();
    document.querySelectorAll('.dish-card.selected').forEach(function (card) {
      if (typeof card._reset === 'function') card._reset();
    });
    if (form) form.reset();
    renderSummary();
  }

  if (placeBtn) {
    placeBtn.addEventListener('click', function () {
      if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }

      if (selected.size === 0) { showError('Please select at least one dish.'); return; }
      if (!form.checkValidity()) {
        showError('Please fill in all required details correctly.');
        form.reportValidity();
        return;
      }

      const items = Array.from(selected.values());
      const payload = {
        customer: {
          name:    form.customerName.value.trim(),
          phone:   form.customerPhone.value.trim(),
          email:   form.customerEmail.value.trim(),
          address: form.deliveryAddress.value.trim(),
        },
        delivery: { date: form.orderDate.value, time: form.orderTime.value },
        notes: form.orderNotes.value.trim(),
        items: items,
        estimatedTotal: items.reduce(function (s, i) { return s + (i.price * i.qty); }, 0),
      };

      console.log('Bulk order payload (to be sent to backend):', payload);
      if (popup) popup.classList.add('active');
    });
  }

  if (closeBtn && popup) {
    closeBtn.addEventListener('click', function () {
      popup.classList.remove('active');
      resetOrder();
    });
  }

  if (popup) {
    popup.addEventListener('click', function (e) {
      if (e.target === popup) {
        popup.classList.remove('active');
        resetOrder();
      }
    });
  }

  renderGrid();
  renderSummary();

});
