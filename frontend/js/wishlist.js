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

