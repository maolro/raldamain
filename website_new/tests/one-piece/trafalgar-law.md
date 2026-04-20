# Trafalgar D. Water Law — Nivel 20 (Revisado)

**Raza:** Humano
**Concepto:** La Ope Ope no Mi (Fruta de la Operacion) modelada como Magia Espacial (Room, Shambles, cortes dimensionales) + Gravitatoria (Tact, manipulacion de objetos) + Vida (cirugia). Law es un genio tactico y cirujano cuya Room le permite controlar todo dentro de su espacio.

---

## Estadisticas (Cap: 9)

| FUE | DES | CON | INT | SAB | CAR |
|-----|-----|-----|-----|-----|-----|
| 5   | 6   | 5   | 9   | 7   | 3   |

**Justificacion de Stats:**
- **INT 9 (maximo):** Estadistica principal de Magia Espacial (INT + Rango) y Magia Gravitatoria (INT + Rango). Con Espacial VI, tiro = INT(9) + Rango(6) = 15. Con Gravitatoria III, tiro = INT(9) + Rango(3) = 12. Tambien es la stat de Mente Desencadenada (INT + Rango). Law es ante todo un genio.
- **SAB 7:** Estadistica de Magia de Vida (SAB + Rango). Con Vida III, tiro de cirugia = SAB(7) + Rango(3) = 10. Refleja su pericia medica.
- **DES 6:** Para Estilo Duelista (FUE o DES + Rango). Con Duelista IV, tiro = DES(6) + Rango(4) = 10. Manejo de Kikoku (nodachi).
- **FUE 5:** Complemento para Duelista y fisico base.
- **CON 5:** Law no es particularmente resistente fisicamente.
- **CAR 3:** Law es antisocial e intimidante. No es carismatico.

## Recursos

- **PV:** 3 + CON(5) + floor(19/3) = 3 + 5 + 6 = **14**
- **VT:** 2 + CON(5) + Nivel(20) = **27**
- **Chi total:** Espacial VI(12) + Gravitatoria III(6) + Duelista IV(8) + Vida III(6) + Mente III(6) + Reflejos II(4) = **42**

> **Nota sobre Chi:** Los JSONs dicen "Rango + 2". El codigo usa "Rango x 2". Los valores aqui usan Rango x 2 (regla de la casa).

---

## Rangos (21/21 puntos) — Nivel 20 = 21 puntos de rango

| Rango | Tier | Chi | Habilidades Clave |
|-------|------|-----|-------------------|
| Magia Espacial VI | R6 | 12 | **Extension de Dominio** (=ROOM) |
| Estilo Duelista IV | R4 | 8 | Contrataque, Danza del Espadachin, Estocada Poderosa |
| Magia Gravitatoria III | R3 | 6 | Agarre Gravitatorio, Bomba de Gravedad |
| Magia de Vida III | R3 | 6 | Sanacion Superior, Luz Viviente |
| Mente Desencadenada III | R3 | 6 | Concentracion Superior, Poder de la Locura |
| Reflejos II | R2 | 4 | Esquiva Asombrosa, Evasion |

**Total:** 6 + 4 + 3 + 3 + 3 + 2 = **21 puntos** (correcto para nivel 20)

---

## Mapeo de Habilidades: Ope Ope no Mi → Sistema Raldamain

### Magia Espacial (EL CORE DE LAW)

| Rango | Habilidad del Sistema | Tecnica One Piece | Notas |
|-------|----------------------|-------------------|-------|
| R1 | **Salto Espacial** (teleport + reaccion dodge) | Shambles (con si mismo) | Teletransporte de 1 paso. Como reaccion: reduce dano a mitad y mueve. A R3: evita totalmente |
| R1 | **Portal Menor** (portal pequeno) | Room mini (portal quirurgico) | Portal pequeno para atacar a traves |
| R1 | **Bolsillo Interdimensional** (guardar objetos) | Almacenamiento dimensional | Guardar/sacar objetos. Corazones almacenados |
| R2 | **Puerta Dimensional** (portal tamano humano) | Room portal (mover personas) | Conecta con punto lejano visible. 1 chi |
| R2 | **Ancla Dimensional** (impedir teleport) | Bloquear escape dimensional | Impide teletransporte del enemigo |
| R2 | **Distorsion Espacial** (teletransportar enemigo) | Shambles (ofensivo) | Teletransporta enemigo 1 paso. Interrumpe acciones. 1 chi |
| R3 | **Brecha Espacial** (ignorar DEF/escudos) | **Gamma Knife** | **ENCAJE PERFECTO.** Siguiente ataque ignora barreras, muros, DEF y escudos. 2 chi |
| R3 | **Portal Multiple** (red de portales) | Room expandido con multiples portales | Aumenta alcance, redirige ataques. 2 chi |
| R3 | **Invocar Extraplanario** (invocar criatura) | Invocar entidades | Criatura nivel <= 6+4 = 10. 2 chi |
| R4 | **Agujero de Gusano** (portal a cualquier lugar) | Room a larga distancia | Portal a cualquier lugar conocido. 2 chi |
| R4 | **Cambio de Posicion** (intercambiar posiciones) | **Shambles** (clasico) | **LA HABILIDAD EMBLEMATICA.** Intercambia posicion con objetivo. Como reaccion: el enemigo recibe el ataque en tu lugar. 2 chi |
| R4 | **Cierre Dimensional** (bloquear magia espacial) | Room Lock / Counter-Room | Bloquea toda magia espacial en radio grande. 2 chi |
| R5 | **Crear Demiplano** (dimension de bolsillo 1km2) | Room permanente / Hospital Room | Dimension personal controlada |
| R5 | **Puerta Interdimensional** (portal a otro plano) | K-Room (penetrar dimensiones) | Portal interdimensional con efectos crecientes. 3 chi |
| R5 | **Desfase Espacial** (intangible) | **Esquivar via Room** | Intangible e inmune al plano material. 3 chi |
| **R6** | **Extension de Dominio** (superponer demiplano) | **R-ROOM / ROOM MAXIMO** | **ESTA ES LA ROOM.** Superpones tu demiplano: ventaja en Espacial, hechizos R1-R2 gratis, usas efectos ambientales. 5 chi. **Los enemigos pueden disputar el control** (resistir el Room). |

### Magia Gravitatoria (Tact / Manipulacion de objetos)

| Rango | Habilidad del Sistema | Tecnica One Piece | Notas |
|-------|----------------------|-------------------|-------|
| R1 | **Pulso Gravitatorio** (empujar) | Tact basico (mover objetos) | Empujon gravitatorio. 1d6+INT |
| R1 | **Arrastre Gravitatorio** (atraer) | Tact atraccion | Atrae objetivo hacia ti |
| R1 | **Pozo de Gravedad** (zona AoE) | Room gravitatorio | Zona de alta gravedad. 1 chi |
| R2 | **Alterar Peso** (reducir/aumentar peso) | Tact avanzado | Reduce/aumenta peso de objetos. 1 chi |
| R2 | **Ancla Gravitatoria** (tropezar+inmovilizar) | Inmovilizar con Room | Derriba e impide movimiento. 1 chi |
| R3 | **Agarre Gravitatorio** (inmovilizar) | Tact agarre (inmovilizar personas) | Inmoviliza a distancia media. 2 chi |
| R3 | **Bomba de Gravedad** (2d8+INT, ignora DEF) | **Shock Wille** (onda de choque) | Explosion que ignora Defensa. 2 chi |

### Estilo Duelista (Kikoku - la nodachi)

| Rango | Habilidad del Sistema | Tecnica One Piece | Notas |
|-------|----------------------|-------------------|-------|
| R1 | **Destreza Defensiva** (parada+esquiva) | Defensa con Kikoku | Tira Parada + Esquiva, queda con el mejor |
| R1 | **Truco de Espada** (maniobra bonus) | Corte quirurgico + maniobra | Maniobra como accion bonus. 1 vigor |
| R2 | **Finta Enganosa** (perder reaccion enemigo) | Finta quirurgica | Enemigo pierde reaccion. 1 vigor |
| R2 | **Ataque Torbellino** (AoE +1d6) | Corte circular de Kikoku | Ataca a todos los adyacentes. 1 vigor |
| R3 | **Espadas Trabadas** (trabar arma) | Trabar y desarmar | Inutiliza arma enemiga. 2 vigor |
| R3 | **Ataque Saltarin** (+2d6) | Salto + corte dimensional | +2d6 dano. 2 vigor |
| R3 | **Combinar Tecnicas** (segundo ataque bonus) | Combo de cortes | Ataque extra como bonus. 2 vigor |
| R4 | **Contrataque** (interrumpir accion) | Counter Shock / Corte preventivo | Interrumpe una accion enemiga. 2 vigor, 1 reaccion |
| R4 | **Danza del Espadachin** (ventaja+reaccion extra) | Modo combate con Kikoku | Ventaja en ataques, +1 reaccion defensiva, para proyectiles. 2 vigor |
| R4 | **Estocada Poderosa** (+2d6, ignora armadura) | **Injection Shot** | +2d6 dano, herida leve, ignora armadura. 2 vigor |

### Magia de Vida (Cirugia)

| Rango | Habilidad del Sistema | Tecnica One Piece | Notas |
|-------|----------------------|-------------------|-------|
| R1 | **Toque Sanador** (curar Rango+2 VT) | Cirugia basica | Cura 5 VT o reduce afliccion |
| R1 | **Rayo de Luz** (1d6+Rango) | Counter Shock (descarga) | Ataque radiante que no se esquiva a corta |
| R2 | **Vinculo Vital** (compartir dano/curar a distancia) | Enlace quirurgico con paciente | Absorbe dano de aliado o cura a distancia. 1 chi |
| R3 | **Sanacion Superior** (curar VT+PV=Rango+2) | Cirugia avanzada | Cura 5 VT+PV, reduce herida 2 pasos. 2 chi |
| R3 | **Luz Viviente** (velocidad+1, +1 reaccion) | Modo alerta quirurgico | +1 velocidad, +1 reaccion defensiva. 2 chi |

### Mente Desencadenada, Reflejos

| Rango | Habilidad | Uso en Law |
|-------|-----------|------------|
| Mente R1 | **Mente Desencadenada** (trance: ventaja+1d6 mental) | Concentracion absoluta del genio |
| Mente R1 | **Agilidad Mental** (+Rango+2 niveles de talento) | 5 niveles extra de talento. Medicina, Tactica, etc. |
| Mente R2 | **Poder del Dolor** (ignorar heridas leves/medias) | Soportar el dolor por voluntad pura |
| Mente R2 | **Conocimiento Arcano** (2 hechizos R1 arcano) | Acceso a hechizos extra via intelecto |
| Mente R3 | **Concentracion Superior** (inquebrantable) | Mantener Room/portales sin interrupcion |
| Mente R3 | **Poder de la Locura** (cordura→chi) | Sacrificar cordura por mas recursos |
| Reflejos R1 | **Velocidad Superior** (+1 accion, +Rango init) | 4 acciones/turno. +2 iniciativa |
| Reflejos R1 | **Instinto de Supervivencia** (reroll DES) | 4 rerolls por combate |
| Reflejos R2 | **Esquiva Asombrosa** (esquivar sorpresas) | Observation Haki basico |
| Reflejos R2 | **Evasion** (halvear dano en fallo) | Reducir dano si falla esquiva. 1 chi |

---

## Upgrade Clave: Espacial V → Espacial VI

La diferencia fundamental es **Extension de Dominio** (R6), que ES literalmente el Room de Law:

- **Superpones tu Demiplano sobre la realidad** en una esfera grande. Dentro, tienes ventaja en toda Magia Espacial.
- **Hechizos R1-R2 son gratis.** Eso significa: Salto Espacial, Portal Menor, Bolsillo, Puerta Dimensional, Ancla Dimensional, Distorsion Espacial — todos a 0 chi.
- Puedes usar los **efectos ambientales de tu demiplano** (que previamente configuraste con Crear Demiplano R5).
- Los enemigos pueden **disputar el control**, lo cual modela perfectamente como oponentes poderosos pueden resistir los efectos del Room.

Con la build anterior (Espacial V), Law tenia que pagar chi por cada Shambles y cada manipulacion. Con R6, dentro del Room todo es gratis. Esto es EXACTAMENTE como funciona la Ope Ope no Mi.

Ademas, la pasiva de R3 Espacial ("Hechizos R1 cuestan -1 accion") significa que Salto Espacial cuesta 0 acciones dentro del Room — Law puede teleportarse como accion libre.

---

## Estrategia de Combate

### Apertura (Turno 1)
1. **Accion 1-3:** Activar **Extension de Dominio** (5 chi) — establece el ROOM.
2. **Accion 4 (Reflejos):** **Distorsion Espacial** gratis (0 chi, R2) — teletransporta enemigo a posicion desventajosa.

### Fase de Control (Turno 2+)
Dentro del Room, Law controla el espacio:
1. **Cambio de Posicion** (Shambles, 2 chi): Intercambiar posiciones. Como reaccion: enemigo recibe ataque dirigido a Law.
2. **Distorsion Espacial** (gratis): Teletransportar enemigos a voluntad.
3. **Salto Espacial** (gratis, 0 acciones con pasiva R3): Teletransportarse instantaneamente.
4. **Agarre Gravitatorio** (2 chi): Inmovilizar enemigo a distancia.

### Ofensiva Quirurgica
1. **Brecha Espacial** (2 chi) + **Estocada Poderosa** (2 vigor) = **Gamma Knife**. Ignora DEF, escudos, barreras Y armadura. +2d6 dano + herida permanente.
2. **Bomba de Gravedad** (2 chi): 2d8+INT(9) = 2d8+9 ignorando DEF.
3. **Contrataque** (2 vigor): Interrumpir acciones enemigas con corte preventivo.

### Defensa Dimensional
- **Salto Espacial** como reaccion (gratis): Evitar ataque totalmente (R3+).
- **Cambio de Posicion** como reaccion (2 chi): Hacer que el enemigo reciba su propio ataque.
- **Desfase Espacial** (3 chi): Volverse completamente intangible en emergencia.
- **Evasion** (1 chi): Halvear dano si falla esquiva.

### Acciones por Turno
- 3 base + 1 (Velocidad Superior) = **4 acciones por turno**.
- 2 reacciones por ronda.
- Con **Mente Desencadenada** activa: ventaja en ataques/defensa mentales + 1d6 dano mental extra.

---

## Feedback del Sistema

### Lo que funciona excepcionalmente bien
1. **Extension de Dominio R6 = Room** es un encaje PERFECTO. La mecanica de "superponer tu demiplano" es literalmente lo que hace Law cuando activa Room. Los hechizos gratis, la ventaja en Espacial, la disputa de control por enemigos poderosos — todo calza.
2. **Brecha Espacial = Gamma Knife** es exacto. Ignorar toda defensa para golpear directamente al interior es precisamente Gamma Knife.
3. **Cambio de Posicion = Shambles** es la habilidad emblematica perfectamente modelada. El intercambio de posiciones Y la reaccion defensiva (que el otro reciba el golpe) son Shambles.
4. **La combinacion Espacial + Duelista** permite a Law ser tanto mago de control como espadachin, que es su estilo hibrido.

### Sugerencias concretas
1. **Counter Shock** (descarga electrica) se podria modelar mejor con Rayo de Luz (Vida R1) reskineado como electricidad, pero idealmente necesitaria acceso a Magia de Tormenta. La build actual lo cubre con Rayo de Luz.
2. **La Operacion de Inmortalidad** (Perennial Youth Operation) necesita una habilidad especial: "Cura la muerte/vejez de un objetivo, pero el usuario muere." Podria ser una habilidad mitica de Vida R5+ con coste de vida permanente.
3. **Amputate** (cortar partes del cuerpo sin matar dentro del Room) no tiene equivalente directo. Se podria crear como efecto ambiental del Demiplano: "Dentro de tu Room, los cortes separan sin matar."
4. **La desventaja de la Ope Ope** (consume stamina masivamente) se modela bien con el coste de chi, pero deberia haber un efecto de "agotamiento post-Room" mas pronunciado. Actualmente Extension de Dominio simplemente termina al perder concentracion.
5. **Puncture Wille** (la tecnica final contra Big Mom) podria modelarse como Brecha Espacial + Empuje Todopoderoso (Gravitatoria R5, que no tiene), lo cual justificaria subir Gravitatoria en futuras builds.
