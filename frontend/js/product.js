// ==========================================
// TERMÉK RÉSZLETEK ÉS HASONLÓ TERMÉKEK
// ==========================================

if (window.location.pathname.includes("product.html")) {
    let product = JSON.parse(localStorage.getItem("selectedProduct"));

    if (product) {
        const imgSrc = getProductImage(product.image);
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

        // Kosárba rakás eseménykezelő
        if (addToCartBtn) {
            addToCartBtn.addEventListener("click", () => {
                if (!window.selectedSize) {
                    showToast("Kérlek válassz méretet!");
                    return;
                }

                const qtyInput = document.getElementById("product-qty");
                const quantity = qtyInput ? parseInt(qtyInput.value) : 1;

                if (quantity < 1) {
                    showToast("Érvénytelen mennyiség!");
                    return;
                }

                // Létrehozzuk a termék objektumot a választott mérettel
                const productWithSize = { ...product, size: window.selectedSize };
                
                // Meghívjuk a közös addToCart függvényt (common.js)
                addToCart(productWithSize, quantity);
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

