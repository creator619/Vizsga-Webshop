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
                // Regisztrációs adatok küldése a saját backendnek
                const response = await fetch(`${BASE_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Hiba a regisztráció során!");
                }

                showToast("Regisztráció sikeres! Most már bejelentkezhetsz.");
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1500);
            } catch (error) {
                showToast(error.message || "Hiba a regisztráció során!");
            }
        });
    }
}
