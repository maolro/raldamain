document.addEventListener('DOMContentLoaded', () => {
    // Mobile Navigation Toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if(hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Simple Search Placeholder Functionality
    const searchBtn = document.querySelector('.search-container button');
    const searchInput = document.querySelector('.search-container input');

    searchBtn.addEventListener('click', () => {
        const query = searchInput.value;
        if(query) {
            alert(`Searching Raldamain database for: ${query}`);
            // In a real app, this would redirect to a search results page
            // window.location.href = `/search?q=${query}`;
        }
    });
});