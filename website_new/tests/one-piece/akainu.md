# Sakazuki (Akainu) — Nivel 24 (Mitico, Revisado)

**Raza:** Humano
**Concepto:** La Magu Magu no Mi (Fruta del Magma) modelada como Fuego (calor extremo, combustion) + Tierra (material fundido, roca liquida). Akainu es el Almirante de Flota, la encarnacion de la "Justicia Absoluta", y posiblemente el usuario de Logia mas ofensivamente poderoso del mundo.

---

## Estadisticas (Cap: 12 — mitico)

| FUE | DES | CON | INT | SAB | CAR |
|-----|-----|-----|-----|-----|-----|
| 10  | 6   | 9   | 5   | 7   | 9   |

**Justificacion de Stats:**
- **CAR 9:** Estadistica principal de Magia de Fuego (CAR + Rango). Con Fuego VI, tiro = CAR(9) + Rango(6) = 15. La pasiva de Fuego R4 da +1 CAR, y Fuego R6 da +1 CON. Akainu tiene una presencia de autoridad absoluta.
- **FUE 10:** Para Estilo Coloso (FUE + Rango). Con Coloso IV, tiro = FUE(10) + Rango(4) = 14. Punos de magma devastadores.
- **CON 9:** Resistencia monstruosa. Sobrevivio a los terremotos de Barbablanca directamente y siguio peleando. Peleo 10 dias contra Aokiji.
- **SAB 7:** Para Magia de Tierra (SAB + Rango). Con Tierra V, tiro = SAB(7) + Rango(5) = 12. La Tierra es el componente solido del magma.
- **DES 6:** Reflejos decentes. Pasiva de Fuego R2 da +1 DES.
- **INT 5:** Akainu no es un genio intelectual. Es un ejecutor implacable.

## Recursos

- **PV:** 3 + CON(9) + floor(23/3) = 3 + 9 + 7 = **19**
- **VT:** 2 + CON(9) + Nivel(24) = **35**
- **Chi total:** Fuego VI(12) + Tierra V(10) + Coloso IV(8) + Fortitud IV(8) + Ira III(6) + Reflejos II(4) + Mente I(2) = **50**

> **Nota sobre Chi:** Los JSONs dicen "Rango + 2". El codigo usa "Rango x 2". Los valores aqui usan Rango x 2.

---

## Rangos (25/25 puntos) — Nivel 24 = 25 puntos de rango

| Rango | Tier | Chi | Habilidades Clave |
|-------|------|-----|-------------------|
| Magia Fuego VI | R6 | 12 | **Forma Elemental** (cuerpo de magma), Infierno Abrasador |
| Magia Tierra V | R5 | 10 | Terremoto, Brecha, **Lluvia de Meteoritos** (R6 no, R5 max) |
| Estilo Coloso IV | R4 | 8 | Maestria de Estilo, Secuencia de Golpes |
| Fortitud IV | R4 | 8 | Muro Viviente, Aguantar los Elementos |
| Ira III | R3 | 6 | Ira Temeraria, Hasta el Limite |
| Reflejos II | R2 | 4 | Esquiva Asombrosa, Evasion |
| Mente Desencadenada I | R1 | 2 | Mente Desencadenada, Agilidad Mental |

**Total:** 6 + 5 + 4 + 4 + 3 + 2 + 1 = **25 puntos** (correcto para nivel 24)

**CORRECCION IMPORTANTE:** Tierra V no da acceso a R6. Para Lluvia de Meteoritos (R6) se necesitaria Tierra VI (6 puntos). La build tiene Tierra V, cuyo techo es Terremoto, Brecha y Bastion de Piedra. Si se quiere Lluvia de Meteoritos, se debe subir Tierra a VI y bajar otro rango. Vease "Variante Ryusei Kazan" abajo.

---

## Mapeo de Habilidades: Magu Magu no Mi → Sistema Raldamain

### Magia de Fuego (Componente de Calor del Magma)

| Rango | Habilidad del Sistema | Tecnica One Piece | Notas |
|-------|----------------------|-------------------|-------|
| R1 | **Llamarada** (1d6+CAR) | Eruption basica | Dano de magma basico. 1d6+9 |
| R1 | **Aliento de Fuego** (cono 2d6+CAR) | Aliento de magma | Cono de magma. 2d6+9. 1 chi |
| R1 | **Fuego Interno** (resist fuego/frio) | Cuerpo de magma (inmunidad termica) | Resiste fuego Y frio |
| R2 | **Muro de Llamas** (PV=18) | Muro de lava | Barrera de magma. PV = Rangox3 = 18 |
| R2 | **Bola de Fuego** (2d6+CAR, AoE) | Dai Funka (Gran Erupcion) parcial | Explosion de magma. 2d6+9 |
| R2 | **Infusion de Fuego** (+1d6→+3d6 a R6) | Punos imbuidos de magma | Todas las armas hacen +3d6 fuego a R6 |
| R3 | **Erupcion Abrasadora** (3d8+CAR, esfera) | **Dai Funka** (puno de magma gigante) | Explosion centrada. 3d8+9. 2 chi |
| R3 | **Propulsion** (vuelo) | Desplazarse con propulsion de magma | Vuelo 2, ventaja esquiva |
| R4 | **Renacer del Fenix** (curar 12 VT) | Regenerar con magma | Regenera en zona de fuego/magma. 1 chi |
| R4 | **Torbellino de Fuego** (2d8+CAR, movil) | Torbellino de magma | Torbellino que deja rastro de lava. 2 chi |
| R4 | **Maestro de las Llamas** (ventaja+escudos) | Maestria del magma | Ventaja + escudos = 6. 2 chi |
| R5 | **Lluvia de Brasas** (4x4d10+CAR) | **Ryusei Kazan** (parcial — version fuego) | 4 explosiones de magma. 4x(4d10+9). 3 chi |
| R5 | **Rayo de Plasma** (4d10+CAR, ignora todo) | **Meigou** (puno que penetra todo) | 4d10+9 que ignora muros, armadura, escudos. 3 chi |
| R5 | **Llama Viviente** (intangible) | Intangibilidad Logia parcial | Inmune a fisico, agarres, mental. Vulnerable a agua/hielo |
| **R6** | **Infierno Abrasador** (radio grande, 6 rondas) | **Campo de magma ambiental** | Todo R1-R2 gratis. Campo de calor extremo. 5 chi |
| **R6** | **Forma Elemental** (stats 12, +40 VT, 6 escudos) | **CUERPO DE MAGMA COMPLETO** | Stats a 12, 40 VT temporal, inmune aflicciones/toque, vuelo, 6 escudos, rodeado de Muro de Fuego permanente (muro de lava). **Intangibilidad Logia total** |

### Magia de Tierra (Componente Solido del Magma)

| Rango | Habilidad del Sistema | Tecnica One Piece | Notas |
|-------|----------------------|-------------------|-------|
| R1 | **Pedrada** (2d6+SAB) | Roca de magma enfriado | 2d6+7. 2 acciones |
| R1 | **Crear Obstaculo** | Barrera de roca volcanica | Cobertura instantanea |
| R1 | **Terratemblor** (AoE 2d6+tropezar) | Impacto sismico de magma | 2d6+7 + derribo. 1 chi |
| R2 | **Muro de Piedra** (PV=15) | Muro de roca volcanica | PV = Rangox3 = 15. Cubierta total |
| R2 | **Tierra Viva** (3d6+SAB) | Erupcion volcanica del suelo | 3d6+7 en cilindro. Derriba voladores. 1 chi |
| R2 | **Moldear la Tierra** (terreno) | Moldear roca fundida | Ventaja en Tierra en zona moldeada. 1 chi |
| R3 | **Abrazo de la Tierra** (agarre) | Atrapar en magma enfriado | Agarre a distancia. 2 chi |
| R3 | **Forma de la Montana** (piedras flotantes) | Rocas de magma en suspension | 4 piedras (Rango-1). Detener ataques o lanzar |
| R3 | **Invocar Elemental de Tierra** | Invocar elemental de magma | Elemental de roca/magma |
| R4 | **Pilares de la Tierra** (6 pilares) | Pilares de roca volcanica | 6 pilares que elevan. 2 chi |
| R4 | **Derrumbamiento** (destruir estructura) | Destruccion masiva de terreno | Dano + agarrado + cegado. 2 chi |
| R4 | **Espinas de Piedra** (AoE+terreno dificil) | Espinas de roca volcanica | Dano en area + terreno dificil. 2 chi |
| R5 | **Terremoto** (continuo, hechizos gratis) | **Meigou** (destruccion continua) | Sismo continuo. Rondas sucesivas: hechizos de Tierra gratis. 3 chi |
| R5 | **Brecha** (4d10+SAB, fisura) | Fisura de magma en el suelo | 4d10+7. Destruye estructuras. 3 chi |
| R5 | **Bastion de Piedra** (fortaleza/elemental gigante) | Fortaleza volcanica / Golem de magma | Alternativa: Elemental gigante (+40 VT). 3 chi |

### Variante "Ryusei Kazan" (Tierra VI en vez de V)

Para obtener **Lluvia de Meteoritos** (Tierra R6), la build alternativa seria:

| Cambio | De | A |
|--------|----|---|
| Tierra | V (5 pts) | **VI (6 pts)** |
| Ira | III (3 pts) | **II (2 pts)** |

Esto da acceso a:
- **Lluvia de Meteoritos** (4x4d10+SAB, 4 esferas medianas) = **Ryusei Kazan** (punos de magma que caen del cielo). 5 chi.

Pero se pierde Ira Temeraria (inmune miedo/mental) y Hasta el Limite. La version base prioriza Ira III por la inmunidad mental (Justicia Absoluta no se doblega), pero la variante Ryusei Kazan es mas tematica.

### Estilo Coloso (Punos de Magma)

| Rango | Habilidad | Tecnica One Piece |
|-------|-----------|-------------------|
| R1 | **Ataque Poderoso** (+1 dado) | Puno de magma cargado |
| R1 | **Golpe Desestabilizador** (empujar+tropezar) | Impacto devastador |
| R2 | **Gran Barrido** (AoE +1d6) | Barrido de magma |
| R2 | **Lanzamiento** (+1d6 a media) | Lanzar bola de magma |
| R3 | **Golpe Demoledor** (romper escudo/armadura) | Magma derrite defensas |
| R3 | **Golpe Aturdidor** (aturdir) | Golpe de magma aturdidor |
| R4 | **Secuencia de Golpes** (doble ataque) | Doble puno de magma |
| R4 | **Maestria de Estilo** (ventaja+escudos) | Maestria con punos de magma. 4 escudos |

### Fortitud, Ira, Reflejos, Mente

| Rango | Habilidad | Uso en Akainu |
|-------|-----------|---------------|
| Fortitud R1 | **Armadura Natural** (+5 PV, +5 DEF) | Cuerpo de magma endurecido |
| Fortitud R2 | **Resiliencia** (halvear dano) | Absorber terremotos de Barbablanca |
| Fortitud R3 | **Hasta la Muerte** (luchar a 0 PV) | Justicia Absoluta no cae |
| Fortitud R3 | **Constitucion Ferrea** (resist aflicciones) | Inmune a veneno/enfermedad |
| Fortitud R4 | **Muro Viviente** (4 escudos) | Escudos de magma |
| Fortitud R4 | **Aguantar los Elementos** (resist 4 elementos) | Resistencia elemental total |
| Ira R1 | **Ira de Combate** (ventaja+1d6) | Justicia Absoluta enfurecida |
| Ira R2 | **Demostracion Terrorifica** (miedo) | Presencia del Almirante |
| Ira R2 | **Resistencia Salvaje** (-3 dano) | Reduce dano recibido en 3 |
| Ira R3 | **Ira Temeraria** (inmune miedo/mental) | Justicia Absoluta: voluntad indomable |
| Reflejos R1 | **Velocidad Superior** (+1 accion, +2 init) | 4 acciones/turno |
| Reflejos R2 | **Esquiva Asombrosa** (esquivar sorpresas) | Observation Haki |
| Reflejos R2 | **Evasion** (halvear dano) | Esquiva de Almirante |
| Mente R1 | **Mente Desencadenada** (trance mental) | Foco de Justicia Absoluta |
| Mente R1 | **Agilidad Mental** (+3 niveles talento) | Tactica militar, Intimidar |

---

## La Combinacion Fuego + Tierra = MAGMA

La innovacion clave de esta build es que **dos escuelas elementales combinadas crean un elemento compuesto**:

### Fuego provee:
- Calor extremo (dano continuo, quemaduras)
- Intangibilidad (Llama Viviente R5, Forma Elemental R6)
- Explosiones (Bola de Fuego, Lluvia de Brasas)
- Regeneracion por calor (Renacer del Fenix)

### Tierra provee:
- Material solido (muros, pilares, obstaculos)
- Dano contundente masivo (Pedrada, Brecha, Terremoto)
- Control de terreno (Moldear, Espinas, Derrumbamiento)
- Masa y peso (las rocas de magma son pesadas y destructivas)

### Juntos = Magma:
- **Forma Elemental** (Fuego R6) = cuerpo de magma completo
- **Terremoto** (Tierra R5) = destruccion del terreno con magma
- **Erupcion Abrasadora** (Fuego R3) + **Tierra Viva** (Tierra R2) = erupcion volcanica
- **Lluvia de Brasas** (Fuego R5) + **Brecha** (Tierra R5) = Ryusei Kazan + destruccion del suelo

---

## Estrategia de Combate

### Apertura (Turno 1)
1. **Acciones 1-2:** **Infierno Abrasador** (5 chi) — campo de magma ambiental. R1-R2 gratis.
2. **Accion 3:** Activar **Ira de Combate** (ventaja + 1d6).
3. **Accion 4 (Reflejos):** **Terratemblor** gratis (0 chi, R1 de Tierra) o **Aliento de Fuego** gratis.

### Fase de Destruccion (Turno 2-3)
1. **Forma Elemental** (5 chi): Cuerpo de magma. Stats a 12. 40 VT temporal. 6 escudos. Intangible.
2. En Forma Elemental con Infierno activo:
   - **Lluvia de Brasas** (3 chi): 4x(4d10+12) = cuatro explosiones de magma.
   - **Rayo de Plasma** (3 chi): 4d10+12 ignorando TODA defensa = Meigou concentrado.
   - **Terremoto** (3 chi): Sismo continuo que da hechizos de Tierra gratis en rondas sucesivas.

3. **Combo Meigou total:**
   - **Rayo de Plasma** (ignora todo) + **Brecha** (4d10+7 fisura) en el mismo turno.
   - O: **Impacto Mortal** (Coloso R4 — no disponible, max R4 = Secuencia de Golpes) combinado con **Infusion de Fuego** (+3d6 a R6) para punos de magma cuerpo a cuerpo.

### Defensa
- **Forma Elemental:** Inmune a fisico no-magico, aflicciones, toque. Rodeado de Muro de Lava permanente.
- **Llama Viviente** (alternativa mas barata a Forma Elemental): Inmune a fisico, agarres, mental. 2 chi.
- **Muro Viviente** (4 escudos) + **Maestria de Estilo** (4 escudos) = hasta 10 escudos simultaneos.
- **Resiliencia** + **Evasion** para halvear dano.

### Acciones por Turno
- 3 base + 1 (Velocidad Superior) = **4 acciones por turno**.
- 2 reacciones por ronda.

---

## Feedback del Sistema

### Lo que funciona excepcionalmente bien
1. **Fuego + Tierra = Magma** es una combinacion elegante y funcional. Demuestra que el sistema permite crear "elementos compuestos" combinando dos escuelas, lo cual es un punto fuerte del diseno.
2. **Forma Elemental R6** como cuerpo de magma completo captura perfectamente la intangibilidad Logia de Akainu. Stats a 12, inmune a toque, 40 VT temporal — es exactamente el poder de un Almirante.
3. **Rayo de Plasma = Meigou** funciona mecanicamente (ignorar toda defensa) y tematicamente (penetrar cualquier proteccion con magma super-caliente).
4. **Infierno Abrasador + hechizos gratis** captura la idea de que Akainu convierte todo el campo de batalla en un infierno de magma donde sus ataques son constantes e imparables.

### Sugerencias concretas
1. **Un rango "Magia de Magma/Lava"** dedicado seria ideal, requiriendo prerrequisitos en Fuego y Tierra. Esto eliminaria la necesidad de invertir 11 puntos en dos rangos separados y daria habilidades mas tematicas (como "Lava Floor" o "Volcanic Eruption").
2. **Punk Hazard** (cambiar permanentemente el clima de una isla) necesita reglas de "alteracion ambiental permanente a escala geografica." Actualmente, Infierno Abrasador dura 6 rondas. Un efecto permanente requeriria un ritual o habilidad mitica.
3. **La resistencia de Akainu** necesita mas representacion. Peleo 10 DIAS contra Aokiji. Fortitud IV es buena pero no captura endurance de esa escala. Fortitud V (Sanacion Rapida + Una Ultima Resistencia) seria mas apropiada, pero requeriria sacrificar Mente I y reducir otro rango.
4. **"Magma > Fuego"** (Akainu supera las llamas de Ace) deberia ser una interaccion mecanica: Magia de Fuego + Tierra deberia tener ventaja o bonus contra Magia de Fuego pura. Una regla de "elemento superior" seria util.
5. **La Justicia Absoluta de Akainu** podria modelarse como una Debilidad/Motivacion que le de bonus (inmunidad a intimidacion, ventaja contra "criminales") pero penalizadores (no puede retirarse, no puede mostrar piedad).
