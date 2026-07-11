#import "theme.typ": *

// ── Page setup ────────────────────────────────────────────
#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 3cm, left: 2.5cm, right: 2.5cm),
  numbering: "1",
  number-align: bottom + right,
)

#set text(size: 10.5pt, lang: "es")
#set par(justify: true, leading: 0.65em, spacing: 0.9em)
#set list(marker: [◆])

// ── Heading styles ────────────────────────────────────────
#show heading.where(level: 1): h => {
  pagebreak(weak: true)
  v(0.5cm)
  text(size: 28pt, weight: "bold")[#upper(h.body)]
  v(4pt)
  line(length: 100%, stroke: 2pt + teal)
  v(2pt)
  line(length: 100%, stroke: 0.5pt + teal)
  v(0.6cm)
}

#show heading.where(level: 2): h => {
  v(0.35cm)
  block(fill: teal-lt, width: 100%, inset: (x: 8pt, y: 5pt), radius: 2pt)[
    #text(size: 11pt, weight: "bold")[#upper(h.body)]
  ]
  v(0.1cm)
}

#show heading.where(level: 3): h => {
  v(0.2cm)
  text(size: 10pt, weight: "bold")[#upper(h.body)]
  v(-3pt)
  line(length: 100%, stroke: 0.4pt + dark)
  v(0.1cm)
}

#show heading.where(level: 4): h => {
  v(0.15cm)
  text(size: 10pt, weight: "bold", style: "italic")[#h.body]
  v(0.05cm)
}

// ── Title page ────────────────────────────────────────────
#page(margin: (x: 3cm, y: 4cm))[
  #v(1fr)
  #align(center)[
    #text(size: 10pt, weight: "bold", fill: gray, tracking: 4pt)[SISTEMA DE JUEGO DE ROL]
    #v(16pt)
    #text(size: 52pt, weight: "bold", fill: teal, tracking: 2pt)[
      #upper("Raldamain")
    ]
    #v(8pt)
    #line(length: 60%, stroke: 1.5pt + gold)
    #v(20pt)
    #text(size: 14pt, fill: dark)[
      Manual Básico — Primera Edición
    ]
  ]
  #v(1fr)
  #align(center)[
    #line(length: 100%, stroke: 0.5pt + teal-lt)
    #v(8pt)
    #text(size: 9pt, fill: gray)[
      Un juego de rol de fantasía épica para 3–6 jugadores
    ]
  ]
]

// ── Table of contents ─────────────────────────────────────
#page[
  #text(size: 26pt, weight: "bold")[#upper("Tabla de Contenidos")]
  #v(4pt)
  #line(length: 100%, stroke: 2pt + teal)
  #v(2pt)
  #line(length: 100%, stroke: 0.5pt + teal)
  #v(0.8cm)

  #show outline.entry.where(level: 1): it => {
    v(3pt)
    text(fill: gold, weight: "bold")[◆ #h(3pt) #it]
  }

  #show outline.entry.where(level: 2): it => {
    v(1pt)
    pad(left: 1em)[#it]
  }

  #outline(title: none, depth: 2)
]

// ── Chapters ──────────────────────────────────────────────
#include "cap0_intro.typ"
#include "cap1_hoja.typ"
#include "cap2_estadisticas.typ"
#include "cap3_rangos.typ"
#include "cap4_equipamiento.typ"
#include "cap5_combate.typ"
#include "cap6_master.typ"
#include "cap7_mundo.typ"
#include "cap8_bestiario.typ"
#include "cap9_glosario.typ"
