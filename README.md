# Tessera

**The visual memory for creative teams.** A one-page marketing site for a fictional visual-archive SaaS: every frame a studio has ever shot, kept in one searchable place.

Three files, no framework, no build step. Open `index.html` and it runs.

```
tessera/
├── index.html    18 KB   markup only
├── style.css     37 KB   the whole design system
├── script.js     32 KB   one animation engine + every section's behaviour
├── README.md     this file — design, animation, inspiration
└── project.md    the rebuild card: prompts, workflow, tools, history
```

To run it locally (any static server works):

```bash
npx -y http-server tessera -p 8126 -c-1
```

---

## 1. The idea

The product is a media library for photo and film studios. The site had to make an archive feel like something you *see* rather than something you query, so there is no screenshot of a dashboard anywhere on the page. Instead the photographs themselves perform: they gather into a ring, swing into an arch, settle into one print, and stack into a pile you scroll through and filter.

The name is literal. A *tessera* is a single tile in a mosaic — one frame of a much larger picture — which is where the logo and the price card's faint tile pattern come from.

---

## 2. Design system

### Colour
There is none. The palette is paper, ink and hairlines, so the photographs are the only colour on the page.

| Token | Value | Used for |
|---|---|---|
| `--paper` | `#ffffff` | every background |
| `--ink` | `#141414` | text, active states, the CTA |
| `--muted` | `#8a8a8a` | labels, secondary copy, inactive states |
| `--line` | `rgba(0,0,0,.08)` | every divider and card outline |
| `--shadow` | `0 16px 36px rgba(0,0,0,.12)` | prints and cards |

Earlier drafts had a butter yellow, pastels and a dark theme. All removed — colour kept pulling attention away from the work on the wall.

### Type
Two families, a strict division of labour:

- **Newsreader 300** (serif) — every section title, every price, the studio names, the big pull quotes. Always `text-wrap: balance`, centred, capped near 20 characters so no title ever leaves one orphan word on a line.
- **Inter Tight 400/500/600** — body copy, and the **wall labels**: 10.5px, weight 600, `letter-spacing: .14em`, uppercase, grey. Those labels are the site's signature — they open every section, name every photo, mark every step, and appear on every control.

### Spacing
A single token governs vertical rhythm, so every section breathes identically:

```css
--hgap: clamp(56px, 9vh, 96px);   /* title → content, everywhere */
```

Measured on the built page at 1280×800: label → title is **50px** and title → content is **72px** in *every* section. That consistency was a specific request and is worth preserving in any new section.

### Motion scale
Five durations, no others. Mixed, arbitrary timings were the main reason the site felt unfinished mid-build; snapping 49 transitions to this scale fixed it:

| Duration | For |
|---|---|
| `.35s` | colour and small state changes |
| `.6s` | something moving a short distance |
| `.9s` | a reveal |
| `1.3s` | a photograph or panel changing shape |
| `1.6s` | slow drift |

Easing is `--ease: cubic-bezier(.22,.8,.3,1)` almost everywhere, with `--spring: cubic-bezier(.34,1.4,.5,1)` reserved for hovers that should overshoot slightly.

---

## 3. The animation engine

Everything that moves shares **one `requestAnimationFrame` loop** in `script.js`:

```js
const jobs = new Set();                     // each job: (now, dt) => keepGoing
const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
function tick(now) {
  raf = 0;
  const dt = lastT ? Math.min(now - lastT, 50) : 16;
  lastT = now;
  let again = false;
  for (const job of jobs) if (job(now, dt)) again = true;
  if (again) wake(); else lastT = 0;        // nothing moving → the loop stops
}
```

Four rules follow from it:

1. **A job returns `true` only while it still has work.** When every job returns `false` the loop stops dead — measured at **0 frames in 1.5s** once the hero is off screen.
2. **Every job is gated by an `IntersectionObserver`**, so off-screen sections cost nothing.
3. **Nothing reads raw scroll position.** Scroll feeds a target, and the rendered value chases it: `pS += (target - pS) * Math.min(1, dt * 0.006)`. That is why the hero feels weighted rather than glued to the wheel.
4. **`dt` is clamped to 50ms**, so a background tab or a stall can't fling the animation forward when it resumes.

[Lenis 1.3.26](https://github.com/darkroomengineering/lenis) sits on top for smooth scrolling (`lerp: 0.07`) and drives the native scroll position, so every scroll-based effect just follows it.

### Keeping photographs sharp
An early version was visibly soft. Three fixes, all still load-bearing:

- Cards are laid out at their **largest** size and only ever scaled **down** — never up past 1.
- Plain 2D transforms, and **no `will-change`** (it was promoting layers and rasterising them at the wrong size).
- No permanent opacity dimming on hero photos — the only fade is a one-off on load.

---

## 4. Section by section

### Nav (fixed)
Three floating capsules. The **logo** is four mosaic tiles with one lifted out, plus "tessera" in serif — and sits bare on the page with no capsule behind it. The **centre pill** names the section you're in with a rolling text swap and a ticking dial. **Menu** opens a full-screen overlay (its preview photos are built on first open, not on page load). **Start free** is an ink pill whose round knob is a tiny window onto the archive: the photo inside changes every few seconds, and floods the pill on hover.

### 01 Collections — the hero
A **640svh scroll track** with a `position: sticky` stage. 18 prints ride a slow ring around one serif line. Scroll progress runs five overlapping beats:

| Beat | Range | What happens |
|---|---|---|
| **A** | 0 – .12 | the ring swells into a wide arch that falls below the fold |
| **B** | .12 – .30 | the arch turns; a caption names the print at its apex |
| **C** | .30 – .40 | the rest fly off; the apex print settles centre, caption walking down to sit **below** it |
| **D** | .40 – .50 | that print becomes the front plane of a 3D stack |
| **E** | .50 – 1 | scrolling travels through the stack |

Hovering a print in ring mode lifts it, straightens it and tilts it toward the cursor in 3D. The tilt reads `offsetX/offsetY` — coordinates in the print's *own rotated space* — so it follows your cursor correctly no matter which way the print is turned. The line under the headline becomes that print's name while you hover.

### 02 Browse — the stack
The planes recede up and to the right from a front plane at depth 0, each one `rotateY(-26deg) rotateX(12deg)` deeper. Scrolling pulls the next plane forward while the old one slides off to the lower left — it leaves the frame rather than fading in place. The front plane gets `+` viewfinder corners and a caption at the right ("07 / 18 · ROME" over a serif title).

Along the bottom: plain small-caps **filters with superscript counts** (ALL ¹⁸, PORTRAITS ⁷, GOLDEN HOUR ⁹ …) built from each photo's tag list, with a hairline sliding under the active one. Choosing one re-forms the stack from just those frames and sends the rest off to the right. Hovering a filter fans out three of its photos above it — the logo's gesture, reused.

> Deliberate: this bar has **no capsule, no glass and no shadow**. The hero clips its own overflow, so anything with a drop shadow near the bottom edge gets sliced when the next section arrives. The bar and caption also fade out over the last 150px of the track so nothing is mid-animation during the handover.

### In the archive — studios
A static four-column grid of 12 studio names on hairlines, name in serif, frame count in small caps. Hover raises that studio's photograph up inside the cell (a `clip-path` wipe) and turns the text white. Nothing moves until you point at it — the quietest section on the page, on purpose, because it sits between two busy ones.

### 03 System — the pipeline
Five photographs in a row. The active one opens wide (`flex: 5`) while the others stay as slim strips labelled 01 Ingest / 02 Rights / 03 Index / 04 Versions / 05 Share. A hairline under the active label fills over 6.5s and hands over to the next panel; hover selects and pauses, click selects. The serif heading and description underneath change with it.

### 04 Workflow
Sticky media on one side, three steps scrolling past on the other. The inactive steps sit at 28% opacity, a huge numeral rolls in the corner of the image, and a progress line tracks your position. Each step's photo wipes in with `clip-path`.

### 05 Field notes
A draggable rail (`scroll-snap` + pointer drag) of white quote cards and photo cards, with a "01 ─── 06" counter and round arrows. Below it the numbers read as **one serif sentence** rather than three stat columns — "Teams reuse **14×** more of the work they already own, give every producer back **6 hours** a week, and have shipped **0** expired licences" — where the figures count up and a small rounded photo opens out beside each one in turn.

### 06 Pricing
One white card with a faint **mosaic-tile halo** behind it (a `conic-gradient` checker, radially masked so it dissolves outward). The price is set in serif **odometer digits**: each digit is a 0–9 strip that slides to its number, staggered per digit. Underneath, a **ruler slider** — one fine tick per seat, inked up to a thin marker, with a bubble riding above reading "23 seats" and "1 seat / 40 seats" at the ends. The native range input is invisible on top of it, so keyboard control still works. Monthly / Yearly is a small-caps toggle with a sliding underline.

### 07 Join
An arc of prints that rolls as you scroll, an underline email field that swaps for a thank-you line on submit, and a giant footer wordmark that rises letter by letter.

---

## 5. Inspiration

Each reference contributed a **mechanic**, not a look. The site reinterprets them in its own white-gallery language.

| Source | What was taken | Where it lives |
|---|---|---|
| **[inkwell.tech](https://inkwell.tech)** | A pinned scroll stage where a ring of images reorganises itself into a new composition as you scroll — the idea that scrolling *edits* a picture instead of moving a page | The hero's ring → arch → single print |
| **[unveil.fr](https://unveil.fr)** (Projects) | A 3D stack of image planes receding diagonally, travelled by scroll, with frosted filter pills and counts along the bottom | Section 02 Browse — though the pills were stripped back to plain type |
| **area.lab / Modulus** | A wordmark that shifts typeface mid-word, and a mark built from a repeated geometric unit | "tess*era*" in the early drafts; the four-tile mosaic mark that replaced it |
| **Pinterest search / bento layouts** | The original brief's reference images: dense image grids and a search-led hero | The first hero draft (a search collage) — later cut |
| **A pricing card reference** (the user's screenshot) | A single price in a card over a faint pixel pattern, with a ruler-style slider and a value bubble below | Section 06, with the pixels reimagined as mosaic tesserae |
| **Mobbin** (via MCP) | Section patterns for how-it-works, pricing and navigation during the mid-build redesign | System, Pricing, the segmented nav |
| **Gallery and print-shop conventions** | Wall labels beside artworks, viewfinder crop marks, contact-sheet captions | Every small-caps label, the `+` corners on the front plane, the "03 / 18 · ROME" captions |

### Rejected directions, and why
Worth knowing if you extend the site — these were all built and thrown away:

- **Cover-flow deck** (Taste-style, with and without a magnifying lens) — too gimmicky, and the lens needed a white panel that broke the white-on-white wall.
- **"Archive record" + filmstrip** — read like a media player, not an archive.
- **Scattered pile** (Pablo Escudero-style) — pretty, but the prints fought the text for attention.
- **Orbiting studio wordmarks** — fifteen typographic logos circling a sentence; busy, and nothing to do with photography.
- **Darkroom drying line** — photos clipped to a sagging rope that swung on scroll. The most charming version, but it didn't match the hero's stillness, which is the test every section had to pass.
- **Pinned System section with callout lines** — thin lines drawn from labels to dots on a photo. Clear, but too technical beside the rest of the page.

---

## 6. Performance

Measured in-browser on the final build:

| | |
|---|---|
| Page weight | 18 KB HTML + 37 KB CSS + 32 KB JS (~25 KB gzipped total) |
| Hero photographs | 18 (down from 24) |
| Image format | WebP throughout — ~24% smaller than the same JPEGs |
| Frame time, scrolling the hero | median **10ms**, worst **11.1ms**, **0** frames over 32ms |
| Idle cost away from the hero | **0** animation frames in 1.5s |
| Dead CSS | none — every rule matches something in the DOM |
| Horizontal overflow at 375px | none at any scroll position |

What was done:

- `.webp` on every `picsum.photos` URL, and each image requested at the size it actually displays.
- The hero ring cut from 24 photos to 18 — six fewer requests before the page settles.
- Menu preview photos built on first open instead of at load (six full-size images saved for anyone who never opens the menu).
- `decoding="async"` on every image, `loading="lazy"` below the fold.
- Photos fade in over a warm tint (`#efece8`) rather than flashing white.
- `preconnect` to both `picsum.photos` and its CDN host.

The remaining wait on first load is Lorem Picsum itself — individual photos took up to 6.5s to respond during testing. Swapping in real images on your own CDN is the single biggest speed-up available.

---

## 7. Accessibility and resilience

- **Reduced motion:** `prefers-reduced-motion` collapses the hero to a single screen, stops the ring, the drift and the count-ups, and makes `scrollTo` jump instead of glide.
- **Keyboard:** the filter buttons, System panels, pricing slider, rail arrows and menu are all real `<button>` / `<input>` elements with visible focus. The hero's narrative is decorative and marked `aria-hidden`.
- **Screen readers:** live regions announce the front plane's caption, the active capability and the price ("$192 a month on Studio"), since those are communicated visually by motion.
- **Mobile:** the stack shrinks and recentres, the filters scroll sideways under a fade mask, System panels narrow to strips, Workflow drops its sticky media for inline images, and the studios grid becomes two columns.

---

## 8. Conventions, if you extend it

1. **Match the hero or don't ship it.** Every section was judged against the hero's stillness and restraint; six were rebuilt for failing that test.
2. **New section = wall label + serif title + `--hgap` + content.** Nothing else.
3. **Use the five durations.** If a new interaction needs a sixth, it is probably two interactions.
4. **Hook new motion into `jobs` + `wake()`**, gated by an `IntersectionObserver`, and return `false` the moment it has nothing to do.
5. **Photographs never scale above 1**, never get `will-change`, and never get a permanent opacity other than 1.
6. **Beware animation-shorthand collisions.** A hover animation on the hero hint once overrode the intro animation and left the line permanently invisible, because `@keyframes nameIn` has no explicit `to` state. Any rule that replaces another element's animation needs its own end state.
7. **Nothing with a shadow goes near the bottom edge of the hero** — it will be clipped.

---

## 9. Credits

Photographs are placeholders from [Lorem Picsum](https://picsum.photos). Type is [Newsreader](https://fonts.google.com/specimen/Newsreader) and [Inter Tight](https://fonts.google.com/specimen/Inter+Tight) via Google Fonts. Smooth scrolling by [Lenis](https://github.com/darkroomengineering/lenis). Tessera is a fictional product built as a design demo; studio names, quotes and figures are invented.
