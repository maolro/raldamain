# Social Media Previews (Link Preview Cards)

## 🎴 ¿Qué son las Link Preview Cards?

Cuando compartes un link en redes sociales o apps de mensajería, aparece una "tarjeta" con:
- **Imagen grande** (preview del contenido)
- **Título** de la página
- **Descripción** breve
- **URL** del sitio

Esto funciona en:
- 📱 WhatsApp
- 💬 Discord
- 🐦 Twitter/X
- 📘 Facebook
- 💼 LinkedIn
- 📨 Slack
- 💬 Telegram
- 📱 iMessage

---

## ✅ Implementación Completa

### 1. **Meta Tags en HTML**

Cada página ahora tiene meta tags de Open Graph y Twitter Card en el `<head>`:

```html
<!-- Open Graph (Facebook, WhatsApp, Discord, LinkedIn) -->
<meta property="og:type" content="article">
<meta property="og:site_name" content="Raldamain">
<meta property="og:title" content="Título de la Página">
<meta property="og:description" content="Descripción breve">
<meta property="og:image" content="URL completa de la imagen">
<meta property="og:url" content="URL de la página">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Título">
<meta name="twitter:description" content="Descripción">
<meta name="twitter:image" content="URL de la imagen">
```

### 2. **JavaScript Dinámico** ([assets/js/meta-tags.js](assets/js/meta-tags.js))

Para páginas dinámicas (rangos, criaturas, equipos), el JavaScript actualiza los meta tags cuando se carga el contenido:

```javascript
updateMetaTags({
    title: 'Magia de Fuego | Raldamain Rangos',
    description: 'Controlas las llamas para causar destrucción...',
    image: 'https://tudominio.com/assets/images/ranks/magia_fuego.jpg',
    url: 'https://tudominio.com/rango/magia_fuego',
    type: 'article'
});
```

### 3. **Archivos Modificados**

#### Templates actualizados:
- ✅ [templates/view-rango.html](templates/view-rango.html)
- ✅ [templates/view-criatura.html](templates/view-criatura.html)
- ✅ [templates/view-equipo.html](templates/view-equipo.html)

#### Loaders actualizados:
- ✅ [assets/js/rank_loader.js](assets/js/rank_loader.js)
- ✅ [assets/js/creature_loader.js](assets/js/creature_loader.js)
- ✅ [assets/js/equipment_loader.js](assets/js/equipment_loader.js)

#### Nuevo archivo:
- ✅ [assets/js/meta-tags.js](assets/js/meta-tags.js) - Función helper

---

## 📋 Requisitos para Imágenes

### **Tamaños Recomendados:**

| Plataforma | Tamaño Óptimo | Ratio |
|------------|---------------|-------|
| Facebook/WhatsApp | 1200x630px | 1.91:1 |
| Twitter | 1200x675px | 16:9 |
| LinkedIn | 1200x627px | 1.91:1 |
| Discord | 1280x720px | 16:9 |

### **Requisitos Generales:**
- ✅ Formato: JPG o PNG
- ✅ Tamaño máximo: 8 MB
- ✅ Mínimo: 600x315px
- ✅ URL completa (no relativa): `https://tudominio.com/assets/images/...`

---

## 🧪 Cómo Probar

### **Opción 1: Facebook Sharing Debugger** (Más Completo)

1. Ve a: https://developers.facebook.com/tools/debug/
2. Pega tu URL: `https://tudominio.com/rango/magia_fuego`
3. Haz clic en **"Debug"**
4. Verás:
   - Preview de la card
   - Todos los meta tags detectados
   - Errores o warnings
5. Si actualizaste los meta tags, haz clic en **"Scrape Again"** para purgar cache

### **Opción 2: Twitter Card Validator**

1. Ve a: https://cards-dev.twitter.com/validator
2. Pega tu URL
3. Haz clic en **"Preview card"**

### **Opción 3: LinkedIn Post Inspector**

1. Ve a: https://www.linkedin.com/post-inspector/
2. Pega tu URL
3. Haz clic en **"Inspect"**

### **Opción 4: WhatsApp (Real)**

1. Envíate un mensaje a ti mismo
2. Pega el link
3. Espera 2-3 segundos
4. Debería aparecer la preview card

### **Opción 5: Discord (Real)**

1. Pega el link en un canal
2. Espera 2-3 segundos
3. Debería aparecer el embed

---

## 🐛 Troubleshooting

### **Problema: No aparece la preview**

**Causa 1: Cache**
- Solución: Usa el Facebook Debugger y haz click en "Scrape Again"

**Causa 2: Imagen no accesible**
- Solución: Verifica que la URL de la imagen sea completa y accesible públicamente
- Prueba abrir la URL de la imagen en el navegador

**Causa 3: Meta tags con errores**
```
❌ MAL:  <meta property="og:image" content="/assets/images/logo.png">
✅ BIEN: <meta property="og:image" content="https://tudominio.com/assets/images/logo.png">
```

**Causa 4: Cloudflare bloquea el bot**
- Solución: Verifica las reglas de firewall en Cloudflare
- Los bots de Facebook/WhatsApp/Discord deben poder acceder

### **Problema: Preview desactualizada**

**Solución:**
1. Facebook Debugger > "Scrape Again"
2. Espera 5-10 minutos (WhatsApp usa cache de Facebook)
3. En Discord: edita el mensaje para forzar re-fetch

### **Problema: Imagen no se muestra**

**Checklist:**
- ✅ URL es absoluta (con https://)
- ✅ Imagen existe y es accesible
- ✅ Imagen no requiere autenticación
- ✅ Tamaño de imagen < 8MB
- ✅ No hay reglas de Cloudflare bloqueando bots

---

## 📊 Ejemplos de URLs

```
https://tudominio.com/rango/magia_fuego
→ Title: Magia de Fuego | Raldamain Rangos
→ Image: /assets/images/ranks/magia_fuego.jpg
→ Desc: Controlas las llamas para causar destrucción...

https://tudominio.com/criatura/esqueleto
→ Title: Esqueleto | Raldamain Bestiario
→ Image: /assets/images/creatures/esqueleto.jpg
→ Desc: No-muerto de nivel 1. Los esqueletos son...

https://tudominio.com/equipo/espada_llamas
→ Title: Espada de Llamas | Raldamain Equipos
→ Image: /assets/images/equipment/espada_llamas.jpg
→ Desc: Arma Marcial Cuerpo a Cuerpo
```

---

## 🚀 Deploy y Verificación

### **1. Deploy:**
```bash
git add .
git commit -m "Add Open Graph and Twitter Card meta tags"
git push
```

### **2. Espera deploy de Cloudflare** (1-2 min)

### **3. Purga cache:**
- Cloudflare Dashboard > Caching > Purge Everything

### **4. Prueba con Facebook Debugger:**
- https://developers.facebook.com/tools/debug/
- Pega tu URL
- Verifica que aparezca correctamente

### **5. Prueba en WhatsApp/Discord:**
- Comparte el link
- Verifica que aparezca la card

---

## 📝 Checklist de Verificación

Para cada página importante:

- [ ] Meta tag `og:title` presente
- [ ] Meta tag `og:description` presente
- [ ] Meta tag `og:image` presente (URL completa)
- [ ] Meta tag `og:url` presente
- [ ] Imagen es accesible públicamente
- [ ] Imagen tiene tamaño adecuado (1200x630px mínimo)
- [ ] Preview funciona en Facebook Debugger
- [ ] Preview aparece en WhatsApp
- [ ] Preview aparece en Discord

---

## 🎨 Mejoras Futuras

### **Imágenes Personalizadas:**
Crear imágenes específicas para cada rango/criatura/equipo:
- Tamaño: 1200x630px
- Incluir: Título + Stats clave + Logo
- Formato: JPG optimizado

### **Descripción Dinámica:**
Extraer descripción relevante de cada contenido:
```javascript
// Para rangos: primera habilidad
description: data.levels[0].abilities[0].desc.substring(0, 150)

// Para criaturas: lore
description: data.lore.substring(0, 150) + '...'
```

### **Video Previews:**
Algunas plataformas soportan video:
```html
<meta property="og:video" content="https://tudominio.com/video.mp4">
```

---

## 📱 Resultado Esperado

Cuando compartes: `https://tudominio.com/rango/magia_fuego`

**WhatsApp:**
```
┌─────────────────────────────────┐
│   [Imagen: Fuego]               │
│                                 │
│   Magia de Fuego | Raldamain   │
│   Controlas las llamas para... │
│   tudominio.com                 │
└─────────────────────────────────┘
```

**Discord:**
```
┌──────────────────────────────────────┐
│ Raldamain                            │
│                                      │
│ Magia de Fuego | Raldamain Rangos   │
│ Controlas las llamas para causar     │
│ destrucción, alterar el campo...     │
│                                      │
│ [Imagen grande de Magia de Fuego]   │
└──────────────────────────────────────┘
```

---

**¡Listo! Tus links ahora generan previews bonitas en todas las plataformas.** 🎉
