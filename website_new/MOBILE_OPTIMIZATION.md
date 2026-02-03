# Mobile Optimization Guide - Raldamain

## 📱 Cambios Realizados para Móviles

### 1. **Navbar Responsive** ([assets/css/style.css](assets/css/style.css))

#### Desktop (>768px):
- Navegación horizontal con todos los links visibles
- Logo tamaño completo
- Barra de búsqueda expandida

#### Tablet/Mobile (≤768px):
- **Hamburger menu** (☰) visible
- Logo más pequeño
- Búsqueda compacta
- Menu colapsable con click en hamburger
- Links verticales con borde inferior

#### Small Mobile (≤480px):
- Logo aún más pequeño
- Búsqueda muy compacta
- Padding reducido

### 2. **Card Grid Responsive**

#### Desktop:
```css
grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
```
- 3-4 columnas dependiendo del ancho

#### Tablet (≤768px):
```css
grid-template-columns: 1fr;
```
- 1 columna (tarjetas a ancho completo)

### 3. **Hero Section Responsive**

#### Desktop: `height: 60vh`
#### Tablet: `height: 50vh`
#### Mobile: `height: 40vh`

### 4. **Typography Responsive**

| Elemento | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Hero h1 | 4rem | 2.5rem | 2rem |
| Section title | 2rem | 1.8rem | 1.5rem |
| Card h3 | 1.5rem | 1.2rem | 1.2rem |
| Body text | 1rem | 0.9rem | 0.9rem |

### 5. **Rank Pages Responsive** ([assets/css/rank_style.css](assets/css/rank_style.css))

#### Hero:
- Desktop: `font-size: 3.5rem`
- Tablet: `font-size: 2rem`
- Mobile: `font-size: 1.5rem`

#### Ability Cards:
- Desktop: Padding `1.5rem`
- Tablet: Padding `1rem`
- Mobile: Padding `0.75rem`

### 6. **Creature Pages** ([assets/css/creature_style.css](assets/css/creature_style.css))

Ya tiene media queries optimizadas.

---

## 🧪 Cómo Probar en Móvil

### Opción 1: Chrome DevTools (Desktop)

1. Abre Chrome
2. Presiona `F12` o `Ctrl+Shift+I`
3. Click en el ícono de dispositivo móvil (📱) en la esquina superior izquierda
4. Selecciona un dispositivo:
   - iPhone 12 Pro (390x844)
   - iPhone SE (375x667)
   - Samsung Galaxy S20 (412x915)
   - Pixel 5 (393x851)

### Opción 2: Responsive Mode

1. En DevTools, click en "Responsive"
2. Arrastra para cambiar el tamaño
3. Prueba estos anchos críticos:
   - **1200px+**: Desktop grande
   - **768px-1199px**: Tablet
   - **480px-767px**: Mobile grande
   - **320px-479px**: Mobile pequeño

### Opción 3: Dispositivo Real

1. Abre tu sitio en tu teléfono
2. Prueba:
   - ☰ Hamburger menu debe abrir/cerrar
   - Tarjetas deben ocupar ancho completo
   - Texto debe ser legible sin zoom
   - No debe haber scroll horizontal

---

## 📋 Checklist de Funcionalidades Móviles

### Navbar:
- ✅ Logo se ve claro
- ✅ Hamburger menu funciona (click abre/cierra)
- ✅ Links son clickables (mínimo 44x44px táctil)
- ✅ Búsqueda es usable
- ✅ No se superpone el contenido

### Cards:
- ✅ Ocupan ancho completo en móvil
- ✅ Imágenes escalan correctamente
- ✅ Texto es legible sin zoom
- ✅ Botones "Ver más" son clickables
- ✅ Gap entre cards es adecuado

### Hero Section:
- ✅ Título es legible
- ✅ No se corta el contenido
- ✅ Altura apropiada (no muy grande ni pequeña)

### Detail Pages:
- ✅ Statblocks son legibles
- ✅ Habilidades se muestran bien
- ✅ No hay overflow horizontal

---

## 🎨 Breakpoints Usados

```css
/* Tablet y Mobile Grande */
@media (max-width: 768px) { ... }

/* Mobile Pequeño */
@media (max-width: 480px) { ... }

/* Desktop Grande */
@media (min-width: 1400px) { ... }
```

---

## 🐛 Problemas Comunes y Soluciones

### Problema: Menu hamburger no funciona

**Causa:** JavaScript no está cargando
**Solución:**
1. Verifica que `components.js` esté cargando
2. Abre consola (F12) y busca errores
3. Verifica que `initMobileMenu()` se ejecute

### Problema: Cards se ven muy pequeñas en mobile

**Causa:** Grid template no se está aplicando
**Solución:**
1. Verifica que `style.css` tenga los media queries
2. Fuerza recarga (Ctrl+Shift+R)
3. Purga cache de Cloudflare

### Problema: Texto se sale de la pantalla

**Causa:** Width fijo o padding muy grande
**Solución:**
```css
/* Usa max-width en lugar de width fijo */
.elemento {
    max-width: 100%;
    padding: 1rem; /* Reduce en mobile */
}
```

### Problema: Scroll horizontal en mobile

**Causa:** Elemento más ancho que viewport
**Solución:**
1. Abre DevTools > Elements
2. Busca el elemento que causa overflow
3. Añade:
```css
.elemento-problema {
    max-width: 100%;
    overflow-x: hidden;
}
```

---

## 🚀 Mejoras Futuras Opcionales

### Touch Gestures:
- Swipe para navegar entre rangos/criaturas
- Pull-to-refresh en listas

### Performance:
- Lazy loading de imágenes
- Reduce tamaño de imágenes en mobile
- Service Worker para offline

### UX:
- Bottom navigation bar (alternativa a hamburger)
- Floating action button para búsqueda
- Sticky filter buttons en listas

---

## 📊 Tamaños Objetivo

| Dispositivo | Ancho Min | Ancho Óptimo |
|-------------|-----------|--------------|
| Mobile S | 320px | 375px |
| Mobile M | 375px | 414px |
| Mobile L | 414px | 480px |
| Tablet | 768px | 1024px |
| Desktop | 1024px | 1440px |

---

**Todos los cambios están implementados y listos para deploy!**
