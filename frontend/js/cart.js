// ==========================================
// KOSÁR KEZELÉSE
// ==========================================

// A globális kosárkezelő függvények (addToCart, updateCartCount) már a common.js-ben vannak.

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
                const imgSrc = getProductImage(item.image);
                container.innerHTML += `
                    <div class="cart-item">
                        <img src="${imgSrc}" onerror="this.src='images/hatter.jpg'">
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

