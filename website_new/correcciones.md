# Correcciones y Problemas Detectados en los Rangos

Este documento recopila todas las reglas ambiguas, inconsistencias, problemas de balanceo y contenido sin definir encontrados durante la revisión de los 31 archivos de rangos.

---

## 1. Reglas Ambiguas

### 1.1 Tiros de Salvación sin especificar estadística

| Archivo | Habilidad | Rango | Problema |
|---------|-----------|-------|----------|
| `magia_mental` | Asalto Mental | I | La resistencia es "Concentración/Averiguar" (habilidades), no una estadística. Diferente del patrón de tiros de salvación basados en stats del resto del sistema. |
| `magia_mental` | Sugestión | II | No especifica ningún mecanismo de resistencia. Un hechizo de control sin tiro de salvación es problemático. |
| `magia_mental` | Geas | III | No especifica tiro de salvación para resistir la orden implantada. |
| `magia_mental` | Esclavizar | V | Control total sin tiro de salvación especificado. Muy poderoso (1 acción, 3 chi) sin resistencia declarada. |
| `magia_gravitatoria` | Agujero Negro | VI | La implosión final no especifica qué estadística usa el tiro de salvación. |
| `magia_espacial` | Puerta Dimensional | II | "Cruzar forzosamente requiere empujón o fallo de salvación" sin especificar estadística. |
| `magia_espacial` | Distorsión Espacial | II | Usa "Salvación Salud" — no queda claro si "Salud" es CON o una estadística personalizada del sistema. |

**Recomendación:** Definir en las reglas base qué estadística resiste cada tipo de efecto (ej: Mental -> INT o SAB, Físico -> FUE o CON, etc.) y aplicarlo consistentemente.

### 1.2 Fórmulas de daño/coste ambiguas

| Archivo | Habilidad | Rango | Problema |
|---------|-----------|-------|----------|
| `ira` | Ira de Combate | I | "Pierdes Chi igual a rondas usadas (riesgo de inconsciencia)" — no especifica el umbral exacto de inconsciencia (¿Chi llega a 0? ¿por debajo de 0?). |
| `ira` | Superar los Límites | V | "FUE, DES, CON suben a 12" — ¿reemplaza valores superiores o solo inferiores? ¿Es un mínimo o un valor fijo? |
| `mente_desencadenada` | Mente Desencadenada | I | "Daño a Cordura igual a (Chi actual - Rondas usadas)" — puede dar resultado negativo. No se especifica qué ocurre en ese caso. |
| `mente_desencadenada` | Mente sobre Cuerpo | V | "Pierdes Cordura igual al daño recibido" — ¿daño total acumulado o solo el del último turno? |
| `ascendencia_primigenia` | Forma de la Bestia | I | Misma fórmula ambigua "Chi actual - Rondas" que Mente Desencadenada. |
| `magia_temporal` | Robar el Tiempo | I | Daño "1d6 + Rango" — ¿se refiere al Rango en Temporal o al rango general del personaje? |
| `estilo_asesino` | Impacto Mortal | V | "Puede activarse con retraso" — mecánicamente ambiguo. ¿Significa daño retardado o declaración posterior al impacto? |

### 1.3 Mecánicas poco claras

| Archivo | Habilidad | Rango | Problema |
|---------|-----------|-------|----------|
| `estilo_asesino` | Presionar Defensas | II | "Tiro de Mente" — ¿es tiro de salvación o tiro enfrentado? |
| `estilo_asesino` | Ataque Triple | II | No queda claro si los tres objetivos comparten un tiro de ataque o reciben tiros separados, ni cómo se resuelve la defensa. |
| `estilo_duelista` | Estocada Poderosa | IV | "Requiere un escudo extra para pararse" — ¿el defensor debe gastar un contador de escudo adicional para usar Parada? |
| `estilo_duelista` | Secuencia de Ataques | V | Etiquetada como "Reacción" pero se activa "Al impactar", lo cual es un efecto on-hit, no una reacción. Tag posiblemente incorrecto. |
| `ira` | Furia Imparable | IV | No está claro qué cuenta como "recursos extra" que el defensor puede pagar, ni cuántos escudos debe sacrificar. |
| `reflejos` | Punto Ciego | IV | ¿La Esquiva reemplaza el tiro de salvación o es un tiro adicional? |
| `mente_desencadenada` | Conocimiento Arcano | II | "2 hechizos de Rango I" — ¿al subir de rango los hechizos disponibles también suben de nivel o permanecen fijos? |
| `magia_gravitatoria` | Pozo de Gravedad | I | "Vulnerabilidad a distancia" — ¿las criaturas dentro son vulnerables a ataques a distancia, o sus ataques a distancia se debilitan? |
| `magia_protectora` | Sello Extraplanario | VI | "+1 stat/limitador por cada 4 niveles" — ¿qué stats? ¿Qué limitadores? Demasiado vago para una habilidad de Rango VI. |
| `magia_ilusoria` | Copiar Hechizo | III | "Cualquier hechizo de tu Rango" — ¿Rango en Ilusoria o rango máximo del personaje? |
| `magia_protectora` | Contrahechizo | I | El empower dice "hechizos de coste X chi o menos" — X no está definido. |

---

## 2. Inconsistencias entre Rangos

### 2.1 Fórmulas de daño inconsistentes

| Archivo | Habilidad | Rango | Problema |
|---------|-----------|-------|----------|
| `magia_agua` | Escaldar | IV | Daño "1d6 + Rango" en vez de "1d6 + SAB" como el resto de hechizos de Agua. |
| `magia_hielo` | Rayo Gélido | I | Daño "1d6 + Rango" en vez de "1d6 + SAB". |
| `magia_tormenta` | Toque Chispeante / Arco Eléctrico | I | Ambos usan "1d6 + Rango" en vez de "1d6 + CAR" (la estadística principal de Tormenta). |
| `magia_tormenta` | Furia de la Tormenta | IV | Mezcla "1d8 + CAR" Eléctrico con "1d10 + Rango" Sónico — dos fórmulas distintas usando stats diferentes en un solo hechizo. |
| `magia_vida` | Arma Solar | II | Usa CAR para el daño pero la estadística principal de Vida es SAB. |

**Recomendación:** Decidir si "Rango" es un modificador válido para daño o si siempre debe ser la estadística principal del rango. Aplicar consistentemente.

### 2.2 Dados de daño y progresión

| Archivo | Problema |
|---------|----------|
| `magia_tormenta` | No tiene pasivas de mejora de dados de daño (d6 -> d8 -> d10) como Agua, Aire, Tierra e Hielo. ¿Intencional o un olvido? |
| `magia_hielo` | Ventisca (Rango IV) usa dados d10 pero no hay pasiva de mejora a d10 en Rango IV. Las otras magias elementales suben a d10 en Rango V. |

### 2.3 Muros elementales inconsistentes

| Muro | PV | DEF | Propiedades especiales |
|------|----|----|----------------------|
| Muro de Llamas | Rango x 3 | — | Cubierta parcial, daño al cruzar |
| Muro de Agua | Rango x 3 | — | **Inmune a físico no-mágico**, cubierta completa |
| Muro de Vientos | Rango x 3 | — | **Inmune a físico no-mágico**, cubierta parcial |
| Muro de Piedra | Rango x 3 | **Rango + 4** | Cubierta total, permanente |
| Muro de Hielo | Rango x 3 | **Rango + 2** | Inmune Frío, Vulnerable Contundente/Fuego |
| Barrera de Rayos | Rango x 3 | — | **Inmune a físico no-mágico**, cubierta parcial |
| Barrera Luminosa | — | — | Inmune a distancia |
| Muro de Energía | Rango x 3 | — | **Inmune a físico no-mágico** |

**Recomendación:** Estandarizar las propiedades de los muros: misma fórmula de PV, decidir cuáles son inmunes a físico no-mágico y cuáles no, y si tienen DEF propia.

### 2.4 Habilidades duplicadas entre estilos

| Habilidad | Archivos | Problema |
|-----------|----------|----------|
| Proyección de Chi | `estilo_asesino` (V) y `estilo_coloso` (V) | Texto idéntico. ¿Intencional o copy-paste? |
| Reflejos Supremos / División Mental | `reflejos` (V) y `mente_desencadenada` (V) | Mecánicamente idénticos (turno extra, 3 acciones, -10 iniciativa). Redundancia notable. |

### 2.5 Tags inconsistentes con mecánicas

| Archivo | Habilidad | Rango | Problema |
|---------|-----------|-------|----------|
| `magia_fuego` | Rayo de Plasma | V | Tags dicen "Fuego" pero el daño es Radiante. |
| `magia_sombria` | Furia de Shade | V | Tag dice "Necrótico" pero el daño es Frío. |
| `magia_sombria` | Ejecución Sombría | V | Tag dice "Necrótico" pero el daño es Frío. |

---

## 3. Contenido sin Definir o Referenciado Inexistente

| Archivo | Habilidad | Rango | Referencia no encontrada |
|---------|-----------|-------|--------------------------|
| `magia_fuego` | Infierno Abrasador | VI | Referencia a "Inmolación masiva" — no existe en el archivo. |
| `magia_fuego` | Forma Elemental | VI | Referencia a "Aura Abrasadora" y "Asalto Flamígero" — no definidas. |
| `ascendencia_celestial` | Ángel Vengador | VI | Referencia a "Poder de los Cielos" — no existe en el árbol de habilidades. |
| `ascendencia_primigenia` | Despertar la Bestia | VI | Referencia a "Estilo Salvaje (Rango III gratis)" — no existe como rango en el sistema. |
| `magia_tormenta` | Cambiar el Clima | V | Referencia a "Controlar Vientos" — habilidad de Magia de Aire, no de Tormenta. Dependencia cross-tree no aclarada. |

---

## 4. Problemas de Balanceo

### 4.1 Habilidades potencialmente infravaloradas

| Archivo | Habilidad | Rango | Problema |
|---------|-----------|-------|----------|
| `magia_hielo` | Medianoche Polar | VI | **Solo cuesta 2 chi** cuando todas las demás capstone de Rango VI cuestan 5 chi. Además, la descripción es puro texto narrativo sin mecánicas concretas (no define área, daño, duración, ni interacciones). |

### 4.2 Habilidades potencialmente sobrevaloradas

| Archivo | Habilidad | Rango | Problema |
|---------|-----------|-------|----------|
| `magia_temporal` | Ataque Retardado | IV | Por solo 2 chi: efecto crítico automático + ataque sorpresa + acción bonus. Combinado con hechizos de alto nivel, puede ser devastador. |
| `magia_mental` | Esclavizar | V | Control total del objetivo por 1 acción y 3 chi sin tiro de salvación especificado. Necesita un mecanismo de resistencia claro. |

### 4.3 Rangos incompletos

| Archivo | Problema |
|---------|----------|
| `rastrear` | No tiene Rango VI, a diferencia de todos los demás rangos del sistema. ¿Intencional (habilidad secundaria) o olvido? |

### 4.4 Duraciones inconsistentes

| Archivo | Habilidad | Rango | Problema |
|---------|-----------|-------|----------|
| `estilo_coloso` | Maestría de Estilo | IV | Duración "Seis rondas" pero desc dice "Termina si pierdes concentración" — dos condiciones de fin distintas. La versión de Asesino no tiene concentración. |
| `estilo_duelista` | Danza del Espadachín | IV | Solo dice "Concentración" sin límite de rondas. Todas las demás Duraderas de estilo especifican "Seis rondas". |

### 4.5 Costes de activación faltantes

| Archivo | Habilidad | Rango | Problema |
|---------|-----------|-------|----------|
| `ascendencia_abisal` | Transformación Abisal | VI | **No tiene coste** (ni acciones ni chi), a diferencia de todas las demás transformaciones de Rango VI que cuestan "3 acciones, 5 chi". |
| `guerrero_divino` | Guerrero de la Fe | II | Etiquetada como "Pasiva" pero tiene duración de 6 rondas y coste de chi al terminar. Debería tener un coste de activación. |
| `guerrero_divino` | Explosión Divina | V | No especifica tipo de daño (Divino, Radiante, según dios). |
| `magia_temporal` | Visión | III | No tiene coste definido (ni chi ni acciones). Marcada como ritual pero sin especificar. |

---

## 5. Errores Textuales Corregidos

| Archivo | Habilidad | Corrección |
|---------|-----------|------------|
| `ascendencia_infernal` | Pacto del Diablo | Decía "Usan chi en lugar de chi" (redundante). Debería especificar qué reserva reemplazan. |
| `nigromancia` | Maldición Vampírica | Campo "range: Toque" duplica el tag "Toque". Inconsistente con otros hechizos de toque que usan "Cuerpo a cuerpo". |

---

## 6. Recomendaciones Generales

1. **Estandarizar tiros de salvación:** Crear una tabla de referencia que asigne una estadística base a cada tipo de efecto (Físico -> FUE/CON, Mental -> INT/SAB, Espacial -> DES, etc.).

2. **Definir "Rango" vs "Estadística" en fórmulas de daño:** Algunos hechizos usan "Rango" como modificador de daño, otros usan la estadística principal. Elegir uno y aplicar consistentemente.

3. **Completar Medianoche Polar (Hielo VI):** Es la única capstone de Rango VI sin mecánicas concretas. Necesita área, duración, efectos específicos y un coste apropiado (5 chi como las demás).

4. **Añadir tiros de salvación a Magia Mental:** Sugestión, Geas y Esclavizar carecen de mecanismo de resistencia explícito. Son habilidades de control que deberían tener salvaciones claras.

5. **Definir las habilidades referenciadas que no existen:** "Inmolación masiva", "Aura Abrasadora", "Asalto Flamígero", "Poder de los Cielos" y "Estilo Salvaje" son referenciados pero no están definidos en ningún archivo.

6. **Revisar progresión de dados de Tormenta:** Es el único elemento sin pasivas de mejora de dados. Si es intencional (compensa con efectos de aturdimiento/ralentización), documentarlo; si no, añadirlas.

7. **Añadir coste a Transformación Abisal (VI):** Debería costar "3 acciones, 5 chi" como todas las demás transformaciones de Rango VI.
