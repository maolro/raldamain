// 1. CARGAR EL ARCHIVO DE REGLAS
const rulesFile = './data/reglas/manual_core.md'; // Tu archivo de texto

fetch(rulesFile)
    .then(response => response.text())
    .then(text => {
        // Convertir Markdown a HTML
        document.getElementById('markdown-viewer').innerHTML = marked.parse(text);

        // Generar el Índice Lateral
        buildSidebar();

        // Scroll to hash anchor after content is loaded
        if (window.location.hash) {
            const targetId = window.location.hash.substring(1); // Remove the '#'
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                // Small delay to ensure layout is complete
                setTimeout(() => {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        }
    })
    .catch(err => console.error('Error:', err));

// Function to turn "Acciones por Turno" into "acciones-por-turno"
function slugify(text) {
    return text.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents (á -> a)
        .replace(/\s+/g, '-')           // Spaces to hyphens
        .replace(/[^\w\-]+/g, '')       // Remove non-word chars
        .replace(/\-\-+/g, '-')         // Collapse multiple hyphens
        .replace(/^-+/, '')             // Trim start
        .replace(/-+$/, '');            // Trim end
}

// 2. FUNCIÓN PARA CREAR EL ÍNDICE AUTOMÁTICO
function buildSidebar() {
    const indexList = document.getElementById('auto-index');
    indexList.innerHTML = ''; // Limpiar lista anterior

    // 1. Seleccionamos H2 y H3 en orden de aparición
    const headers = document.querySelectorAll('#markdown-viewer h2, #markdown-viewer h3');
    
    let currentMainItem = null; // Para recordar el último H2 procesado
    let currentSubList = null;  // La lista <ul> dentro del H2 actual

    headers.forEach((header) => {
        // Generar ID único (Slugify)
        const slug = slugify(header.innerText);
        header.id = slug;

        // Crear el enlace
        const link = document.createElement('a');
        link.href = `#${slug}`;
        link.innerText = header.innerText;

        // LÓGICA DE JERARQUÍA
        if (header.tagName === 'H2') {
            // --- ES UN TÍTULO PRINCIPAL ---
            
            // 1. Crear el <li> principal
            const li = document.createElement('li');
            li.appendChild(link);
            
            // 2. Crear una sublista <ul> vacía por si luego vienen H3s
            const subUl = document.createElement('ul');
            subUl.className = 'sub-menu'; // Clase para CSS
            li.appendChild(subUl);

            // 3. Añadir al menú principal
            indexList.appendChild(li);

            // 4. Guardar referencia para los futuros hijos
            currentMainItem = li;
            currentSubList = subUl;

        } else if (header.tagName === 'H3') {
            // --- ES UN SUBAPARTADO ---
            
            if (currentSubList) {
                const li = document.createElement('li');
                li.appendChild(link);
                currentSubList.appendChild(li); // Añadir a la sublista del H2 actual
            } else {
                // (Caso raro: Si hay un H3 antes del primer H2, lo añadimos al root)
                const li = document.createElement('li');
                li.appendChild(link);
                indexList.appendChild(li);
            }
        }
    });
}