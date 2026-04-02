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

            try {
                // Csak a minimális adatokat küldjük fel (ID, mennyiség, méret), az árat a szerver számolja az adatbázis alapján.
                const orderData = {
                    items: cart.map(item => ({
                        id: item.id,
                        quantity: item.quantity || 1,
                        size: item.size || null
                    })),
                    shipping_method: shippingMethod,
                    payment_method: paymentMethod,
                    customer_name: name,
                    customer_phone: phone,
                    customer_address: address,
                    user_email: email
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
