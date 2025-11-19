// firebase-cloudinary.js
// Module: Cloudinary upload + Firestore product save + realtime render + cart wiring
// Uses your Firebase config and Cloudinary unsigned preset (safe for dev).
// IMPORTANT: do NOT put Cloudinary API SECRET in frontend. This uses an unsigned preset.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* =========================
   Replace / confirm values
   ========================= */
const firebaseConfig = {
  apiKey: "AIzaSyDPLy94SiCF6697yGsLXIfteV3iAtmXzKI",
  authDomain: "former-shop.firebaseapp.com",
  projectId: "former-shop",
  storageBucket: "former-shop.firebasestorage.app",
  messagingSenderId: "977112770102",
  appId: "1:977112770102:web:f61cf20895b0ca79e11a97",
  measurementId: "G-Q8E0XE0QRN"
};

const CLOUD_NAME = "dvqcmud7f";       // your cloud name
const UPLOAD_PRESET = "farmUnsigned"; // your unsigned preset name

/* =========================
   Init Firebase
   ========================= */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =========================
   Helpers
   ========================= */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const escape = t => String(t||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);

function idFor(){ return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

/* =========================
   Cloudinary upload helper
   - uploads file (unsigned preset)
   - returns secure_url string
   ========================= */
async function uploadToCloudinaryFile(file) {
  if (!file) return "";
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  // optional: fd.append("folder", "former_shop_products");

  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Cloudinary upload failed: ' + txt);
  }
  const data = await res.json();
  return data.secure_url || data.url || "";
}

/* =========================
   Transform Cloudinary URL to fixed professional size
   We take the returned secure_url and insert transformations segment:
   -> /upload/w_800,h_540,c_fill/
   If the URL already contains transformations we try to avoid duplication.
   ========================= */
function transformCloudinaryUrlToProfessional(url) {
  if (!url) return url;
  try {
    // find "/upload/" in the url and inject transformations after it
    const key = '/upload/';
    const idx = url.indexOf(key);
    if (idx === -1) return url;
    // only inject if transformations not already present
    const after = url.slice(idx + key.length);
    // if already contains w_ or h_ we skip insertion
    if (/w_\d|h_\d|c_/.test(after)) return url;
    const transform = 'w_800,h_540,c_fill/';
    return url.slice(0, idx + key.length) + transform + after;
  } catch (e) {
    return url;
  }
}

/* =========================
   Save product to Firestore
   ========================= */
async function saveProductToFirestore({ title, price, imageUrl }) {
  const docRef = await addDoc(collection(db, 'products'), {
    title,
    price: Number(price),
    imageUrl: imageUrl || '',
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

/* =========================
   Render product card
   - uses the existing #productsGrid in your HTML
   ========================= */
const productsGrid = $('#productsGrid');

function createProductCard(docId, data) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.docId = docId;
  card.innerHTML = `
    <img src="${escape(data.imageUrl || 'https://via.placeholder.com/800x540?text=No+Image')}" alt="${escape(data.title)}" class="product-img">
    <h3>${escape(data.title)}</h3>
    <div class="price">₹${Number(data.price).toFixed(2)}</div>
    <div style="margin-top:auto;display:flex;gap:8px;align-items:center">
      <input type="number" min="1" value="1" class="qty-input" data-id="${docId}" style="width:70px;padding:6px;border-radius:8px;border:1px solid #ddd">
      <button class="add-to-cart btn" data-id="${docId}" style="padding:8px 10px;border-radius:8px;border:0;background:#2f8f4a;color:#fff;cursor:pointer">Add to cart</button>
    </div>
  `;
  return card;
}

/* product cache */
const productMap = new Map();

/* attach Add-to-cart handlers for the container */
function attachAddToCartHandlers(container) {
  container.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const input = btn.parentElement.querySelector('.qty-input');
      const qty = input ? Math.max(1, parseInt(input.value) || 1) : 1;
      const prod = productMap.get(id);
      if (!prod) return alert('Product not found (refresh page).');
      addToCart(prod, qty);
      openCart();
    });
  });
}

/* =========================
   Real-time listener for products
   ========================= */
import { collection as collRef } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"; // alias to satisfy bundlers if required
import { query as qref, orderBy as ob, onSnapshot as onSnap } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

function startRealtimeProducts() {
  const q = qref(collection(db, 'products'), orderBy('createdAt', 'desc'));
  onSnapshot(q, snapshot => {
    productMap.clear();
    if (!productsGrid) return;
    productsGrid.innerHTML = '';
    snapshot.docs.forEach(docSnap => {
      const d = docSnap.data();
      const id = docSnap.id;
      // store in map
      productMap.set(id, { id, title: d.title, price: d.price, imageUrl: d.imageUrl || '' });
      // create and append card
      const card = createProductCard(id, d);
      productsGrid.appendChild(card);
    });
    // attach handlers
    attachAddToCartHandlers(productsGrid);
    // update cart UI counts
    renderCart();
  }, err => {
    console.error('Products listener error:', err);
  });
}

/* =========================
   Add product flow (UI injection)
   - If your page already has an inline sell form with ids (#prodTitle,#prodPrice and file input #prodImageFile),
     this code will prefer using it. Otherwise it injects a modal "Add product" form (so no HTML change required).
   ========================= */
function createAddProductModalIfNeeded() {
  if ($('#__addProductModal')) return $('#__addProductModal');

  const modal = document.createElement('div');
  modal.id = '__addProductModal';
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.display = 'none';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.background = 'rgba(0,0,0,0.35)';
  modal.style.zIndex = '15000';

  modal.innerHTML = `
    <div style="width:560px;max-width:95%;background:#fff;border-radius:12px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,0.15)">
      <h3 style="margin:0 0 12px 0">Add a product</h3>
      <form id="__addProductForm" style="display:grid;grid-template-columns:1fr;gap:8px">
        <label style="display:flex;flex-direction:column">
          Title
          <input name="title" required style="padding:10px;border-radius:8px;border:1px solid #ddd;margin-top:6px">
        </label>
        <label style="display:flex;flex-direction:column">
          Price (₹)
          <input name="price" type="number" min="0" step="0.01" required style="padding:10px;border-radius:8px;border:1px solid #ddd;margin-top:6px">
        </label>
        <label style="display:flex;flex-direction:column">
          Image file (recommended)
          <input name="imageFile" id="__imageFile" type="file" accept="image/*" style="margin-top:6px">
          <small style="color:#666;margin-top:6px">Or paste image URL below if you prefer</small>
        </label>
        <label style="display:flex;flex-direction:column">
          Or image URL
          <input name="imageUrl" id="__imageUrl" type="url" placeholder="https://..." style="padding:10px;border-radius:8px;border:1px solid #ddd;margin-top:6px">
        </label>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
          <button type="button" id="__cancelAdd" style="padding:8px 12px;border-radius:8px;border:0;background:#e9e9e9;cursor:pointer">Cancel</button>
          <button type="submit" id="__submitAdd" style="padding:8px 12px;border-radius:8px;border:0;background:#2f8f4a;color:#fff;cursor:pointer">Add product</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#__cancelAdd').addEventListener('click', () => { modal.style.display = 'none'; });

  modal.querySelector('#__addProductForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const title = form.title.value.trim();
    const price = parseFloat(form.price.value);
    const fileInput = form.imageFile;
    const urlInput = form.imageUrl;

    if (!title || isNaN(price)) return alert('Please enter valid title and price.');

    const submitBtn = form.querySelector('#__submitAdd');
    submitBtn.disabled = true;
    const prev = submitBtn.textContent;
    submitBtn.textContent = 'Uploading...';

    try {
      let imageUrl = '';
      if (fileInput && fileInput.files && fileInput.files[0]) {
        imageUrl = await uploadToCloudinaryFile(fileInput.files[0]);
      } else if (urlInput && urlInput.value.trim()) {
        imageUrl = urlInput.value.trim();
      }
      // transform to professional size (800x540 crop)
      imageUrl = transformCloudinaryUrlToProfessional(imageUrl);

      await saveProductToFirestore({ title, price, imageUrl });
      form.reset();
      modal.style.display = 'none';
      alert('Product uploaded and saved.');
    } catch (err) {
      console.error(err);
      alert('Error adding product: ' + (err.message || err));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = prev;
    }
  });

  return modal;
}

/* Intercept "To Sell" nav link and open modal instead of jumping */
function interceptSellLink() {
  $$('a[href="#sell"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = createAddProductModalIfNeeded();
      modal.style.display = 'flex';
    });
  });
}

/* =========================
   CART (localStorage) - minimal
   ========================= */
const CART_KEY = 'cart_v1';
function readCart(){ try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch { return {}; } }
function writeCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); renderCart(); }
function addToCart(product, qty=1){
  const cart = readCart();
  if (!cart[product.id]) cart[product.id] = { product, qty: 0 };
  cart[product.id].qty = (cart[product.id].qty || 0) + qty;
  writeCart(cart);
}
function setQty(id, qty){
  const cart = readCart();
  if (qty <= 0) delete cart[id]; else if (cart[id]) cart[id].qty = qty;
  writeCart(cart);
}
function removeItem(id){ const cart = readCart(); delete cart[id]; writeCart(cart); }
function clearCart(){ localStorage.removeItem(CART_KEY); renderCart(); }

/* Cart UI injection & render (keeps small footprint) */
let cartDrawerEl = null;
function ensureCartDrawer() {
  if (cartDrawerEl) return cartDrawerEl;
  cartDrawerEl = document.createElement('aside');
  cartDrawerEl.id = '__cart_drawer';
  cartDrawerEl.style.position = 'fixed';
  cartDrawerEl.style.right = '0';
  cartDrawerEl.style.top = '0';
  cartDrawerEl.style.height = '100vh';
  cartDrawerEl.style.width = '360px';
  cartDrawerEl.style.maxWidth = '95%';
  cartDrawerEl.style.background = '#fff';
  cartDrawerEl.style.transform = 'translateX(110%)';
  cartDrawerEl.style.transition = 'transform 280ms ease';
  cartDrawerEl.style.zIndex = '9999';
  cartDrawerEl.style.display = 'flex';
  cartDrawerEl.style.flexDirection = 'column';
  cartDrawerEl.style.borderLeft = '1px solid #eee';
  cartDrawerEl.style.overflow = 'hidden';

  cartDrawerEl.innerHTML = `
    <div style="padding:16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0">
      <strong>Your Cart</strong>
      <button id="__close_cart" style="border:0;background:transparent;font-size:18px;cursor:pointer">✕</button>
    </div>
    <div id="__cart_items" style="padding:14px;flex:1;overflow:auto;background:#fafafa"></div>
    <div style="padding:12px;border-top:1px solid #f0f0f0;background:#fff">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>Subtotal</div>
        <strong id="__cart_sub">₹0.00</strong>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="__clear_cart" style="padding:8px 10px;border-radius:8px;border:0;background:#e9e9e9;cursor:pointer">Clear</button>
        <button id="__checkout_btn" style="padding:8px 10px;border-radius:8px;border:0;background:#2f8f4a;color:#fff;cursor:pointer">Checkout</button>
      </div>
    </div>
  `;
  document.body.appendChild(cartDrawerEl);

  $('#__close_cart').addEventListener('click', () => cartDrawerEl.style.transform = 'translateX(110%)');
  $('#__clear_cart').addEventListener('click', () => { if (confirm('Clear cart?')) clearCart(); });
  $('#__checkout_btn').addEventListener('click', () => {
    alert('Checkout demo — implement server-side orders for production.');
  });

  return cartDrawerEl;
}

function openCart(){ ensureCartDrawer().style.transform = 'translateX(0)'; renderCart(); }
function renderCart(){
  const el = ensureCartDrawer();
  const itemsEl = $('#__cart_items');
  const subEl = $('#__cart_sub');
  const cart = readCart();
  const ids = Object.keys(cart);
  itemsEl.innerHTML = '';
  if (ids.length === 0) {
    itemsEl.innerHTML = '<p style="color:#777">Cart is empty.</p>';
    if (subEl) subEl.textContent = '₹0.00';
  } else {
    let subtotal = 0;
    ids.forEach(id => {
      const entry = cart[id];
      const p = entry.product, qty = entry.qty;
      subtotal += Number(p.price) * qty;
      const item = document.createElement('div');
      item.style.display = 'flex';
      item.style.gap = '12px';
      item.style.alignItems = 'center';
      item.style.padding = '10px';
      item.style.borderRadius = '8px';
      item.style.background = '#fff';
      item.style.marginBottom = '10px';
      item.innerHTML = `
        <img src="${escape(p.imageUrl || 'https://via.placeholder.com/150')}" alt="${escape(p.title)}" style="width:64px;height:64px;object-fit:cover;border-radius:6px">
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${escape(p.title)}</strong>
            <div>₹${(Number(p.price)*qty).toFixed(2)}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
            <button class="__inc" data-id="${id}" style="width:30px;height:30px">+</button>
            <span style="min-width:30px;text-align:center">${qty}</span>
            <button class="__dec" data-id="${id}" style="width:30px;height:30px">−</button>
            <button class="__rem" data-id="${id}" style="padding:6px;border-radius:6px;background:#f3f3f3;border:0;cursor:pointer">Remove</button>
          </div>
        </div>
      `;
      itemsEl.appendChild(item);
    });
    if (subEl) subEl.textContent = `₹${subtotal.toFixed(2)}`;
    // attach handlers
    $$('.__inc').forEach(b => b.addEventListener('click', e => {
      const id = e.currentTarget.dataset.id; const cartNow = readCart(); setQty(id, (cartNow[id]?.qty||0)+1);
    }));
    $$('.__dec').forEach(b => b.addEventListener('click', e => {
      const id = e.currentTarget.dataset.id; const cartNow = readCart(); setQty(id, Math.max(0, (cartNow[id]?.qty||0)-1));
    }));
    $$('.__rem').forEach(b => b.addEventListener('click', e => {
      const id = e.currentTarget.dataset.id; if (confirm('Remove item?')) removeItem(id);
    }));
  }
  // update badge
  const badge = $('#cartCount'); if (badge) badge.textContent = Object.values(cart).reduce((s,i)=> s + (i.qty||0), 0);
}

/* =========================
   Wire header cart button and Sell link
   ========================= */
function wireHeaderCart() {
  const btn = $('#cartBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const c = ensureCartDrawer();
    const showing = c.style.transform === 'translateX(0px)' || c.style.transform === 'translateX(0)';
    if (showing) c.style.transform = 'translateX(110%)'; else openCart();
  });
}

function wireSellLink() {
  $$('a[href="#sell"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const modal = createAddProductModalIfNeeded();
      modal.style.display = 'flex';
    });
  });
}

/* =========================
   Initialization
   ========================= */
function init() {
  startRealtimeProducts();
  wireHeaderCart();
  wireSellLink();
  ensureCartDrawer();
  renderCart();
  // expose debug
  window.__shop = { productMap, addToCart, readCart, writeCart };
}

init();
