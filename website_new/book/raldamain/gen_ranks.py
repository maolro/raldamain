"""Generate book/raldamain/rangos/*.typ from data/ranks/*.json"""
import json, os, glob, re

BASE   = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'ranks')
OUT    = os.path.join(os.path.dirname(__file__), 'rangos')
os.makedirs(OUT, exist_ok=True)

# Expanded one-paragraph introductions for each rank
EXPANDED_DESCRIPTIONS = {
    "ascendencia_abisal": (
        "La sangre abisal despierta en ti como un hambre que no puede saciarse. "
        "Canalizas el poder de entidades olvidadas que habitaron el mundo antes que los dioses actuales, "
        "transformando tu cuerpo y mente en algo que ya no es completamente humano. "
        "A medida que tu poder crece, tu apariencia cambia: cuernos, piel endurecida, ojos sin iris. "
        "El precio es tu cordura y humanidad, que se erosionan con cada uso del poder. "
        "Quienes dominan la Ascendencia Abisal son seres temidos por igual por sus enemigos y sus aliados."
    ),
    "ascendencia_akhasica": (
        "El Akhasa es la memoria cósmica del universo: el registro inmutable de todo cuanto ha ocurrido "
        "y todo cuanto puede ocurrir. Al conectarte con él, tu mente se expande más allá de los límites "
        "físicos, accediendo a fragmentos de conocimiento prohibido. Ves el pasado de quienes te rodean, "
        "anticipas los golpes antes de que ocurran y mueves los hilos del destino con sutileza quirúrgica. "
        "Sin embargo, ninguna mente mortal fue diseñada para soportar el peso de todo lo que es y ha sido: "
        "la cordura es el primer sacrificio."
    ),
    "ascendencia_celestial": (
        "El poder de la Hueste Celestial desciende sobre ti como luz que no puede ser sofocada. "
        "No eres un dios, pero eres su eco en el mundo mortal: un faro de curación y destrucción en igual medida. "
        "Tu cuerpo se transforma con el paso del tiempo, desarrollando rasgos angélicos mientras tu presencia "
        "irradia una autoridad que hace retroceder a los no-muertos. "
        "Con la Ascendencia Celestial aprendes que la gracia y la furia son la misma moneda: "
        "las criaturas del mal se deshacen ante ti como cera ante la llama."
    ),
    "ascendencia_infernal": (
        "Una voz del más allá conoce tu nombre y te ofrece un trato sin precio visible. "
        "La Ascendencia Infernal no es solo poder: es una transformación fundamental de lo que eres, "
        "reescribiendo tu cuerpo con la esencia de los señores de la Sima. "
        "Tu piel endurece, tus ojos arden, y adquieres una presencia que fascina y aterra a partes iguales. "
        "A medida que progresas, la línea entre tú y la entidad que te otorgó el poder se vuelve cada vez más difusa. "
        "Los que dominan esta ascendencia pueden desatar ejércitos infernales, pagando cada vez más de su humanidad."
    ),
    "ascendencia_primigenia": (
        "Antes de que los dioses dieran forma al mundo, la naturaleza ya existía: "
        "vasta, impredecible y completamente indiferente a los asuntos mortales. "
        "La Ascendencia Primigenia te conecta con esas fuerzas anteriores a toda civilización, "
        "haciendo de ti un eslabón entre el mundo material y el espiritual. "
        "Con el tiempo aprendes a adoptar formas bestiales, invocar espíritus y sanar heridas con energía vital pura. "
        "Los druidas, chamanes y guardianes de los bosques prohibidos son quienes más frecuentemente despiertan este poder."
    ),
    "bombas": (
        "Mientras otros buscan el poder en la magia o la fe, tú lo encuentras en la química y la física. "
        "La Ciencia de las Bombas no requiere talento mágico ni gracia divina: "
        "solo inteligencia, paciencia y la disposición a comprender cómo funciona el mundo para usarlo en tu contra. "
        "Tu repertorio va desde granadas de metralla y cegadores hasta bombas de ácido y gases tóxicos "
        "que transforman el campo de batalla en una trampa letal. "
        "En manos expertas, un solo alquimista bien equipado puede cambiar el curso de una batalla."
    ),
    "estilo_asesino": (
        "El Estilo Asesino no es brutalidad: es eficiencia llevada al extremo. "
        "Cada movimiento tiene un propósito, cada golpe apunta a los puntos donde el dolor es mayor "
        "y la recuperación más lenta. "
        "Aprendes a desaparecer antes de que el enemigo sepa que estabas ahí, a atacar desde ángulos imposibles "
        "y a explotar cada fracción de segundo de vulnerabilidad. "
        "Los practicantes del Estilo Asesino terminan los combates en los primeros intercambios, "
        "o no los terminan bien."
    ),
    "estilo_coloso": (
        "Cuando el Coloso entra en combate, el suelo tiembla. "
        "Las armas de dos manos en manos de un experto no son solo armas: "
        "son herramientas de demolición que derriban muros y rompen formaciones enteras. "
        "El Estilo Coloso sacrifica la gracia y la defensa por una filosofía simple: "
        "quien reciba un golpe tuyo no volverá a levantarse con facilidad. "
        "A medida que el rango crece, el Coloso aprende a proyectar su chi a través del arma, "
        "convirtiendo sus ataques en fuerzas de la naturaleza que ninguna armadura puede ignorar."
    ),
    "estilo_duelista": (
        "El Duelista no combate: negocia. "
        "Cada parada es una respuesta, cada finta una pregunta, y cada golpe la conclusión lógica "
        "de un argumento que el oponente no supo refutar. "
        "El Estilo Duelista perfecciona el arte del combate individual, convirtiendo la esgrima en un lenguaje "
        "con el que el practicante expresa superioridad técnica sobre cualquier adversario. "
        "Los mejores duelistas resuelven un combate sin recibir un solo golpe, "
        "usando las defensas propias para crear las oportunidades que terminan la pelea."
    ),
    "fortitud": (
        "Fortitud no es glamoroso: es el rango que convierte a un guerrero en algo imparable. "
        "Donde otros fallan por el dolor, el cansancio o las heridas, el practicante de Fortitud simplemente continúa. "
        "Esta disciplina desarrolla la resistencia física hasta límites sobrehumanos, "
        "haciendo que el cuerpo ignore señales de alarma que paralizarían a cualquier mortal corriente. "
        "En el campo de batalla, la Fortitud no se traduce en golpes más poderosos, "
        "sino en que el practicante sigue siendo una amenaza cuando el resto del grupo ya no puede pelear."
    ),
    "guerrero_divino": (
        "Los dioses no solo bendicen a sus sacerdotes: también empuñan su poder a través de guerreros, "
        "héroes y cruzados que llevan su voluntad a los rincones más oscuros del mundo. "
        "El Guerrero Divino no reza: actúa. "
        "Su fe se manifiesta en acero, en milagros menores que doblan el curso de las batallas "
        "y en una presencia que infunde esperanza en sus aliados y terror en sus enemigos. "
        "Con el tiempo, el poder divino impregna cada aspecto de su combate hasta convertirlo en un santo viviente: "
        "una extensión de la voluntad de su dios en el mundo mortal."
    ),
    "ira": (
        "La Ira no es una emoción negativa para el guerrero berserker: es una herramienta. "
        "Canalizando la furia como combustible, el practicante quiebra los límites físicos del cuerpo humano, "
        "moviéndose más rápido, golpeando más fuerte y resistiendo daño que detendría a cualquier otro. "
        "El precio es el control: en el trance de Ira, el mundo se reduce a objetivos y obstáculos. "
        "Los practicantes aprenden a surfear ese límite entre la eficacia devastadora "
        "y la pérdida total de control, encontrando en ese equilibrio precario su mayor fortaleza."
    ),
    "magia_agua": (
        "El agua no destruye con la violencia del fuego ni la contundencia de la tierra: "
        "erosiona, envuelve y aplasta con paciencia infinita. "
        "Los maestros del agua comprenden que la verdadera fortaleza no es la rigidez sino la adaptabilidad: "
        "fluir alrededor de los obstáculos y encontrar siempre el camino hacia abajo. "
        "Este rango ofrece desde tentáculos que aprisionan hasta olas devastadoras, "
        "desde lluvias curativas hasta corrientes capaces de arrastrar fortalezas. "
        "El agua en todas sus formas obedece a quien ha aprendido a escucharla."
    ),
    "magia_aire": (
        "El aire es el elemento más libre y el más ignorado hasta que desaparece. "
        "Los manipuladores del aire comprenden que el viento no es solo movimiento: "
        "es presión, temperatura, corriente y el espacio entre todas las cosas. "
        "Este rango domina la movilidad y el control del campo de batalla por encima de todo, "
        "convirtiendo al practicante en una presencia que el enemigo no puede encuadrar ni predecir. "
        "En sus formas más avanzadas, la Magia de Aire convoca huracanes, asfixia ejércitos "
        "y puede manipular el clima de una región entera."
    ),
    "magia_divina": (
        "La Magia Divina no es técnica ni estudio: es relación. "
        "El clérigo que domina este rango ha forjado un vínculo con su dios "
        "lo suficientemente profundo como para canalizar milagros en el mundo mortal. "
        "Sus oraciones tienen respuesta en forma de bendiciones que doblan el curso de las batallas, "
        "maldiciones que consumen a los infieles y consagraciones que hacen la tierra santa. "
        "A medida que la fe crece, el dominio específico del dios elegido se manifiesta "
        "en habilidades únicas que ningún otro rango puede replicar."
    ),
    "magia_espacial": (
        "Para el maestro de la Magia Espacial, la distancia no es una realidad: es una sugerencia. "
        "Este rango reescribe las reglas del campo de batalla al permitir teletransporte instantáneo, "
        "apertura de portales y manipulación de las posiciones relativas de cualquier criatura u objeto. "
        "Las líneas que separan un lugar de otro se vuelven permeables ante su voluntad. "
        "En sus niveles más altos, el practicante puede plegar el espacio a su alrededor, "
        "impedir que los enemigos huyan y mover a sus aliados en el tiempo que tarda un parpadeo."
    ),
    "magia_evocacion": (
        "La Evocación es el arte de convertir chi en destrucción pura. "
        "Sin necesitar un elemento específico, el evocador moldea la energía mágica en formas "
        "que queman, fragmentan y aplanan en ráfagas que no discriminan entre objetivo y entorno. "
        "Es el rango mágico más directo y más peligroso: en manos expertas, "
        "un solo hechizo de Evocación puede terminar una batalla. "
        "Requiere también la mayor concentración de todos los rangos arcanos, "
        "pues la energía liberada no distingue amigo de enemigo si la mente que la dirige vacila."
    ),
    "magia_fuego": (
        "El fuego es el elemento más antiguo de la civilización: "
        "fuente de calor, herramienta de destrucción y símbolo de transformación. "
        "Los maestros de la Magia de Fuego comprenden que las llamas no son simplemente calor: "
        "son energía con voluntad propia que consume, purifica y renueva. "
        "Este rango convierte ese entendimiento en un arsenal de llamaradas, explosiones y muros de fuego "
        "que niegan el movimiento enemigo mientras el practicante canaliza las llamas para protegerse. "
        "En sus expresiones más avanzadas, el fuego obedece como un segundo cuerpo."
    ),
    "magia_gravitatoria": (
        "La gravedad es la fuerza más silenciosa y más absoluta del universo. "
        "La Magia Gravitatoria opera sobre esta verdad invisible, "
        "curvando la atracción entre objetos para crear efectos que ningún otro rango puede replicar. "
        "Aplasta armaduras desde dentro, lanza enemigos al cielo y los trae de vuelta con fuerza fatal, "
        "crea zonas donde el movimiento es imposible "
        "y permite al practicante avanzar por superficies verticales o volar sin necesidad de alas. "
        "Es una magia discreta en su operación y devastadora en sus resultados."
    ),
    "magia_hielo": (
        "El frío no mata de golpe: inmoviliza primero y mata después. "
        "La Magia de Hielo ha sido perfeccionada por maestros que entendieron "
        "que la congelación del movimiento es más valiosa que el daño directo. "
        "Este rango crea armas de hielo en tiempo real, erige muros que cortan el campo de batalla "
        "y desata ventiscas que reducen la visión y la velocidad del enemigo a cero. "
        "En sus expresiones más avanzadas, el practicante puede crear un invierno localizado "
        "que convierte el terreno en su dominio exclusivo."
    ),
    "magia_ilusoria": (
        "La ilusión perfecta es indistinguible de la realidad, y la Magia Ilusoria persigue esa perfección. "
        "Los practicantes de este rango no atacan el cuerpo directamente: atacan la mente, "
        "creando imágenes que confunden, sonidos que desorientan y sensaciones que paralizan. "
        "En sus formas avanzadas, las ilusiones se vuelven tan convincentes "
        "que el cerebro del objetivo las acepta como reales, "
        "permitiendo que un monstruo ilusorio cause daño psicosomático genuino. "
        "La mejor defensa contra un maestro de las ilusiones es dudar de todo lo que ves."
    ),
    "magia_mental": (
        "La mente es el último bastión de la autonomía individual, "
        "y la Magia Mental es la llave que abre esa fortaleza desde fuera. "
        "Los practicantes de este rango no necesitan espadas ni hechizos destructivos: "
        "tienen acceso directo a los miedos, los recuerdos y la voluntad de quienes los rodean. "
        "Pueden convertir a un enemigo en aliado, extraer secretos sin tortura "
        "o sembrar la paranoia dentro de un ejército entero. "
        "El precio es la proximidad constante al abismo psíquico: "
        "quien con frecuencia entra en mentes ajenas corre el riesgo de perderse en ellas."
    ),
    "magia_metal": (
        "El metal está en todas partes donde hay civilización: "
        "en las armas, en las armaduras, en los cimientos de las ciudades y en las monedas que mueven el mundo. "
        "La Magia de Metal convierte esa omnipresencia en una ventaja táctica sin igual. "
        "No es el elemento más destructivo ni el más versátil, pero ninguno es más preciso: "
        "el practicante puede arrancar espadas de manos, guiar proyectiles metálicos con exactitud mortal "
        "y desatar tormentas de fragmentos que barren toda protección. "
        "A los rangos superiores, el metal obedece como una extensión del cuerpo del practicante."
    ),
    "magia_protectora": (
        "Donde otros aprendieron a atacar, el practicante de Magia Protectora aprendió a negar. "
        "Este rango domina los escudos de fuerza, la disipación de hechizos "
        "y la creación de campos antimágicos que convierten al practicante "
        "en el peor enemigo de cualquier mago. "
        "Su valor en un grupo no se mide en daño infligido sino en daño absorbido: "
        "la Magia Protectora puede neutralizar amenazas que derrotarían a todo el grupo por sí solas, "
        "convirtiendo a su portador en un muro que ningún hechizo atraviesa fácilmente."
    ),
    "magia_sombria": (
        "El Plano Sombrío es el espejo oscuro del mundo material: "
        "un lugar donde la luz no llega y los sueños se pudren hasta convertirse en pesadillas. "
        "Los maestros de la Magia Sombría han aprendido a extraer energía de ese lugar y usarla en el mundo real, "
        "drenando la vitalidad de sus enemigos, creando oscuridad impenetrable "
        "y materializando los miedos de quienes se atreven a enfrentarlos. "
        "Es una magia lenta y deliberada, especializada en control y desgaste: "
        "quien lucha contra un maestro de las sombras descubre que el verdadero combate ocurre en la mente."
    ),
    "magia_temporal": (
        "El tiempo no es un río: es un tejido, y la Magia Temporal tira de sus hilos con manos expertas. "
        "Los practicantes de este rango aprenden primero a percibir el tiempo de manera diferente: "
        "ven fracciones de segundo que otros ignoran y anticipan movimientos antes de que ocurran. "
        "Con experiencia, pueden revertir daños menores, acelerar aliados o ralentizar enemigos. "
        "En sus expresiones más poderosas, la Magia Temporal puede detener el tiempo "
        "o reescribir eventos enteros de una batalla. "
        "Es el rango más raro y difícil de dominar, y sus usuarios son considerados "
        "algunos de los practicantes más peligrosos del continente."
    ),
    "magia_tierra": (
        "La tierra no se apresura. La Magia de Tierra comparte esa filosofía: "
        "lenta, implacable y absolutamente devastadora cuando llega. "
        "Los practicantes de este rango aprenden a levantar muros, hundir el suelo bajo los enemigos "
        "y lanzar rocas del tamaño de casas. "
        "Su defensa es igualmente formidable: la tierra puede solidificarse alrededor del practicante "
        "como una armadura viva o erigirse como un bastión que transforma cualquier terreno en fortaleza. "
        "Quien se enfrenta a un maestro de Tierra se enfrenta al terreno mismo."
    ),
    "magia_tormenta": (
        "La tormenta no es un elemento: es una colaboración entre el aire, el agua y la electricidad, "
        "y quien domina la Magia de Tormenta domina su sinergia. "
        "Este rango explota la conductividad del entorno para multiplicar el alcance de sus ataques, "
        "convirtiendo superficies mojadas y estructuras metálicas en extensiones de su voluntad. "
        "Sus practicantes se mueven con la velocidad del relámpago y hablan con la voz del trueno. "
        "En su cúspide, un maestro de tormenta puede invocar un apocalipsis climático localizado "
        "que disuelve formaciones enteras de enemigos."
    ),
    "magia_vida": (
        "La vida no es simplemente ausencia de muerte: es una fuerza activa que fluye a través de todo ser viviente "
        "y puede ser canalizada, amplificada y dirigida por quienes aprenden a escucharla. "
        "La Magia de Vida domina la sanación en todas sus formas, "
        "desde cerrar heridas hasta purgar venenos y revertir daños imposibles para la medicina ordinaria. "
        "Pero la vida también puede ser un arma: la misma energía que cura puede quemar a los no-muertos "
        "y castigar a quienes pervierten la fuerza natural. "
        "Los maestros de este rango son los guardianes más preciados de cualquier grupo."
    ),
    "mente_desencadenada": (
        "La Mente Desencadenada persigue la pregunta más antigua de la filosofía: "
        "¿qué sería una mente sin las limitaciones que le impone el cuerpo? "
        "Los practicantes de este rango aprenden a desvincularse del mundo físico "
        "hasta niveles que la mayoría consideraría peligrosos, "
        "alcanzando una claridad cognitiva que permite resolver cualquier problema con velocidad sobrehumana. "
        "El precio es la cordura: cada escalón hacia la claridad perfecta "
        "es un escalón alejándose de la experiencia ordinaria de ser humano. "
        "Los practicantes suelen parecer perturbadores incluso en los rangos iniciales."
    ),
    "nigromancia": (
        "La muerte no es el fin: es una transición. "
        "La Nigromancia domina ese umbral, manipulando la energía que queda en los cuerpos "
        "y el plano que habitan las almas que se niegan a cruzar. "
        "Los nigromantes levantan ejércitos de no-muertos que obedecen sin cuestionamientos, "
        "drenan la vitalidad de los vivos y transmiten enfermedades a través del espacio. "
        "Es la magia más temida y más prohibida del continente, y con razón: "
        "un nigromante sin escrúpulos puede acumular un ejército de los caídos de sus propios enemigos."
    ),
    "rastrear": (
        "El rastreador entiende que el campo de batalla no es solo el espacio entre dos ejércitos: "
        "es el terreno, el clima, la oscuridad y las mil pequeñas ventajas "
        "que el entorno ofrece a quien sabe leerlas. "
        "Este rango perfecciona el arte de la observación, el movimiento silencioso y la emboscada, "
        "convirtiendo al practicante en una amenaza que el enemigo nunca ve venir. "
        "Más allá del combate, el Rastreador es invaluable en exploración y supervivencia, "
        "capaz de seguir rastros imposibles, curar heridas en campo "
        "y guiar a un grupo a través de terrenos que matarían a cualquier otro."
    ),
    "reflejos": (
        "El Rango de Reflejos convierte el instante entre el ataque y el impacto "
        "en el espacio de trabajo del practicante. "
        "Donde otros reaccionan al peligro, quien domina los Reflejos ya ha terminado de responder. "
        "Esta disciplina entrena el cuerpo para moverse antes de que la mente consciente registre la amenaza, "
        "creando esquivas que parecen predecir el futuro "
        "y contraataques que llegan antes de que el ataque original alcance su objetivo. "
        "En sus niveles superiores, los Reflejos permiten evadir proyectiles a distancias que desafían la física."
    ),
}


def strip_html(s):
    if not s: return ""
    s = re.sub(r'<strong>(.*?)</strong>', r'*\1*', s, flags=re.I|re.S)
    s = re.sub(r'<b>(.*?)</b>',         r'*\1*', s, flags=re.I|re.S)
    s = re.sub(r'<i>(.*?)</i>',          r'_\1_', s, flags=re.I|re.S)
    s = re.sub(r'<em>(.*?)</em>',        r'_\1_', s, flags=re.I|re.S)
    return re.sub(r'<[^>]+>', '', s).strip()

def esc_str(s):
    """Escape for Typst double-quoted string literal"""
    s = strip_html(s or "")
    return s.replace('\\', '\\\\').replace('"', '\\"')

def esc_content(s):
    """Clean HTML for use in Typst content blocks"""
    return strip_html(s or "")

def tags_typ(tags):
    if not tags: return '()'
    items = ', '.join(f'"{t}"' for t in tags)
    # Typst requires trailing comma for single-element arrays
    if len(tags) == 1:
        return f'({items},)'
    return f'({items})'

def ability_card(ab):
    lines = ['#ability-card(']
    lines.append(f'  name: "{esc_str(ab.get("name",""))}",')
    tags = ab.get('tags', [])
    if tags:
        lines.append(f'  tags: {tags_typ(tags)},')
    for key, param in [('cost','cost'),('range','range'),('area','area'),('duration','duration'),('crit','crit')]:
        v = esc_str(ab.get(key,''))
        if v: lines.append(f'  {param}: "{v}",')
    lines.append(f'  desc: "{esc_str(ab.get("desc",""))}",')
    emp = esc_str(ab.get('empower',''))
    if emp: lines.append(f'  empower: "{emp}",')
    lines.append(')')
    return '\n'.join(lines)

generated = []

for path in sorted(glob.glob(os.path.join(BASE, '*.json'))):
    with open(path, encoding='utf-8') as f:
        data = json.load(f)

    rank_id   = data.get('id') or os.path.splitext(os.path.basename(path))[0]
    # Use expanded description if available, otherwise fall back to JSON description
    desc      = EXPANDED_DESCRIPTIONS.get(rank_id) or esc_content(data.get('description', ''))
    funds     = data.get('fundamentals', [])
    levels    = data.get('levels', [])

    out = ['#import "../theme.typ": *', '']

    if desc:
        out.append(desc)
        out.append('')

    if funds:
        out.append('#tip-box[')
        for fi in funds:
            out.append('  ' + esc_content(fi))
        out.append(']')
        out.append('')

    for lv in levels:
        rk    = lv.get('rank', '?')
        title = lv.get('title', '')
        head  = f'==== Rango {rk}' + (f' — {title}' if title else '')
        out.append(head)
        out.append('')
        passive = lv.get('passive', '')
        if passive:
            out.append(f'_Pasiva: {esc_content(passive)}_')
            out.append('')
        for ab in lv.get('abilities', []):
            out.append(ability_card(ab))
            out.append('')

    outpath = os.path.join(OUT, f'{rank_id}.typ')
    with open(outpath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))

    category = data.get('category', '')
    title_str = data.get('title', rank_id)
    generated.append((category, rank_id, title_str))
    print(f'  {rank_id}.typ  [{category}]')

# Print summary grouped by category
from collections import defaultdict
by_cat = defaultdict(list)
for cat, rid, title in generated:
    by_cat[cat].append((rid, title))

print('\nCategory summary:')
for cat, entries in sorted(by_cat.items()):
    print(f'  {cat}: ' + ', '.join(t for _, t in entries))

print(f'\nTotal: {len(generated)} files generated in {OUT}')
