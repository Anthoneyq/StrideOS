# Running Surface Equivalency Lab — Design Directions

## Three distinct approaches

### Theme Name: Biomechanics Field Ledger
**Very Brief Intro:** An editorial research notebook translated into a modern digital instrument: warm paper, precise ink, topographic contours, and vivid measurement marks. It should feel trustworthy enough for a sports-science lab and approachable enough for an everyday runner.

**Probability:** 0.031

### Theme Name: Alpine Signal Room
**Very Brief Intro:** A deep-charcoal technical environment with luminous terrain traces and instrument-panel interactions. The mood is focused, high-performance, and intentionally nocturnal.

**Probability:** 0.074

### Theme Name: Track Geometry
**Very Brief Intro:** A bright neo-Bauhaus system built from lane arcs, angled grade lines, and strong primary color blocks. The mood is energetic, graphic, and training-plan oriented.

**Probability:** 0.018

## Chosen approach: Biomechanics Field Ledger

### Design Movement

**Contemporary scientific editorial design**, influenced by mid-century field manuals, topographic survey maps, and modern data journalism. The experience will read like a rigorously annotated research spread rather than a generic dashboard.

### Core Principles

1. **Evidence has hierarchy.** Primary findings, formulas, assumptions, and caveats receive visibly different treatments so certainty is never flattened.
2. **Geometry explains effort.** Grade triangles, elevation traces, and lane-like curves make the mathematics spatial and memorable.
3. **Warmth supports rigor.** Paper-toned surfaces, dark mineral ink, and restrained color make dense evidence less clinical without weakening authority.
4. **Interaction must answer a question.** Every slider, selector, and chart must yield an interpretable comparison rather than decorative motion.

### Color Philosophy

The foundation is a warm limestone paper tone that reduces the glare of a long research page. Deep navy-black functions as stable scientific ink. **Signal orange** marks workload, warnings, and key results because it is energetic and highly visible without suggesting danger by default. Muted teal distinguishes modeled estimates from directly measured findings. The palette is deliberately limited so citations and uncertainty remain legible.

### Layout Paradigm

The page uses an **asymmetric field-guide spread**: a narrow sticky index and evidence key on the left, with a wider narrative-and-instrument column that alternates between full-bleed data bands, marginal notes, formula plates, and chart panels. Content should not resolve into a monotonous centered card grid. Diagonal grade lines and stepped section boundaries create forward motion.

### Signature Elements

1. **Contour-rule background:** Fine topographic curves and sparse registration marks sit behind major sections.
2. **Grade wedges:** Small geometric incline/decline triangles label slope, rise, and run consistently.
3. **Evidence tabs:** Source-backed findings receive compact edge tabs indicating direct measurement, derived model, or practical heuristic.

### Interaction Philosophy

Interactions feel like adjusting a physical measurement instrument. Sliders move a clear marker along a calibrated rail; outputs update immediately; selected chart lines gain contrast while non-selected context remains visible. Hover and focus states reveal definitions, assumptions, and exact values without hiding essential information behind interaction.

### Animation

Motion remains under 300 ms and uses a crisp ease-out. Chart traces may draw once on entry, grade wedges interpolate between angles, and metric numbers cross-fade or translate by a few pixels when inputs change. Section entrances use restrained 40–60 ms staggering. Buttons compress to 0.97 on activation. No perpetual decorative motion; all nonessential transitions respect `prefers-reduced-motion`.

### Typography System

**Fraunces** is the display face for the report title, high-level findings, and large numeric callouts; its variable optical character gives the page an authored editorial voice. **IBM Plex Sans** handles body copy, controls, tables, and navigation. **IBM Plex Mono** sets formulas, units, citations, and evidence labels. Headings are left-aligned, tightly tracked, and rarely centered. Body text stays between 16–18 px with a generous reading line height; data labels stay compact but never below 12 px.

### Brand Essence

**Positioning:** A transparent running-science field guide for athletes and coaches who need to translate grade, pace, distance, and metabolic effort without pretending unlike workouts are perfectly interchangeable.

**Personality:** Exacting, grounded, kinetic.

### Brand Voice

Headlines sound like concise findings. Calls to action use verbs tied to analysis—compare, trace, calculate, inspect. Microcopy states assumptions plainly and avoids hype.

Example headline: **“A 10% hill is not simply ten percent harder.”**

Example CTA: **“Set a pace. Trace the equivalent effort.”**

### Wordmark & Logo

The wordmark pairs a custom condensed “SURFACE / LAB” lockup with a bold symbol: two rising contour bands crossing a single track-lane arc to form an abstract **S** and slope profile. The symbol contains no text, remains recognizable at favicon scale, and appears large enough in the header to function as a genuine brand mark.

### Signature Brand Color

**Grade Orange — `#F05A28`**. It is the ownable signal used for active controls, incline traces, decisive findings, and the logo’s key stroke.

## Style Decisions

The **SURFACE / LAB** lockup and abstract slope-contour symbol are primary brand assets. They appear prominently in the hero and repeat near the footer; editorial findings such as “One surface. Many kinds of effort.” remain campaign language rather than replacing the product identity.

Grade Orange `#F05A28` remains reserved for active controls, decisive findings, incline/workload marks, citation signals, and the logo’s key stroke. Muted teal remains reserved for modeled estimates and secondary comparisons; no additional emphasis colors or decorative gradients are introduced.

Future additions must preserve the field-ledger asymmetry through marginal notes, formula strips, registration marks, numbered sections, and evidence labels rather than drifting into a uniform dashboard-card grid.

## Future Lab Revision

The user prefers a **clean modern laboratory from the future** while retaining the illustrations and research instrumentation. The revised system replaces the serif editorial hierarchy with **Space Grotesk**, supported by IBM Plex Sans and IBM Plex Mono. The palette moves to cool white, graphite, cobalt, and restrained cyan; the previous orange, tan, ochre, and forest-green presentation is retired.

The visual movement is contemporary scientific instrumentation rather than vintage field guide. Panels use precise cool-gray rules, controlled translucency, low blue shadows, larger radii, and crisp data rails. Cobalt marks active controls and decisive outputs, while cyan distinguishes model traces and secondary comparisons. Illustrations remain prominent but receive a cool monochromatic treatment so their content survives without reintroducing the former warm palette.

The asymmetric section rhythm, numbered source system, evidence labels, formula plates, and explicit uncertainty hierarchy remain because they are functional strengths rather than vintage decoration.

### Future Lab Style Decisions

The **SURFACE / LAB** slope-contour symbol and wordmark are dominant brand artifacts in both the hero and footer. Cobalt is reserved for active controls and decisive outputs; cyan is reserved for modeled estimates, secondary comparisons, and trace overlays. Every major section carries at least one structural laboratory device—calibrated rail, registration cross, evidence tab, offset data plate, or formula strip—so the experience does not drift into centered SaaS panels.
