# Arlong — Nivel 8 (Revisado)
**Raza:** Mediano (reskin Gyojin / Hombre-Pez)

## Estadisticas (Cap: 5)
| FUE | DES | CON | INT | SAB | CAR |
|-----|-----|-----|-----|-----|-----|
| 5   | 3   | 5   | 2   | 3   | 2   |

**Justificacion de stats:**
- **FUE 5 (cap):** Estadistica principal de Estilo Coloso (FUE + Rango) e Ira. Tiro de coloso = 5+3 = 8. Los Gyojin son 10x mas fuertes que los humanos.
- **CON 5 (cap):** Alimenta Fortitud (bonus CON defensivo), PV y VT. Los Gyojin son extremadamente resistentes.
- **SAB 3:** Estadistica principal de Magia de Agua (SAB + Rango). Con R2, tiro de agua = 3+2 = 5. Karate Gyojin basico.
- **DES 3:** Movilidad decente. Arlong no es lento pero tampoco rapido.
- **INT 2 / CAR 2:** Arlong es bruto e intimidante, no carismatico ni intelectual.

## Recursos
- **PV:** 3 + CON(5) + floor((8-1)/3) = 3 + 5 + 2 = **10**
- **VT:** 2 + CON(5) + Nivel(8) = **15**
- **Chi total:** Agua II (2x2=4) + Reflejos I (1x2=2) = **6 chi**
- **Vigor total:** Coloso III (3x2=6) + Fortitud II (2x2=4) + Ira I (1x2=2) = **12 vigor**

> **Nota sobre Chi:** Los JSON del sistema dicen "Rango + 2" para chi. El codigo usa "Rango x 2". Diferencia en este build: Con Rango+2, Agua II daria 4, Reflejos I daria 3 = 7 chi vs 6 chi con Rango x 2. Minor.

## Rangos (9/9 puntos)
| Rango | Nivel | Chi/Vigor | Stat Principal |
|-------|-------|-----------|----------------|
| Estilo Coloso | III | 6 vigor | FUE + Rango |
| Magia de Agua | II | 4 chi | SAB + Rango |
| Fortitud | II | 4 vigor | CON (defensivo) |
| Ira | I | 2 vigor | FUE/CON (innato) |
| Reflejos | I | 2 chi | DES (Esquiva + Rango) |

**Verificacion de puntos:** 3 + 2 + 2 + 1 + 1 = 9 puntos. Nivel 8 = 9 puntos. Correcto.

## Mapeo de Habilidades

### Estilo Coloso III (Fuerza bruta Gyojin)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Ataque Poderoso** | Mordisco de tiburon | +1 dado de dano. Arlong muerde con sus dientes renovables. Declarar antes de atacar. |
| **Golpe Desestabilizador** | Embestida Gyojin | Empuja 1 paso + tropezado (salvacion Fisico). Funciona incluso si paran. Cuesta 1 chi. |
| **Gran Barrido** | Shark On Darts (barrido) | AoE radio corto, +1d6 dano, empuja. 1 vigor. Arlong gira con la nariz como arma. |
| **Guardia Fluida** | Posicion defensiva acuatica | 2 acciones + 1 chi. Ataca como reaccion a cada enemigo que se acerque. Arlong esperando en el agua. |
| **Lanzamiento** | Lanzar agua / rocas | Lanza objeto a distancia media, +1d6 dano. 1 accion + 1 chi. Arlong arrancando pedazos del edificio. |
| **Reposicion Forzosa** | Empujon de agua | Reaccion: si esquivan, salvacion Fisico o desventaja en siguiente defensa. 1 chi. |
| **Golpe Demoledor** | Destruir con los dientes | Rompe escudo/armadura/arma al impactar. 1 chi. Los dientes de Arlong destrozan metal. |
| **Carga Salvaje** | Shark On Darts | Linea media: mueve y ataca a todos en camino, +1d6, empuja y tropieza. 2 chi. LA tecnica emblematica. |
| **Golpe Aturdidor** | Cabezazo de tiburon | Al impactar: Voluntad o aturdido 1 ronda. 2 chi. Arlong usa su nariz como arma de impacto. |

### Magia de Agua II (Karate Gyojin)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Torrente** | Uchimizu (lanzar agua) | 1d6 + SAB a distancia media. Contundente. Ignora resistencia a distancia. |
| **Aguas de la Vida** | Regeneracion acuatica | Cura Rango+2 = 4 VT. Los Gyojin se recuperan mas rapido en el agua. |
| **Niebla Envolvente** | Crear neblina marina | Zona de ceguera. Control del campo de batalla acuatico. |
| **Muro de Agua** | Barrera de agua | PV = Rango x 3 = 6. Inmune a fisico no-magico. Cubierta total. Reaccion defensiva. |
| **Ola Chocante** | Ola de Karate Gyojin | Linea media: 1d6 + SAB, empuja y derriba. Se mueve si concentras. |
| **Tentaculos de Agua** | Control del agua circundante | Rango-1 = 1 escudo + ataque Torrente bonus 1/ronda. Arlong rodeado de agua que lo protege. |

### Fortitud II (Piel Gyojin)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Armadura Natural** | Piel de tiburon | +3 PV y +3 DEF (Rango+1 = 3). Se acumula con armadura. La dureza natural Gyojin. |
| **Segundo Aliento** | Resistencia sobrehumana | Recupera Rango+2 = 4 VT como accion bonus. 1 vigor. |
| **Duro de Pelar** | Cuerpo de tiburon | Resistencia a Sonico, Aturdimiento y Maniobras. Inmune a criticos de Aturdimiento. |
| **Resiliencia** | Absorber el golpe | Reaccion: reduce dano a la mitad. 1 vigor. 1 vez/ronda. |

### Ira I (Odio racial)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Ira de Combate** | Furia contra los humanos | Ventaja en ataques y salvaciones fisicas, +1d6 dano. Max 6 rondas. Al terminar: pierde Vigor = rondas usadas. |
| **Frenesi de Batalla** | Berserker Gyojin | Ventaja en ataques, desventaja en defensa. Estado temporal de agresion total. |

### Reflejos I (Sentidos acuaticos)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Velocidad Superior** | Velocidad submarina | +1 accion/turno. +Rango (1) a iniciativa. Los Gyojin son rapidos en combate. |
| **Instinto de Supervivencia** | Sentidos de tiburon | Repetir tiro de DES. 3 usos/combate (Rango+2). Reflejos de depredador. |

## Reskinning y Justificacion

### Gyojin como raza
No existe una raza acuatica en el sistema. **Mediano** se reskinnea por sus bonificaciones raciales. La verdadera "raza Gyojin" se modela con los rangos: Fortitud (piel dura), Magia de Agua (karate acuatico), y las stats FUE/CON al cap (superioridad fisica inherente).

### Karate Gyojin como Magia de Agua
El Karate Gyojin no es magia en el sentido tradicional — es una arte marcial que manipula el agua del entorno (y la del cuerpo humano). Magia de Agua encaja porque ambas permiten controlar agua para atacar, defenderse y controlar el campo.

### Shark On Darts = Carga Salvaje
La tecnica emblematica de Arlong (lanzarse como un misil con la nariz por delante) se mapea perfectamente a **Carga Salvaje**: movimiento en linea + dano a todos en camino + empujon. Es probablemente la mejor sinergia del build.

## Estrategia de Combate

**Apertura en combate terrestre:**
1. **Ira de Combate** (inicio de combate, sin coste de accion) — Ventaja + 1d6 dano
2. **Ataque Poderoso** (1 accion) + ataque con arma (1 accion) — +2 dados de dano total con Ira
3. **Segundo Aliento** si esta herido (accion bonus, 1 vigor)

**Turno de asalto (5 acciones con Velocidad Superior, 4 base + 1):**
- **Carga Salvaje** (2 chi): linea media, ataca a todos, +1d6, empuja y tropieza
- Seguir con **Ataque Poderoso** + ataque normal al objetivo principal

**Combo devastador:**
- **Ira de Combate** activa + **Frenesi de Batalla** + **Ataque Poderoso** + **Golpe Aturdidor** = Ventaja doble en ataque, +1d6 (Ira) + 1 dado extra (Poderoso) + stun si impacta. Extremadamente agresivo pero desventaja en defensa.

**En agua:** Muro de Agua como defensa, Torrente como hostigamiento, Ola Chocante para controlar posiciones. Arlong es mucho mas peligroso cerca del agua.

## Feedback del Sistema

1. **Falta de raza acuatica:** El mayor hueco. Se necesita una raza "Acuatico" con: respiracion acuatica, velocidad de nado, +1 FUE o CON, vulnerabilidad a fuego en tierra seca (opcional).

2. **SAB 3 limita Magia de Agua:** El tiro de agua de Arlong (3+2 = 5) es mediocre. Esto es tematicamente correcto — Arlong usa fuerza bruta, no tecnica refinada. Pero hace que sus hechizos de agua fallen a menudo contra enemigos fuertes.

3. **Coloso III es la eleccion perfecta:** Carga Salvaje (Shark On Darts), Golpe Demoledor (dientes que destrozan armaduras), Golpe Aturdidor (cabezazos) — todo encaja con el estilo brutal de Arlong.

4. **Ira I vs Ira II:** Con solo R1, Arlong pierde acceso a Resistencia Salvaje (R2), que seria tematicamente perfecta para un Gyojin. Si hay flexibilidad, considerar bajar Reflejos I y subir Ira a II para obtener Resistencia Salvaje y Demostracion Terrorifica (el aura intimidante de Arlong).

5. **Progresion recomendada (niveles 9-12):** Subir Coloso a IV para Secuencia de Golpes y Maestria de Estilo. Agua a III para Prision Acuosa (ahogar enemigos = muy tematico). Fortitud a III para Hasta la Muerte.
