// theme.typ — Raldamain RPG Book Theme

#let teal    = rgb("#4d8a76")
#let teal-lt = rgb("#c8e4dc")
#let gold    = rgb("#c9a227")
#let dark    = rgb("#1a1a1a")
#let bg-tip  = rgb("#eaf5f1")
#let gray    = rgb("#666666")

// ── Highlighted rule / tip box ───────────────────────────
#let tip-box(body) = {
  v(0.3em)
  block(
    fill: bg-tip,
    width: 100%,
    inset: (x: 10pt, y: 8pt),
    radius: 3pt,
    stroke: 0.5pt + teal,
  )[#body]
  v(0.3em)
}

// ── Centered formula / definition ────────────────────────
#let formula-box(body) = {
  v(0.3em)
  block(
    fill: teal-lt,
    width: 100%,
    inset: (x: 12pt, y: 8pt),
    radius: 3pt,
  )[
    #align(center)[#body]
  ]
  v(0.3em)
}

// ── Numbered step box ─────────────────────────────────────
#let step-item(n, body) = {
  block(
    width: 100%,
    inset: (x: 10pt, y: 8pt),
    stroke: 0.5pt + teal,
    radius: 3pt,
  )[
    #grid(
      columns: (22pt, 1fr),
      gutter: 8pt,
      align: (center + top, left + top),
      box(
        width: 18pt, height: 18pt,
        fill: teal, radius: 9pt,
      )[
        #align(center + horizon)[
          #text(fill: white, size: 9pt, weight: "bold")[#str(n)]
        ]
      ],
      body,
    )
  ]
  v(4pt)
}

// ── Ability card ─────────────────────────────────────────
#let ability-card(
  name: "",
  tags: (),
  cost: none,
  range: none,
  area: none,
  duration: none,
  crit: none,
  desc: "",
  empower: none,
) = {
  v(0.2cm)
  block(
    width: 100%,
    inset: (x: 10pt, y: 8pt),
    stroke: 0.5pt + teal-lt,
    radius: 4pt,
    fill: white,
  )[
    [*#name*]
    #if tags.len() > 0 [
      #v(2pt)
      #for tag in tags [
        #box(fill: teal-lt, inset: (x: 5pt, y: 2pt), radius: 2pt)[#text(size: 6.5pt, fill: teal, weight: "bold")[#upper(tag)]]
        #h(3pt)
      ]
    ]
    #if cost     != none [#linebreak()*Coste:* #cost]
    #if range    != none [#linebreak()*Alcance:* #range]
    #if area     != none [#linebreak()*Área:* #area]
    #if duration != none [#linebreak()*Duración:* #duration]
    #v(5pt)
    #text(size: 9.5pt)[#desc]
    #if crit != none [
      #v(3pt)
      #text(weight: "bold", fill: teal)[Crítico: ]
      #text(size: 9.5pt)[#crit]
    ]
    #if empower != none [
      #v(3pt)
      #text(weight: "bold", fill: gold)[Empoderar (1 Chi · máx. 2×): ]
      #text(size: 9.5pt)[#empower]
    ]
  ]
}

// ── Stat block section divider and label ─────────────────
#let stat-divider() = {
  v(5pt)
  line(length: 100%, stroke: 0.4pt + teal-lt)
  v(3pt)
}

#let stat-section(title) = {
  stat-divider()
  text(weight: "bold", size: 9.5pt, fill: teal)[#upper(title)]
  v(4pt)
}

// ── Creature stat block ───────────────────────────────────
#let creature-stat(
  name: "",
  tier: "",
  c-type: "",
  c-size: "",
  level: 0,
  hits: 0,
  speed: "",
  saves: "",
  immune: "",
  lore: "",
  body,
) = {
  v(0.3cm)
  block(
    width: 100%,
    stroke: 1pt + teal,
    radius: 4pt,
    inset: 0pt,
    clip: true,
  )[
    #block(fill: teal, width: 100%, inset: (x: 10pt, y: 6pt))[
      #grid(
        columns: (1fr, auto),
        text(fill: white, weight: "bold", size: 12pt)[#name],
        text(fill: white, size: 9pt)[#tier · Nivel #str(level)],
      )
    ]
    #block(width: 100%, inset: (x: 10pt, y: 6pt))[
      #text(size: 9pt, fill: gray)[#c-type · #c-size]
      #v(4pt)
      #grid(
        columns: (1fr, 1fr),
        gutter: 4pt,
        [*Golpes:* #str(hits) #h(8pt) *Velocidad:* #speed],
        [*Salvaciones:* #saves],
      )
      #if immune.len() > 0 [
        #v(2pt)
        *Inmunidades:* #immune
      ]
      #if lore.len() > 0 {
        v(5pt)
        line(length: 100%, stroke: 0.3pt + teal-lt)
        v(3pt)
        text(style: "italic", size: 9pt)[#lore]
      }
      #v(5pt)
      #line(length: 100%, stroke: 0.3pt + teal-lt)
      #v(3pt)
      #body
    ]
  ]
}
