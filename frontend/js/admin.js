// Az admin felület már a common.js-t is betölti, így az API_URL és apiFetch elérhető.

// Az oldal betöltésekor lefutó fő inicializáló rész
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Alapszintű ellenőrzés a localStorage-ból (gyors visszajelzés)
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Szerveroldali ellenőrzés a saját backendünkön keresztül
    try {
        const profile = await apiFetch('/profile');

        // Ellenőrizzük az adatbázisból jövő valódi admin státuszt
        if (!profile || !profile.is_admin) {
            throw new Error("Nincs admin jogosultság az adatbázisban");
        }

        // Ha a szerver is megerősítette a jogosultságot, betölthetjük az adatokat
        loadOrders();       // Rendelések
        loadStats();        // Statisztikák (bevétel, stb.)
        loadCategoriesAdmin(); // Kategóriák a termékfelvételhez
        setupTabs();        // Fülek közötti navigáció beállítása
        
    } catch (err) {
        console.warn("Hozzáférés megtagadva:", err.message);
        alert('Nincs jogosultságod ehhez az oldalhoz! Kérlek lépj be egy admin fiókkal.');
        
        // Biztonsági okokból töröljük a gyanús localStorage adatot is, ha az admint hazudott
        if (user.is_admin) {
            user.is_admin = false;
            localStorage.setItem('user', JSON.stringify(user));
        }
        
        window.location.href = 'index.html';
    }
});

// A fülek (Irányítópult, Rendelések, Termékek) közötti váltás kezelése
function setupTabs() {
    document.querySelectorAll('.admin-nav .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Aktív osztály eltávolítása minden fülről és tartalom elrejtése
            document.querySelectorAll('.admin-nav .tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

            // Aktuális fül aktiválása
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.getElementById(`${target}-tab`).style.display = 'block';

            // Adatok frissítése a fülre kattintáskor
            if (target === 'dashboard') loadStats();
            if (target === 'orders') loadOrders();
            if (target === 'products') {
                loadProducts();
            }
        });
    });
}

// Kategóriák betöltése a backendről a termék felvételi legördülő menübe
async function loadCategoriesAdmin() {
    try {
        const categories = await apiFetch('/categories');

        const select = document.getElementById('p-category');
        if (select) {
            select.innerHTML = '<option value="">Válassz kategóriát...</option>';
            categories.forEach(cat => {
                select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            });
        }
    } catch (err) {
        console.error("Hiba a kategóriák betöltésekor:", err);
    }
}

// --- DASHBOARD: Statisztikai adatok számítása ---
async function loadStats() {
    try {
        const stats = await apiFetch('/admin/stats');
        
        // Megjelenítés az oldalon
        document.getElementById('stat-revenue').textContent = stats.totalRevenue.toLocaleString() + ' Ft';
        document.getElementById('stat-orders').textContent = stats.totalOrders + ' db';
        document.getElementById('stat-customers').textContent = stats.totalCustomers + ' fő';
    } catch (err) {
        console.error("Hiba a statisztikák betöltésekor:", err);
    }
}

// --- RENDELÉSEK: Rendelések listázása és kezelése ---
async function loadOrders() {
    try {
        const orders = await apiFetch('/orders');
        
        const tbody = document.querySelector('#admin-orders-table tbody');
        tbody.innerHTML = '';

        orders.forEach(o => {
            const date = new Date(o.created_at).toLocaleDateString('hu-HU');
            // Rendelési tételek HTML listája
            const itemsHtml = o.order_items ? o.order_items.map(item => `
                <div style="font-size: 0.85rem; color: #666; margin-bottom: 2px;">
                    • ${item.product_name} ${item.size ? `<b>(${item.size})</b>` : ''} <span style="color: #444; font-weight: 500;">(${item.quantity} db)</span> — <b>${(item.price * item.quantity).toLocaleString()} Ft</b>
                </div>
            `).join('') : 'Nincs adat';

            // Sor hozzáadása a táblázathoz
            const shippingText = o.shipping_method === 'home' ? 'Házhoz' : (o.shipping_method === 'locker' ? 'Automata' : o.shipping_method || '-');
            const paymentText = o.payment_method === 'cod' ? 'Utánvét' : (o.payment_method === 'transfer' ? 'Átutalás' : o.payment_method || '-');

            tbody.innerHTML += `
                <tr>
                    <td>#${o.id}</td>
                    <td>
                        <b>${o.customer_name || 'Ismeretlen'}</b><br>
                        <span style="font-size: 0.85rem; color: #555;">${o.user_email}</span><br>
                        <div style="font-size: 0.85rem; color: #777; margin-top: 3px;">
                            📞 ${o.customer_phone || '-'}<br>
                            🏠 ${o.customer_address || '-'}
                        </div>
                        <div class="order-items-detail" style="margin-top: 5px; border-top: 1px solid #eee; pt-2;">
                            ${itemsHtml}
                        </div>
                    </td>
                    <td>${o.total_price.toLocaleString()} Ft</td>
                    <td>
                        <div style="font-size: 0.85rem;">${shippingText}</div>
                        <div style="font-size: 0.75rem; color: #777;">${paymentText}</div>
                    </td>
                    <td>${date}</td>
                    <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                    <td>
                        <!-- Státusz módosító legördülő menü -->
                        <select onchange="updateOrderStatus(${o.id}, this.value)">
                            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Függőben</option>
                            <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Szállítva</option>
                            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Kézbesítve</option>
                        </select>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

// Rendelés státuszának frissítése (pl. függőben -> szállítva)
async function updateOrderStatus(id, newStatus) {
    try {
        await apiFetch(`/orders/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        showToast('Státusz frissítve!');
        loadOrders(); // Táblázat frissítése
    } catch (err) {
        console.error(err);
        showToast('Hiba a státusz frissítésekor!');
    }
}

// Termékek listájának betöltése az admin táblázatba
async function loadProducts() {
    try {
        const products = await apiFetch('/products');
        window.allProducts = products;

        const tbody = document.querySelector('#admin-products-table tbody');
        tbody.innerHTML = '';

        products.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td><img src="${getProductImage(p.image)}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" onerror="this.src='images/hatter.jpg'"></td>
                    <td>${p.name}</td>
                    <td>${p.price.toLocaleString()} Ft</td>
                    <td>${p.stock} db</td>
                    <td>${p.category_id}</td>
                    <td>
                        <!-- Szerkesztés és Törlés gombok -->
                        <button class="action-btn" onclick='editProduct(${JSON.stringify(p)})'>✏️</button>
                        <button class="action-btn" onclick="deleteProduct(${p.id})">🗑️</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

// Termékfelvételi űrlap megjelenítése
function showProductForm() {
    document.getElementById('product-form').style.display = 'block';
    document.getElementById('form-title').textContent = 'Új termék hozzáadása';
    clearForm();
}

// Űrlap elrejtése
function hideProductForm() {
    document.getElementById('product-form').style.display = 'none';
}

// Űrlap mezőinek kiürítése
function clearForm() {
    document.getElementById('p-id').value = '';
    document.getElementById('p-name').value = '';
    document.getElementById('p-price').value = '';
    document.getElementById('p-image').value = '';
    document.getElementById('p-category').value = '';
    document.getElementById('admin-size-inputs').innerHTML = '<span style="color: #666; font-size: 0.9rem;">Kérlek válassz először kategóriát!</span>';
    document.getElementById('p-desc').value = '';
}

// Dinamikus méretmező generátor a kategória alapján
function generateAdminSizeInputs(productId = null) {
    const category = document.getElementById('p-category').value;
    const container = document.getElementById('admin-size-inputs');
    
    if (!category) {
        container.innerHTML = '<span style="color: #666; font-size: 0.9rem;">Kérlek válassz először kategóriát!</span>';
        return;
    }
    
    // Kategóriától függő méretlista
    let sizes = category == '4' ? ["40", "41", "42", "43", "44", "45"] : ["S", "M", "L", "XL", "XXL"];
    
    // Meglévő adatok kinyerése a termékből (size_stocks oszlop a DB-ben)
    let customStocks = {};
    const product = window.allProducts?.find(p => p.id == productId);
    if (product && product.size_stocks) {
        customStocks = product.size_stocks;
    } else {
        // Fallback a régi localStorage-ra, ha még nincs fent az új DB oszlopban
        const stockMap = JSON.parse(localStorage.getItem('customStockMap') || '{}');
        if (stockMap[productId]) customStocks = stockMap[productId];
    }
    
    container.innerHTML = '';
    sizes.forEach(size => {
        // Alapértelmezett érték: ha új termék, 10-et teszünk bele osztva, hogy legyen benne valami (demo miatt), ha meglévő, akkor 0, de ha customStocks létezik, azt használjuk
        let defaultVal = customStocks[size] !== undefined ? customStocks[size] : (productId ? 0 : 2);
        container.innerHTML += `
            <div style="display: flex; flex-direction: column; width: 60px;">
                <label style="font-size: 0.85rem; text-align: center; margin-bottom: 3px;">${size}</label>
                <input type="number" class="size-stock-input" data-size="${size}" value="${defaultVal}" min="0" style="padding: 5px; text-align: center; margin-bottom: 0;">
            </div>
        `;
    });
}

// Meglévő termék adatainak beöltése az űrlapba szerkesztéshez
function editProduct(p) {
    document.getElementById('product-form').style.display = 'block';
    document.getElementById('form-title').textContent = 'Termék szerkesztése';

    document.getElementById('p-id').value = p.id;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-price').value = p.price;
    document.getElementById('p-image').value = p.image;
    document.getElementById('p-category').value = p.category_id;
    
    // Generáljuk a kategóriának megfelelő inputokat a meglévő termékhez
    generateAdminSizeInputs(p.id);

    document.getElementById('p-desc').value = p.description;
}

// Termék mentése (ha van ID, frissít, ha nincs, újat szúr be)
async function saveProduct() {
    const id = document.getElementById('p-id').value;
    
    // Összeszeljük a méretenkénti készletet
    const sizeInputs = document.querySelectorAll('.size-stock-input');
    let totalStock = 0;
    let sizeBreakdown = {};
    sizeInputs.forEach(inp => {
        const val = parseInt(inp.value) || 0;
        totalStock += val;
        sizeBreakdown[inp.dataset.size] = val;
    });

    const product = {
        name: document.getElementById('p-name').value,
        price: parseInt(document.getElementById('p-price').value),
        image: document.getElementById('p-image').value,
        stock: totalStock,
        size_stocks: sizeBreakdown,
        category_id: parseInt(document.getElementById('p-category').value),
        description: document.getElementById('p-desc').value
    };

    try {
        let savedProduct;
        
        if (id) {
            savedProduct = await apiFetch(`/products/${id}`, {
                method: 'PUT',
                body: JSON.stringify(product)
            });
        } else {
            savedProduct = await apiFetch('/products', {
                method: 'POST',
                body: JSON.stringify(product)
            });
        }

        const savedId = savedProduct.id;

        if (savedId) {
            const stockMap = JSON.parse(localStorage.getItem('customStockMap') || '{}');
            stockMap[savedId] = sizeBreakdown;
            localStorage.setItem('customStockMap', JSON.stringify(stockMap));
            if(window.allProducts) {
                const idx = window.allProducts.findIndex(x=>x.id == savedId);
                if(idx !== -1) window.allProducts[idx] = savedProduct;
                else window.allProducts.push(savedProduct);
            }
        }

        showToast(id ? 'Termék frissítve!' : 'Termék hozzáadva!');
        hideProductForm();
        loadProducts(); // Lista frissítése
    } catch (err) {
        console.error(err);
        showToast('Hiba a mentés során: ' + err.message);
    }
}

// Termék törlése
async function deleteProduct(id) {
    if (!confirm('Biztosan törlöd a terméket?')) return;

    try {
        await apiFetch(`/products/${id}`, { method: 'DELETE' });
        
        showToast('Termék törölve!');
        loadProducts(); // Lista frissítése
    } catch (err) {
        console.error(err);
        showToast('Hiba a törlés során!');
    }
}

