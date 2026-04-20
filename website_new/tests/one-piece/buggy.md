# Buggy el Payaso — Nivel 6 (Revisado)
**Raza:** Humano

## Estadisticas (Cap: 5)
| FUE | DES | CON | INT | SAB | CAR |
|-----|-----|-----|-----|-----|-----|
| 2   | 4   | 3   | 3   | 2   | 5   |

**Justificacion de stats:**
- **INT 3:** Estadistica principal de Magia Espacial (INT + Rango). A nivel 6 con R2, su tiro espacial es 3+2 = 5.
- **DES 4:** Estadistica principal de Estilo Asesino (DES + Rango). Con R2, su tiro de ataque es 4+2 = 6.
- **CAR 5:** Refleja el carisma absurdo de Buggy, su capacidad de atraer seguidores y su personalidad teatral. Util para talentos sociales.
- **CON 3:** Supervivencia basica. Contribuye a PV y VT.
- **FUE 2 / SAB 2:** Buggy no es fuerte ni sabio. Stats de descarte.

## Recursos
- **PV:** 3 + CON(3) + floor((6-1)/3) = 3 + 3 + 1 = **7**
- **VT:** 2 + CON(3) + Nivel(6) = **11**
- **Chi total:** Espacial II (2x2=4) + Asesino II (2x2=4) + Reflejos I (1x2=2) + Duelista I (1x2=2) + Fortitud I (vigor, no chi) = **12 chi**
- **Vigor total:** Fortitud I (1x2=2) + Duelista I (1x2=2) = **4 vigor**

> **Nota sobre Chi:** Los JSON del sistema dicen "Rango + 2" para la reserva de chi. Sin embargo, el codigo fue modificado para usar "Rango x 2". En esta build usamos Rango x 2 (la regla house rule vigente). Si se aplicara Rango + 2: Espacial II daria 4, Asesino II daria 4, Reflejos I daria 3, Duelista I daria 3 = 14 chi. La diferencia es menor a nivel bajo, pero crece significativamente a niveles altos.

## Rangos (7/7 puntos)
| Rango | Nivel | Chi/Vigor | Stat Principal |
|-------|-------|-----------|----------------|
| Magia Espacial | II | 4 chi | INT + Rango |
| Estilo Asesino | II | 4 chi | DES + Rango |
| Reflejos | I | 2 chi | DES (Esquiva + Rango) |
| Estilo Duelista | I | 2 chi | FUE o DES + Rango |
| Fortitud | I | 2 chi | CON (defensivo) |

**Verificacion de puntos:** 2 + 2 + 1 + 1 + 1 = 7 puntos. Nivel 6 = 7 puntos disponibles. Correcto.

## Mapeo de Habilidades

### Magia Espacial II (Bara Bara no Mi)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Salto Espacial** | Bara Bara Emergency Escape | Teletransporte 1 paso. Como reaccion, reduce dano a la mitad y se mueve. Representa separar el cuerpo para esquivar cortes. |
| **Portal Menor** | Bara Bara no Mi (mano flotante) | Portal pequeno (tamano mano) a distancia media. Buggy ataca con cuchillos a traves del portal = punetazos/apunaladas flotantes. |
| **Bolsillo Interdimensional** | Esconder bombas/armas | Guarda objetos en dimension de bolsillo. Las Muggy Balls y cuchillos ocultos de Buggy. |
| **Puerta Dimensional** | Bara Bara Festival | Portal tamano humano. Buggy envia partes enteras de su cuerpo a distancia lejana. |
| **Ancla Dimensional** | N/A (utilidad) | Impide teletransporte enemigo. Uso situacional. |
| **Distorsion Espacial** | Bara Bara: Desplazamiento | Teletransporta enemigo 1 paso. Interrumpe acciones. Buggy separa el espacio alrededor del enemigo para desorientarlo. |

### Estilo Asesino II (Cuchillos y trampas)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Apuntar Ataque** | Preparar emboscada | +2 al siguiente ataque. Buggy apunta con precision sus cuchillos. |
| **Ataque Furtivo** | Punal traicionero | +1d6 dano + herida leve. El estilo cobarde y oportunista de Buggy. |
| **Presionar Defensas** | Truco de circo / finta | Desventaja en defensa enemiga. Los trucos teatrales de Buggy distraen al oponente. |
| **Clavar Arma** | Cuchillo clavado | +1d6 y enfermado. Buggy clava un cuchillo que queda incrustado. |
| **Secuencia de Punaladas** | Bara Bara no Mi + cuchillos | Doble ataque, defensa unica. Manos separadas apunalando desde dos angulos. |
| **Ataque Triple** | Ataque con tres manos | Ataca a 3 objetivos. Buggy envia multiples extremidades con cuchillos. |

### Reflejos I (Instinto de supervivencia)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Velocidad Superior** | Reflejos de pirata veterano | +1 accion/turno, +Rango a iniciativa. Buggy es sorprendentemente rapido cuando su vida peligra. |
| **Instinto de Supervivencia** | "Plot armor" de Buggy | Repetir tiro de DES. Rango+2 = 3 usos/combate. La suerte absurda de Buggy. |

### Estilo Duelista I (Esgrima con dagas)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Destreza Defensiva** | Parar con cuchillos | Parada + Esquiva, quedarse con el mejor. Buggy para y esquiva simultaneamente. |
| **Truco de Espada** | Maniobra sucia | Maniobra bonus (derribo, paso rapido, etc.). Los trucos sucios tipicos de Buggy. |

### Fortitud I (Dureza improbable)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Armadura Natural** | Resistencia Gyojin/pirata | +2 PV y +2 DEF (Rango+1 = 2). Buggy sobrevive a cosas que matarian a otros. |
| **Segundo Aliento** | Recuperarse del castigo | Recupera Rango+2 = 3 VT como accion bonus. Buggy siempre se levanta. |

## Reskinning y Justificacion

### La Bara Bara no Mi como Magia Espacial
La Bara Bara no Mi (Fruta de la Division) se modela con **Magia Espacial** porque ambas comparten el mismo concepto fundamental: manipular la posicion de objetos y partes en el espacio. Cada "teletransporte" es Buggy separando y moviendo una parte de su cuerpo. Los "portales" representan los puntos de conexion entre sus partes separadas.

**Limitacion importante:** El sistema no tiene una habilidad que represente directamente la "inmunidad al corte" de Buggy. La combinacion de **Salto Espacial** (reducir/evitar dano como reaccion), **Destreza Defensiva** (parar+esquivar) y **Instinto de Supervivencia** (repetir esquivas) simula esta capacidad parcialmente, pero no es una inmunidad verdadera.

### CAR 5 como stat social
Aunque CAR no alimenta directamente ninguno de sus rangos de combate, es la stat mas alta de Buggy porque su verdadero poder es social. CAR 5 a nivel 6 significa que Buggy es excepcional en Intimidar, Persuadir y Liderazgo — exactamente como en la serie, donde su mayor habilidad es convencer a la gente de seguirlo.

## Estrategia de Combate

**Turno tipico (4 acciones con Velocidad Superior):**
1. **Portal Menor** (1 accion) — abre portal a distancia media
2. **Apuntar Ataque** (1 accion) — +2 al ataque
3. **Ataque con cuchillo a traves del portal** (1 accion) con **Ataque Furtivo** (1 chi) — +1d6 dano + herida leve
4. **Salto Espacial** (1 reacck, 1 chi) — reposicionarse

**Combo ofensivo:** Presionar Defensas (1 chi) + Secuencia de Punaladas (1 chi) = desventaja en defensa + doble ataque. Costoso pero efectivo contra un objetivo unico.

**Defensivamente:** Salto Espacial como reaccion (reduce dano a la mitad), Instinto de Supervivencia (3 repeticiones), Destreza Defensiva (parar+esquivar). Buggy es dificil de golpear pero fragil si lo atrapan.

## Feedback del Sistema

1. **Inmunidad al corte:** El problema mas grande. Buggy deberia ser inmune a dano cortante, pero no hay mecanismo para esto. Sugerencia: crear una habilidad pasiva de Magia Espacial R1 tipo "Cuerpo Fragmentado: Inmunidad a dano cortante. No funciona contra ataques magicos o de area."

2. **Magia Espacial usa INT, pero Buggy tiene INT 3:** Esto limita su efectividad magica (tiro = 3+2 = 5). Funciona tematicamente porque Buggy no domina bien su fruta. A nivel mas alto, necesitaria subir INT o aceptar que sus hechizos espaciales seran menos efectivos que los de un mago dedicado.

3. **Sinergia Asesino + Espacial:** La combinacion funciona excelentemente. Portal Menor + Ataque Furtivo permite ataques a distancia con bonus de sigilo, simulando las manos flotantes con cuchillos.

4. **Nivel 6 es apropiado:** Buggy es un pirata veterano del East Blue pero claramente inferior a los combatientes del Grand Line. Su versatilidad compensa su falta de poder bruto.

5. **Progresion recomendada (niveles 7-10):** Subir Magia Espacial a III para obtener Brecha Espacial (ataques que ignoran barreras = poder de la fruta mejorado) y el pasivo de R1 gratis. Considerar Magia Ilusoria I para trucos de circo si hay puntos disponibles.
