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
            <li><a href="/reglas.html">Reglas Principales</a></li>
            <li><a href="/rangos.html">Rangos</a></li>
            <li><a href="/criaturas.html">Criaturas</a></li>
            <li><a href="/equipos.html">Equipamiento</a></li>
            <li><a href="/mundo">El Mundo</a></li>
            <li><a href="#" class="btn-builder">Creador de Personajes</a></li>
        </ul>
        <div class="search-container">
            <input type="text" placeholder="Buscar información aquí...">
            <button>🔍</button>
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