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



