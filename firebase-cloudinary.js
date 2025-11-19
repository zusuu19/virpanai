// firebase-cloudinary.js (complete, ready to save as a single file)
// Usage: include once in index.html: <script type="module" src="firebase-cloudinary.js"></script>

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ---------- CONFIG (your values) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDPLy94SiCF6697yGsLXIfteV3iAtmXzKI",
  authDomain: "former-shop.firebaseapp.com",
  projectId: "former-shop",
  storageBucket: "former-shop.firebasestorage.app",
  messagingSenderId: "977112770102",
  appId: "1:977112770102:web:f61cf20895b0ca79e11a97",
  measurementId: "G-Q8E0XE0QRN"
};
const CLOUD_NAME = "dvqcmud7f";
const UPLOAD_PRESET = "farmUnsigned";

/* ---------- Replace this with the farmer's WhatsApp number (E.164). Keep as string. ---------- */
const FARMER_PHONE = "+917502404737"; // replace if needed

/* ---------- INIT ---------- */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------- HELPERS ---------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const escapeHtml = s => String(s || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);

/* ---------- Cloudinary helpers ---------- */
async function uploadToCloudinaryFileReturnResp(file) {
  if (!file) return null;
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Cloudinary upload failed: ' + txt);
  }
  return await res.json();
}

function buildTransformedUrlFromUploadResult(resp, w = 800, h = 540) {
  if (!resp) return '';
  if (!resp.public_id) return resp.secure_url || '';
  const v = resp.version;
  const pid = resp.public_id;
  const fmt = resp.format || 'jpg';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_${w},h_${h},c_fill/v${v}/${pid}.${fmt}`;
}

/* ---------- Firestore write for products & orders (now accepts category) ---------- */
async function saveProductToFirestore({ title, price, imageUrl, category = 'other' }) {
  return await addDoc(collection(db, 'products'), {
    title,
    price: Number(price),
    imageUrl: imageUrl || '',
    category: category || 'other',
    createdAt: serverTimestamp()
  });
}
async function saveOrderToFirestore(orderDoc) {
  return await addDoc(collection(db, 'orders'), orderDoc);
}

/* ---------- HERO SLIDER JS (keeps your slider working) ---------- */
function initHeroSlider(options = {}) {
  const container = document.querySelector('.hero-slider');
  if (!container) return;

  const slidesWrap = container.querySelector('.slides');
  const slides = Array.from(container.querySelectorAll('.slide'));
  const dotsWrap = container.querySelector('#sliderDots');
  const prevBtn = container.querySelector('#sliderPrev');
  const nextBtn = container.querySelector('#sliderNext');

  let current = 0;
  const total = slides.length;
  const interval = options.interval || 4500;
  let timer = null;

  // create dots
  if (dotsWrap) {
    dotsWrap.innerHTML = '';
    slides.forEach((s, i) => {
      const b = document.createElement('button');
      b.dataset.index = i;
      if (i === 0) b.classList.add('active');
      dotsWrap.appendChild(b);
    });
  }
  const dots = dotsWrap ? Array.from(dotsWrap.children) : [];

  function goTo(index) {
    index = (index + total) % total;
    current = index;
    if (slidesWrap) slidesWrap.style.transform = `translateX(${-index * 100}%)`;
    dots.forEach(d => d.classList.remove('active'));
    if (dots[index]) dots[index].classList.add('active');
  }

  function next() { goTo(current + 1); resetTimer(); }
  function prev() { goTo(current - 1); resetTimer(); }

  if (nextBtn) nextBtn.addEventListener('click', next);
  if (prevBtn) prevBtn.addEventListener('click', prev);

  if (dotsWrap) {
    dotsWrap.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const idx = Number(b.dataset.index);
      if (!Number.isNaN(idx)) goTo(idx);
      resetTimer();
    });
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(() => goTo(current + 1), interval);
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }
  function resetTimer() { stopTimer(); startTimer(); }

  container.addEventListener('mouseenter', stopTimer);
  container.addEventListener('mouseleave', startTimer);
  container.addEventListener('focusin', stopTimer);
  container.addEventListener('focusout', startTimer);

  goTo(0);
  startTimer();

  return { goTo, next, prev, startTimer, stopTimer, getCurrent: () => current };
}
document.addEventListener('DOMContentLoaded', () => { initHeroSlider({ interval: 4500 }); });

/* ---------- SELL MODAL (Add product) ---------- */
function createAddProductModal() {
  if ($('#__addProductModal')) return $('#__addProductModal');

  const modal = document.createElement('div');
  modal.id = '__addProductModal';
  modal.style = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);z-index:15000';

  // NOTE: added Category select (#__category) here
  modal.innerHTML = `
    <div style="width:560px;max-width:95%;background:#fff;border-radius:12px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,0.15)">
      <h3 style="margin:0 0 12px 0">Add a product</h3>
      <form id="__addProductForm" style="display:grid;gap:8px">
        <label style="display:flex;flex-direction:column">
          Title
          <input name="title" id="__title" required style="padding:10px;border-radius:8px;border:1px solid #ddd;margin-top:6px">
        </label>
        <label style="display:flex;flex-direction:column">
          Price (₹)
          <input name="price" id="__price" type="number" min="0" step="0.01" required style="padding:10px;border-radius:8px;border:1px solid #ddd;margin-top:6px">
        </label>

        <label style="display:flex;flex-direction:column">
          Category
          <select id="__category" name="category" required style="padding:10px;border-radius:8px;border:1px solid #ddd;margin-top:6px">
            <option value="vegetables">Vegetables</option>
            <option value="fruits">Fruits</option>
            <option value="dairy">Dairy</option>
            <option value="grains">Grains</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label style="display:flex;flex-direction:column">
          Image file (recommended)
          <input name="imageFile" id="__imageFile" type="file" accept="image/*" style="margin-top:6px">
          <small style="color:#666;margin-top:6px">Or paste image URL below</small>
        </label>
        <label style="display:flex;flex-direction:column">
          Or image URL
          <input name="imageUrl" id="__imageUrl" type="url" placeholder="https://..." style="padding:10px;border-radius:8px;border:1px solid #ddd;margin-top:6px">
        </label>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
          <button type="button" id="__cancelAdd" style="padding:8px 12px;border-radius:8px;border:0;background:#e9e9e9;cursor:pointer">Cancel</button>
          <button type="submit" id="__submitAdd" style="padding:8px 12px;border-radius:8px;border:0;background:#2f8f4a;color:#fff;cursor:pointer">Add product</button>
        </div>
        <div id="__addStatus" style="display:none;margin-top:10px;color:#333"></div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#__cancelAdd').addEventListener('click', () => modal.style.display = 'none');

  modal.querySelector('#__addProductForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const titleEl = form.querySelector('#__title');
    const priceEl = form.querySelector('#__price');
    const fileEl = form.querySelector('#__imageFile');
    const urlEl = form.querySelector('#__imageUrl');
    const statusEl = form.querySelector('#__addStatus');
    const submitBtn = form.querySelector('#__submitAdd');

    const title = titleEl.value.trim();
    const price = parseFloat(priceEl.value);
    if (!title || isNaN(price)) { alert('Please enter valid title and price.'); return; }

    submitBtn.disabled = true;
    const prevText = submitBtn.textContent;
    submitBtn.textContent = 'Uploading...';
    statusEl.style.display = 'block';
    statusEl.textContent = 'Uploading image to Cloudinary...';

    try {
      let imageUrl = '';
      if (fileEl && fileEl.files && fileEl.files[0]) {
        const resp = await uploadToCloudinaryFileReturnResp(fileEl.files[0]);
        imageUrl = buildTransformedUrlFromUploadResult(resp, 800, 540);
      } else if (urlEl && urlEl.value.trim()) {
        imageUrl = urlEl.value.trim();
      }
      statusEl.textContent = 'Saving product to Firestore...';
      const category = form.querySelector('#__category') ? form.querySelector('#__category').value : 'other';

      await saveProductToFirestore({
        title,
        price,
        imageUrl,
        category
      });

      statusEl.textContent = 'Product saved ✔️';
      form.reset();
      setTimeout(() => { modal.style.display = 'none'; statusEl.style.display = 'none'; }, 600);
    } catch (err) {
      console.error('Add product error:', err);
      const code = err?.code || err?.message || String(err);
      alert('Error adding product: ' + code);
      statusEl.textContent = 'Error: ' + code;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = prevText;
    }
  });

  return modal;
}

/* ---------- Products UI helpers (skeleton + upgraded card) ---------- */
const productsGrid = $('#productsGrid');
const productCache = new Map();

function showProductsSkeleton(count = 6) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'skeleton-grid';
  for (let i=0;i<count;i++){
    const sk = document.createElement('div');
    sk.className = 'skel-card';
    sk.innerHTML = `
      <div class="skel-media"></div>
      <div class="skel-line"></div>
      <div class="skel-line short"></div>
      <div style="height:8px"></div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="skel-qty"></div>
        <div style="width:110px;height:36px;border-radius:8px;background:linear-gradient(90deg,#eaeaea,#f5f5f5)"></div>
      </div>
    `;
    wrap.appendChild(sk);
  }
  grid.appendChild(wrap);
}

function renderRatingStars(r) {
  const v = Math.max(0, Math.min(5, Number(r) || 0));
  const full = Math.floor(v);
  const half = (v - full) >= 0.45 && (v - full) < 0.95;
  let out = '★'.repeat(full);
  if (half) out += '☆';
  out += '☆'.repeat(5 - out.length);
  return out;
}

function createProductCard(docId, data) {
  const card = document.createElement('article');
  card.className = 'card';
  // add dataset for filtering
  card.dataset.category = (data.category || 'other');

  const imgUrl = data.imageUrl || 'https://via.placeholder.com/800x540?text=No+Image';
  // data.category optional
  card.innerHTML = `
    <div class="media" style="position:relative">
      ${ data.category ? `<div class="tag">${escapeHtml(data.category)}</div>` : '' }
      <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(data.title)}" class="product-img">
    </div>

    <div class="content">
      <h3>${escapeHtml(data.title)}</h3>
      <div class="rating">${renderRatingStars(data.rating || 4.6)}</div>
      <div class="price">₹${Number(data.price).toFixed(2)}</div>

      <div class="meta-row">
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" min="1" value="1" class="qty-input" data-id="${docId}">
        </div>

        <div style="display:flex;align-items:center;gap:8px">
          <button class="add-to-cart btn" data-id="${docId}">Add to cart</button>
        </div>
      </div>

      <div class="bottom" style="color:#666;font-size:.92rem;margin-top:auto">
        <small>Fresh • Locally sourced</small>
      </div>
    </div>
  `;
  return card;
}

/* ---------- Realtime listener for products (Firestore) ---------- */
let currentFilter = 'all'; // will be used by filters
function startProductsListener() {
  showProductsSkeleton(6); // show skeleton while initial load
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  onSnapshot(q, snapshot => {
    productCache.clear();
    if (productsGrid) productsGrid.innerHTML = '';
    snapshot.docs.forEach(docSnap => {
      const d = docSnap.data();
      const id = docSnap.id;
      productCache.set(id, { id, title: d.title, price: d.price, imageUrl: d.imageUrl || '', category: d.category || '', rating: d.rating || 4.6 });
      if (productsGrid) productsGrid.appendChild(createProductCard(id, d));
    });

    // attach add-to-cart handlers (re-run after rendering)
    if (productsGrid) {
      productsGrid.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = btn.dataset.id;
          const input = btn.parentElement.parentElement.querySelector('.qty-input');
          const qty = input ? Math.max(1, parseInt(input.value) || 1) : 1;
          const prod = productCache.get(id);
          if (!prod) return alert('Product not found. Refresh page.');
          addToCart(prod, qty);
          openCart();
        });
      });
    }

    // apply currently selected filter after rendering
    filterProducts(currentFilter);
  }, error => {
    console.error('Realtime products listener error:', error);
    if (error?.code === 'permission-denied') alert('Realtime read permission denied for products. Check Firestore rules.');
  });
}

/* ---------- Cart (localStorage) ---------- */
const CART_KEY = 'cart_v1';
function readCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch { return {}; } }
function writeCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); renderCart(); }
function addToCart(product, qty = 1) {
  const cart = readCart();
  if (!cart[product.id]) cart[product.id] = { product, qty: 0 };
  cart[product.id].qty = (cart[product.id].qty || 0) + qty;
  writeCart(cart);
}
function setQty(id, qty) {
  const cart = readCart();
  if (qty <= 0) delete cart[id];
  else if (cart[id]) cart[id].qty = qty;
  writeCart(cart);
}
function removeItem(id) {
  const cart = readCart();
  delete cart[id];
  writeCart(cart);
}
function clearCart() { localStorage.removeItem(CART_KEY); renderCart(); }

let cartDrawer = null;
function ensureCartDrawer() {
  if (cartDrawer) return cartDrawer;

  cartDrawer = document.createElement('aside');
  cartDrawer.style = 'position:fixed;right:0;top:0;height:100vh;width:360px;max-width:95%;transform:translateX(110%);transition:transform .28s ease;z-index:9999;background:#fff;border-left:1px solid #eee;display:flex;flex-direction:column;overflow:hidden';
  cartDrawer.innerHTML = `
    <div style="padding:16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0">
      <strong>Your Cart</strong>
      <button id="__closecart" style="border:0;background:transparent;cursor:pointer">✕</button>
    </div>
    <div id="__cartitems" style="padding:14px;flex:1;overflow:auto;background:#fafafa"></div>
    <div style="padding:12px;border-top:1px solid #f0f0f0;background:#fff">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>Subtotal</div><strong id="__cartsum">₹0.00</strong>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="__clearcart" style="padding:8px 10px;border-radius:8px;border:0;background:#e9e9e9;cursor:pointer">Clear</button>
        <button id="__checkout" style="padding:8px 10px;border-radius:8px;border:0;background:#2f8f4a;color:#fff;cursor:pointer">Checkout</button>
      </div>
    </div>
  `;
  document.body.appendChild(cartDrawer);

  $('#__closecart').addEventListener('click', () => cartDrawer.style.transform = 'translateX(110%)');
  $('#__clearcart').addEventListener('click', () => { if (confirm('Clear cart?')) clearCart(); });

  const checkoutBtnOld = $('#__checkout');
  if (checkoutBtnOld) checkoutBtnOld.replaceWith(checkoutBtnOld.cloneNode(true));
  const checkoutBtn = $('#__checkout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      ensureCartDrawer().style.transform = 'translateX(110%)';
      showCheckoutForm();
    });
  }

  return cartDrawer;
}

function openCart() {
  ensureCartDrawer().style.transform = 'translateX(0)';
  renderCart();
}

function renderCart() {
  ensureCartDrawer();
  const itemsEl = $('#__cartitems');
  const sumEl = $('#__cartsum');
  const cart = readCart();
  itemsEl.innerHTML = '';
  let subtotal = 0;
  const ids = Object.keys(cart);
  if (ids.length === 0) {
    itemsEl.innerHTML = '<p style="color:#777">Your cart is empty.</p>';
    sumEl.textContent = '₹0.00';
  } else {
    ids.forEach(id => {
      const e = cart[id];
      subtotal += Number(e.product.price) * e.qty;
      const node = document.createElement('div');
      node.style = 'display:flex;gap:12px;align-items:center;padding:10px;border-radius:8px;background:#fff;margin-bottom:10px';
      node.innerHTML = `
        <img src="${escapeHtml(e.product.imageUrl || 'https://via.placeholder.com/150')}" style="width:64px;height:64px;object-fit:cover;border-radius:6px">
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${escapeHtml(e.product.title)}</strong>
            <div>₹${(Number(e.product.price) * e.qty).toFixed(2)}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
            <button class="qty-dec" data-id="${id}" style="width:30px;height:30px;border-radius:6px;border:1px solid #e6e6e6;background:#fff;cursor:pointer">−</button>
            <span style="min-width:30px;text-align:center">${e.qty}</span>
            <button class="qty-inc" data-id="${id}" style="width:30px;height:30px;border-radius:6px;border:1px solid #e6e6e6;background:#fff;cursor:pointer">+</button>
            <button class="remove-item" data-id="${id}" style="padding:6px 8px;border-radius:6px;border:0;background:#f3f3f3;cursor:pointer">Remove</button>
          </div>
        </div>
      `;
      itemsEl.appendChild(node);
    });

    sumEl.textContent = `₹${subtotal.toFixed(2)}`;

    Array.from(itemsEl.querySelectorAll('.qty-inc')).forEach(b => b.addEventListener('click', (ev) => {
      const id = ev.currentTarget.dataset.id; setQty(id, (readCart()[id].qty || 0) + 1);
    }));
    Array.from(itemsEl.querySelectorAll('.qty-dec')).forEach(b => b.addEventListener('click', (ev) => {
      const id = ev.currentTarget.dataset.id; setQty(id, Math.max(0, (readCart()[id].qty || 0) - 1));
    }));
    Array.from(itemsEl.querySelectorAll('.remove-item')).forEach(b => b.addEventListener('click', (ev) => {
      const id = ev.currentTarget.dataset.id; if (confirm('Remove item?')) removeItem(id);
    }));
  }

  const badge = $('#cartCount');
  if (badge) badge.textContent = ids.reduce((s, i) => s + (cart[i].qty || 0), 0);
}

/* ---------- Checkout Form Modal (collects buyer data) ---------- */
function showCheckoutForm() {
  if ($('#__checkoutFormModal')) { $('#__checkoutFormModal').style.display = 'flex'; return $('#__checkoutFormModal'); }

  const modal = document.createElement('div');
  modal.id = '__checkoutFormModal';
  modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;justify-content:center;align-items:center;z-index:999999';

  modal.innerHTML = `
    <div style="background:white;padding:22px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.25);width:360px;max-width:95%">
      <h2 style="margin:0 0 10px 0;color:#2f8f4a;text-align:center">Checkout</h2>
      <form id="__checkoutForm" style="display:flex;flex-direction:column;gap:10px">
        <label style="display:flex;flex-direction:column">
          Name
          <input id="__c_name" required style="padding:8px;border-radius:6px;border:1px solid #ccc">
        </label>
        <label style="display:flex;flex-direction:column">
          Phone
          <input id="__c_phone" type="tel" required style="padding:8px;border-radius:6px;border:1px solid #ccc">
        </label>
        <label style="display:flex;flex-direction:column">
          Email
          <input id="__c_email" type="email" required style="padding:8px;border-radius:6px;border:1px solid #ccc">
        </label>
        <label style="display:flex;flex-direction:column">
          Address
          <textarea id="__c_address" rows="2" required style="padding:8px;border-radius:6px;border:1px solid #ccc"></textarea>
        </label>
        <div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px">
          <button type="button" id="__c_cancel" style="padding:8px 12px;border-radius:6px;border:0;background:#ddd;cursor:pointer">Cancel</button>
          <button type="submit" id="__c_place" style="padding:8px 12px;border-radius:6px;border:0;background:#2f8f4a;color:white;cursor:pointer">Place Order</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector('#__c_cancel').addEventListener('click', () => modal.remove());

  modal.querySelector('#__checkoutForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = modal.querySelector('#__c_name').value.trim();
    const phone = modal.querySelector('#__c_phone').value.trim();
    const email = modal.querySelector('#__c_email').value.trim();
    const address = modal.querySelector('#__c_address').value.trim();

    if (!name || !phone || !email || !address) {
      alert('Please fill all fields.');
      return;
    }

    const cart = readCart();
    const items = Object.values(cart).map(i => ({
      productId: i.product.id,
      title: i.product.title,
      price: Number(i.product.price),
      qty: Number(i.qty || 1),
      imageUrl: i.product.imageUrl || ''
    }));
    if (items.length === 0) {
      alert('Your cart is empty.');
      return;
    }
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const orderDoc = {
      buyer: { name, phone, email },
      address,
      items,
      subtotal,
      shippingFee: 0,
      total: subtotal,
      status: 'new',
      createdAt: serverTimestamp()
    };

    const placeBtn = modal.querySelector('#__c_place');
    placeBtn.disabled = true;
    placeBtn.textContent = 'Placing...';

    try {
      const docRef = await saveOrderToFirestore(orderDoc);
      const savedOrder = { id: docRef.id, ...orderDoc };
      openWhatsAppToFarmer(FARMER_PHONE, savedOrder);
      modal.remove();
      clearCart();
      showCheckoutSuccess();
    } catch (err) {
      console.error('Order save failed', err);
      alert('Failed to place order. Try again.');
      placeBtn.disabled = false;
      placeBtn.textContent = 'Place Order';
    }
  });

  return modal;
}

/* ---------- WhatsApp helper (opens WhatsApp web/app with prefilled order text) ---------- */
function openWhatsAppToFarmer(farmerPhone, order) {
  const itemsText = (order.items || []).map(i => `${i.qty} × ${i.title} = ₹${(i.price * i.qty).toFixed(2)}`).join('%0A');
  const message =
    `New Order%0A` +
    `Order ID: ${order.id}%0A` +
    `Name: ${encodeURIComponent(order.buyer?.name || '')}%0A` +
    `Phone: ${encodeURIComponent(order.buyer?.phone || '')}%0A` +
    `Email: ${encodeURIComponent(order.buyer?.email || '')}%0A` +
    `Address: ${encodeURIComponent(order.address || '')}%0A%0A` +
    `Items:%0A${itemsText}%0A%0A` +
    `Total: ₹${(order.total || order.subtotal || 0).toFixed(2)}`;

  const phoneForUrl = (farmerPhone || '').replace(/\+/g, '').replace(/\s/g, '');
  const waLink = `https://wa.me/${phoneForUrl}?text=${message}`;
  window.open(waLink, '_blank');
}

/* ---------- Contact form -> WhatsApp integration + success popup ---------- */
function wireContactFormToWhatsApp() {
  const contactForm = $('#contact-form');
  if (!contactForm) return;

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl = $('#contact-name') || contactForm.querySelector('input[name="Name"]');
    const emailEl = $('#contact-email') || contactForm.querySelector('input[name="mail"]');
    const msgEl = $('#contact-message') || contactForm.querySelector('textarea[name="message"]');

    const name = nameEl ? nameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const message = msgEl ? msgEl.value.trim() : '';

    if (!name || !email || !message) {
      showContactSuccessPopup();
      return;
    }

    const text = 
      `Contact Message%0A` +
      `Name: ${encodeURIComponent(name)}%0A` +
      `Email: ${encodeURIComponent(email)}%0A` +
      `Message: ${encodeURIComponent(message)}`;

    const phoneForUrl = (FARMER_PHONE || '').replace(/\+/g, '').replace(/\s/g, '');
    const waLink = `https://wa.me/${phoneForUrl}?text=${text}`;
    window.open(waLink, '_blank');

    contactForm.reset();
    showContactSuccessPopup();
  });
}

/* ---------- Checkout / contact success UI ---------- */
function showCheckoutSuccess() {
  const modal = document.createElement('div');
  modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;justify-content:center;align-items:center;z-index:999999';
  modal.innerHTML = `
    <div style="background:#fff;padding:30px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.2);text-align:center;width:320px">
      <h2 style="margin-bottom:8px;color:#2f8f4a">✔ Checkout Successful</h2>
      <p style="margin:0 0 12px 0">Your order has been placed successfully!</p>
      <button id="__closeSuccess" style="padding:8px 16px;border:0;border-radius:8px;background:#2f8f4a;color:#fff;cursor:pointer">OK</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#__closeSuccess').addEventListener('click', () => modal.remove());
}

function showContactSuccessPopup() {
  const modal = document.createElement("div");
  modal.style = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.4);
    display:flex;
    justify-content:center;
    align-items:center;
    z-index:999999;
  `;

  modal.innerHTML = `
    <div style="
      background:#fff;
      padding:30px;
      border-radius:12px;
      box-shadow:0 8px 30px rgba(0,0,0,0.2);
      text-align:center;
      width:320px;
    ">
      <h2 style="margin-bottom:8px;color:#2f8f4a">✔ Message Sent</h2>
      <p style="margin:0 0 12px 0">Your message has been sent successfully!</p>
      <button id="contactSuccessClose" style="
        padding:8px 16px;
        border:0;
        border-radius:8px;
        background:#2f8f4a;
        color:#fff;
        cursor:pointer;
      ">OK</button>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector("#contactSuccessClose").addEventListener("click", () => modal.remove());
}

/* ---------- Filtering UI: inject filter bar if missing, wire filters ---------- */
function ensureFilterBar() {
  // If the page already contains an element with id 'filterButtons', do nothing
  if ($('#filterButtons')) return $('#filterButtons');

  // find the products section heading and inject the filter bar after it
  const productsSection = document.querySelector('#products');
  if (!productsSection) return null;

  const h2 = productsSection.querySelector('h2');
  const wrapper = document.createElement('div');
  wrapper.id = 'filterButtons';
  wrapper.style = 'margin:12px 0;display:flex;gap:8px;flex-wrap:wrap';
  wrapper.innerHTML = `
    <button data-filter="all" class="filter-btn active-filter" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);background:#2f8f4a;color:#fff;cursor:pointer">All</button>
    <button data-filter="vegetables" class="filter-btn" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);background:#fff;cursor:pointer">Vegetables</button>
    <button data-filter="fruits" class="filter-btn" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);background:#fff;cursor:pointer">Fruits</button>
    <button data-filter="dairy" class="filter-btn" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);background:#fff;cursor:pointer">Dairy</button>
    <button data-filter="grains" class="filter-btn" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);background:#fff;cursor:pointer">Grains</button>
    <button data-filter="other" class="filter-btn" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);background:#fff;cursor:pointer">Other</button>
  `;
  if (h2 && h2.parentNode) {
    h2.parentNode.insertBefore(wrapper, h2.nextSibling);
    return wrapper;
  }
  return null;
}

function filterProducts(category) {
  currentFilter = category || 'all';
  const cards = document.querySelectorAll('#productsGrid .card');
  cards.forEach(card => {
    const cardCat = (card.dataset.category || 'other').toLowerCase();
    if (category === 'all' || category === 'all' || cardCat === category) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
  // highlight active button
  const btns = document.querySelectorAll('#filterButtons .filter-btn');
  btns.forEach(b => {
    if (b.dataset.filter === category) {
      b.classList.add('active-filter');
      b.style.background = '#2f8f4a';
      b.style.color = '#fff';
    } else {
      b.classList.remove('active-filter');
      b.style.background = '#fff';
      b.style.color = '#000';
    }
  });
}

function wireFilters() {
  const bar = ensureFilterBar();
  if (!bar) return;
  const btns = Array.from(bar.querySelectorAll('.filter-btn'));
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.filter;
      filterProducts(cat);
    });
  });
}

/* ---------- Wire nav & init ---------- */
function wireNav() {
  $$('a[href="#sell"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      createAddProductModal().style.display = 'flex';
    });
  });

  const cartBtn = $('#cartBtn');
  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      const drawer = ensureCartDrawer();
      const showing = drawer.style.transform === 'translateX(0px)' || drawer.style.transform === 'translateX(0)';
      drawer.style.transform = showing ? 'translateX(110%)' : 'translateX(0)';
    });
  }
}

function init() {
  ensureFilterBar();        // inject filter bar if missing
  startProductsListener();
  wireNav();
  ensureCartDrawer();
  renderCart();
  wireContactFormToWhatsApp();
  wireFilters();            // wire filter buttons
}
init();

/* ---------- Helpful troubleshooting note ----------
If you see "Missing or insufficient permissions" when saving to Firestore:
  - Check Firestore Rules. For dev you can temporarily use:
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if true;
        }
      }
    }
  - But secure your rules before production.

If Cloudinary upload succeeds but Firestore fails (permission-denied),
the file on Cloudinary remains but Firestore won't have imageUrl — this script keeps form values until successful.
-------------------------------------------------- */
