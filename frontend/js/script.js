// Az alapvető UI események (pl. mobil menü) kezelése már a common.js-ben benne van.

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
// API ÉS SUPABASE INICIALIZÁLÁS
// ==========================================

const API_URL = "http://localhost:3000/api";

// Segédfüggvény az API hívásokhoz
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

// A Supabase inicializálás eltávolításra került

// A termékek lekérése és megjelenítése a common.js-ben van definiálva.

/**
 * Termékek lekérése a saját backendünkről.
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
 * Eltárolja a terméket a LocalStorage-ba, majd átirányít.
 */
/**
 * Egy konkrét termék részletes oldalának megnyitása.
 */
async function openProduct(id) {
    try {
        const data = await apiFetch(`/products/${id}`);
        
        const staticInfo = (typeof productsData !== 'undefined') ? productsData.find(sp => sp.id === data.id) : null;
        const fullProduct = { ...data, sizes: staticInfo ? staticInfo.sizes : [] };

        localStorage.setItem("selectedProduct", JSON.stringify(fullProduct));
        window.location.href = "product.html";
    } catch (err) {
        console.error(err);
        const product = window.allProducts?.find(p => p.id === id);
        if (product) {
            localStorage.setItem("selectedProduct", JSON.stringify(product));
            window.location.href = "product.html";
        }
    }
}

// ==========================================
// TERMÉK RÉSZLETEK ÉS HASONLÓ TERMÉKEK
// ==========================================

if (window.location.pathname.includes("product.html")) {
    let product = JSON.parse(localStorage.getItem("selectedProduct"));

    if (product) {
        const imgSrc = product.image && !product.image.includes('/') && !product.image.startsWith('http') ? 'images/' + product.image : (product.image.startsWith('uploads/') ? `${API_URL}/${product.image}` : product.image);
        document.getElementById("product-img").src = imgSrc;
        document.getElementById("product-name").textContent = product.name;
        document.getElementById("product-price").textContent = product.price.toLocaleString() + " Ft";
        document.getElementById("product-desc").textContent = product.description;

        const stockDetail = document.getElementById("product-stock-detail");
        const addToCartBtn = document.querySelector(".add-to-cart");

        // Készletinformáció kezelése
        if (stockDetail) {
            if (product.stock !== undefined && product.stock > 0) {
                stockDetail.textContent = `Készleten: ${product.stock} db`;
                stockDetail.classList.remove("out-of-stock");
                if (addToCartBtn) {
                    addToCartBtn.disabled = false;
                    addToCartBtn.textContent = "Kosárba";
                }
            } else {
                stockDetail.textContent = "Sajnos elfogyott";
                stockDetail.classList.add("out-of-stock");
                if (addToCartBtn) {
                    addToCartBtn.disabled = true;
                    addToCartBtn.textContent = "Elfogyott";
                    addToCartBtn.style.opacity = "0.5";
                    addToCartBtn.style.cursor = "not-allowed";
                }
            }
        }

        // Méretválasztó gombok generálása
        const sizeContainer = document.getElementById("size-options");
        if (sizeContainer && product.sizes) {
            sizeContainer.innerHTML = "";
            
            // Készletelosztás logikája (mivel a db nem tárol bontást, egy determinisztikus elosztást használunk)
            const baseStock = product.stock !== undefined ? product.stock : 10;
            
            product.sizes.forEach((size, index) => {
                let sizeStock = 0;
                
                if (product.size_stocks && product.size_stocks[size] !== undefined) {
                    // Valódi készletadat a DB-ből
                    sizeStock = product.size_stocks[size];
                } else {
                    // Fallback: Ha még nincs méretspecifikus adat, fiktív elosztás (régi termékeknél)
                    sizeStock = Math.floor(baseStock / product.sizes.length);
                    if (index === (product.id % product.sizes.length)) sizeStock += (baseStock % product.sizes.length);
                }

                // Néhány méretet véletlenszerűen készlethiányosra állítunk a demó kedvéért, ha a baseStock > 0 és MÉG NINCS valós adat
                if (!product.size_stocks && baseStock > 0 && (product.id + index) % 7 === 0) {
                    sizeStock = 0;
                }

                const btn = document.createElement("button");
                btn.className = "size-btn";
                btn.innerHTML = `
                    <span style="display:block; font-size: 1.1rem;">${size}</span>
                    <span style="display:block; font-size: 0.75rem; color: #888; margin-top: 3px; font-weight: normal;">
                        ${sizeStock > 0 ? sizeStock + ' db' : 'Elfogyott'}
                    </span>
                `;
                
                if (sizeStock <= 0) {
                    btn.disabled = true;
                    btn.style.opacity = "0.4";
                    btn.style.cursor = "not-allowed";
                    btn.title = "Sajnos ebből a méretből jelenleg nincs készleten.";
                }

                btn.onclick = () => {
                    document.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    window.selectedSize = size; // Kiválasztott méret tárolása az ablak szintjén
                    
                    // Frissítjük a fő készletkijelzést is a választott mérethez
                    if (stockDetail) {
                        stockDetail.textContent = `A kiválasztott méretből készleten: ${sizeStock} db`;
                        stockDetail.classList.remove("out-of-stock");
                    }
                    
                    if (addToCartBtn) {
                        addToCartBtn.disabled = false;
                        addToCartBtn.textContent = "Kosárba";
                        addToCartBtn.style.opacity = "1";
                        addToCartBtn.style.cursor = "pointer";
                    }
                };
                sizeContainer.appendChild(btn);
            });
        }

        // Kapcsolódó termékek (ugyanabból a kategóriából) megjelenítése
        renderRelatedProducts(product);
    }
}

/**
 * Ugyanolyan kategóriájú termékek keresése és megjelenítése.
 */
function renderRelatedProducts(currentProduct) {
    const container = document.getElementById("related-list");
    if (!container || !window.allProducts) return;

    const related = window.allProducts
        .filter(p => p.category_id === currentProduct.category_id && p.id !== currentProduct.id)
        .slice(0, 4);

    renderProducts(related, "related-list");
}

// A kosárba rakás eseménykezelőjét a product.js kezeli a termékoldalon.

if (window.location.pathname.includes("cart.html")) {
    renderCart();
}

function renderCart() {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const container = document.getElementById("cart-items");
    let total = 0;

    if (container) {
        container.innerHTML = "";
        if (cart.length === 0) {
            container.innerHTML = "<p>A kosár üres.</p>";
        } else {
            cart.forEach((item, index) => {
                const itemTotal = item.price * (item.quantity || 1);
                total += itemTotal;
                container.innerHTML += `
                    <div class="cart-item">
                        <img src="${item.image}">
                        <div class="cart-item-info">
                            <h3>${item.name} ${item.size ? `(${item.size})` : ''}</h3>
                            <p>${item.price.toLocaleString()} Ft / db</p>
                            <div class="cart-item-qty">
                                <button class="qty-btn" onclick="changeQuantity(${index}, -1)">-</button>
                                <span>${item.quantity || 1} db</span>
                                <button class="qty-btn" onclick="changeQuantity(${index}, 1)">+</button>
                            </div>
                        </div>
                        <div class="cart-item-actions">
                            <p class="item-total">${itemTotal.toLocaleString()} Ft</p>
                            <button class="remove-btn" onclick="removeItem(${index})">Törlés</button>
                        </div>
                    </div>
                `;
            });
        }

        // Végösszeg és ingyenes szállítás kalkuláció
        const totalSpan = document.getElementById("cart-total");
        if (totalSpan) {
            totalSpan.textContent = total.toLocaleString() + " Ft";
            
            // Ingyenes szállítás info megjelenítése
            const summaryDiv = document.querySelector(".cart-summary");
            if (summaryDiv) {
                let shippingInfo = document.getElementById("cart-shipping-info");
                if (!shippingInfo) {
                    shippingInfo = document.createElement("p");
                    shippingInfo.id = "cart-shipping-info";
                    shippingInfo.style.fontSize = "0.9rem";
                    shippingInfo.style.marginTop = "10px";
                    summaryDiv.insertBefore(shippingInfo, totalSpan.parentElement.nextSibling);
                }
                
                if (total >= 10000) {
                    shippingInfo.innerHTML = "🎉 <strong>Ingyenes szállítás!</strong>";
                    shippingInfo.style.color = "var(--accent)";
                } else {
                    const diff = 10000 - total;
                    shippingInfo.innerHTML = `Vásárolj még <strong>${diff.toLocaleString()} Ft</strong> értékben az ingyenes szállításhoz!`;
                    shippingInfo.style.color = "#666";
                }
            }
        }
    }

    const checkoutBtn = document.querySelector(".checkout-btn");
    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", () => {
            if (cart.length === 0) {
                showToast("A kosár üres!");
                return;
            }
            window.location.href = "checkout.html";
        });
    }
}

// Mennyiség módosítása a kosárban
function changeQuantity(index, delta) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    if (cart[index]) {
        cart[index].quantity = (cart[index].quantity || 1) + delta;
        if (cart[index].quantity < 1) {
            removeItem(index); // Ha 0 lenne a darabszám, töröljük
            return;
        }
        localStorage.setItem("cart", JSON.stringify(cart));
        renderCart();
        updateCartCount();
    }
}

// Termék törlése a kosárból
function removeItem(index) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    if (window.location.pathname.includes("cart.html")) {
        renderCart();
    } else {
        location.reload();
    }
    updateCartCount();
}

// ==========================================
// PÉNZTÁR ÉS RENDELÉS LEADÁSA
// ==========================================

if (window.location.pathname.includes("checkout.html")) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const container = document.getElementById("checkout-items");
    let total = 0;

    // Összegző feltöltése termékekkel
    if (container) {
        container.innerHTML = "";
        cart.forEach(item => {
            const itemQty = item.quantity || 1;
            total += item.price * itemQty;
            container.innerHTML += `
                <div class="checkout-item">
                    <span>${item.name} ${item.size ? `(${item.size})` : ''} <span style="color: #888; font-size: 0.9rem;">(${itemQty} db)</span></span>
                    <span style="font-weight: 500;">${(item.price * itemQty).toLocaleString()} Ft</span>
                </div>
            `;
        });

        const totalLabel = document.getElementById("checkout-total");

        /**
         * Kiszámolja a végösszeget a szállítási díjjal együtt.
         */
        function updateCheckoutTotal() {
            const shippingMethod = document.querySelector('input[name="shipping"]:checked')?.value || 'home';
            let shippingFee = 0;

            // 10.000 Ft alatt szállítási díjat számítunk fel
            if (total < 10000) {
                shippingFee = (shippingMethod === 'home') ? 1500 : 990;
            }

            const finalTotal = total + shippingFee;
            
            // Szállítási díj sor megjelenítése/frissítése
            let shippingDisplay = document.getElementById("shipping-fee-display");
            if (!shippingDisplay) {
                shippingDisplay = document.createElement("div");
                shippingDisplay.id = "shipping-fee-display";
                shippingDisplay.className = "checkout-item shipping-row";
                shippingDisplay.style.borderTop = "1px solid #eee";
                shippingDisplay.style.marginTop = "10px";
                shippingDisplay.style.paddingTop = "10px";
                container.appendChild(shippingDisplay);
            }
            
            shippingDisplay.innerHTML = `
                <span>Szállítási díj:</span>
                <span>${shippingFee > 0 ? shippingFee.toLocaleString() + " Ft" : "Ingyenes"}</span>
            `;

            totalLabel.textContent = finalTotal.toLocaleString() + " Ft";
            return finalTotal;
        }

        updateCheckoutTotal();

        // Szállítási mód váltásakor újraszámoljuk az árat
        document.querySelectorAll('input[name="shipping"]').forEach(input => {
            input.addEventListener('change', updateCheckoutTotal);
        });
    }

    // Alapadatok kitöltése, ha a felhasználó be van jelentkezve
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
        if (document.getElementById("name")) document.getElementById("name").value = user.name;
        if (document.getElementById("email")) document.getElementById("email").value = user.email;
    }

    // Rendelés leadása gomb
    const orderBtn = document.querySelector(".place-order-btn");
    if (orderBtn) {
        orderBtn.addEventListener("click", async () => {
            const name = document.getElementById("name").value;
            const email = document.getElementById("email").value;
            const phone = document.getElementById("phone").value;
            const address = document.getElementById("address").value;
            const shippingMethod = document.querySelector('input[name="shipping"]:checked')?.value || 'home';
            const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'cod';

            if (!name || !email || !phone || !address) {
                showToast("Kérlek tölts ki minden mezőt!");
                return;
            }

            // Rendelés küldése a backendre
            try {
                const orderData = {
                    p_items: cart.map(item => ({
                        id: item.id,
                        quantity: item.quantity || 1,
                        size: item.size || null
                    })),
                    p_shipping_method: shippingMethod,
                    p_payment_method: paymentMethod,
                    p_customer_name: name,
                    p_customer_phone: phone,
                    p_customer_address: address,
                    p_user_email: email
                };

                const result = await apiFetch('/orders', {
                    method: 'POST',
                    body: JSON.stringify(orderData)
                });

                showToast("Rendelés sikeresen leadva!");
                localStorage.removeItem("cart"); // Kosár ürítése
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1500);
            } catch (err) {
                console.error(err);
                showToast("Hiba történt a rendelés leadásakor: " + (err.message || "Ismeretlen hiba"));
            }
        });
    }
}

// ==========================================
// HITELLESÍTÉS (REGISZTRÁCIÓ ÉS BEJELENTKEZÉS)
// ==========================================

// Regisztráció logikája
if (window.location.pathname.includes("register.html")) {
    const regBtn = document.getElementById("register-btn");
    if (regBtn) {
        regBtn.addEventListener("click", async () => {
            const name = document.getElementById("reg-name").value;
            const email = document.getElementById("reg-email").value;
            const password = document.getElementById("reg-password").value;

            if (!name || !email || !password) {
                showToast("Kérlek tölts ki minden mezőt!");
                return;
            }

            try {
                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error);

                showToast("Regisztráció sikeres! Kérlek igazold vissza az e-mailt.");
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1500);
            } catch (error) {
                showToast(error.message || "Hiba a regisztráció során!");
            }
        });
    }
}

// Bejelentkezés logikája
if (window.location.pathname.includes("login.html")) {
    const loginBtn = document.getElementById("login-btn");
    if (loginBtn) {
        loginBtn.addEventListener("click", async () => {
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error);

                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                const userData = data.user;
                
                showToast("Sikeres bejelentkezés!");
                setTimeout(() => {
                    window.location.href = userData.is_admin ? "admin.html" : "index.html";
                }, 1000);
            } catch (error) {
                showToast(error.message || "Hibás email vagy jelszó!");
            }
        });
    }
}

// ==========================================
// PROFIL ADATOK ÉS RENDELÉSI ELŐZMÉNYEK
// ==========================================

if (window.location.pathname.includes('profile.html')) {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        showToast('Kérlek jelentkezz be a profilod megtekintéséhez!');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    } else {
        // UI feltöltése a tárolt profil adatokkal
        const detailsCard = document.getElementById('user-details-card');
        if (detailsCard) {
            detailsCard.innerHTML = `
                <div class="user-data-item">
                    <strong>Név</strong>
                    <span>${user.name}</span>
                </div>
                <div class="user-data-item">
                    <strong>E-mail cím</strong>
                    <span>${user.email}</span>
                </div>
                <div class="user-data-item">
                    <strong>Telefonszám</strong>
                    <span>${user.phone || "<i>Nincs megadva</i>"}</span>
                </div>
                <div class="user-data-item">
                    <strong>Szállítási cím</strong>
                    <span>${user.address || "<i>Nincs megadva</i>"}</span>
                </div>
            `;
        }

        // Szerkesztés gomb eseménykezelő
        const editBtn = document.getElementById('edit-profile-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => toggleEditForm(true));
        }

        const ordersList = document.getElementById('orders-list');
        // Rendelések lekérése a backendről
        apiFetch('/orders/my')
            .then(userOrders => {
                if (ordersList) {
                    ordersList.innerHTML = '';
                    if (!userOrders || userOrders.length === 0) {
                        ordersList.innerHTML = '<p>Még nincsenek rendeléseid.</p>';
                    } else {
                        userOrders.forEach(order => {
                            const dateObj = new Date(order.created_at);
                            const formattedDate = dateObj.toLocaleDateString('hu-HU') + ' ' + dateObj.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });

                            let itemsHtml = order.order_items ? order.order_items.map(item => `
                                <li class="order-item">
                                    <span>${item.product_name} ${item.size ? `(${item.size})` : ''} <span style="color: #888; font-size: 0.85rem;">(${item.quantity} db)</span></span>
                                    <span style="font-weight: 600;">${(item.price * item.quantity).toLocaleString()} Ft</span>
                                </li>
                            `).join('') : '';
                            const statusText = order.status === 'pending' ? 'Feldolgozás alatt' :
                                order.status === 'shipped' ? 'Szállítás alatt' :
                                    order.status === 'delivered' ? 'Kézbesítve' : order.status;

                            ordersList.innerHTML += `
                                <div class="order-card">
                                    <div class="order-header">
                                        <div>
                                            <span class="order-id" style="display: block; font-size: 0.8rem; color: #999;">#${order.id}</span>
                                            <span class="order-date">${formattedDate}</span>
                                        </div>
                                        <div class="order-total">${order.total_price.toLocaleString()} Ft</div>
                                    </div>
                                    <ul class="order-item-list" style="list-style: none; padding: 0; margin-bottom: 0;">
                                        ${itemsHtml}
                                    </ul>
                                    <div class="order-footer" style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
                                        <span class="status-badge status-${order.status}" style="font-size: 0.75rem;">${statusText}</span>
                                    </div>
                                </div>
                            `;
                        });
                    }
                }
            })
            .catch(err => {
                console.error(err);
                if (ordersList) ordersList.innerHTML = '<p>Hiba történt a rendelések betöltésekor.</p>';
            });
    }
}

/**
 * Profil szerkesztése űrlap ki/be kapcsolása.
 */
function toggleEditForm(show) {
    const form = document.getElementById('edit-profile-form');
    const user = JSON.parse(localStorage.getItem('user'));

    if (show && user) {
        document.getElementById('edit-name').value = user.name;
        document.getElementById('edit-phone').value = user.phone || "";
        document.getElementById('edit-address').value = user.address || "";
        form.style.display = 'block';
        window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
    } else {
        form.style.display = 'none';
    }
}

/**
 * Módosított profiladatok mentése.
 */
async function saveProfileChanges() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const updatedData = {
        name: document.getElementById('edit-name').value,
        phone: document.getElementById('edit-phone').value,
        address: document.getElementById('edit-address').value
    };

    if (!updatedData.name) {
        showToast("A név megadása kötelező!");
        return;
    }

    try {
        const profile = await apiFetch('/profile', {
            method: 'PUT',
            body: JSON.stringify(updatedData)
        });

        // Frissítjük a localStorage-t is
        const updatedUser = { ...user, ...profile };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        showToast("Profil sikeresen frissítve!");
        toggleEditForm(false);
        setTimeout(() => location.reload(), 1000);
    } catch (err) {
        console.error(err);
        showToast("Hiba a profil mentésekor!");
    }
}

// ==========================================
// KÍVÁNSÁGLISTA (WISHLIST)
// ==========================================

/**
 * Termék hozzáadása vagy eltávolítása a kedvencek közül.
 */
function toggleWishlist(event, productId) {
    event.stopPropagation(); // Ne nyissa meg a termék oldalt kattintáskor
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const index = wishlist.indexOf(productId);

    if (index > -1) {
        wishlist.splice(index, 1);
        showToast('Eltávolítva a kívánságlistáról.');
    } else {
        wishlist.push(productId);
        showToast('Hozzáadva a kívánságlistához!');
    }

    localStorage.setItem('wishlist', JSON.stringify(wishlist));

    // Ha a kívánságlista oldalon vagyunk, azonnal újrarajzoljuk a listát
    if (window.location.pathname.includes('wishlist.html')) {
        renderWishlist();
    } else {
        // Különben csak frissítjük az ikonokat
        applyFilters();
    }
}

/**
 * A kedvencnek jelölt termékek kilistázása a wishlist.html-en.
 */
function renderWishlist() {
    if (typeof window.allProducts === 'undefined') return;
    let wishlistIds = JSON.parse(localStorage.getItem('wishlist')) || [];
    const wishlistedProducts = window.allProducts.filter(p => wishlistIds.includes(p.id));
    renderProducts(wishlistedProducts, "wishlist-list");
}

if (window.location.pathname.includes('wishlist.html')) {
    document.addEventListener('DOMContentLoaded', renderWishlist);
}

// ==========================================
// KATEGÓRIA KEZELÉS ÉS MENÜ
// ==========================================

/**
 * Kategóriák lekérése a backendről.
 */
async function fetchCategories() {
    try {
        const data = await apiFetch('/categories');
        renderMenu(data);
        console.log("Kategóriák sikeresen betöltve az API-ról.");
    } catch (error) {
        console.warn("Hiba a kategóriák betöltésekor, statikus lista használata.");
        const staticCategories = [
            { id: 1, name: "Ing" }, { id: 2, name: "Zakó" }, { id: 3, name: "Nadrág" }, { id: 4, name: "Cipő" }
        ];
        renderMenu(staticCategories);
    }
}

/**
 * Dinamikus menü generálása a kategóriák alapján.
 */
function renderMenu(categories) {
    const menu = document.getElementById("main-menu");
    if (!menu) return;

    // Régi elemek takarítása
    const existingItems = menu.querySelectorAll("li[data-category]");
    existingItems.forEach(item => item.remove());

    // Új elemek beszúrása
    categories.slice().reverse().forEach(cat => {
        const li = document.createElement("li");
        li.setAttribute("data-category", cat.id);
        li.textContent = cat.name;
        menu.prepend(li); // A lista elejére fűzzük
    });
}

// ==========================================
// SZŰRÉS, KERESÉS ÉS RENDEZÉS
// ==========================================

/**
 * A termékek szűrése keresőszó, kategória és ár alapján, majd rendezésük.
 */
function applyFilters() {
    const source = window.allProducts || (typeof productsData !== 'undefined' ? productsData : []);
    if (!source || source.length === 0) return;

    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const activeCategory = document.querySelector('.menu li.active')?.getAttribute('data-category');
    const sortBy = document.getElementById('sort-select')?.value || 'default';
    const maxPrice = parseInt(document.getElementById('price-filter')?.value) || 100000;

    let filtered = source.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm) || (p.description && p.description.toLowerCase().includes(searchTerm));
        const matchesCategory = !activeCategory || p.category_id == activeCategory;
        const matchesPrice = p.price <= maxPrice;
        return matchesSearch && matchesCategory && matchesPrice;
    });

    // Rendezési feltételek alkalmazása
    if (sortBy === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') filtered.sort((a, b) => b.price - a.price);
    else if (sortBy === 'name-asc') filtered.sort((a, b) => a.name.localeCompare(b.name));

    renderProducts(filtered);
}

// Menü kattintások (kategória váltás) kezelése
const menuList = document.getElementById("main-menu");
if (menuList) {
    menuList.addEventListener("click", (e) => {
        const item = e.target.closest("li");
        if (!item || item.classList.contains("cart-menu")) return;

        const cat = item.getAttribute("data-category");
        const isMainPage = window.location.pathname.endsWith("index.html") || window.location.pathname === "/" || window.location.pathname.endsWith("/");

        if (cat !== null || item.innerText.includes("Főoldal")) {
            if (isMainPage) {
                // Ha a főoldalon vagyunk, aktiváljuk a szűrőt
                document.querySelectorAll(".menu li").forEach(li => li.classList.remove("active"));
                item.classList.add("active");
                applyFilters();
            } else {
                // Ha más oldalon vagyunk, visszairányítjuk a főoldalra a kategória paraméterrel
                const targetCat = cat || ""; 
                window.location.href = `index.html${targetCat ? `?category=${targetCat}` : ""}`;
            }

            // Mobil menü automatikus bezárása kattintás után
            menuList.classList.remove("active");
            const toggleBtn = document.getElementById("mobile-menu-toggle");
            if (toggleBtn) toggleBtn.textContent = "☰";
        }
    });
}

// Inicializálás betöltéskor
document.addEventListener('DOMContentLoaded', () => {
    const sortSelect = document.getElementById('sort-select');
    const priceFilter = document.getElementById('price-filter');
    const priceDisplay = document.getElementById('price-display');
    const searchInput = document.getElementById('search-input');

    // Eseménykezelők a szűrőkhöz
    if (sortSelect) sortSelect.addEventListener('change', applyFilters);
    if (priceFilter) {
        priceFilter.addEventListener('input', (e) => {
            const val = e.target.value;
            if (priceDisplay) priceDisplay.textContent = parseInt(val).toLocaleString() + ' Ft';
            applyFilters();
        });
    }
    if (searchInput) searchInput.addEventListener('input', applyFilters);

    // Kezdő adatok betöltése
    fetchProducts().then(() => {
        // Ellenőrizzük, hogy kategória szűréssel érkeztünk-e az oldalra
        const urlParams = new URLSearchParams(window.location.search);
        const catParam = urlParams.get('category');
        if (catParam) {
            const menuItem = document.querySelector(`.menu li[data-category="${catParam}"]`);
            if (menuItem) {
                document.querySelectorAll(".menu li").forEach(li => li.classList.remove("active"));
                menuItem.classList.add("active");
                applyFilters();
            }
        }
    });
    fetchCategories();
    updateCartCount();
});


// ==========================================
// �gyf�lkapcsolati oldal (contact.html) logika
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. FAQ Harmonika működése
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const questionBtn = item.querySelector('.faq-question');
        
        questionBtn.addEventListener('click', () => {
            // Bezárjuk a többit (opcionális, ha csak 1 lehet nyitva egyszerre)
            const currentlyActive = document.querySelector('.faq-item.active');
            if (currentlyActive && currentlyActive !== item) {
                currentlyActive.classList.remove('active');
            }
            
            // Re-toggle aktuális
            item.classList.toggle('active');
        });
    });

    // 2. Kapcsolati űrlap kezelése (mock)
    const contactForm = document.getElementById('contact-form');
    const statusMsg = document.getElementById('contact-status');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('contact-name').value;
            const email = document.getElementById('contact-email').value;
            const subject = document.getElementById('contact-subject').value;
            const message = document.getElementById('contact-message').value;

            // Alap validáció már megtörtént a HTML5 required attributummal
            
            // Gomb tiltása a feldolgozás alatt
            const submitBtn = contactForm.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Küldés folyamatban...';
            submitBtn.disabled = true;

            // Szimulált backend kérés
            setTimeout(() => {
                // Siker esetén ürítés és üzenet
                contactForm.reset();
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                
                statusMsg.textContent = 'Köszönjük az üzenetet! Hamarosan felvesszük veled a kapcsolatot.';
                statusMsg.className = 'status-msg success';
                
                // Üzenet eltüntetése kis idő múlva
                setTimeout(() => {
                    statusMsg.style.display = 'none';
                    statusMsg.className = 'status-msg'; // Alap érték vissza
                    // Biztos ami biztos, inline style reset
                    setTimeout(() => statusMsg.style.display = '', 100);
                }, 5000);
                
            }, 1500);
        });
    }
});



