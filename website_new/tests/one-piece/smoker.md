# Smoker — Nivel 12 (Revisado)
**Raza:** Humano

## Estadisticas (Cap: 7)
| FUE | DES | CON | INT | SAB | CAR |
|-----|-----|-----|-----|-----|-----|
| 5   | 4   | 5   | 3   | 4   | 3   |

**Justificacion de stats:**
- **FUE 5:** Estadistica principal de Estilo Coloso (FUE + Rango). Con R3, tiro = 5+3 = 8. Smoker usa una jitte pesada y combate cuerpo a cuerpo agresivo.
- **CON 5:** Alimenta Fortitud (bonus CON defensivo). Smoker es extremadamente resistente y dificil de derribar.
- **DES 4:** Movilidad para Reflejos. Con R2, Esquiva + Rango = 4+2 = 6.
- **SAB 4:** Stat secundaria. Smoker es un Marine experimentado con buen juicio tactico. Tambien alimenta Magia de Aire si usa SAB.
- **INT 3 / CAR 3:** Stats medias. Smoker no es un genio ni un lider carismatico, pero es competente.

*Nota: Magia de Aire no tiene sus habilidades detalladas en el prompt. Se asumen habilidades de control de viento, intangibilidad gaseosa, vuelo y AoE que encajan tematicamente con la Moku Moku no Mi.*

## Recursos
- **PV:** 3 + CON(5) + floor((12-1)/3) = 3 + 5 + 3 = **11**
- **VT:** 2 + CON(5) + Nivel(12) = **19**
- **Chi total:** Aire IV (4x2=8) + Reflejos II (2x2=4) = **12 chi**
- **Vigor total:** Coloso III (3x2=6) + Fortitud III (3x2=6) + Ira I (1x2=2) = **14 vigor**

> **Nota sobre Chi:** JSON: "Rango + 2". Codigo: "Rango x 2". Diferencia significativa aqui: Aire IV con Rango+2 = 6, vs Rango x 2 = 8. Total con Rango+2: 6+4 = 10 chi vs 12 chi con x2. A niveles altos la diferencia se nota.

## Rangos (13/13 puntos)
| Rango | Nivel | Chi/Vigor | Stat Principal |
|-------|-------|-----------|----------------|
| Magia de Aire | IV | 8 chi | SAB/INT + Rango (asumido) |
| Estilo Coloso | III | 6 vigor | FUE + Rango |
| Fortitud | III | 6 vigor | CON (defensivo) |
| Reflejos | II | 4 chi | DES (Esquiva + Rango) |
| Ira | I | 2 vigor | FUE/CON (innato) |

**Verificacion de puntos:** 4 + 3 + 3 + 2 + 1 = 13 puntos. Nivel 12 = 13 puntos. Correcto.

## Mapeo de Habilidades

### Magia de Aire IV (Moku Moku no Mi — Fruta del Humo)
*Nota: Las habilidades especificas de Magia de Aire no fueron detalladas. Se asume el siguiente mapeo basado en la estructura estandar de rangos elementales:*

| Tecnica de One Piece | Habilidad Asumida (Aire) | Justificacion |
|---|---|---|
| White Blow (punetazo de humo) | Ataque basico de aire R1 | Proyectil de humo/viento a distancia |
| White Out (expansion de humo) | AoE de viento/gas R2 | Expansion masiva de humo que ciega y empuja |
| White Snake (serpiente de humo) | Agarre/restriccion R3 | Tentaculo de humo que atrapa al objetivo |
| White Launcher (propulsion) | Vuelo/propulsion R2-3 | Smoker se convierte en humo para volar |
| Intangibilidad Logia | Forma gaseosa/eterea R3+ | Ataques fisicos pasan a traves de Smoker |
| White Vine (captura masiva) | Control de area R4 | Humo que atrapa a multiples enemigos |

### Estilo Coloso III (Jitte de Kairoseki)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Ataque Poderoso** | Golpe con jitte | +1 dado de dano. El arma pesada de Smoker aplastando. |
| **Golpe Desestabilizador** | Empujon con jitte | Empuja + tropeza. Salvacion Fisico. 1 chi. |
| **Gran Barrido** | Barrido con jitte | AoE radio corto, +1d6, empuja. 1 vigor. |
| **Guardia Fluida** | Posicion defensiva | 2 acciones + 1 chi. Ataca a cada enemigo que se acerque. |
| **Lanzamiento** | Lanzar jitte | Lanza arma a distancia media, +1d6. 1 accion + 1 chi. |
| **Reposicion Forzosa** | Contraataque de humo | Reaccion: fuerza movimiento si esquivan. 1 chi. |
| **Golpe Demoledor** | Jitte de Kairoseki (anti-DF) | Rompe escudo/armadura. 1 chi. La jitte de Kairoseki anula poderes de Fruta del Diablo — se reskinnea como "romper defensas magicas". |
| **Carga Salvaje** | White Launcher + jitte | Linea media, ataca a todos, +1d6, empuja. 2 chi. Smoker se propulsa con humo y golpea con la jitte. |
| **Golpe Aturdidor** | Golpe de Kairoseki | Aturde 1 ronda (Voluntad). 2 chi. El contacto con Kairoseki debilita a usuarios de DF. |

### Fortitud III (Resistencia de Marine veterano)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Armadura Natural** | Constitucion de Marine | +4 PV y +4 DEF (Rango+1 = 4). |
| **Segundo Aliento** | Determinacion | Recupera Rango+2 = 5 VT. 1 vigor. |
| **Duro de Pelar** | Veterano de combate | Resistencia a Sonico, Aturdimiento, Maniobras. |
| **Resiliencia** | Absorber golpes | Reaccion: dano a la mitad. 1 vigor. |
| **Hasta la Muerte** | Nunca rendirse | Lucha a 0 PV con tiros de muerte. Heridas reducen gravedad. El espiritu de Smoker: jamas abandona. |
| **Constitucion Ferrea** | Cuerpo de acero | Resistencia a Aflicciones y Necrotico. Inmune a criticos de Enfermedad. |

### Reflejos II (Velocidad de combate)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Velocidad Superior** | Velocidad de Logia | +1 accion/turno, +Rango (2) a iniciativa. |
| **Instinto de Supervivencia** | Reflejos de Marine | Repetir tiro DES. 4 usos/combate (Rango+2). |
| **Esquiva Asombrosa** | Intangibilidad parcial | Esquivar ataques sorpresa (con desventaja). Smoker se disuelve parcialmente en humo. |
| **Evasion** | Disipacion de humo | Al fallar Esquiva: mitad de dano, evita estados. 1 chi. El humo absorbe parte del impacto. |

### Ira I (Furia de la Justicia)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Ira de Combate** | Determinacion imparable | Ventaja en ataques y salvaciones fisicas, +1d6. Smoker enfurecido contra criminales. Max 6 rondas. |
| **Frenesi de Batalla** | Asalto total | Ventaja en ataques, desventaja en defensa. 1 ronda. |

## Reskinning y Justificacion

### La Moku Moku no Mi como Magia de Aire
La Fruta del Humo es una Logia de tipo aire. **Magia de Aire** es la eleccion natural porque:
- El humo es mecanicamente muy similar al viento/gas en el sistema
- La intangibilidad Logia se modela con la forma gaseosa de alto rango
- El vuelo (White Launcher) = habilidades de vuelo del rango de Aire
- Los ataques de area (White Out) = AoE de viento/gas

### Jitte de Kairoseki como arma unica
La jitte de Smoker esta hecha de Kairoseki (piedra marina), que anula los poderes de las Frutas del Diablo. En el sistema, **Golpe Demoledor** (romper armaduras/escudos) + **Golpe Aturdidor** (aturdir) representan mecanicamente este efecto anti-magia. Una regla de reskin sugerida: la jitte de Smoker otorga +2 al dano contra usuarios de magia y puede "romper" efectos magicos activos al impactar.

### Dual-style: cuerpo a cuerpo + elemental
Smoker es unico porque combina magia elemental (humo) con combate fisico directo (jitte). El build refleja esto con Coloso III + Aire IV — puede alternar entre ataques magicos a distancia y golpes devastadores cuerpo a cuerpo.

## Estrategia de Combate

**Turno tipico (4 acciones con Velocidad Superior):**
1. Habilidad de Aire (ataque/control de area) — 1-2 acciones
2. **Ataque Poderoso** + ataque con jitte — 2 acciones
3. **Segundo Aliento** si necesario — accion bonus

**Apertura agresiva:**
- **Ira de Combate** + **Carga Salvaje** (propulsion de humo + jitte) = linea de destruccion con Ventaja y +1d6 (Ira) + 1d6 (Carga)

**Control de campo:**
- AoE de humo (Aire) para cegar y controlar posiciones
- **Guardia Fluida** en chokepoints — ataca a cada enemigo que se acerque

**Defensivamente:**
- Fortitud III es extremadamente resistente: Armadura Natural (+4 PV/DEF), Resiliencia (mitad de dano), Hasta la Muerte (luchar a 0 PV), Constitucion Ferrea (resistir aflicciones)
- Reflejos II: Esquiva Asombrosa + Evasion = dificil de danar con magia o sorpresas
- Ira de Combate otorga Ventaja en salvaciones fisicas

## Feedback del Sistema

1. **Magia de Aire no detallada:** Este build depende criticamente de habilidades de Magia de Aire que no fueron especificadas en el prompt. La intangibilidad Logia es la habilidad mas importante para Smoker y debe existir en R3-R4 del rango de Aire. Sin ella, el build pierde su aspecto mas iconico.

2. **Intangibilidad Logia:** El problema universal de las Logia en Raldamain. Se necesita una mecanica que permita "ataques fisicos pasan a traves del cuerpo" pero que sea contrarrestable por Haki/Chi/magia. Sugerencia: habilidad pasiva R3+ que otorga Inmunidad a dano fisico no-magico, anulable por Proyeccion de Chi o ataques magicos.

3. **Kairoseki como material:** El sistema necesita un material "Kairoseki" que otorgue: supresion de magia al contacto, bonus contra usuarios de Frutas del Diablo, y debilidad para usuarios de Frutas que lo toquen. Actualmente no hay equivalente directo.

4. **Nivel 12 es correcto:** Smoker es un Comodoro fuerte pero claramente inferior a los Almirantes (que serian nivel 18+). Puede pelear con piratas del Grand Line pero pierde contra los verdaderamente poderosos.

5. **Coloso usa vigor, Aire usa chi:** Esto crea una buena distribucion de recursos — Smoker no agota un solo pool. Pero tambien significa que necesita administrar dos recursos diferentes, lo cual annade complejidad tactica.

6. **Progresion recomendada:** Aire a V para intangibilidad completa y ataques devastadores. Coloso a IV para Maestria de Estilo y Secuencia de Golpes. Ira a II para Resistencia Salvaje (reduccion de dano pasiva = dureza de Logia parcial).
