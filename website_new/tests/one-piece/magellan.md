# Magellan — Nivel 18 (Revisado)

**Raza:** Humano
**Concepto:** La Doku Doku no Mi (Fruta del Veneno) modelada como reskin de Fuego (veneno ofensivo/gaseoso) + Agua (veneno liquido). Magellan es el director de Impel Down, capaz de derrotar ejercitos enteros con su veneno letal.

---

## Estadisticas (Cap: 9)

| FUE | DES | CON | INT | SAB | CAR |
|-----|-----|-----|-----|-----|-----|
| 6   | 4   | 8   | 5   | 5   | 6   |

**Justificacion de Stats:**
- **CAR 6:** Estadistica principal de Magia de Fuego (CAR + Rango). Con Fuego VI, su tiro ofensivo de veneno es CAR(6) + Rango(6) = 12. Ademas, R4 Fuego da +1 CAR pasivo.
- **CON 8:** Estadistica de Fortitud. Refleja su inmunidad al propio veneno y resistencia sobrenatural. PV y VT dependen de CON. R6 Fuego da +1 CON pasivo (cap 9 alcanzado).
- **SAB 5:** Estadistica de Magia de Agua (SAB + Rango). Con Agua IV, su tiro de veneno liquido es SAB(5) + Rango(4) = 9.
- **FUE 6:** Para Estilo Coloso (FUE + Rango). Con Coloso II, tiro de ataque = FUE(6) + Rango(2) = 8.

## Recursos

- **PV:** 3 + CON(8) + floor(17/3) = 3 + 8 + 5 = **16**
- **VT:** 2 + CON(8) + Nivel(18) = **28**
- **Chi total:** Fuego VI(12) + Agua IV(8) + Fortitud IV(8) + Coloso II(4) + Ira II(4) + Reflejos I(2) = **38**

> **Nota sobre Chi:** Los JSONs del sistema dicen "Rango + 2" como formula de Chi. Sin embargo, el codigo fue modificado para usar "Rango x 2" como regla de la casa. Ambos valores coinciden para Rango II (2+2=4, 2x2=4) pero divergen a rangos superiores. Los valores aqui usan Rango x 2.

---

## Rangos (19/19 puntos) — Nivel 18 = 19 puntos de rango

| Rango | Tier | Chi | Habilidades Clave |
|-------|------|-----|-------------------|
| Magia Fuego VI | R6 | 12 | Forma Elemental, Infierno Abrasador |
| Magia Agua IV | R4 | 8 | Oleaje, Prision de Agua, Vortice |
| Fortitud IV | R4 | 8 | Muro Viviente, Aguantar los Elementos |
| Estilo Coloso II | R2 | 4 | Gran Barrido, Lanzamiento |
| Ira II | R2 | 4 | Demostración Terrorifica, Resistencia Salvaje |
| Reflejos I | R1 | 2 | Velocidad Superior, Instinto de Supervivencia |

**Total:** 6 + 4 + 4 + 2 + 2 + 1 = **19 puntos** (correcto para nivel 18)

---

## Mapeo de Habilidades: Veneno → Sistema Raldamain

### Magia de Fuego (reskin: Veneno Toxico/Gaseoso)

| Rango | Habilidad del Sistema | Tecnica One Piece | Notas |
|-------|----------------------|-------------------|-------|
| R1 | **Llamarada** (1d6+CAR) | Poison Cloud (nube de veneno basica) | Dano de fuego → dano de veneno. El "prender objetos" = contaminar zona |
| R1 | **Aliento de Fuego** (cono 2d6+CAR) | Poison Breath / Chloro Ball | Cono de gas venenoso. 1 chi |
| R1 | **Fuego Interno** (resist fuego/frio) | Inmunidad al propio veneno | Pasiva perfecta para Magellan |
| R2 | **Muro de Llamas** (PV=Rangox3) | Barrera de veneno | Muro toxico que dana al cruzar. PV = 18 |
| R2 | **Bola de Fuego** (2d6+CAR, AoE) | Hydra (cabezas de veneno) | Multiples explosiones de veneno. 1 chi |
| R2 | **Infusion de Fuego** (+1d6 arma) | Recubrir armas con veneno | A R4 escala a +2d6, a R6 +3d6 |
| R3 | **Erupcion Abrasadora** (3d8+CAR, esfera) | Venom Road (explosion de veneno) | Explosion centrada en Magellan. 2 chi |
| R3 | **Propulsion** (vuelo) | Desplazarse sobre olas de veneno | Velocidad de vuelo 2 |
| R3 | **Elemento del Poder** (reducir VT→chi) | Sacrificar salud por poder toxico | Reduce VT/PV max por 2 → -1 chi de coste |
| R4 | **Renacer del Fenix** (curar VT=Rangox2) | Absorber veneno para curarse | Recupera 12 VT. Requiere estar en zona envenenada |
| R4 | **Torbellino de Fuego** (2d8+CAR, movil) | Hydra movil / serpiente de veneno | Torbellino que deja rastro de Muro. 2 chi |
| R4 | **Maestro de las Llamas** (ventaja+escudos) | Maestria toxica | Ventaja en todo Fuego + escudos = Rango(6). 2 chi |
| R5 | **Lluvia de Brasas** (4x4d10+CAR) | Hydra (multiples cabezas atacando) | 4 explosiones simultaneas de veneno. 3 chi |
| R5 | **Rayo de Plasma** (4d10+CAR, ignora todo) | Veneno concentrado letal | Ignora muros, armadura, escudos. 3 chi |
| R5 | **Llama Viviente** (intangible) | Cuerpo de veneno parcial | Inmune a fisico, agarres, mental |
| **R6** | **Infierno Abrasador** (radio grande, 6 rondas) | **Zona de muerte toxica** | Hechizos R1-R2 gratis. Campo ambiental de veneno. 5 chi |
| **R6** | **Forma Elemental** (stats 12, +40 VT, vuelo, 6 escudos) | **Venom Demon** | **LA HABILIDAD DEFINITORIA.** Cuerpo completamente de veneno. Stats fisicas y CAR a 12, inmune a aflicciones/toque, vuelo, 6 escudos, rodeado de Muro de Fuego (muro de veneno). 5 chi/vigor |

### Magia de Agua (reskin: Veneno Liquido)

| Rango | Habilidad del Sistema | Tecnica One Piece | Notas |
|-------|----------------------|-------------------|-------|
| R1 | **Torrente** (1d6+SAB) | Chorro de veneno liquido | Empuja y tropieza en critico |
| R1 | **Aguas de la Vida** (curar Rango+2 VT) | Purgar veneno de aliados | Cura aliados, dana no-muertos |
| R2 | **Muro de Agua** | Barrera de veneno liquido | Defensa liquida |
| R3 | **Prision de Agua** | Atrapar en burbuja de veneno | Agarre liquido |
| R4 | **Vortice** | Remolino de veneno | Control de area toxico |

### Fortitud

| Rango | Habilidad del Sistema | Representacion | Notas |
|-------|----------------------|----------------|-------|
| R1 | **Armadura Natural** (+PV+DEF=Rango+1) | Piel endurecida / Haki basico | +5 PV y +5 DEF (Rango IV +1) |
| R1 | **Segundo Aliento** (curar Rango+2 VT) | Regeneracion por veneno | Recupera 6 VT por 1 vigor |
| R2 | **Duro de Pelar** (resist sonico/aturdir) | Constitucion monstruosa | Resistencia a aturdimiento y maniobras |
| R2 | **Resiliencia** (reducir dano a mitad) | Absorber impactos | 1 reaccion, 1 vigor. Halvea un ataque |
| R3 | **Hasta la Muerte** (luchar a 0 PV) | Voluntad inquebrantable | Sigue luchando moribundo |
| R3 | **Constitucion Ferrea** (resist aflicciones) | Inmune a venenos/enfermedades | Perfecta — es inmune a su propio veneno |
| R4 | **Muro Viviente** (escudos=Rango) | Defensa absoluta | 4 escudos. 2 vigor |
| R4 | **Aguantar los Elementos** (resist fuego/frio/acido/electrico) | Resistencia elemental total | Inmune a criticos de quemadura/paralisis |

### Estilo Coloso, Ira, Reflejos

| Rango | Habilidad | Uso en Magellan |
|-------|-----------|-----------------|
| Coloso R1 | **Ataque Poderoso** (+1 dado) | Golpe envenenado potente |
| Coloso R1 | **Golpe Desestabilizador** (empujar+tropezar) | Empujon con mano envenenada |
| Coloso R2 | **Gran Barrido** (AoE +1d6) | Barrido de cola de veneno (Venom Demon) |
| Coloso R2 | **Lanzamiento** (lanzar objeto +1d6) | Lanzar bolas de veneno solido |
| Ira R1 | **Ira de Combate** (ventaja+1d6) | Furia del director de Impel Down |
| Ira R1 | **Frenesi de Batalla** (ventaja ataques) | Descontrol toxico |
| Ira R2 | **Demostracion Terrorifica** (miedo) | Intimidar prisioneros |
| Ira R2 | **Resistencia Salvaje** (reducir dano=Rango) | Reduce dano recibido por 2 |
| Reflejos R1 | **Velocidad Superior** (+1 accion, +Rango init) | 4 acciones por turno. +1 iniciativa |
| Reflejos R1 | **Instinto de Supervivencia** (reroll DES) | 3 rerolls por combate |

---

## Upgrade Clave: Fuego V → Fuego VI

La diferencia entre la build anterior (Fuego V) y esta revision (Fuego VI) es enorme:

- **Forma Elemental** convierte a Magellan en el Venom Demon literalmente: stats fisicas y CAR suben a 12, gana 40 VT temporal, 6 escudos, vuelo, inmunidad a aflicciones y toque, rodeado de muro de veneno permanente.
- **Infierno Abrasador** crea un campo ambiental de veneno toxico que hace que todos los hechizos R1-R2 sean gratis (0 chi). Esto significa Hydra, Bola de Fuego, Aliento de Fuego, Muro de Llamas — todo sin coste.
- La pasiva de R6 da +1 CON, llegando a CON 9 (cap).
- Los dados de dano base suben a d10 por la pasiva de R5.

El coste es reducir Coloso de III a II (perdemos Golpe Demoledor, Carga Salvaje, Golpe Aturdidor) e Ira de II se mantiene igual. Es un intercambio favorable: Magellan no necesita finura marcial, necesita potencia toxica abrumadora.

---

## Estrategia de Combate

### Apertura (Turno 1-2)
1. **Accion 1-2:** Activar **Infierno Abrasador** (5 chi) — crea un campo de veneno toxico en radio grande durante 6 rondas. A partir de aqui, hechizos R1-R2 son gratis.
2. **Accion 3:** **Llamarada** gratis (0 chi) contra objetivo prioritario.
3. **Accion 4 (Reflejos):** Posicionamiento o segundo **Torrente** gratis.

### Fase de Presion (Turno 2-4)
1. Lanzar **Bola de Fuego** (Hydra, gratis por Infierno) en areas con enemigos agrupados.
2. **Muro de Llamas** (gratis) para bloquear rutas de escape.
3. Si enemigos se acercan: **Erupcion Abrasadora** centrada en si mismo (3d8+CAR).

### Fase de Aniquilacion (Turno 4+)
1. Activar **Forma Elemental** (Venom Demon) — 5 chi. Stats a 12, 40 VT temporal, 6 escudos, vuelo, intangible a fisico.
2. En Forma Elemental: **Lluvia de Brasas** (4x4d10+CAR=12) = cuatro explosiones de 4d10+12.
3. **Rayo de Plasma** (4d10+12, ignora TODA defensa) para objetivos que resistan.
4. El campo de Infierno Abrasador permite detonar todo en la 4a ronda para Inmolacion masiva gratis.

### Reacciones (2 por ronda)
- **Resiliencia** (Fortitud R2): Halvear un ataque.
- **Instinto de Supervivencia** (Reflejos R1): Reroll de DES.
- **Muro de Llamas** como reaccion defensiva (gratis si Infierno activo).

### Acciones por Turno
- 3 base + 1 (Velocidad Superior) = **4 acciones por turno**.
- 2 reacciones por ronda.

---

## Feedback del Sistema

### Lo que funciona bien
1. **Fuego como Veneno es mecanicamente solido.** El dano continuo (quemaduras) mapea perfectamente al envenenamiento progresivo. La intangibilidad de Llama Viviente / Forma Elemental captura la naturaleza toxica intocable de Magellan.
2. **Forma Elemental R6 = Venom Demon** es un encaje perfecto. Stats a 12, cuerpo intangible de veneno, 40 VT temporal — es exactamente lo que Venom Demon representa.
3. **Infierno Abrasador + hechizos gratis** captura la idea de que Magellan contamina todo un area y luego lanza veneno sin esfuerzo.
4. **Fortitud IV** captura bien la dureza de Magellan (sobrevivio a Luffy, Ivankov, Jinbe, Crocodile simultaneamente).

### Sugerencias concretas
1. **Se necesita un tipo de dano "Veneno/Toxico"** separado de Fuego. Actualmente, las resistencias a Fuego anulan todo el dano de Magellan, lo cual no tiene sentido narrativo. Una criatura resistente al fuego NO deberia ser resistente al veneno.
2. **Magia de Agua como veneno liquido es redundante.** Se podria crear un rango "Magia Toxica" que combine los efectos de dano continuo de Fuego con los efectos de control de area de Agua, eliminando la necesidad de dos rangos.
3. **El efecto de "enfermedad progresiva"** del veneno de Magellan (el veneno se acumula y empeora) no tiene una mecanica directa. Las quemaduras de Fuego son lo mas cercano, pero una mecanica de "acumulacion de veneno" (mas stacks = peor efecto) seria ideal.
4. **Renacer del Fenix como autocuracion por veneno** funciona narrativamente (absorbe su propio veneno para curarse), pero requiere "estar en llamas/zona de fuego" lo cual necesita reinterpretacion.
5. **El debuff de diarrea cronica de Magellan** (sus problemas estomacales que lo incapacitan 10 horas al dia) podria modelarse como una Debilidad narrativa que le de puntos extra de personaje.
