// ==========================================
// KONFIGURÁCIÓ
// ==========================================

const BASE_URL = "http://localhost:3000";
const API_URL = `${BASE_URL}/api`;

/**
 * Segédfüggvény a termékképek elérési útjának meghatározásához.
 */
function getProductImage(imagePath) {
    if (!imagePath) return 'images/hatter.jpg';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('uploads/')) return `${BASE_URL}/${imagePath}`;
    if (!imagePath.includes('/')) return `images/${imagePath}`;
    return imagePath;
}

/**
 * Toast értesítés megjelenítése a felhasználónak.
 * A képernyő jobb alsó sarkában úszik be, majd 3 másodperc után eltűnik.
 */
function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span>✨</span> ${message}`;

    container.appendChild(toast);

    // Animált eltüntetés időzítése
    setTimeout(() => {
        toast.classList.add("hide");
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

/**
 * Ellenőrzi a bejelentkezési állapotot a LocalStorage-ból,
 * és frissíti a fejlécben található navigációs gombokat (Login helyett Profil/Admin).
 */
function updateAuthUI() {
    const user = JSON.parse(localStorage.getItem("user"));
    const userNav = document.getElementById("user-nav");

    if (user && userNav) {
        // Ha admin a felhasználó, megjelenítjük a fogaskerék ikont az admin felülethez
        const adminLink = user.is_admin ? `<span class="username" onclick="window.location.href='admin.html'" style="color: var(--accent); margin-right: 15px;">⚙️ Admin</span>` : '';
        userNav.innerHTML = `
            <li class="user-info">
                ${adminLink}
                <span class="username" onclick="window.location.href='profile.html'" title="Profil megtekintése">👤 ${user.name}</span>
                <button class="logout-btn" onclick="logout()">Kijelentkezés</button>
            </li>
        `;
    }
}

/**
 * Kijelentkezés: törli a felhasználói adatokat és visszairányít a főoldalra.
 */
function logout() {
    localStorage.removeItem("user");
    showToast("Sikeres kijelentkezés!");
    setTimeout(() => {
        window.location.href = "index.html";
    }, 1000);
}

// Alapvető UI események (pl. mobil menü) kezelése betöltéskor
document.addEventListener("DOMContentLoaded", () => {
    updateAuthUI();

    // Mobil menü nyitás/zárás kezelése
    const toggleBtn = document.getElementById("mobile-menu-toggle");
    const menu = document.getElementById("main-menu");
    if (toggleBtn && menu) {
        toggleBtn.addEventListener("click", () => {
            menu.classList.toggle("active");
            toggleBtn.textContent = menu.classList.contains("active") ? "✕" : "☰";
        });
    }
});

// ==========================================
// API FETCH ÉS SEGÉDFÜGGVÉNYEK
// ==========================================

// A SUPABASE INICIALIZÁLÁS ELTÁVOLÍTVA - Mostantól saját MySQL backendünket használjuk

/**
 * Segédfüggvény az API hívásokhoz (automatikusan hozzáadja a tokent).
 */
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { 
        'Content-Type': 'application/json',
        ...options.headers 
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Hiba: ${response.status}`);
    }
    return response.json();
}

// ==========================================
// TERMÉKEK MEGJELENÍTÉSE ÉS LEKÉRÉSE
// ==========================================

/**
 * A kapott terméklistát HTML kártyákká alakítja és beszúrja a megadott konténerbe.
 */
function renderProducts(list, containerId = "product-list") {
    const container = document.getElementById(containerId) || document.getElementById("wishlist-list") || document.getElementById("related-list");
    if (!container) return;

    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = "<p style='grid-column: 1/-1; text-align: center; padding: 50px;'>Nincs megjeleníthető termék.</p>";
        return;
    }

    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

    list.forEach((p, index) => {
        const isHearted = wishlist.includes(p.id) ? 'active' : '';
        const heartIcon = isHearted ? '❤️' : '🤍';
        
        const imgSrc = getProductImage(p.image);
        const currentStock = (p.stock === null || p.stock === undefined) ? 10 : p.stock;
        
        // Készlet állapot szövegezése
        const stockStatus = currentStock > 0 ? `<p class="stock-info">Készleten: ${currentStock} db</p>` : `<p class="stock-info out-of-stock">Elfogyott</p>`;
        const disableClass = currentStock > 0 ? '' : 'disabled';

        container.innerHTML += `
            <div class="product-card ${disableClass}" onclick="${currentStock > 0 ? `openProduct(${p.id})` : ''}" style="animation-delay: ${index * 0.1}s">
                <button class="wishlist-btn ${isHearted}" onclick="toggleWishlist(event, ${p.id})">${heartIcon}</button>
                <img src="${imgSrc}" alt="${p.name}" onerror="this.src='images/hatter.jpg'">
                <h3>${p.name}</h3>
                <p>${p.price.toLocaleString()} Ft</p>
                ${stockStatus}
            </div>
        `;
    });
}

/**
 * Termékek lekérése a saját API-ról.
 */
async function fetchProducts() {
    try {
        const data = await apiFetch('/products');
        
        // Statikus kiegészítések (pl. választható méretek) hozzáfűzése a backend adatokhoz
        const mergedData = data.map(p => {
            const staticInfo = (typeof productsData !== 'undefined') ? productsData.find(sp => sp.id === p.id) : null;
            return { ...p, sizes: staticInfo ? staticInfo.sizes : [] };
        });

        window.allProducts = mergedData;
        renderProducts(mergedData);
    } catch (error) {
        console.warn("Hiba a termékek letöltésekor, statikus adatok használata:", error);
        // Tartalék megoldás: ha a szerver nem érhető el, a products_data.js-ből dolgozunk
        if (typeof productsData !== 'undefined') {
            window.allProducts = productsData;
            renderProducts(productsData);
        } else {
            showToast("Hiba a termékek betöltésekor!");
        }
    }
}

// Kezdő lekérés indítása, ha van terméklista az oldalon
if (document.getElementById("product-list")) {
    fetchProducts();
}

/**
 * Egy konkrét termék részletes oldalának megnyitása.
 */
async function openProduct(id) {
    try {
        // Megpróbáljuk lekérni az API-ról a legfrissebb adatot
        const data = await apiFetch(`/products/${id}`);
        
        const staticInfo = (typeof productsData !== 'undefined') ? productsData.find(sp => sp.id === data.id) : null;
        const fullProduct = { ...data, sizes: staticInfo ? staticInfo.sizes : [] };

        localStorage.setItem("selectedProduct", JSON.stringify(fullProduct));
        window.location.href = "product.html";
    } catch (err) {
        console.error("Hiba a termék részleteinek lekérésekor:", err);
        // Hiba esetén megpróbáljuk a már korábban betöltött listából kikeresni
        const product = window.allProducts?.find(p => p.id === id);
        if (product) {
            localStorage.setItem("selectedProduct", JSON.stringify(product));
            window.location.href = "product.html";
        }
    }
}

// ==========================================
// KOSÁR ÉS KÍVÁNSÁGLISTA KEZELÉSE
// ==========================================

/**
 * Frissíti a menüben a kosár melletti számot (tételek összesítése).
 */
function updateCartCount() {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const count = cart.reduce((total, item) => total + (item.quantity || 1), 0);
    const countSpan = document.getElementById("cart-count");
    if (countSpan) {
        countSpan.textContent = `(${count})`;
    }
}

/**
 * Termék hozzáadása a kosárhoz.
 */
function addToCart(product, quantity = 1) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    // Készlet ellenőrzése
    if (product.stock !== undefined && product.stock < quantity) {
        showToast("Sajnos nincs elég készlet ebből a termékből.");
        return;
    }

    // Ha ugyanaz a termék ugyanabban a méretben már benne van, csak a mennyiséget növeljük
    const existingItem = cart.find(item => item.id === product.id && item.size === product.size);

    if (existingItem) {
        const totalQty = (existingItem.quantity || 1) + quantity;
        if (product.stock !== undefined && totalQty > product.stock) {
            showToast("Nincs több készleten!");
            return;
        }
        existingItem.quantity = totalQty;
    } else {
        product.quantity = quantity;
        cart.push(product);
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    showToast("Hozzáadva a kosárhoz!");
    updateCartCount();
}

/**
 * Kedvencek (Kívánságlista) ki-be kapcsolása.
 */
function toggleWishlist(event, productId) {
    event.stopPropagation(); // Ne nyissa meg a termékoldalt a kártyára kattintás miatt
    
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const index = wishlist.indexOf(productId);
    
    const btn = event.currentTarget;
    
    if (index === -1) {
        wishlist.push(productId);
        btn.classList.add('active');
        btn.innerHTML = '❤️';
        showToast("Hozzáadva a kívánságlistához!");
    } else {
        wishlist.splice(index, 1);
        btn.classList.remove('active');
        btn.innerHTML = '🤍';
        showToast("Eltávolítva a kívánságlistáról.");
    }
    
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

// Kezdő számláló frissítés
updateCartCount();

