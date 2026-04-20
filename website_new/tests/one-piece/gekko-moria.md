# Gekko Moria — Nivel 16 (Revisado)
**Raza:** Humano (tamano grande, reskin)

## Estadisticas (Cap: 8)
| FUE | DES | CON | INT | SAB | CAR |
|-----|-----|-----|-----|-----|-----|
| 5   | 3   | 5   | 4   | 4   | 8   |

**Justificacion de stats:**
- **CAR 8 (cap):** Estadistica principal de Magia Sombria (CAR + Rango = 8+6 = 14) y Nigromancia (CAR + Rango = 8+5 = 13). Moria es un maestro absoluto de la manipulacion de sombras. Su poder crece con CAR porque la magia sombria y la nigromancia se alimentan de la voluntad y presencia del lanzador.
- **FUE 5:** Moria es fisicamente grande y fuerte. No es su enfoque principal pero complementa Shadow Asgard y el combate cuerpo a cuerpo de emergencia.
- **CON 5:** Resistencia. Moria soporto golpes de Luffy en Gear Second y sobrevivio a la masacre de Kaido contra su tripulacion.
- **INT 4 / SAB 4:** Inteligencia y astucia moderadas. Moria planeo la operacion de Thriller Bark con detalle, pero no es un genio de nivel Crocodile.
- **DES 3:** Moria es lento y perezoso. Su debilidad principal en combate directo.

## Recursos
- **PV:** 3 + CON(5) + floor((16-1)/3) = 3 + 5 + 5 = **13**
- **VT:** 2 + CON(5) + Nivel(16) = **23**
- **Chi total:** Sombria VI (6x2=12) + Nigromancia V (5x2=10) + Mente III (3x2=6) + Reflejos I (1x2=2) = **30 chi**
- **Vigor total:** Fortitud II (2x2=4) = **4 vigor**

> **Nota sobre Chi:** JSON: "Rango + 2". Codigo: "Rango x 2". **Discrepancia enorme a este nivel.** Sombria VI: Rango+2 = 8 vs x2 = 12 (diferencia de 4). Nigromancia V: Rango+2 = 7 vs x2 = 10 (diferencia de 3). Mente III: Rango+2 = 5 vs x2 = 6 (dif 1). Reflejos I: Rango+2 = 3 vs x2 = 2 (a favor de Rango+2 aqui). Total: Rango+2 = 23 chi vs Rango x2 = 30 chi. **Diferencia de 7 puntos de chi.** Esto afecta drasticamente la capacidad de Moria de usar Eclipse de Sacrificio (5 chi) y Apocalipsis de la No-muerte (5 chi) en el mismo combate.

> **Nota sobre Reflejos:** Segun el JSON de Reflejos, este rango usa Chi (no Vigor). Se contabiliza como chi.

## Rangos (17/17 puntos)
| Rango | Nivel | Chi/Vigor | Stat Principal |
|-------|-------|-----------|----------------|
| Magia Sombria | VI | 12 chi | CAR + Rango |
| Nigromancia | V | 10 chi | CAR + Rango |
| Mente Desencadenada | III | 6 chi | INT + Rango |
| Fortitud | II | 4 vigor | CON (defensivo) |
| Reflejos | I | 2 chi | DES (Esquiva + Rango) |

**Verificacion de puntos:** 6 + 5 + 3 + 2 + 1 = 17 puntos. Nivel 16 = 17 puntos. Correcto.

## Mapeo de Habilidades

### Magia Sombria VI (Kage Kage no Mi — Fruta de las Sombras)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Toque Drenador** | Robar sombra (parcial) | 1 accion. 1d10 + Rango Frio (d10 por pasivo R5). Reduce VT/PV maximo (Afliccion 1). Moria drenando la sombra del objetivo. |
| **Tajo Umbrio** | Brick Bat (murcilagos cortantes) | 1 accion. 1d10 + Rango Frio a distancia media. Reduce VT/PV max. Los murcilagos de sombra de Moria. |
| **Crear Oscuridad** | Zona de sombras | 2 acciones + 1 chi. Esfera que ciega y otorga ocultamiento. Apaga luces y disipa Vida de rango menor. |
| **Bola Sombra** | Shadow Bat Blast | 1+ acciones + 1 chi. AoE 1d10 + CAR Frio. Cargable: +1d10 y +1 paso radio por cada 2 acciones (max 4). Requiere oscuridad para cargar. |
| **Capullo Sombrio** | Shadow's Asgard (parcial) | 1 accion + 1 chi. VT temporal = Rango x 3 = 18. Inmune a Toque. Ocultamiento. Enemigos adyacentes: 1d10 + Rango Frio + reduccion vital. Moria envuelto en sombras protectoras. |
| **Oscuridad Devoradora** | Brick Bat: Agarre | 1 accion + 1 chi. Solidifica sombra para atrapar. 1d10 + Rango Frio + Enredado. Concentracion. |
| **Tentaculos de Oscuridad** | Shadow's Asgard (tentaculos) | 2 acciones + 2 chi. AoE radio corto: 1d10 + CAR Frio. Agarra objetivos (Heroismo/Atletismo). Agarrados sufren dano recurrente. Concentracion. |
| **Maldicion de Shade** | Robo de sombra (completo) | 2 chi. Maldice al impactar con ataque Sombrio. Impide curacion/cordura. Empeora progresivamente: 1) Sin moral, 2) Exhausto, 3) Catatonico, 4) Muerte o criatura sombria. **El robo de sombra de Moria — la victima pierde su sombra y se debilita hasta morir.** |
| **Terror Nocturno** | Nightmare (pesadilla viviente) | 2 acciones + 2 chi. Esfera media. Ventaja Sombria dentro. Enemigos: Voluntad/Percepcion o Miedo +1 y atrapados. Ceguera/Ocultamiento. Concentracion. |
| **Titiritero Sombrio** | Kage Kakumei (control de sombras) | 1 accion + 2 chi. Controla movimientos del enemigo en oscuridad (Heroismo/Destrozar). Agarrado. Gasta tus acciones para forzarle a actuar. Concentracion. **Habilidad emblematica: Moria manipula personas a traves de sus sombras.** |
| **Clones Sombrios** | Doppelman (doble de sombra) | 2 acciones + 2 chi. Crea Rango = 6 clones con mitad nivel y 1 PV. Inmunes a Mente/Miedo/Toque. Redirige ataques si oculto. Concentracion. El Doppelman que protege y ataca por Moria. |
| **Oscuridad Enloquecedora** | Pesadilla inducida | 2 acciones + 2 chi. Esfera media. Confunde enemigos (Voluntad/Concentracion). Maldicion de Shade hace que parezcan monstruos. Requiere oscuridad. Concentracion. |
| **Furia de Shade** | Shadow's Asgard: Explosion | 2 acciones + 3 chi. Cono grande: 3d10 + CAR Frio. Aplica Maldicion de Shade. Crea tierra consagrada sombria. Requiere oscuridad. |
| **Ejecucion Sombria** | Destruir sombra robada | 1 accion + 3 chi. 3d10 + CAR Frio a objetivo con Maldicion de Shade a distancia lejana. Si falla defensa, explota danando cercanos (1d10). Si mata, crea criatura sombria. |
| **Laberinto de Pesadillas** | Thriller Bark (demiplano de pesadilla) | 2 acciones + 3 chi. Exilia enemigo a demiplano sombrio. Pierde cordura y gana Maldicion cada turno. Escapar requiere 3 exitos de Voluntad. Concentracion. |
| **Eclipse de Sacrificio** | Shadow's Asgard (forma final) | **R6:** 3 acciones + 5 chi. Radio grande, 7 rondas. Oscuridad total. Ventaja en Sombria. Enemigos sufren Maldicion de Shade progresiva. Por ronda: R2 invocar criaturas sombrias gratis, R4 moldear terreno, R7 Furia de Shade potenciada. **La forma definitiva: Shadow Asgard a maxima potencia, absorbiendo todas las sombras del area.** |
| Pasivo R3 | Maestria sombria | Dados suben a d8. |
| Pasivo R5 | Dominio absoluto | Dados suben a d10. |

### Nigromancia V (Zombis de Thriller Bark)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Toque Necrotico** | Drenaje de sombra directo | 1 accion. 1d10 + Rango Necrotico (d10 pasivo R5). Reduce VT/PV max (Afliccion 1). |
| **Descarga de Energia Negativa** | Rayo de energia oscura | 1 accion. 1d10 + Rango Necrotico a distancia media. |
| **Bendicion de la Muerte** | Afinidad con la muerte | Pasiva. Resistencia a Aflicciones y Necrotico. Vulnerabilidad a Radiante. No-muertos no hostiles. Moria como senor de los muertos. |
| **Vinculo Parasitico** | Transferir dano a zombi | 3 acciones + 1 chi. Transfiere mitad del dano a criatura vinculada. Lanza Toque a traves del vinculo. Concentracion. Moria usando zombis como escudos de dano. |
| **Animar No-muerto** | Crear zombi (sombra + cadaver) | 3 acciones + 1 chi. Levanta zombi/esqueleto. Max Rango x 3 = 15 controlados. Puede lanzar Toque desde su posicion o sacrificar para evitar dano. **El proceso central: insertar sombra robada en cadaver.** |
| **Maldicion Vampirica** | Absorcion de vitalidad | 1 accion + 1 chi. Marca enemigo. Recupera VT = mitad del dano Necrotico infligido. Moria alimentandose de la energia de sus victimas. |
| **Aspecto de No-muerto** | Rasgos de no-muerto parciales | Pasiva. Elige rasgos: defensa de esqueleto, sugestin de vampiro, veneno de gul, toque de momia, etc. Moria con caracteristicas parciales de ser sombrío. |
| **Tormenta de Energia Negativa** | Explosion de energia oscura | 2 acciones + 2 chi. AoE radio corto: 2d10 + CAR Necrotico (d10 pasivo R5). Reduce VT/PV max. Cura no-muertos Rango+2 = 7. |
| **Aura de Muerte** | Aura de Thriller Bark | 2 acciones + 2 chi. Radio medio. Ventaja Nigromancia. Impide sanacion enemiga. Tierra consagrada para no-muertos. Concentracion. |
| **Crear No-muerto Superior** | General Zombi | 3 acciones + 2 chi. No-muerto inteligente, Nivel <= Rango x 2 = 10. Max 1 por Rango = 5 controlados. **Los Generales Zombi de Moria: Ryuma, Absalom, Oars-clase.** |
| **Cadenas de la Muerte** | Red de zombis protectores | 2 acciones + 2 chi. Vinculo con hasta 4 no-muertos. Distribuye dano recibido entre ellos. Concentracion. |
| **Enervacion** | Maldicion de la sombra robada | 2 chi. Maldice al impactar con Necrotico. Impide sanacion (sanacion hiere). Empeora: Fatiga -> Exhausto -> Control Mental -> Muerte/Zombi. |
| **Toque de la Muerte** | Extraccion de sombra letal | 1 accion + 3 chi. 3d10 + CAR Necrotico + Enervacion. Si mata (0 PV), transforma en no-muerto instantaneo. **El poder definitivo: arrancar la sombra completamente, matar y crear zombi.** |
| **Alma Corrompida** | Sombra corrompida | Pasiva. Inmunidad Necrotico. Dano necrotico te cura. Sigue luchando en negativo hasta PV < -CAR. Moria corrupto por decadas de uso de sombras. |
| **Nube de Aniquilacion** | Campo de sombras letales | 2 acciones + 3 chi. Esfera mediana. Ocultamiento. Al entrar/empezar turno: 1d10 + CAR Necrotico + Enervacion. Muerte en la nube crea no-muertos. Concentracion. |
| Pasivo R3 | Maestria necrotica | Dados suben a d8. |
| Pasivo R5 | Poder de la muerte | Dados suben a d10. |

### Mente Desencadenada III (Planificador maestro)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Mente Desencadenada** | Modo planificacion | Trance: Ventaja mental, +1d6 mental. Max 6 rondas. Dano a Cordura al terminar. |
| **Agilidad Mental** | Experiencia vasta | Pasiva. +Rango+2 = 5 niveles de talento adicionales. Moria domina navegacion, tactica, ocultismo. |
| **Poder del Dolor** | Determinacion del sobreviviente | Pasiva (en trance). Ignora heridas leves/medias. Resistencia Aflicciones/Aturdimiento. Moria sobrevivio a Kaido. |
| **Conocimiento Arcano** | Conocimiento oscuro | Pasiva (en trance). 2 hechizos R1 adicionales usando INT+Rango. Moria conoce secretos necroticos y planares. |
| **Concentracion Superior** | Control mental absoluto | Pasiva. No pierde concentracion por dano o efectos negativos (salvo heridas graves). **Critico: Moria mantiene Eclipse de Sacrificio, Clones Sombrios, Tentaculos, Cadenas de la Muerte, etc. simultaneamente sin riesgo de perder concentracion.** |
| **Poder de la Locura** | Cordura por poder | Pasiva (en trance). Reduce 2 Cordura para recuperar 1 Chi. Max 3/ronda. La locura progresiva de Moria alimenta su magia oscura. |

### Fortitud II (Cuerpo resistente)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Armadura Natural** | Cuerpo enorme y resistente | Pasiva. +3 PV y +3 DEF (Rango+1 = 3). El tamano masivo de Moria lo hace naturalmente resistente. |
| **Segundo Aliento** | Regenerarse con sombras | Recupera Rango+2 = 4 VT. 1 vigor. Accion bonus. |
| **Duro de Pelar** | Resistencia fisica | Pasiva. Resistencia Sonico/Aturdimiento/Maniobras. |
| **Resiliencia** | Absorber el golpe | Reaccion: mitad dano. 1 vigor. 1 vez/ronda. |

### Reflejos I (Reacciones basicas)
| Habilidad del Sistema | Tecnica de One Piece | Descripcion Mecanica |
|---|---|---|
| **Velocidad Superior** | Reflejos de Shichibukai veterano | Pasiva. +1 accion/turno, +1 iniciativa. Moria no es rapido pero es un pirata veterano. |
| **Instinto de Supervivencia** | Instinto de superviviente | Rango+2 = 3 usos/combate. Repetir tiro de DES. |

## Reskinning y Justificacion

### Kage Kage no Mi como Sombria + Nigromancia
La Fruta de las Sombras de Moria tiene dos aspectos que se mapean perfectamente a dos rangos distintos del sistema:

**Magia Sombria** modela la manipulacion directa de sombras:
- Doppelman (Clones Sombrios) — el doble de sombra que absorbe golpes
- Control de personas via sombra (Titiritero Sombrio) — la habilidad mas iconica
- Brick Bat / murcilagos de sombra (Tajo Umbrio, Bola Sombra)
- Shadow Asgard forma final (Eclipse de Sacrificio)
- Zonas de oscuridad total (Crear Oscuridad, Terror Nocturno)

**Nigromancia** modela la creacion de zombis:
- Insertar sombras en cadaveres (Animar No-muerto)
- Generales Zombi como Ryuma y Oars (Crear No-muerto Superior)
- Robar sombras = matar y zombificar (Toque de la Muerte)
- Ejercito permanente de muertos vivientes (hasta 15 basicos + 5 superiores)

### Shadow Asgard como Eclipse de Sacrificio
Shadow Asgard (Moria absorbiendo 1000 sombras para volverse gigante) es mecanicamente **Eclipse de Sacrificio** (R6): campo masivo de oscuridad total, Ventaja total en Sombria, maldicion progresiva para todos los enemigos, invocaciones gratis por ronda. Es la culminacion del poder de Moria y justifica el Rango VI.

### La debilidad de Moria: DES 3 y Reflejos I
Moria es notoriamente lento, indolente y dependiente de sus subordinados. DES 3 y solo Reflejos I reflejan su mayor debilidad: un enemigo rapido puede esquivar sus ataques y golpearlo antes de que reaccione. Esto es exactamente lo que Luffy hizo en Thriller Bark. La estrategia de Moria es nunca pelear directamente — delega todo al ejercito de zombis y al Doppelman.

## Estrategia de Combate

**Fase 1: Preparacion (antes del combate)**
- **Animar No-muerto** (multiples usos fuera de combate) — crear ejercito de zombis (hasta 15)
- **Crear No-muerto Superior** — crear Generales Zombi (hasta 5 de nivel 10)
- **Cadenas de la Muerte** — vincular dano a 4 zombis protectores

**Fase 2: Apertura de combate (turno 1, 4 acciones con Velocidad Superior)**
1. **Mente Desencadenada** (activar trance) — sin coste de accion
2. **Eclipse de Sacrificio** (3 acciones, 5 chi) — oscuridad total, maldicion progresiva, invocaciones gratis
3. Con **Concentracion Superior**, mantiene Eclipse sin riesgo de perderlo por dano

**Fase 3: Dominio del campo (turnos 2+)**
Eclipse de Sacrificio otorga efectos por ronda:
- R2: Invocar criaturas sombrias gratis
- R4: Moldear terreno sombrio
- R7: Furia de Shade potenciada (cono 3d10 + Maldicion gratis)

Mientras tanto, en cada turno:
- **Clones Sombrios** (2 acciones, 2 chi) — 6 Doppelman para absorber ataques y confundir
- **Titiritero Sombrio** (1 accion, 2 chi) — controlar un enemigo clave a traves de su sombra
- **Maldicion de Shade** (2 chi, aplicar via ataques Sombrios) — debilitacion progresiva

**Fase 4: Ejecucion**
- Enemigos con Maldicion de Shade avanzada: **Ejecucion Sombria** (1 accion + 3 chi = 3d10 + CAR, explota si falla, criatura sombria si mata)
- Enemigos debilitados: **Toque de la Muerte** (1 accion + 3 chi = 3d10 + Enervacion, mata y crea zombi)
- Zombis y no-muertos atacan simultaneamente mientras Moria controla desde la retaguardia

**Defensivamente (capas multiples):**
- Cadenas de la Muerte (distribuir dano recibido a 4 zombis)
- Capullo Sombrio (18 VT temporal + inmune a Toque)
- Clones Sombrios (6 clones con 1 PV que absorben ataques si Moria esta oculto)
- Vinculo Parasitico (transferir mitad dano a criatura vinculada)
- Alma Corrompida (inmune a Necrotico, sigue luchando en negativo)
- Resiliencia (mitad dano, 1/ronda)
- Armadura Natural (+3 PV/DEF)
- Moria es un "caster" que se esconde detras de multiples capas de proteccion indirecta

## Feedback del Sistema

1. **Sinergia Sombria + Nigromancia = perfecta:** Moria es el mejor ejemplo de como dos rangos de magia se complementan. Sombria controla el campo y maldice; Nigromancia crea el ejercito y ejecuta. La combinacion es devastadora y tematicamente impecable. Ningun otro personaje encaja tan bien en el sistema.

2. **Eclipse de Sacrificio (R6) justifica el nivel 16:** La habilidad mas poderosa del sistema sombrio requiere Rango VI (nivel 16+). Shadow Asgard a maxima potencia es exactamente Eclipse de Sacrificio: campo masivo, maldicion progresiva, invocaciones gratis, Ventaja total. El mapeo es casi 1:1.

3. **DES 3 y Reflejos I = debilidad critica deliberada:** Moria es vulnerable a combatientes rapidos. Con solo Reflejos I, tiene pocas reacciones y esquivas debiles. Un build de Asesino III+ o Reflejos III+ puede destruir a Moria si logra pasar sus defensas de zombis/clones. Esto es deliberado y fiel al personaje — Moria no pelea, sus zombis pelean por el.

4. **Administracion de chi es critica:** Con 30 chi (Rango x 2), Moria puede lanzar Eclipse (5) + Clones (2) + Titiritero (2) + varios ataques/defensas. Con Poder de la Locura (cordura por chi), puede extenderse mas, pero a costa de su cordura — un caster que se vuelve mas loco mientras mas poder usa. **Con Rango+2 (23 chi), la situacion es mucho mas ajustada** — Eclipse (5) + Clones (2) + Titiritero (2) = 9 de 23 chi gastados, dejando solo 14 para todo lo demas. La discrepancia de chi es critica para este build.

5. **Limite de no-muertos:** 15 zombis basicos (Rango x 3 de Nigromancia V) + 5 Generales (1 por Rango) es un ejercito de 20 criaturas. El DM debe estar preparado para manejar esta cantidad en combate. Sugerencia: usar los zombis basicos como "turba" con stats simplificados y solo detallar los Generales individualmente.

6. **Concentracion Superior + multiples efectos duraderos:** Moria puede mantener Eclipse de Sacrificio, Clones Sombrios, Titiritero Sombrio, Cadenas de la Muerte, y Terror Nocturno todos a la vez gracias a Concentracion Superior. El DM debe decidir si el sistema permite mantener multiples concentraciones o si hay un limite. Si solo se permite una, Moria debe priorizar Eclipse de Sacrificio.

7. **Nivel 16 es correcto:** Moria es un Shichibukai, pero uno de los mas debiles en combate directo. Su poder viene de la preparacion y el ejercito de zombis. Nivel 16 lo coloca correctamente: devastador con tiempo de preparacion, vulnerable si se le confronta directamente y sin zombis. En su prime (pre-Kaido), probablemente seria nivel 18-19.

8. **Progresion post-prime no aplica:** Con R6 en Sombria y R5 en Nigromancia, Moria esta en su techo. Mejoras futuras irian a Fortitud III (Hasta la Muerte, Constitucion Ferrea) y Mente IV (Psique Retorcida para reflejar ataques mentales, Sentido Arcano para vista ciega).
