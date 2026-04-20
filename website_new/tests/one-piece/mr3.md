# Mr. 3 (Galdino) — Nivel 10 (Revisado)
**Raza:** Humano

## Estadisticas (Cap: 6)
| FUE | DES | CON | INT | SAB | CAR |
|-----|-----|-----|-----|-----|-----|
| 2   | 3   | 3   | 6   | 4   | 4   |

**Justificacion de stats:**
- **INT 6 (cap):** Alimenta Mente Desencadenada (INT + Rango). Con R2, tiro mental = 6+2 = 8. Mr. 3 es un estratega e intelectual.
- **SAB 4:** Estadistica principal de Magia de Tierra (SAB + Rango). Con R3, tiro de tierra = 4+3 = 7. La cera se modela como "tierra moldeable".
- **CAR 4:** Soporte para Magia Ilusoria y talentos sociales. Mr. 3 es teatral y manipulador.
- **CON 3 / DES 3:** Supervivencia basica. Mr. 3 no es fisicamente excepcional.
- **FUE 2:** Stat de descarte. Mr. 3 es debil fisicamente.

## Recursos
- **PV:** 3 + CON(3) + floor((10-1)/3) = 3 + 3 + 3 = **9**
- **VT:** 2 + CON(3) + Nivel(10) = **15**
- **Chi total:** Tierra III (3x2=6) + Mente II (2x2=4) + Ilusoria II (2x2=4) + Protectora II (2x2=4) + Reflejos I (1x2=2) = **20 chi**
- **Vigor total:** Fortitud I (1x2=2) = **2 vigor**

> **Nota sobre Chi:** JSON: "Rango + 2". Codigo: "Rango x 2". Con Rango+2: Tierra III = 5, Mente II = 4, Ilusoria II = 4, Protectora II = 4, Reflejos I = 3 = 20 chi. Curiosamente, a este nivel la diferencia es minima (20 vs 20) porque los rangos bajos dan mas con Rango+2 y los altos dan mas con Rango x 2. La discrepancia crece a niveles mas altos.

> **Nota sobre Reflejos:** Segun el JSON de Reflejos, este rango usa Chi (no Vigor). Se contabiliza como chi.

## Rangos (11/11 puntos)
| Rango | Nivel | Chi/Vigor | Stat Principal |
|-------|-------|-----------|----------------|
| Magia de Tierra | III | 6 chi | SAB + Rango |
| Mente Desencadenada | II | 4 chi | INT + Rango |
| Magia Ilusoria | II | 4 chi | INT/CAR + Rango |
| Magia Protectora | II | 4 chi | SAB + Rango |
| Reflejos | I | 2 chi | DES (Esquiva + Rango) |
| Fortitud | I | 2 vigor | CON (defensivo) |

**Verificacion de puntos:** 3 + 2 + 2 + 2 + 1 + 1 = 11 puntos. Nivel 10 = 11 puntos. Correcto.

## Mapeo de Habilidades

### Magia de Tierra III (Doru Doru no Mi — Fruta de la Cera)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Pedrada** | Candle Lock (proyectil de cera) | 2d8 + SAB a distancia media (d8 por pasivo R3). Contundente. La cera endurece en impacto. |
| **Crear Obstaculo** | Muro de cera rapido | Barrera pequena. Otorga Cubierta. Mr. 3 levanta muros de cera instantaneos. |
| **Terratemblor** | Cera Explosiva (suelo) | AoE radio pequeno: 2d8 + SAB + tropezado. Crea terreno dificil. Cera endurecida que erupciona del suelo. |
| **Muro de Piedra** | Candle Wall | Muro solido con PV = Rango x 3 = 9. Reaccion defensiva. La defensa principal de Mr. 3. |
| **Tierra Viva** | Candle Champion (erupciones) | 3d8 + SAB en cilindro mediano. Erupciones de cera endurecida desde el suelo. |
| **Moldear la Tierra** | Doru Doru Arts | Modifica terreno en radio grande. Ventaja en Magia de Tierra. Mr. 3 esculpe el campo de batalla con cera. |
| **Abrazo de la Tierra** | Candle Lock (aprision) | Ataque de Pedrada que agarra. Rocas tienen resistencia de Muro. La cera atrapa y endurece alrededor del enemigo. |
| **Forma de la Montana** | Candle Armor / Champion | Levanta Rango-1 = 2 piedras flotantes. Sacrificar para detener ataque o lanzar Pedrada bonus. La armadura de cera de Mr. 3. |
| **Invocar Elemental de Tierra** | Candle Champion (golem) | Invoca elemental = golem de cera gigante que lucha por Mr. 3. |
| Pasivo R3 | Maestria de cera | Dados de dano suben a d8. Hechizos R1 cuestan -1 accion. |

### Mente Desencadenada II (Genio estrategico)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Mente Desencadenada** | Estado de concentracion total | Trance: Ventaja mental, +1d6 dano mental. Max 6 rondas. Mr. 3 planificando en combate. |
| **Agilidad Mental** | Talento multiproposito | +Rango+2 = 4 niveles de talento adicionales. Mr. 3 es competente en muchas areas. |
| **Poder del Dolor** | Determinacion bajo presion | Ignora heridas leves/medias, Resistencia a Aflicciones. Mr. 3 soportando por orgullo profesional. |
| **Conocimiento Arcano** | Formulas de cera avanzadas | Lanza 2 hechizos R1 adicionales (Arcano/Ocultismo) usando INT+Rango. Versatilidad intelectual. |

### Magia Ilusoria II (Teatralidad y engano)
*Nota: Las habilidades especificas de Magia Ilusoria no fueron detalladas en el prompt. Se asume la existencia de hechizos de engano visual, misdirection y creacion de imagenes falsas que encajan con la personalidad teatral y manipuladora de Mr. 3. Posibles mapeos: crear replicas de cera realistas (ilusiones tactiles), disfrazar objetos de cera como reales, distracciones visuales.*

### Magia Protectora II (Cera defensiva)
*Nota: Magia Protectora no fue detallada en el prompt. Se selecciono por su sinergia tematica — la cera de Mr. 3 es tanto ofensiva como defensiva. Las barreras, escudos y protecciones de este rango complementan los muros de Tierra. La cera endurecida que protege aliados (Candle Lock protector usado con Luffy en Impel Down) encaja aqui.*

### Reflejos I (Agilidad basica)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Velocidad Superior** | Reacciones rapidas | +1 accion/turno, +1 iniciativa. Mr. 3 no es lento mentalmente. |
| **Instinto de Supervivencia** | Instinto de autopreservacion | Repetir tiro DES. 3 usos/combate. Mr. 3 esquivando por puro panico. |

### Fortitud I (Resistencia basica)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Armadura Natural** | Capa de cera pasiva | +2 PV y +2 DEF. Una fina capa de cera siempre protege a Mr. 3. |
| **Segundo Aliento** | Recuperarse | Recupera 3 VT como accion bonus. |

## Reskinning y Justificacion

### La Doru Doru no Mi como Magia de Tierra
La Fruta de la Cera (Doru Doru no Mi) produce cera que endurece como acero. **Magia de Tierra** es el rango mas apropiado porque:
- La cera endurecida es mecanicamente identica a la piedra (dura, moldeable, usable como barrera)
- **Crear Obstaculo** = muros de cera
- **Muro de Piedra** = Candle Wall
- **Moldear la Tierra** = Doru Doru Arts (escultura libre de cera)
- **Forma de la Montana** = Candle Champion (armadura de cera con piezas que se sacrifican)
- **Invocar Elemental** = Candle Champion golem

La unica diferencia tematica es que la cera deberia ser vulnerable al fuego. Esto se puede implementar como una debilidad del reskin: todo muro/elemental de "cera" tiene vulnerabilidad a dano de fuego (doble dano).

### INT y SAB como stats principales
Mr. 3 es un intelectual que usa su fruta con ingenio, no con fuerza. INT 6 alimenta Mente Desencadenada e Ilusoria. SAB 4 alimenta Tierra y Protectora. Esta distribucion hace que Mr. 3 sea un controlador de campo de batalla, no un combatiente directo.

## Estrategia de Combate

**Fase de preparacion (turno 1):**
1. **Mente Desencadenada** (activar trance)
2. **Moldear la Tierra** (2 acciones, 1 chi) — moldea el campo de batalla con cera
3. **Crear Obstaculo** (1 accion) — cobertura inmediata

**Fase de control (turnos 2+):**
- **Forma de la Montana** (2 acciones, 2 chi) — armadura de cera con piedras defensivas/ofensivas
- **Abrazo de la Tierra** (1 accion, 2 chi) — atrapar enemigos en cera endurecida
- **Muro de Piedra** como reaccion — bloquear ataques

**Combo de encerramiento:**
- Moldear la Tierra + Crear Obstaculo (cerrar escapes) + Abrazo de la Tierra (atrapar) + Tierra Viva (dano de area) = campo de muerte de cera

**Defensivamente:** Muro de Piedra (reaccion), Forma de la Montana (sacrificar piedras), Instinto de Supervivencia (repetir esquivas). Mr. 3 es un controlador que se esconde detras de defensas.

## Feedback del Sistema

1. **Vulnerabilidad al fuego:** La Doru Doru no Mi tiene una debilidad critica al fuego que no esta representada mecanicamente. Sugerencia: declarar que todas las construcciones de "cera" tienen Vulnerabilidad a Fuego (doble dano). Esto crea una debilidad interesante sin necesitar reglas nuevas.

2. **Tierra usa SAB, pero Mr. 3 deberia usar INT:** Tematicamente, Mr. 3 es un genio que manipula cera con intelecto. Que Magia de Tierra use SAB en vez de INT es un desajuste. Sugerencia: permitir que el reskin use INT en lugar de SAB para Magia de Tierra, o aceptar SAB 4 como "intuicion artistica" para la escultura de cera.

3. **Invocar Elemental = Candle Champion:** La sinergia es excelente. Un golem de cera gigante que lucha por Mr. 3 mientras el controla desde atras es exactamente su estilo.

4. **Magia Ilusoria y Protectora sin datos completos:** Este build asume la existencia de habilidades genericas en estos rangos. Seria util detallar sus JSON para que el mapeo sea completo.

5. **Nivel 10 es apropiado:** Mr. 3 es un agente de nivel medio de Baroque Works, peligroso pero no de primer nivel. Su fortaleza es la estrategia, no el poder bruto.

6. **Progresion recomendada:** Tierra a IV para Pilares de la Tierra (trampas de cera elaboradas) y Espinas de Piedra (cera con pinchos). Mente a III para Concentracion Superior (mantener multiples efectos de cera sin riesgo de perder concentracion).
