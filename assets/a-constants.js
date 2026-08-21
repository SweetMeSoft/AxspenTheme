if (typeof ON_CHANGE_DEBOUNCE_TIMER === 'undefined') window.ON_CHANGE_DEBOUNCE_TIMER = 300;

if (typeof PUB_SUB_EVENTS === 'undefined') window.PUB_SUB_EVENTS = {
  cartUpdate: 'cart-update',
  quantityUpdate: 'quantity-update',
  variantChange: 'variant-change'
};
