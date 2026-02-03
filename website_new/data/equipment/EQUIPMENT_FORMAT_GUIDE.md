# Guía de Formato de Equipos - Raldamain

Esta guía explica cómo crear archivos JSON para equipos en el sistema de Raldamain.

---

## Estructura Básica

Cada equipo requiere dos cosas:
1. **Entrada en `equipment_list.json`** (lista maestra)
2. **Archivo individual en `data/equipment/{id}.json`** (detalles completos)

---

## 1. ENTRADA EN EQUIPMENT_LIST.JSON

Esta es la información mínima que aparece en la página de lista de equipos:

```json
{
  "id": "nombre_unico_sin_espacios",
  "name": "Nombre Completo del Equipo",
  "type": "Arma|Armadura|Arma Mágica|Armadura Mágica|Objeto Mágico",
  "subtype": "Categoría específica del equipo",
  "rarity": "Común|Poco Común|Rara|Muy Rara|Legendaria",
  "image": "nombre_imagen.jpg",
  "description": "Descripción breve (1-2 líneas) para la tarjeta",
  "price": "Precio en CR, po, etc."
}
```

### Campos Obligatorios (Lista):
- **id**: Identificador único (sin espacios, usar guiones bajos)
- **name**: Nombre del equipo
- **type**: Categoría principal
- **subtype**: Subcategoría específica
- **rarity**: Nivel de rareza
- **image**: Nombre del archivo de imagen
- **description**: Descripción corta
- **price**: Precio del equipo

---

## 2. ARCHIVO INDIVIDUAL DE EQUIPO

El archivo completo en `data/equipment/{id}.json` contiene toda la información detallada:

### SECCIONES DEL EQUIPO

#### A. INFORMACIÓN BÁSICA (Obligatorio)

```json
{
  "id": "espada_larga",
  "name": "Espada Larga",
  "type": "Arma",
  "subtype": "Arma Marcial Cuerpo a Cuerpo",
  "rarity": "Común",
  "image": "espada_larga.jpg",
  "description": "Descripción completa y detallada del equipo..."
}
```

**Dónde aparece:**
- `id`, `name`: Hero section (título)
- `type`, `subtype`, `rarity`: Meta badges bajo el título
- `description`: Sección "Descripción"

---

#### B. ESTADÍSTICAS (Opcional, según tipo)

```json
{
  "damage": "1d8 cortante",
  "damageType": "Cortante|Perforante|Contundente|Fuego|etc.",
  "defense": "14",
  "weight": "3 kg",
  "price": "50 CR",
  "range": "Cuerpo a cuerpo | 6/18 metros",
  "attackBonus": "+1",
  "defenseBonus": "+2"
}
```

**Campos de estadísticas disponibles:**
- **damage**: Daño del arma (ej: "1d8 cortante", "2d6+2 fuego")
- **damageType**: Tipo de daño
- **defense**: Valor de defensa de armadura
- **weight**: Peso en kg
- **price**: Precio
- **range**: Alcance del arma
- **attackBonus**: Bonus mágico al ataque (ej: "+1", "+3")
- **defenseBonus**: Bonus mágico a la defensa

**Dónde aparece:** Sección "Estadísticas" en formato de tabla

---

#### C. PROPIEDADES (Opcional pero recomendado)

```json
{
  "properties": [
    "Versátil: Puede usarse con una o dos manos",
    "Ligera: Ideal para combate con dos armas",
    "Pesada: Requiere fuerza considerable"
  ]
}
```

**Dónde aparece:** Sección "Propiedades" con viñetas decoradas (⚔)

**Ejemplos de propiedades:**
- Características especiales del equipo
- Bonificaciones pasivas
- Restricciones de uso
- Efectos secundarios

---

#### D. REQUISITOS (Opcional pero importante para armaduras pesadas)

```json
{
  "requirements": "Competencia con armaduras pesadas. Mínimo 6 en Fuerza para usarla sin penalizaciones."
}
```

**Dónde aparece:** Sección "Requisitos" con borde rojo (destacado)

**Ejemplos:**
- "Ninguno" (equipos simples)
- "Competencia con armas marciales"
- "Sintonización"
- "Sintonización por un usuario de magia"
- "Mínimo 13 de Carisma"
- "Competencia con armaduras medias. Mínimo 4 en Fuerza"

---

#### E. PENALIZACIONES (Opcional - nuevo campo para armaduras pesadas)

```json
{
  "penalties": "Si no tienes al menos 4 en Fuerza, sufres -4 a todas las tiradas de Destreza y no puedes recuperar Focus (Chi) durante descansos cortos mientras lleves esta armadura."
}
```

**Dónde aparece:** Se renderiza junto con "Requisitos" en la sección destacada

**Uso:**
- Para armaduras pesadas que requieren Fuerza
- Para equipos malditos
- Para objetos con efectos negativos

**Ejemplos:**
- Armadura Media: "...sufres -4 a tiradas de Destreza y no puedes recuperar Focus durante descansos cortos"
- Armadura Pesada: "...sufres -6 a tiradas de Destreza y no puedes recuperar Focus durante descansos cortos o largos. Tu velocidad se reduce en 3 metros"

---

#### F. HABILIDADES MÁGICAS (Opcional - solo objetos mágicos)

```json
{
  "abilities": [
    {
      "name": "Llamarada",
      "cost": "1 Chi | 1 acción | Reacción | Pasiva",
      "uses": "3/día | 1/día | Una vez | Ilimitado | Permanente",
      "description": "Descripción detallada de la habilidad y sus efectos..."
    }
  ]
}
```

**Campos de habilidad:**
- **name**: Nombre de la habilidad
- **cost**: Costo de activación (Chi, acción, bonus, reacción, pasiva)
- **uses**: Frecuencia de uso
- **description**: Efectos completos, salvaciones, daño, etc.

**Dónde aparece:** Sección "Habilidades Mágicas" con tarjetas individuales

**Ejemplos de habilidades:**
```json
{
  "name": "Protección Constante",
  "cost": "Pasiva",
  "uses": "Permanente",
  "description": "Obtienes +1 de bonus a tu Defensa y a todas tus tiradas de salvación."
}
```

```json
{
  "name": "Aliento Dragónico",
  "cost": "1 Chi",
  "uses": "1/día",
  "description": "Exhalas fuego en un cono de 9 metros. Cada criatura debe hacer salvación de Destreza CD 16, sufriendo 6d6 de daño por fuego (mitad si éxito)."
}
```

---

#### G. LORE/HISTORIA (Opcional pero recomendado)

```json
{
  "lore": "Historia extensa y detallada sobre el origen del equipo, usuarios famosos, eventos legendarios, etc. Puede ser varios párrafos."
}
```

**Dónde aparece:** Sección "Historia" al final de la página, con formato itálico especial

---

## 3. EJEMPLOS COMPLETOS POR TIPO

### ARMA NORMAL (Mínimo)

```json
{
  "id": "daga",
  "name": "Daga",
  "type": "Arma",
  "subtype": "Arma Simple Cuerpo a Cuerpo",
  "rarity": "Común",
  "image": "daga.jpg",
  "description": "Una hoja corta y afilada...",
  "damage": "1d4 perforante",
  "damageType": "Perforante",
  "weight": "0.5 kg",
  "price": "10 CR",
  "range": "Cuerpo a cuerpo o arrojadiza (6/18 metros)",
  "properties": [
    "Ligera: Ideal para combate con dos armas",
    "Arrojadiza: Puede lanzarse a distancia"
  ],
  "requirements": "Ninguno"
}
```

### ARMADURA NORMAL (Con penalizaciones)

```json
{
  "id": "cota_mallas",
  "name": "Cota de Mallas",
  "type": "Armadura",
  "subtype": "Armadura Media",
  "rarity": "Común",
  "image": "cota_mallas.jpg",
  "description": "Anillos de acero entrelazados...",
  "defense": "6",
  "weight": "20 kg",
  "price": "150 CR",
  "properties": [
    "Protección Media: Buen equilibrio entre protección y movilidad",
    "Pesada: Requiere fuerza considerable"
  ],
  "requirements": "Competencia con armaduras medias. Mínimo 4 en Fuerza para usarla sin penalizaciones.",
  "penalties": "Si no tienes al menos 4 en Fuerza, sufres -4 a todas las tiradas de Destreza y no puedes recuperar Focus (Chi) durante descansos cortos mientras lleves esta armadura.",
  "lore": "La cota de mallas ha sido la armadura estándar..."
}
```

### ARMA MÁGICA (Completo)

```json
{
  "id": "espada_llamas",
  "name": "Espada de Llamas",
  "type": "Arma Mágica",
  "subtype": "Arma Marcial Cuerpo a Cuerpo",
  "rarity": "Rara",
  "image": "espada_llamas.jpg",
  "description": "Forjada en un volcán activo...",
  "damage": "1d8 cortante + 1d6 fuego",
  "damageType": "Cortante y Fuego",
  "weight": "3 kg",
  "price": "2,500 CR",
  "attackBonus": "+1",
  "properties": [
    "Versátil: Una o dos manos",
    "Llama Eterna: Siempre envuelta en llamas",
    "Iluminación: Luz brillante 6m, tenue 6m",
    "Resistencia al Fuego: El portador resiste daño por fuego"
  ],
  "abilities": [
    {
      "name": "Llamarada",
      "cost": "1 Chi",
      "uses": "3/día",
      "description": "Lanza llamarada en cono 4.5m. Salvación Destreza CD 15 o 3d6 daño fuego (mitad si éxito)."
    }
  ],
  "requirements": "Sintonización. Competencia con armas marciales. Mínimo 13 de Carisma.",
  "lore": "Forjada por Ignis el Infernal hace tres siglos..."
}
```

### OBJETO MÁGICO (Completo)

```json
{
  "id": "anillo_proteccion",
  "name": "Anillo de Protección",
  "type": "Objeto Mágico",
  "subtype": "Anillo",
  "rarity": "Rara",
  "image": "anillo_proteccion.jpg",
  "description": "Anillo de plata con runas protectoras...",
  "weight": "0.01 kg",
  "price": "2,000 CR",
  "defenseBonus": "+1",
  "properties": [
    "Escudo Arcano: +1 a la Defensa",
    "Salvaciones Mejoradas: +1 a todas las salvaciones",
    "Discreto: No es visible la protección",
    "Permanente: Efecto constante"
  ],
  "abilities": [
    {
      "name": "Protección Constante",
      "cost": "Pasiva",
      "uses": "Permanente",
      "description": "+1 bonus a Defensa y salvaciones mientras lleves el anillo."
    }
  ],
  "requirements": "Sintonización",
  "lore": "Creados por magos especializados en magia protectora..."
}
```

---

## 4. CAMPOS DE EQUIPO - REFERENCIA RÁPIDA

### Obligatorios
- `id`, `name`, `type`, `subtype`, `rarity`, `image`, `description`

### Estadísticas (según tipo)
- `damage`, `damageType`, `defense`, `weight`, `price`, `range`, `attackBonus`, `defenseBonus`

### Opcionales
- `properties` (array de strings)
- `requirements` (string)
- `penalties` (string) - NUEVO para armaduras pesadas
- `abilities` (array de objetos)
- `lore` (string largo)

---

## 5. TIPOS Y SUBTIPOS ESTÁNDAR

### ARMA
**Subtipos:**
- "Arma Simple Cuerpo a Cuerpo"
- "Arma Simple a Distancia"
- "Arma Marcial Cuerpo a Cuerpo"
- "Arma Marcial a Distancia"

### ARMADURA
**Subtipos:**
- "Armadura Ligera"
- "Armadura Media"
- "Armadura Pesada"
- "Escudo"

### ARMA MÁGICA / ARMADURA MÁGICA
**Subtipos:** (mismos que arriba)

### OBJETO MÁGICO
**Subtipos:**
- "Anillo"
- "Vara"
- "Báculo"
- "Varita"
- "Poción"
- "Pergamino"
- "Maravilloso" (misceláneo)

---

## 6. NIVELES DE RAREZA

1. **Común** - Equipos estándar, fáciles de encontrar
2. **Poco Común** - Equipos mejorados, algo especiales
3. **Rara** - Equipos mágicos, difíciles de encontrar
4. **Muy Rara** - Equipos poderosos, muy escasos
5. **Legendaria** - Artefactos únicos, casi míticos

Cada rareza tiene un color automático en la interfaz.

---

## 7. CONSEJOS DE ESCRITURA

### Para Descripciones:
- **Lista (equipment_list.json)**: 1-2 líneas máximo
- **Detalle (archivo individual)**: 2-4 líneas, más descriptivo

### Para Propiedades:
- Usa formato "Nombre: Explicación"
- Sé específico con mecánicas de juego
- Incluye bonificaciones numéricas

### Para Penalizaciones:
- Especifica claramente las condiciones (ej: "Si no tienes X en Fuerza...")
- Detalla todos los efectos negativos
- Menciona limitaciones de recuperación de Focus/Chi

### Para Habilidades:
- Nombre claro y evocativo
- Costo específico (Chi, acción, reacción)
- Descripción completa con CD de salvación, daño, duración
- Indica limitaciones de uso

### Para Lore:
- Cuenta una historia interesante
- Menciona creadores, usuarios famosos
- Conecta con el mundo de Raldamain
- 2-4 párrafos es ideal

---

## 8. DÓNDE VAN LOS CAMPOS EN LA INTERFAZ

| Campo | Ubicación en la Página |
|-------|------------------------|
| `name` | Hero Section - Título principal |
| `type`, `subtype`, `rarity` | Hero Section - Meta badges |
| `image` | Hero Section - Fondo |
| `description` | Sección "Descripción" |
| `damage`, `defense`, `weight`, etc. | Sección "Estadísticas" (tabla) |
| `properties` | Sección "Propiedades" (lista con viñetas) |
| `requirements` | Sección "Requisitos" (destacado en rojo) |
| `penalties` | Dentro de sección "Requisitos" |
| `abilities` | Sección "Habilidades Mágicas" (tarjetas) |
| `lore` | Sección "Historia" (itálico al final) |

---

## 9. CHECKLIST PARA CREAR NUEVO EQUIPO

- [ ] Crear entrada en `equipment_list.json`
- [ ] Crear archivo `data/equipment/{id}.json`
- [ ] Asegurar que ambos usan el mismo `id`
- [ ] Añadir imagen en `assets/images/equipment/{nombre}.jpg`
- [ ] Incluir todos los campos obligatorios
- [ ] Añadir propiedades relevantes
- [ ] Para armaduras pesadas: incluir `requirements` y `penalties`
- [ ] Para objetos mágicos: añadir `abilities`
- [ ] Escribir `lore` interesante
- [ ] Verificar rareza y precio apropiados
- [ ] Probar en la web (`/equipos.html` y `/equipo/{id}`)

---

## 10. EJEMPLOS DE PENALIZACIONES POR FUERZA

### Armadura Ligera (Sin penalizaciones)
```json
{
  "requirements": "Competencia con armaduras ligeras",
  "penalties": null
}
```

### Armadura Media (FUE 4 requerida)
```json
{
  "requirements": "Competencia con armaduras medias. Mínimo 4 en Fuerza para usarla sin penalizaciones.",
  "penalties": "Si no tienes al menos 4 en Fuerza, sufres -4 a todas las tiradas de Destreza y no puedes recuperar Focus (Chi) durante descansos cortos mientras lleves esta armadura."
}
```

### Armadura Pesada (FUE 6 requerida)
```json
{
  "requirements": "Competencia con armaduras pesadas. Mínimo 6 en Fuerza para usarla sin penalizaciones.",
  "penalties": "Si no tienes al menos 6 en Fuerza, sufres -6 a todas las tiradas de Destreza y no puedes recuperar Focus (Chi) durante descansos cortos o largos mientras lleves esta armadura. Además, tu velocidad de movimiento se reduce en 3 metros."
}
```

---

**¡Listo!** Ahora puedes crear equipos completos y consistentes para tu sistema Raldamain.
