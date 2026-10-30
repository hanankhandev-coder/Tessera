# Tessera: Project Card

Everything someone needs to rebuild this exact site: the prompts, workflow, tools and history.

---

## Short description (30 max)
**Visual archive SaaS for creative teams**

## Description
Tessera is a one-page marketing site for a made-up archive tool: every frame a studio has ever shot, kept in one searchable place. The whole site is one pinned photographic scene that keeps transforming — a ring of small prints swells into an arch, settles into a single print, then becomes a 3D stack you scroll through and filter. Everything after it is white paper, hairlines and photographs: a grid of studio names that reveal their work on hover, five photo panels that take turns explaining the pipeline, a sticky-media workflow, a draggable rail of quotes, and a pricing card whose digits roll as you drag a ruler. No colour at all — black, grey, white, and the photographs.

## Type
Landing page / marketing site (one page, a single static `index.html`, no build step)

## Vibe
Gallery-quiet and editorial: full white walls, a light serif for the titles, tiny uppercase sans "wall labels", soft-shadowed prints, and slow scroll-driven motion — photography is the only colour

## Category
SaaS / creative tools (digital asset management, media library, archive search)

## Claude model used most
**Claude Opus 5** (`claude-opus-5`) throughout

## How many tries
**About 25 prompts across one long build session (Sept 2026), roughly 12 major rounds.**
Three sections ate most of them:
- **Section 2 (Browse):** 5 attempts — cover-flow deck → deck + lens → "archive record" + filmstrip → scattered pile → **3D stack** ✅
- **Studios section:** 4 attempts — orbiting wordmarks → serif sentence + photo fan → darkroom drying line → marquee rail → **static grid** ✅
- **System section:** 3 attempts — tabbed inspector → pinned print with callout lines → **five photo panels** ✅

The hero itself was rebuilt 3 times (collage → Inkwell-style ring → ring with tilt hover), and there was a late pass each for consistent spacing, animation timing and performance.

---

## Main prompt

> Build a one-page marketing site for **Tessera**, a fictional visual-archive SaaS for creative teams — every frame a studio has ever shot, findable. Hero line: "Every frame your team has ever made, findable." One static `index.html` with vanilla JS and CSS custom properties, no framework and no build step. Lenis 1.3.26 from a CDN for smooth scroll. Photos from `picsum.photos` as `.webp`, warm and cinematic (ids 322, 388, 65, 390, 325, 323 set the tone).
>
> **Design system:** pure white `#fff`, ink `#141414`, muted `#8a8a8a`, hairlines `rgba(0,0,0,.08)` — **no colour anywhere**, no pastels, no yellow. Titles in **Newsreader 300** (serif, `text-wrap:balance`, centred, max 20ch); body and labels in **Inter Tight**. Every section opens with a 10.5px uppercase label, letter-spacing `.14em`, grey — treat them as gallery wall labels. One spacing token `--hgap: clamp(56px,9vh,96px)` sets the gap from title to content in *every* section, and the label-to-title gap is identical everywhere. Easing `cubic-bezier(.22,.8,.3,1)`, plus a spring for hovers. **One timing scale only: .35s** (colour / small state), **.6s** (short moves), **.9s** (reveals), **1.3s** (a photo or panel changing shape), **1.6s** (slow drift).
>
> **Motion engine:** a single rAF loop — a `jobs` Set, `wake()`, `tick(now, dt)`; a job returns `true` to keep the loop alive, and the loop sleeps completely when nothing moves. Gate every job behind an IntersectionObserver. Scroll progress is lerped, never read raw. **Images must stay sharp:** lay cards out at their largest size and only ever scale *down*, use plain 2D transforms, and no `will-change` — no blur, ever, and no permanent opacity dimming on hero photos.
>
> **01 Collections (hero), a 640svh pinned scroll track** with a `position:sticky` stage, after inkwell.tech. 18 prints ride a slow ring around one centred serif line and a small-caps "Scroll to explore". Five beats driven by scroll: **A** the ring swells into a wide arch below the fold → **B** the arch turns and a caption names the print at its apex → **C** the others fly off and the apex print settles centre, with the caption walking down to sit *below* it (never over it) → **D** that print becomes the front plane of a 3D stack → **E** scrolling travels through the stack. Hovering a print in ring mode lifts it and tilts it in 3D toward the cursor (measure `offsetX/offsetY` in the print's own rotated space), and the line under the headline becomes that print's name.
>
> **02 Browse** (the end of the hero, after unveil.fr): planes recede up and to the right from a front plane at depth 0, each tilted `rotateY(-26deg) rotateX(12deg)`. Scrolling brings the next plane forward and slides the old one off to the lower left — it leaves the frame, it does not fade in place. The front plane gets small "+" viewfinder corners and a caption at the right ("07 / 18 · ROME" over a serif "Alley scout"). At the bottom, plain small-caps filters with superscript counts (ALL ¹⁸, PORTRAITS, GOLDEN HOUR, COAST, STREET, TRAVEL, DESERT) built from each photo's tags, with a hairline that slides under the active one — **no capsule, no glass, no shadow that the section can crop**. Hovering a filter fans out three of its photos above it. A grid button returns to the front. The bar and caption fade out before the section scrolls away.
>
> **In the archive:** a static four-column grid of 12 studio names on hairlines, each cell with the name in serif and a frame count in small caps. Hover raises that studio's photograph up inside the cell and turns the text white. Nothing moves until you hover.
>
> **03 System:** five photographs in a row. The active one opens wide (`flex:5`) while the others stay as slim strips with "01 Ingest / 02 Rights / 03 Index / 04 Versions / 05 Share" beneath. A hairline under the active label fills over 6.5s and hands over to the next; hover selects and pauses, click selects. A two-tone serif heading and description below change with it.
>
> **04 Workflow:** sticky media on one side, three scrolling steps on the other, with a big numeral rolling in the corner and a progress line.
>
> **05 Field notes:** a draggable rail of white quote cards and photo cards with "01 ─── 06" counters and round arrows. Under it, the numbers read as one serif sentence — "Teams reuse **14×** more of the work they already own, give every producer back **6 hours** a week, and have shipped **0** expired licences" — with the figures counting up and a small rounded photo opening out beside each one.
>
> **06 Pricing:** one white price card with a faint mosaic-tile halo behind it (a conic-gradient checker, radially masked). The price is set in large serif **odometer digits** — each digit is a 0–9 strip that slides to its number with a per-digit delay. Under it two plain lines of copy, then a **ruler slider**: one fine tick per seat, inked up to a thin marker, with a rounded bubble riding above it reading "23 seats" and "1 seat / 40 seats" at the ends. Monthly / Yearly · save 20% as a small-caps underline toggle.
>
> **07 Join:** an arc of prints that rolls with scroll, an underline email field, and a giant footer wordmark that rises letter by letter.
>
> **Chrome:** a floating segmented nav — a logo that is four mosaic tiles with one lifted out (it clicks back into place on hover) plus "tessera" in serif with **no capsule behind it**; a centre pill naming the section you're in with a ticking dial; a Menu button whose dots scatter on hover; and an ink "Start free" CTA whose knob is a tiny window onto a photo that changes every few seconds. A full-screen menu overlay with large serif links and a preview photo (built only on first open). A small custom cursor companion.
>
> **Finish:** WebP everywhere, images sized to what they actually display, lazy below the fold, `decoding="async"`, photos fading in over a warm tint rather than flashing white, a favicon of the same mosaic mark, reduced-motion support, and no horizontal overflow at 375px.

## Follow-up prompts (in order, condensed)
1. "Build a SaaS site in an image-heavy industry." *(reference screenshots attached)*
2. "Make this search collage the hero section."
3. "Rework the design — editorial images, scroll/parallax animations, make it an experience."
4. "Current one looks boring and too AI. Redo everything: buttons, headings, layout, colours — from these references."
5. "Make the hero minimal like Inkwell: drop the extra labels, no line under 'Scroll to explore', no italic in the heading."
6. "Replicate the Inkwell scroll animation and connect section 2 to the end of it."
7. "Replace the colour blocks in section 2 with images. Minimalise it. New hero hover — not a copy of Inkwell."
8. "Animations are too fast. Fix the caption landing on top of the final image. New logo, new menu and CTA buttons."
9. "Images are blurred — fix. Full white background. Add Lenis. One theme across the whole site."
10. "Section 2 isn't the vibe — do something like this." *(Pablo Escudero pile, then the Unveil stack)*
11. "The filter bar shadow is getting cropped — redesign it with interactions."
12. "The logo section and System section don't match the hero and section 2 — redo them."
13. "Gaps between heading and content must be consistent everywhere. Redo the numbers. Pricing needs work."
14. "Make pricing like this." *(odometer + ruler reference)*
15. "Finalize and optimize: animations should feel good, the site shouldn't take this long, optimize the images."

---

## Workflow
1. **Pick an image-heavy industry**, so photography can carry the whole design.
2. **Hero first, then everything follows it.** Each later section was explicitly rebuilt to match the hero, not just recoloured.
3. **Reference-led iteration.** Nearly every round came with a screenshot; the job was to name the mechanic in it (a stack, a ruler, an odometer) and rebuild it in the site's own language rather than copy it.
4. **Guarded patch scripts, never freehand edits.** Each round ran a Node script in the scratchpad with `replaceOnce` / `replaceBetween`, a backup copy first, and sanity checks that fail the patch if a marker is missing, an id is duplicated, or a removed section leaves anything behind (`must(!s.includes("inspector"))`). That caught several half-deletions before they hit the page.
5. **Verify in the browser pane, never by eye alone:** emulate 1280×800 and 375×812, drive scroll with `lenis.scrollTo(y, {immediate:true})`, step the loop by hand with `tick()` when the pane is hidden (a hidden pane pauses rAF and will look like a broken hero), and measure with `getBoundingClientRect` — title-to-content gaps, overflow (`scrollWidth` vs `innerWidth`), caption positions.
6. **Audit, don't guess:** list CSS rules whose selectors match nothing in the live DOM; count frame times during a scripted scroll; count rAF ticks while idle to prove the loop sleeps.
7. **Optimise last:** WebP, fewer hero photos, right-sized images, deferred menu previews, one timing scale.

## Tech stack
- One `index.html` — 86 KB, ~25 KB gzipped — vanilla JS, CSS custom properties
- Lenis 1.3.26 (jsDelivr) for smooth scroll; Newsreader + Inter Tight from Google Fonts
- `position:sticky` scroll tracks, IntersectionObserver gating, one shared rAF loop
- `backdrop-filter`, conic-gradient masks, container query units, inline SVG favicon
- Lorem Picsum (`picsum.photos/id/N/W/H.webp`) for every photograph

## Performance (measured, final build)
| | |
|---|---|
| Page | 86 KB (~25 KB gzipped), single file |
| Hero photos | 18 (was 24), WebP ≈ 24% smaller than JPEG on the same images |
| Frame time scrolling the hero | median 10 ms, worst 11.1 ms, **0** frames over 32 ms |
| Idle cost away from the hero | **0** rAF ticks in 1.5 s |
| Dead CSS | none — every rule matches something in the DOM |

---

## Skills used
| Skill | Used? | Notes |
|---|---|---|
| `ponytail` (full) | ✅ | Active throughout; kept it to one file and the shortest working diff |
| `impeccable` | ✅ | Invoked early for the design/polish passes |
| `anthropic-skills:built-in-browser` | ✅ | Browser-pane previews, measurement and verification |
| `design-taste-frontend` | ❌ | Not invoked |

**Recommended if you rebuild it:** keep `ponytail` on (it is why this is one file), and use `impeccable` for the critique passes between rounds.

## Connectors / MCPs used
| Connector | Used? | What for |
|---|---|---|
| **Mobbin** | ✅ | Section patterns and nav/menu inspiration during the mid-build redesign |
| **Claude Browser (in-app)** | ✅ | `preview_start` on port 8126, viewport emulation, scripted scrolling, frame-time and overflow measurement |
| **Higgsfield** | ❌ | Not used — all imagery is Lorem Picsum placeholder photography |

## References
inkwell.tech (the pinned hero ring and scroll beats), unveil.fr (the 3D plane stack and filter bar), area.lab / Modulus (the wordmark idea), pabloescudero (the rejected pile), Taste (the rejected cover flow), plus the user's own screenshots for the pricing card (odometer + ruler), the bento layout and the original search-collage hero.

## Rebuild notes
- **Swap the photos first.** Picsum ids are placeholders; real brand photography changes the whole feel and is the single biggest upgrade.
- **The hero is the budget.** 18 photographs load before the page settles. Keep the count down or serve your own CDN images — Picsum itself was the slowest part of every load test.
- **Don't let section 2's filter bar own a shadow.** The hero clips its own overflow, so anything with a drop shadow near the bottom edge gets cut when the next section arrives.
- **Watch animation-shorthand collisions.** A hover animation on the hero hint overrode the intro animation and left the line permanently invisible, because the keyframes had no explicit `to` state. Give such rules their own end state.
