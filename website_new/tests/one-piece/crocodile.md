# Crocodile (Sir Crocodile) — Nivel 14 (Revisado)
**Raza:** Humano

## Estadisticas (Cap: 7)
| FUE | DES | CON | INT | SAB | CAR |
|-----|-----|-----|-----|-----|-----|
| 4   | 5   | 4   | 6   | 7   | 4   |

**Justificacion de stats:**
- **SAB 7 (cap):** Estadistica principal de Magia de Tierra (SAB + Rango). Con R5, tiro = 7+5 = 12. La Suna Suna no Mi es devastadora — Crocodile es un maestro absoluto de la arena.
- **INT 6:** Alimenta Mente Desencadenada (INT + Rango). Con R3, tiro mental = 6+3 = 9. Crocodile es un estratega brillante, lider de Baroque Works.
- **DES 5:** Estadistica principal de Estilo Asesino (DES + Rango). Con R3, tiro = 5+3 = 8. El gancho envenenado de Crocodile.
- **FUE 4 / CON 4:** Buenas stats fisicas. Crocodile es fuerte pero no un bruto.
- **CAR 4:** Presencia intimidante pero no excepcional. Crocodile lidera por miedo e inteligencia, no carisma puro.

## Recursos
- **PV:** 3 + CON(4) + floor((14-1)/3) = 3 + 4 + 4 = **11**
- **VT:** 2 + CON(4) + Nivel(14) = **20**
- **Chi total:** Tierra V (5x2=10) + Mente III (3x2=6) + Reflejos II (2x2=4) = **20 chi**
- **Vigor total:** Asesino III (3x2=6) + Fortitud II (2x2=4) = **10 vigor**

> **Nota sobre Chi:** JSON: "Rango + 2". Codigo: "Rango x 2". Diferencia notable: Tierra V con Rango+2 = 7, vs Rango x 2 = 10. Son 3 puntos de diferencia solo en un rango. Total con Rango+2: 7+5+4 = 16 chi vs 20 chi con x2. **La discrepancia es muy relevante a este nivel.**

## Rangos (15/15 puntos)
| Rango | Nivel | Chi/Vigor | Stat Principal |
|-------|-------|-----------|----------------|
| Magia de Tierra | V | 10 chi | SAB + Rango |
| Estilo Asesino | III | 6 vigor | DES + Rango |
| Mente Desencadenada | III | 6 chi | INT + Rango |
| Fortitud | II | 4 vigor | CON (defensivo) |
| Reflejos | II | 4 chi | DES (Esquiva + Rango) |

**Verificacion de puntos:** 5 + 3 + 3 + 2 + 2 = 15 puntos. Nivel 14 = 15 puntos. Correcto.

## Mapeo de Habilidades

### Magia de Tierra V (Suna Suna no Mi — Fruta de la Arena)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Pedrada** | Sables (cuchillas de arena) | 2d10 + SAB a distancia media (d10 por pasivo R5). Arena comprimida como proyectil cortante. |
| **Crear Obstaculo** | Barrera de arena | Cubierta instantanea. Arena solidificada. |
| **Terratemblor** | Desert Encierro (aprision de arena) | AoE 2d10 + tropezado. Arena que erupciona y atrapa. Con pasivo R3, hechizos R1 cuestan -1 accion. |
| **Muro de Piedra** | Muro de arena compacta | PV = Rango x 3 = 15. Reaccion defensiva. Con pasivo R4, cuestan -1 accion (R2). |
| **Tierra Viva** | Pesado Desert Spada | 3d10 + SAB en cilindro mediano. Erupciones devastadoras de arena. Con pasivo R4, cuesta -1 accion. |
| **Moldear la Tierra** | Desert Girasole (preparacion) | Modifica terreno en radio grande. Ventaja en Tierra. Crocodile transformando el terreno en desierto. |
| **Abrazo de la Tierra** | Desert Encierro | Agarra con arena. Resistencia de Muro. La arena comprime y deshidrata al atrapado. |
| **Forma de la Montana** | Escudo de arena | Rango-1 = 4 piedras flotantes. Escudos de arena que detienen ataques o se lanzan como proyectiles. |
| **Invocar Elemental de Tierra** | Tormenta de arena viviente | Elemental de arena que lucha autonomamente. A R5 el elemental escala. |
| **Pilares de la Tierra** | Trampas de arena | 6 pilares que elevan criaturas (DES para evitar). Crocodile manipulando el terreno debajo de los enemigos. |
| **Derrumbamiento** | Desert Sunlight | Derrumba estructura. Dano de Tierra Viva + agarre. Edificios y terreno colapsando en arena. |
| **Espinas de Piedra** | Campo de arena cortante | AoE radio medio + terreno dificil + ataque bonus de espina 1/ronda. Arena con filo lacerante. |
| **Terremoto** | Ground Secco (desecacion masiva) | 3 acciones + 3 chi. Sismo continuo en radio grande. Tropezado constante, terreno dificil, derrumbes. Rondas sucesivas otorgan hechizos gratis: R2 Terratemblor/Obstaculo, R4 Tierra Viva/Espinas/Derrumbamiento, R7 Brecha. **LA habilidad definitiva de Crocodile.** |
| **Brecha** | Desert Girasole (fisura) | 3 acciones + 3 chi. Fisura: 4d10 + SAB + tropezado. Destruye estructuras. La arena se abre en una grieta masiva que traga a los enemigos. |
| **Bastion de Piedra** | Fortaleza de arena / Golem gigante | 3 acciones + 3 chi. Fortaleza (4 muros de Rango x 3 = 15 PV cada uno) O Elemental gigante (+40 VT, Stats = Magia Tierra). Crocodile creando un titan de arena. |
| Pasivo R3 | Control refinado | Dados suben a d8. Hechizos R1 cuestan -1 accion. |
| Pasivo R4 | Dominio del desierto | Hechizos R2 cuestan -1 accion. |
| Pasivo R5 | Maestro absoluto | Dados suben a d10. Hechizos R3 cuestan -1 accion. |

### Estilo Asesino III (Gancho envenenado y combate sucio)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Apuntar Ataque** | Preparar emboscada | +4 al ataque (bonus R3). Crocodile esperando el momento perfecto. |
| **Ataque Furtivo** | Golpe del gancho | +1d6 + herida leve. 1 chi. Ataque traicionero con el gancho. |
| **Presionar Defensas** | Intimidacion + finta | Desventaja en defensa enemiga. 1 chi. La presencia opresiva de Crocodile. |
| **Clavar Arma** | Gancho envenenado | +1d6 + enfermado 1 ronda. 1 chi. El veneno del gancho de Crocodile. Perfectamente tematico. |
| **Secuencia de Punaladas** | Doble golpe de gancho | Doble ataque, defensa unica. 1 chi. |
| **Ataque Triple** | Ataque multiple | 3 objetivos. 1 chi. Crocodile barriendo con arena y gancho. |
| **Golpe Penetrante** | Gancho que perfora armadura | Ignora armadura, cuenta como magico. 2 chi. El gancho de Crocodile penetra defensas. |
| **Paso del Asesino** | Aparicion repentina de arena | Movimiento bonus sin aperturas + desventaja enemiga. 1 chi. Crocodile se materializa de la arena detras del enemigo. |
| **Cuchillada** | Maestria de combate | Pasiva. Parada + Esquiva en todos los tiros defensivos + movimiento bonus. Crocodile es un veterano del Nuevo Mundo. |

### Mente Desencadenada III (Genio estrategico)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Mente Desencadenada** | Modo planificacion | Trance: Ventaja mental, +1d6 mental. Max 6 rondas. Crocodile calculando cada movimiento. |
| **Agilidad Mental** | Experiencia vasta | +5 niveles de talento (Rango+2). Crocodile domina espionaje, politica, comercio. |
| **Poder del Dolor** | Voluntad de hierro | Ignora heridas leves/medias. Resistencia a Aflicciones. La determinacion de alguien que perdio un brazo contra Whitebeard y siguio adelante. |
| **Conocimiento Arcano** | Conocimiento del Nuevo Mundo | 2 hechizos R1 adicionales usando INT+Rango. Crocodile conoce secretos antiguos. |
| **Concentracion Superior** | Control absoluto | No pierde concentracion por dano o efectos negativos. **Critico para su estrategia: Crocodile mantiene Terremoto incluso mientras pelea cuerpo a cuerpo.** |
| **Poder de la Locura** | Sacrificar cordura por poder | Reduce 2 Cordura para recuperar 1 Chi. Max 3/ronda. Crocodile empujando sus limites por ambicion. |

### Fortitud II (Resistencia de Shichibukai)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Armadura Natural** | Cuerpo endurecido | +3 PV y +3 DEF (Rango+1 = 3). |
| **Segundo Aliento** | Determinacion | Recupera Rango+2 = 4 VT. 1 vigor. |
| **Duro de Pelar** | Veterano del Grand Line | Resistencia Sonico/Aturdimiento/Maniobras. Inmune a criticos de Aturdimiento. |
| **Resiliencia** | Absorber el impacto | Reaccion: mitad dano. 1 vigor. 1 vez/ronda. |

### Reflejos II (Velocidad Logia)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Velocidad Superior** | Reflejos de Logia | +1 accion/turno, +2 iniciativa. |
| **Instinto de Supervivencia** | Experiencia de combate | Repetir DES, 4 usos (Rango+2). |
| **Esquiva Asombrosa** | Intangibilidad de arena | Esquivar ataques sorpresa (con desventaja). El cuerpo de arena deja pasar ataques. |
| **Evasion** | Disipacion parcial | Al fallar Esquiva: mitad dano, evita estados, desenganche bonus. 1 chi. La arena absorbe impactos. |

## Reskinning y Justificacion

### La Suna Suna no Mi como Magia de Tierra
La Fruta de la Arena es una Logia elemental. **Magia de Tierra** es la eleccion perfecta porque:
- La arena ES tierra en forma granular — el reskin es casi literal
- Todos los hechizos de Tierra funcionan como habilidades de arena con reskin minimo
- **Terremoto** = Ground Secco (la desecacion masiva que hunde ciudades)
- **Brecha** = Desert Girasole (la fisura que traga edificios)
- **Bastion de Piedra** como golem = la tormenta de arena gigante de Crocodile
- Los pasivos de reduccion de coste de accion (R3/R4/R5) representan el dominio creciente de Crocodile

### Deshidratacion como efecto especial
La habilidad mas iconica de Crocodile (deshidratar cosas al tocarlas) no tiene equivalente directo. Sugerencia de reskin: **Abrazo de la Tierra** causa "deshidratacion" en vez de "aplastamiento" — mecanicamente identico (dano + agarre) pero narrativamente distinto. Adicionalmente, **Clavar Arma** (enfermado) puede representar la deshidratacion parcial por contacto con el gancho.

### El gancho envenenado
Estilo Asesino modela perfectamente el gancho de Crocodile:
- **Clavar Arma** (enfermedad) = veneno del gancho
- **Golpe Penetrante** (ignorar armadura) = el gancho perforando defensas
- **Paso del Asesino** (aparecer de la arena) = materializacion Logia
- **Cuchillada** (parar+esquivar+moverse) = veterania de combate del Nuevo Mundo

## Estrategia de Combate

**Fase 1: Dominacion del campo (turno 1)**
1. **Mente Desencadenada** (activar trance)
2. **Moldear la Tierra** (2 acciones, 1 chi) — convertir el campo en desierto, Ventaja en Tierra
3. **Crear Obstaculo** (1 accion, gratis con pasivo R3) — cobertura

**Fase 2: Terremoto (turno 2)**
1. **Terremoto** (3 acciones, 3 chi) — sismo continuo, tropezado constante, terreno dificil
2. Con **Concentracion Superior**, mantiene Terremoto incluso al recibir dano

**Fase 3: Destruccion (turnos 3+)**
- Terremoto otorga hechizos gratis por ronda:
  - R2: Terratemblor gratis = AoE de arena constante
  - R4: Tierra Viva/Espinas/Derrumbamiento gratis = destruccion progresiva
  - R7: Brecha gratis = fisura que traga todo
- Mientras tanto, ataca cuerpo a cuerpo: **Paso del Asesino** + **Golpe Penetrante** + **Clavar Arma** = aparece de la arena, ignora armadura, envenena

**Combo letal:**
Terremoto (activo) + Abrazo de la Tierra (atrapar) + Espinas de Piedra (AoE cortante) + Paso del Asesino + Ataque Furtivo + Clavar Arma = enemigo atrapado en arena cortante mientras Crocodile lo apunala con gancho envenenado desde la espalda

**Defensivamente:**
- Cuchillada (Parada+Esquiva en cada defensa)
- Esquiva Asombrosa + Evasion (intangibilidad de arena)
- Muro de Piedra como reaccion (15 PV)
- Forma de la Montana (4 escudos de arena)
- Resiliencia (mitad dano)

## Feedback del Sistema

1. **Intangibilidad Logia (problema recurrente):** Al igual que con Smoker, Crocodile deberia ser intangible a ataques fisicos no-magicos. La combinacion de Reflejos II (Esquiva Asombrosa + Evasion) simula esto parcialmente, pero no es una inmunidad real. Se necesita una mecanica Logia para el sistema.

2. **Deshidratacion sin mecanica directa:** El toque deshidratante de Crocodile es su habilidad mas iconica y no tiene equivalente. Sugerencia: crear un efecto "Deshidratacion" como Afliccion que reduce VT maximo progresivamente (similar a Enervacion de Nigromancia pero con dano de Tierra).

3. **Terremoto + Concentracion Superior = combinacion devastadora:** Esta sinergia es extremadamente poderosa. Crocodile mantiene un Terremoto permanente (que otorga hechizos gratis cada ronda) sin poder perder la concentracion. El DM debe considerar que Terremoto tiene costo alto (3 acciones + 3 chi) y que Crocodile no puede hacer mucho mas en el turno en que lo activa.

4. **Nivel 14 es correcto para pre-timeskip:** Crocodile pre-timeskip es un Shichibukai derrotado por Luffy en Alabasta. Nivel 14 lo coloca como un combatiente de elite pero por debajo de los Yonkou y Almirantes.

5. **SAB 7 como stat principal:** Tierra usando SAB en vez de INT es ligeramente contra-intuitivo para Crocodile (que es mas intelectual que sabio), pero funciona porque SAB alimenta Tierra consistentemente en el sistema y se puede interpretar como "intuicion del desierto".

6. **Progresion post-timeskip (nivel 16+):** Tierra a VI para Lluvia de Meteoritos (rocas de arena masivas). Asesino a IV para Maestria de Arma y Furia Asesina. Mente a IV para Sentido Arcano y Psique Retorcida. Fortitud a III para Hasta la Muerte.
