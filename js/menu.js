/* ============================================
   INDOSPICY — Menu Page Render
   Display-only image tiles with overlaid price + name
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {

  const grid = document.getElementById('menuGrid');
  if (!grid || !window.DISHES) return;

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  grid.innerHTML = window.DISHES.map(function (cat) {
    const cards = cat.items.map(function (dish) {
      return (
        '<article class="dish-card dish-card--overlay">' +
          '<div class="dish-card-img">' +
            '<img src="' + esc(dish.image) + '" alt="' + esc(dish.name) + '" loading="lazy">' +
            '<div class="dish-card-overlay">' +
              '<span class="dish-card-name">' + esc(dish.name) + '</span>' +
              '<span class="dish-card-price">RM ' + dish.price + '</span>' +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }).join('');
    return (
      '<div class="bulk-category">' +
        '<h3>' + esc(cat.category) + '</h3>' +
        '<div class="dish-card-grid">' + cards + '</div>' +
      '</div>'
    );
  }).join('');

});
