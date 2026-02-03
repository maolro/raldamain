/* components.js */

document.addEventListener("DOMContentLoaded", function() {
    loadNavbar();
});

function loadNavbar() {
    // 1. Select the placeholder where the nav should go
    const navContainer = document.getElementById("navbar-container");
    if (!navContainer) return;

    // 2. Define your HTML structure (Copy from your existing code)
    const navbarHTML = `
    <nav class="navbar">
        <div class="logo-container">
            <a href="/index.html"> <img src="/assets/images/raldamain_logo.png" alt="Raldamain Logo" class="nav-logo">
            </a>
        </div>
        <ul class="nav-links">
            <li><a href="/reglas">Reglas Principales</a></li>
            <li><a href="/rangos">Rangos</a></li>
            <li><a href="/criaturas">Criaturas</a></li>
            <li><a href="/equipos">Equipamiento</a></li>
            <li><a href="/mundo">El Mundo</a></li>
            <li><a href="#" class="btn-builder">Creador de Personajes</a></li>
        </ul>
        <div class="search-container">
            <input type="text" id="search-input" placeholder="Buscar información aquí...">
            <button type="button" id="search-button">🔍</button>
        </div>
        <div class="hamburger">
            <span></span>
            <span></span>
            <span></span>
        </div>
    </nav>
    `;

    // 3. Inject the HTML
    navContainer.innerHTML = navbarHTML;

    // 4. Highlight the "Active" page automatically
    highlightActiveLink();

    // 5. Initialize Mobile Menu (since the HTML didn't exist before this script ran)
    initMobileMenu();

    // 6. Initialize Search (prevent default button behavior)
    initSearch();
}

function highlightActiveLink() {
    const path = window.location.pathname;
    const page = path.split("/").pop(); // Get 'index.html' or 'magia_fuego.html'

    // Simple check to add 'active' color (Gold)
    if(page === "index.html" || page === "") {
        document.getElementById("link-home").style.color = "var(--accent-gold)";
    }
    // You can add more logic here, e.g., if page contains "fire", highlight Compendium
}

function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if(hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
}

function initSearch() {
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');

    if(searchButton) {
        searchButton.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent any default behavior
            const query = searchInput.value.trim();

            if(query) {
                // TODO: Implement search functionality
                console.log('Búsqueda:', query);
                // For now, just log it. Later you can redirect to a search page:
                // window.location.href = `/buscar?q=${encodeURIComponent(query)}`;
            }
        });

        // Also handle Enter key in search input
        searchInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                e.preventDefault();
                searchButton.click();
            }
        });
    }
}