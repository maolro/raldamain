# Kaido de las Bestias — Nivel 26 (Mitico, Revisado)

**Raza:** Humano (Oni)
**Concepto:** La Uo Uo no Mi: Modelo Seiryu (Fruta del Pez Mitico: Dragon Azul) modelada como Ascendencia Primigenia (transformacion en dragon) + Fuego (Boro Breath). Kaido es "la criatura mas fuerte del mundo", un ser cuya resistencia es literalmente imposible de superar, capaz de transformarse en un dragon oriental divino.

---

## Estadisticas (Cap: 12 — mitico)

| FUE | DES | CON | INT | SAB | CAR |
|-----|-----|-----|-----|-----|-----|
| 12  | 7   | 12  | 6   | 8   | 8   |

**Justificacion de Stats:**
- **FUE 12 (maximo mitico):** "La criatura mas fuerte del mundo" en combate fisico. Para Estilo Coloso (FUE + Rango). Con Coloso V, tiro = FUE(12) + Rango(5) = 17. Pasiva de Primigenia R4 da +1 FUE (ya en cap 12).
- **CON 12 (maximo mitico):** "Literalmente imposible de matar." Capturado 18 veces, sentenciado a muerte 40 veces, ejecutado multiples veces — y sobrevivio a TODO. Pasiva de Primigenia R6 da +1 CON (ya en cap 12). PV = 3 + 12 + 8 = 23. VT = 2 + 12 + 26 = 40.
- **SAB 8:** Estadistica principal de Ascendencia Primigenia (SAB/CON + Rango). Con Primigenia VI, tiro = SAB(8) + Rango(6) = 14 o CON(12) + Rango(6) = 18. Pasiva de Primigenia R2 da +1 SAB (= 9 con pasiva).
- **CAR 8:** Para Magia de Fuego (CAR + Rango). Con Fuego IV, tiro = CAR(8) + Rango(4) = 12. Presencia abrumadora del Rey de las Bestias.
- **DES 7:** Kaido es sorprendentemente rapido para su tamano. Thunder Bagua es casi imposible de esquivar.
- **INT 6:** No es un estratega intelectual. Es una fuerza de la naturaleza.

## Recursos

- **PV:** 3 + CON(12) + floor(25/3) = 3 + 12 + 8 = **23**
- **VT:** 2 + CON(12) + Nivel(26) = **40**
- **Chi total:** Primigenia VI(12) + Coloso V(10) + Fortitud V(10) + Fuego IV(8) + Ira IV(8) + Reflejos III(6) = **54**

> **Nota sobre Chi:** Los JSONs dicen "Rango + 2". El codigo usa "Rango x 2". Los valores aqui usan Rango x 2. Para Ascendencia Primigenia, el JSON dice "Rango x 2" explicitamente, asi que ambas formulas coinciden.

---

## Rangos (27/27 puntos) — Nivel 26 = 27 puntos de rango

| Rango | Tier | Chi | Habilidades Clave |
|-------|------|-----|-------------------|
| Ascendencia Primigenia VI | R6 | 12 | **Despertar la Bestia** (=Forma Dragon Completa) |
| Estilo Coloso V | R5 | 10 | Impacto Mortal, Impacto Meteoro, Proyeccion de Chi |
| Fortitud V | R5 | 10 | Sanacion Rapida, Una Ultima Resistencia |
| Magia Fuego IV | R4 | 8 | Renacer del Fenix, Torbellino de Fuego, Maestro de las Llamas |
| Ira IV | R4 | 8 | **Golpe de Adrenalina**, Furia Imparable |
| Reflejos III | R3 | 6 | Giro Defensivo, Gran Acrobata |

**Total:** 6 + 5 + 5 + 4 + 4 + 3 = **27 puntos** (correcto para nivel 26)

---

## Mapeo de Habilidades: Uo Uo no Mi (Seiryu) → Sistema Raldamain

### Ascendencia Primigenia (LA TRANSFORMACION DRAGON)

| Rango | Habilidad del Sistema | Tecnica One Piece | Notas |
|-------|----------------------|-------------------|-------|
| R1 | **Aspecto Primigenio** (sentidos animales, inmune terreno natural) | Sentidos de Oni/Dragon | Vision nocturna, olfato, inmune a terreno natural |
| R1 | **Forma de la Bestia** (hibrida: ventaja fisico, +DEF Rango+1) | **Forma Hibrida Humano-Dragon** | Ventaja en TODOS los tiros fisicos. DEF +7 (Rango+1). Dura 6 rondas. Coste de Cordura al terminar |
| R2 | **Fuerza Salvaje** (+1 dado, magico) | Golpe de dragon imbuido | +1 dado magico. Empoderar: +2 dados mas. 1 chi/vigor |
| R2 | **Comunion con la Naturaleza** (2 hechizos divinos R1) | Conexion con las fuerzas naturales | 2 hechizos divinos R1 extras |
| R2 | *Pasiva: +1 SAB* | Instinto animal refinado | SAB sube a 9 |
| R3 | **Transformacion Animal** (bestia completa, 2 mejoras) | **Forma Dragon Oriental** | Transformacion completa en dragon. **Mejoras elegidas: Vuelo + Gigante** (tamano+, alcance+, dano+) |
| R3 | **Llamar a los Espiritus** (invocar nivel <= Rangox2=12) | Invocar bestias / espiritus | Invocar criaturas nivel 12 o menor. Max 4 |
| R4 | **Vinculo Primigenio** (resist 5 elementos) | **Escamas de Dragon** (resistencia elemental) | Resistencia a Fuego, Frio, Electrico, Sonico, Radiante. Inmune a criticos de estos tipos |
| R4 | **Sanacion Espiritual** (regen Rango=6 VT/turno) | Regeneracion draconiana | 6 VT por turno automaticamente. Reduce heridas |
| R4 | *Pasiva: +1 FUE, +2 hechizos R2* | Poder fisico draconiano | FUE ya en cap 12. 2 hechizos divinos R2 extras |
| R5 | **Aura Primigenia** (resist arcano/divino) | Resistencia magica del dragon | Resiste magia arcana y divina. 50% fallo a objetos magicos cercanos |
| R5 | **Portal Espiritual** (plano espiritual, +3 acciones extra) | **Dimension del dragon** | En plano espiritual: +3 acciones extra (dilatacion temporal). 3 chi/vigor |
| **R6** | **Despertar la Bestia** (avatar) | **FORMA DRAGON COMPLETA / KAIDO SUPREMO** | Ver seccion dedicada abajo |
| R6 | *Pasiva: +1 CON, +2 hechizos R3* | Constitucion draconiana suprema | CON ya en cap 12. 2 hechizos divinos R3 extras |

### Despertar la Bestia R6: LA FORMA DRAGON DEFINITIVA

**Costo:** 3 acciones, 5 chi/vigor
**Duracion:** 6 rondas

Efectos:
- **+40 Vitalidad Temporal** — capa extra de resistencia masiva
- **Stats fisicas a 12** — FUE, DES, CON todas a 12 (ya tiene FUE y CON en 12, DES sube de 7 a 12)
- **DEF 20** — defensa casi impenetrable
- **Inmunidad a Mental/Miedo/Aflicciones/Toque** — el dragon ignora efectos menores
- **Tamano +1** — dragon colosal
- **Ataques naturales 1d10 (Material III)** — garras, colmillos, cola
- **Vuelo 1** — el dragon vuela
- **6 Contadores de Escudo** — 6 escudos automaticos
- **Hechizos gratis** (los de Comunion con la Naturaleza)
- **Conoces Estilo Salvaje (R3 gratis)** — tecnicas de combate animal

**Esto es el Dragon Kaido.** El dragon oriental gigante que flota sobre Onigashima, inmune a casi todo, con DEF 20 y 40 VT extra. Para danarlo, necesitas superar DEF 20 + 6 escudos + las resistencias elementales + la reduccion de dano pasiva. Es un boss de RPG definitivo.

### Magia de Fuego (Boro Breath y ataques de fuego del dragon)

| Rango | Habilidad del Sistema | Tecnica One Piece | Notas |
|-------|----------------------|-------------------|-------|
| R1 | **Llamarada** (1d6+CAR) | Llamarada basica de dragon | 1d6+8 |
| R1 | **Aliento de Fuego** (cono 2d6+CAR) | **Boro Breath** (basico) | Cono de fuego de dragon. 2d6+8. 1 chi |
| R1 | **Fuego Interno** (resist fuego/frio) | Inmunidad termica del dragon | Resiste fuego y frio |
| R2 | **Muro de Llamas** (PV=12) | Barrera de fuego del dragon | PV = Rangox3 = 12 |
| R2 | **Bola de Fuego** (2d6+CAR, AoE) | **Boro Breath** (AoE) | Explosion de fuego. 2d6+8. 1 chi |
| R2 | **Infusion de Fuego** (+2d6 a R4) | Garras/cola infundidas con fuego | +2d6 dano fuego en armas. +3d6 a R6 (no aplica, Fuego IV) |
| R3 | **Erupcion Abrasadora** (3d8+CAR) | **Kaen Daiko** (percusion de llamas) | Explosion centrada en Kaido. 3d8+8. 2 chi |
| R3 | **Propulsion** (vuelo) | Propulsion con fuego del dragon | Vuelo extra ademas de vuelo de Primigenia |
| R4 | **Renacer del Fenix** (curar 8 VT) | Regenerar en fuego | Regenera en zona de fuego. Rangox2 = 8 VT. 1 chi |
| R4 | **Torbellino de Fuego** (2d8+CAR) | **Kaifu** (viento cortante flamigero) | Torbellino de fuego movil. 2d8+8. 2 chi |
| R4 | **Maestro de las Llamas** (ventaja+escudos=4) | Maestria draconiana del fuego | Ventaja + 4 escudos. 2 chi |

### Estilo Coloso (Thunder Bagua y potencia con Kanabo)

| Rango | Habilidad del Sistema | Tecnica One Piece | Notas |
|-------|----------------------|-------------------|-------|
| R1 | **Ataque Poderoso** (+1 dado) | Golpe de kanabo cargado | +1 dado |
| R1 | **Golpe Desestabilizador** (empujar+tropezar) | Kanabo sweep | Empuja + derriba |
| R2 | **Gran Barrido** (AoE +1d6) | Barrido de kanabo masivo | Radio corto. +1d6 |
| R2 | **Guardia Fluida** (atacar como reaccion) | Defensa con kanabo | Ataca a cada criatura que se acerque |
| R2 | **Lanzamiento** (+1d6 a media) | Lanzar escombros/rocas | +1d6 a distancia media |
| R3 | **Golpe Demoledor** (romper escudos/armadura) | Romper defensas con kanabo | Destruye escudos y armaduras |
| R3 | **Carga Salvaje** (linea+ataque multiple) | Thunder Bagua en linea | Mover en linea + atacar a cada enemigo |
| R3 | **Golpe Aturdidor** (aturdir) | **Thunder Bagua** (aturdir) | Aturde 1 ronda. **LA tecnica emblematica.** 2 chi |
| R4 | **Golpe Ascendente** (anti-air +2d6) | Kanabo uppercut | +2d6 contra voladores |
| R4 | **Secuencia de Golpes** (doble ataque) | Doble Thunder Bagua | 2 ataques, 1 defensa. Empuja y persigue |
| R4 | **Maestria de Estilo** (ventaja+escudos=5) | Maestria del kanabo | Ventaja + 5 escudos. 2 chi |
| **R5** | **Impacto Meteoro** (salto AoE 2d6) | **Ragnaraku** (golpe descendente) | Salta 2 pasos + 2d6 a todos. Destruye estructuras. 3 chi |
| **R5** | **Impacto Mortal** (3d6+herida grave+romper) | **Kosanze Ragnaraku** (golpe definitivo) | 3d6 extra + herida grave + destruye escudos/armadura. 1 accion + 3 chi |
| **R5** | **Proyeccion de Chi** (magico, alcance medio) | **Haki avanzado** | Dano magico. Alcance medio. Detiene magia |

### Fortitud (INDESTRUCTIBLE)

| Rango | Habilidad | Representacion | Notas |
|-------|-----------|----------------|-------|
| R1 | **Armadura Natural** (+6 PV, +6 DEF) | Escamas de Oni/Dragon | +6 PV (=29 total) y +6 DEF. Rango V + 1 |
| R1 | **Segundo Aliento** (7 VT) | Regeneracion natural | 7 VT por 1 vigor |
| R2 | **Duro de Pelar** | Inmovible | Resist aturdir, sonico, maniobras |
| R2 | **Resiliencia** (halvear dano) | Absorber impactos | 1 vigor |
| R3 | **Hasta la Muerte** (luchar a 0 PV) | **No puede morir** | Lucha a 0 PV |
| R3 | **Constitucion Ferrea** (resist aflicciones) | Inmune a veneno/enfermedad | Resist aflicciones y necrotico |
| R4 | **Muro Viviente** (5 escudos) | Escamas como escudo | 5 escudos. 2 vigor |
| R4 | **Aguantar los Elementos** (resist 4 elementos) | Resistencia elemental total | Resist fuego/frio/acido/electrico |
| **R5** | **Sanacion Rapida** (7 VT/turno) | **Regeneracion constante** | 7 VT por turno automaticamente |
| **R5** | **Una Ultima Resistencia** (full heal a 0 PV) | **Levantarse de nuevo** | Full heal: 40 VT + 11 PV. 1 vez/descanso |

### Ira (La Bestia Enfurecida)

| Rango | Habilidad | Uso | Notas |
|-------|-----------|-----|-------|
| R1 | **Ira de Combate** (ventaja+1d6) | Furia de la bestia | Ventaja + 1d6. Max 6 rondas |
| R2 | **Demostracion Terrorifica** (miedo) | **Haoshoku Haki** | Radio medio de miedo. 1 vigor |
| R2 | **Resistencia Salvaje** (-4 dano) | Ignorar heridas menores | -4 dano a cada ataque |
| R3 | **Ira Temeraria** (inmune miedo/mental) | Voluntad del Rey de las Bestias | Inmune a miedo y mental |
| R3 | **Hasta el Limite** (VT→vigor) | Sacrificar salud por poder | -2 VT max → +1 vigor |
| **R4** | **Golpe de Adrenalina** (+1 accion, +1 reaccion) | **Modo Borracho: burst** | +1 accion y +1 reaccion. Evita sorpresas |
| **R4** | **Furia Imparable** (cancelar defensa enemiga) | **Poder irresistible del dragon** | Si enemigo bloquea tu ataque, cancelas su defensa. 2 vigor |

### Reflejos

| Rango | Habilidad | Uso |
|-------|-----------|-----|
| R1 | **Velocidad Superior** (+1 accion, +3 init) | Velocidad imposible para su tamano |
| R1 | **Instinto de Supervivencia** (reroll DES) | 5 rerolls por combate |
| R2 | **Esquiva Asombrosa** (esquivar sorpresas) | Observation Haki |
| R2 | **Evasion** (halvear dano) | Esquiva draconiana |
| R3 | **Giro Defensivo** (-4 dano) | Reduccion pasiva de dano |
| R3 | **Gran Acrobata** (inmune terreno dificil) | Moverse sobre cualquier terreno |

---

## Resumen de Acciones y Defensas

### Acciones por Turno (Forma Normal)
- 3 base + 1 (Velocidad Superior) + 1 (Golpe de Adrenalina) = **5 acciones por turno**.
- 2 base + 1 (Golpe de Adrenalina) = **3 reacciones por ronda**.

### Acciones por Turno (Despertar la Bestia activo)
- Mismas 5 acciones, pero con stats fisicas a 12, DEF 20, 6 escudos, vuelo, ataques naturales 1d10.
- Estilo Salvaje R3 gratis proporciona tecnicas adicionales de combate animal.

### Reduccion de Dano Acumulada (en Despertar la Bestia)
1. **DEF 20** (Despertar la Bestia).
2. **Giro Defensivo** (Reflejos R3): -4 dano.
3. **Resistencia Salvaje** (Ira R2): -4 dano.
4. **6 Escudos** (Despertar la Bestia) + **5 Escudos** (Muro Viviente) + **5 Escudos** (Maestria de Estilo) = hasta **16 escudos**.
5. **Vinculo Primigenio**: Resistencia a Fuego, Frio, Electrico, Sonico, Radiante.
6. **Aguantar los Elementos**: Resistencia a Fuego, Frio, Acido, Electrico.
7. **Fuego Interno**: Resistencia a Fuego y Frio.
8. **Sanacion Rapida**: 7 VT/turno.
9. **Sanacion Espiritual**: 6 VT/turno (en forma dragon).
10. **Regeneracion total:** 7 + 6 = **13 VT por turno**.
11. **Resiliencia**: Halvear un ataque.

**Para matar a Kaido hay que superar: DEF 20, -8 reduccion plana, resistencias elementales multiples, 16 escudos potenciales, y 13 VT de regeneracion por turno.** Y si llegas a 0 PV, Una Ultima Resistencia restaura toda la VT + 11 PV.

---

## Estrategia de Combate

### Fase 1: Dragon Aereo
1. **Turno 1:** Activar **Despertar la Bestia** (3 acciones, 5 chi) + **Ira de Combate** (automatico, 0 acciones de coste real en estado trance de Ira) + posicionamiento aereo.
2. **Turno 2+:** Volar sobre el campo y lanzar:
   - **Aliento de Fuego** (Boro Breath): Cono 2d6+CAR(ahora 12 en forma dragon). 1 chi.
   - **Bola de Fuego** (Boro Breath AoE): 2d6+12. 1 chi.
   - **Erupcion Abrasadora**: 3d8+12 centrada. 2 chi.
   - Ataques naturales 1d10 contra quien se acerque al dragon.

### Fase 2: Forma Hibrida (cuando el enemigo resiste)
1. Despues de que Despertar la Bestia termine (6 rondas), usar **Forma de la Bestia** (R1 Primigenia) para forma hibrida: Ventaja fisica, +7 DEF.
2. Combate cuerpo a cuerpo con kanabo:
   - **Golpe Aturdidor** (Thunder Bagua): 2 chi, aturde 1 ronda.
   - **Impacto Mortal** (Ragnaraku): 3d6 extra + herida grave + destruye todo.
   - **Secuencia de Golpes**: 2 ataques, 1 defensa.
   - **Furia Imparable**: Si bloquean, cancela la defensa.

### Fase 3: Endurance (cuando cae a 0 PV)
1. **Hasta la Muerte**: Sigue luchando a 0 PV.
2. **Una Ultima Resistencia**: Full heal (40 VT + 11 PV).
3. Despues del heal: Re-activar Ira de Combate y seguir luchando.
4. **Sanacion Rapida**: 7 VT/turno incluso moribundo.

---

## Feedback del Sistema

### Lo que funciona excepcionalmente bien
1. **Ascendencia Primigenia R6 = Uo Uo no Mi: Seiryu** es el ENCAJE DEFINITIVO del sistema. Despertar la Bestia fue literalmente disenada para representar transformaciones en criaturas miticas — y el Dragon Azul de Kaido es la criatura mitica por excelencia. Stats a 12, DEF 20, 40 VT temporal, vuelo, 6 escudos, inmunidad a mental/miedo/aflicciones: ES Kaido dragon.
2. **La triple regeneracion** (Sanacion Rapida + Sanacion Espiritual + Segundo Aliento = 13+ VT/turno) captura perfectamente por que Kaido es "imposible de matar". Necesitas un dano masivo sostenido para superar la regeneracion.
3. **Coloso V + Ira IV** permite que Thunder Bagua (Golpe Aturdidor) sea devastador: con Ventaja (Ira) + 1d6 (Ira) + Ataque Poderoso (+1 dado), un solo golpe puede noquear a un comandante Yonkou.
4. **La escala del personaje** (nivel 26, 27 puntos de rango) justifica plenamente la existencia de niveles miticos. Un nivel 20 no puede representar a Kaido.

### Sugerencias concretas
1. **El Modo Borracho** (cambiar estilos de pelea segun estado emocional) necesita una habilidad dedicada: "Cambia tu estilo de combate como accion libre. Cada estilo tiene distintos bonus/penalizadores." Esto es unico de Kaido y no tiene equivalente.
2. **El kanabo de Kaido** deberia ser un item mitico con dano adicional de trueno/rayo (+1d6 electrico) y efecto de "aturdimiento mejorado" (salvacion con desventaja).
3. **Las Nubes de Llamas** (Homuragumo, que permite hacer flotar Onigashima) deberian ser una habilidad de Primigenia o un combo Fuego+Aire. Actualmente la build no tiene Magia de Aire, lo cual es una perdida tematica, pero las acciones y puntos son demasiado limitados.
4. **La interaccion entre Despertar la Bestia y Forma de la Bestia** deberia clarificarse: Despertar la Bestia probablemente reemplaza Forma de la Bestia, no se acumula.
5. **Kaido a nivel 26 con 27 puntos captura bien su poder**, pero en Wano (post-awakening, final fight vs Gear 5) probablemente seria nivel 28+ con acceso a habilidades miticas aun mas poderosas. El Despertar de la Uo Uo (si existe) requeriria reglas adicionales.
6. **La debilidad de Kaido** (su deseo de muerte, buscar un oponente digno) podria modelarse como una Motivacion que le impida huir del combate y le de bonus contra enemigos que lo desafien directamente, pero penalizadores cuando no tiene un "rival digno".
