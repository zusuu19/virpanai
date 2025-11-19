// script.js
// Simple product store logic with localStorage cart
// Put this file in same folder as index.html and styles.css

const products = [
  {
    id: 'p1',
    title: 'Fresh Tomatoes (1kg)',
    price: 60,
    image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 'p2',
    title: 'Organic Milk (1L)',
    price: 55,
    image: 'https://images.unsplash.com/photo-1581607543304-9c5d3d84d1f8?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 'p3',
    title: 'Farm Eggs (6 pcs)',
    price: 70,
    image: 'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 'p4',
    title: 'Green Spinach (250g)',
    price: 30,
    image: 'https://images.unsplash.com/photo-1542444459-db3f8a39b6c0?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 'p5',
    title: 'Raw Honey (250g)',
    price: 180,
    image: 'https://images.unsplash.com/photo-1518972559570-6f2d9b7d6e05?q=80&w=800&auto=format&fit=crop'
  }
];

// DOM refs
const productsGrid = document.getElementById('productsGrid');
const cartBtn = document.getElementById('cartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const closeCart = document.getElementById('closeCart');
const cartItemsEl = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartSubtotal = document.getElementById('cartSubtotal');
const clearCartBtn = document.getElementById('clearCart');
const checkoutBtn = document.getElementById('checkoutBtn');
const checkoutModal = document.getElementById('checkoutModal');
const cancelCheckout = document.getElementById('cancelCheckout');
const checkoutForm = document.getElementById('checkoutForm');
const checkoutItemsCount = document.getElementById('checkoutItemsCount');
const checkoutTotal = document.getElementById('checkoutTotal');
const yearEl = document.getElementById('year');

yearEl.textContent = new Date().getFullYear();

// CART helpers
const CART_KEY = 'farmer_cart_v1';

function getCart(){
  try{
    return JSON.parse(localStorage.getItem(CART_KEY) || '{}');
  }catch(e){
    return {};
  }
}
function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCartSummary();
}
function addToCart(productId, qty=1){
  const cart = getCart();
  cart[productId] = (cart[productId] || 0) + qty;
  saveCart(cart);
}
function setQty(productId, qty){
  const cart = getCart();
  if(qty <= 0) delete cart[productId];
  else cart[productId] = qty;
  saveCart(cart);
}
function clearCart(){
  localStorage.removeItem(CART_KEY);
  renderCartSummary();
}

// UI rendering
function renderProducts(){
  productsGrid.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.image}" alt="${p.title}">
      <h3>${p.title}</h3>
      <div class="price">₹${p.price.toFixed(2)}</div>
      <div style="margin-top:auto;display:flex;gap:8px;align-items:center;">
        <button class="btn" data-id="${p.id}" aria-label="Add ${p.title} to cart">Add to cart</button>
        <input type="number" min="1" value="1" class="qty-input" data-id="${p.id}" style="width:70px;padding:6px;border-radius:8px;border:1px solid #ddd">
      </div>
    `;
    productsGrid.appendChild(card);
  });
}

// CART drawer render
function renderCartSummary(){
  const cart = getCart();
  const ids = Object.keys(cart);
  let totalCount = 0;
  let subtotal = 0;
  cartItemsEl.innerHTML = '';

  if(ids.length === 0){
    cartItemsEl.innerHTML = `<p style="color:var(--muted)">Your cart is empty.</p>`;
  } else {
    ids.forEach(id => {
      const qty = cart[id];
      const prod = products.find(p => p.id === id);
      if(!prod) return;
      totalCount += qty;
      subtotal += prod.price * qty;

      const item = document.createElement('div');
      item.className = 'cart-item';
      item.innerHTML = `
        <img src="${prod.image}" alt="${prod.title}">
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${prod.title}</strong>
            <div class="price">₹${(prod.price * qty).toFixed(2)}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
            <div class="qty-control">
              <button class="btn qty-dec" data-id="${id}" aria-label="Decrease quantity">−</button>
              <span style="min-width:30px;text-align:center">${qty}</span>
              <button class="btn qty-inc" data-id="${id}" aria-label="Increase quantity">+</button>
            </div>
            <button class="btn muted remove-item" data-id="${id}">Remove</button>
          </div>
        </div>
      `;
      cartItemsEl.appendChild(item);
    });
  }

  cartCount.textContent = totalCount;
  cartSubtotal.textContent = `₹${subtotal.toFixed(2)}`;
  checkoutItemsCount.textContent = totalCount;
  checkoutTotal.textContent = `₹${subtotal.toFixed(2)}`;
}

// event delegation for add buttons & qty inputs
productsGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = btn.dataset.id;
  if(id){
    // add to cart button
    addToCart(id, 1);
    // briefly open drawer to show feedback
    openCart();
  }
});
productsGrid.addEventListener('change', (e) => {
  const input = e.target;
  if(input.matches('.qty-input')){
    const id = input.dataset.id;
    let qty = parseInt(input.value) || 1;
    if(qty < 1) qty = 1;
    // set specific qty (so next click uses this amount)
    // We'll add that qty next time user clicks "Add to cart" — for now no-op
  }
});
// handle "Add to cart" with custom quantity (if user filled number)
productsGrid.querySelectorAll('.card').forEach(() => {}); // safe no-op (cards added dynamically)

// open/close cart
cartBtn.addEventListener('click', () => {
  const expanded = cartBtn.getAttribute('aria-expanded') === 'true';
  if(!expanded) openCart();
  else closeCartDrawer();
});
closeCart.addEventListener('click', closeCartDrawer);
function openCart(){
  cartDrawer.classList.add('open');
  cartBtn.setAttribute('aria-expanded','true');
  cartDrawer.setAttribute('aria-hidden','false');
  renderCartSummary();
}
function closeCartDrawer(){
  cartDrawer.classList.remove('open');
  cartBtn.setAttribute('aria-expanded','false');
  cartDrawer.setAttribute('aria-hidden','true');
}

// event delegation inside cart (qty inc/dec, remove)
cartItemsEl.addEventListener('click', (e) => {
  const inc = e.target.closest('.qty-inc');
  const dec = e.target.closest('.qty-dec');
  const rem = e.target.closest('.remove-item');
  if(inc){
    const id = inc.dataset.id;
    const cart = getCart();
    setQty(id, (cart[id] || 0) + 1);
    renderCartSummary();
  } else if(dec){
    const id = dec.dataset.id;
    const cart = getCart();
    setQty(id, (cart[id] || 0) - 1);
    renderCartSummary();
  } else if(rem){
    const id = rem.dataset.id;
    const cart = getCart();
    delete cart[id];
    saveCart(cart);
    renderCartSummary();
  }
});

// clear cart
clearCartBtn.addEventListener('click', () => {
  if(confirm('Clear the cart?')) {
    clearCart();
  }
});

// Checkout flow
checkoutBtn.addEventListener('click', () => {
  const cart = getCart();
  if(Object.keys(cart).length === 0){
    alert('Your cart is empty.');
    return;
  }
  checkoutModal.classList.add('open');
  checkoutModal.setAttribute('aria-hidden','false');
});
cancelCheckout.addEventListener('click', () => {
  checkoutModal.classList.remove('open');
  checkoutModal.setAttribute('aria-hidden','true');
});

// submit checkout
checkoutForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const data = {
    fullname: form.fullname.value.trim(),
    address: form.address.value.trim(),
    phone: form.phone.value.trim()
  };
  if(!data.fullname || !data.address || !data.phone){
    alert('Please fill all fields.');
    return;
  }

  // in a real app you'd send `data` + cart to a server.
  // Here we just simulate success and clear the cart.
  alert(`Thank you ${data.fullname}! Your order has been placed (demo).`);
  clearCart();
  checkoutModal.classList.remove('open');
  checkoutModal.setAttribute('aria-hidden','true');
  form.reset();
});

// contact form (demo)
document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Thanks for your message — we will get back to you soon (demo).');
  e.target.reset();
});

// initialize products & cart UI
function init(){
  renderProducts();
  // attach "Add to cart" that respects local qty input:
  // Since renderProducts created elements dynamically, attach events now:
  productsGrid.querySelectorAll('.card').forEach(card => {
    const addBtn = card.querySelector('button[data-id]');
    const qtyInput = card.querySelector('.qty-input');
    if(addBtn){
      addBtn.addEventListener('click', (ev) => {
        const id = addBtn.dataset.id;
        let qty = 1;
        if(qtyInput){
          qty = parseInt(qtyInput.value) || 1;
          if(qty < 1) qty = 1;
        }
        addToCart(id, qty);
      });
    }
  });

  // render cart count from storage
  renderCartSummary();
}

init();
