const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover:hover) and (pointer:fine)").matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (n, lo, hi) => n < lo ? lo : n > hi ? hi : n;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const TAU = Math.PI * 2;
const pic = (id, w, h) => `https://picsum.photos/id/${id}/${w}/${h}.webp`;

/* one frame loop for everything that moves; it sleeps when nothing does */
let raf = 0;
const jobs = new Set();
const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
let lastT = 0;
function tick(now) {
  raf = 0;
  const dt = lastT ? Math.min(now - lastT, 50) : 16;
  lastT = now;
  let again = false;
  for (const job of jobs) if (job(now, dt)) again = true;
  if (again) wake(); else lastT = 0;
}
addEventListener("scroll", wake, { passive: true });

/* Lenis: weighted, smooth scrolling (skipped for reduced motion). It drives
   the native scroll position, so every scrollY-based effect just follows. */
const lenis = !reduced && window.Lenis ? new Lenis({ autoRaf: true, anchors: true, lerp: 0.07 }) : null;
if (lenis) lenis.on("scroll", wake);
addEventListener("resize", wake, { passive: true });

/* ---------- text splitting for the word-by-word reveals ---------- */
for (const el of $$("[data-split]")) {
  let i = 0;
  const walk = node => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.append(part); continue; }
          const w = document.createElement("span"); w.className = "w";
          const s = document.createElement("span"); s.textContent = part; s.style.setProperty("--i", i++);
          w.append(s); frag.append(w);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === 1) walk(child);
    }
  };
  walk(el);
}

/* ---------- reveal on scroll + count-ups ---------- */
const countUp = el => {
  const target = parseFloat(el.dataset.count), dp = +el.dataset.decimals || 0, suffix = el.dataset.suffix || "";
  if (reduced || !target) { el.textContent = target.toFixed(dp) + suffix; return; }
  const t0 = performance.now();
  const step = now => {
    const p = clamp((now - t0) / 1400, 0, 1);
    el.textContent = (target * easeOut(p)).toFixed(dp) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
const io = new IntersectionObserver((entries, obs) => {
  for (const en of entries) if (en.isIntersecting) {
    en.target.classList.add("in");
    en.target.querySelectorAll("[data-count]").forEach(countUp);
    obs.unobserve(en.target);
  }
}, { rootMargin: "0px 0px -10% 0px" });
$$(".rv, [data-split]").forEach(el => io.observe(el));

/* ---------- nav: where am I, and how far ---------- */
const navName = $("#navName"), navIdx = $("#navIdx"), dial = $("#dial");
const ORDER = ["Collections", "Browse", "System", "Workflow", "Field notes", "Pricing", "Join"];
const setName = n => {
  if (navName.textContent === n) return;
  navName.classList.remove("in"); void navName.offsetWidth;
  navName.textContent = n; navName.classList.add("in");
  navIdx.classList.remove("in"); void navIdx.offsetWidth;
  navIdx.textContent = String(ORDER.indexOf(n) + 1).padStart(2, "0"); navIdx.classList.add("in");
};
const sectionSpy = new IntersectionObserver(entries => {
  for (const en of entries) if (en.isIntersecting) setName(en.target.dataset.name);
}, { rootMargin: "-45% 0px -50% 0px" });
$$("[data-name]").forEach(s => sectionSpy.observe(s));
let lastNp = "";
jobs.add(() => {
  const max = document.documentElement.scrollHeight - innerHeight;
  const v = clamp(scrollY / max, 0, 1).toFixed(3);
  if (v !== lastNp) { lastNp = v; dial.style.setProperty("--np", v); dial.title = Math.round(v * 100) + "% of the page"; }
  return false;
});

/* full-screen menu */
const menu = $("#menu"), menuBtn = $("#menuBtn"), preview = $("#preview");
let previewBuilt = false;
const buildPreview = () => {
  if (previewBuilt) return;
  previewBuilt = true;
  preview.innerHTML = $$("a[data-img]", menu).map(a => `<img decoding="async" src="${pic(a.dataset.img, 520, 650)}" alt="" data-for="${a.dataset.img}">`).join("");
  showPreview(shownPreview);
};
let shownPreview = "65";
const showPreview = id => { shownPreview = id; $$("img", preview).forEach(im => im.classList.toggle("on", im.dataset.for === id)); };
let menuOpen = false;
const toggleMenu = open => {
  menuOpen = open;
  menuBtn.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("menu-open", open);
  document.documentElement.classList.toggle("lock", open);
  if (lenis) open ? lenis.stop() : lenis.start();
  const ml = $("#menuLabel"); ml.classList.remove("in"); void ml.offsetWidth; ml.textContent = open ? "Close" : "Menu"; ml.classList.add("in");
  if (open) {
    buildPreview();
    menu.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add("open")));
    setTimeout(() => $("a", menu).focus({ preventScroll: true }), 350);
  } else {
    menu.classList.remove("open");
    setTimeout(() => { if (!menuOpen) menu.hidden = true; }, reduced ? 0 : 750);
  }
};
menuBtn.addEventListener("click", () => toggleMenu(!menuOpen));
addEventListener("keydown", e => { if (e.key === "Escape" && menuOpen) { toggleMenu(false); menuBtn.focus(); } });
for (const a of $$("a", menu)) {
  a.addEventListener("mouseenter", () => showPreview(a.dataset.img));
  a.addEventListener("focus", () => showPreview(a.dataset.img));
  a.addEventListener("click", () => toggleMenu(false));
}

/* ---------- cursor companion ---------- */
if (finePointer && !reduced) {
  const cur = $("#cursor"), label = $("span", cur);
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, shown = false;
  addEventListener("pointermove", e => {
    x = e.clientX; y = e.clientY;
    if (!shown) { shown = true; cx = x; cy = y; cur.style.opacity = 1; }
    const zone = e.target.closest("[data-cursor-link], a, button, input, label");
    const big = !zone && e.target.closest("[data-cursor]");
    cur.classList.toggle("big", !!big);
    cur.classList.toggle("link", !!zone);
    if (big) label.textContent = big.dataset.cursor;
    wake();
  }, { passive: true });
  document.addEventListener("pointerleave", () => { cur.style.opacity = 0; shown = false; });
  jobs.add(() => {
    cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
    cur.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
    return Math.abs(x - cx) + Math.abs(y - cy) > 0.3;
  });
}

/* sliding highlight behind a segmented control */
const segBlob = group => {
  const blob = $(".blob", group), on = $('[aria-pressed="true"]', group);
  if (!blob || !on) return;
  blob.style.left = on.offsetLeft + "px";
  blob.style.width = on.offsetWidth + "px";
  blob.style.top = on.offsetTop + "px";
  blob.style.height = on.offsetHeight + "px";
};

/* ======================================================================
   01 HERO + 02 BROWSE — one pinned stage, five beats (after inkwell.tech,
   then a 3D stack after unveil.fr):
     A  the small ring swells into an arch below the fold
     B  the arch turns; the caption names the print at the apex
     C  the rest fly off; the apex print settles in the centre and the
        caption walks down beneath it
     D  that print becomes the front plane of a 3D stack, and the others
        slide in behind it, receding up and to the right
     E  scrolling travels through the stack: the front plane slips away to
        the lower left and the next one comes forward
   Frosted filters re-form the stack; hover pulls a plane out; click brings
   it to the front. Lenis smooths the scroll; a light lerp keeps beats soft.
   ====================================================================== */
const ringItems = [
  [65,   "SS26 · Backlit portrait", "portrait woman hair backlit golden hour warm field summer campaign"],
  [322,  "Rome · Alley scout",      "street alley old city travel warm rome"],
  [646,  "Talent · Meadow",         "portrait woman meadow backlit golden hour field summer"],
  [943,  "Wild · Morning deer",     "deer wild animal mist morning golden forest"],
  [325,  "SS26 · White dress",      "fashion dress forest green editorial campaign portrait"],
  [896,  "Coast · Last sun",        "sea coast sunset sun golden orange horizon"],
  [390,  "Coast · Jump",            "coast jump sea sunset people summer"],
  [564,  "Desert · Slot canyon",    "desert canyon light orange rock travel"],
  [815,  "Talent · Hands at dusk",  "hands heart sunset golden people portrait"],
  [323,  "Coast · Blue cliffs",     "coast cliffs sea blue summer travel"],
  [428,  "Street · Yellow house",   "street yellow house bicycles old travel"],
  [388,  "Field · Last light",      "field grass sunset golden hour warm"],
  [551,  "Road · The van",          "road trip van travel warm dusk"],
  [778,  "SS26 · Golden hour",      "portrait girl backlit golden hour sunset"],
  [546,  "Architecture · Arcade",   "architecture arcade arches old warm light street travel"],
  [399,  "SS26 · Dusk, two",        "people couple sunset golden hour warm backlit portrait"],
  [64,   "Talent · Field",          "portrait woman sunglasses summer warm golden hour field"],
  [1016, "Desert · Red rock",       "desert red rock canyon warm travel"]
];
const FILTERS = [["All", ""], ["Portraits", "portrait"], ["Golden hour", "golden"], ["Coast", "coast"],
                 ["Street", "street"], ["Travel", "travel"], ["Desert", "desert"]];
const ratios = [4/5, 3/4, 1, 4/5, 3/4];
const stage = $("#stage"), ring = $("#ring"), hero = $("#top"), hub = $("#hub"), hint = $(".hint", hub);
const cap = $("#cap"), capName = $("#capName"), sbar = $("#sbar"), spills = $("#spills"), scap = $("#scap");
ring.innerHTML = ringItems.map(([id], i) => {
  const r = ratios[i % ratios.length];
  return `<div class="card"><div class="in"><img decoding="async" src="${pic(id, 520, Math.round(520 / r))}" alt="" draggable="false"></div></div>`;
}).join("");
for (const img of $$("img", ring)) { const ld = () => img.classList.add("ld"); img.complete ? ld() : img.addEventListener("load", ld, { once: true }); }
const cards = $$(".card", ring).map((el, i) => ({
  el, in: $(".in", el), r: ratios[i % ratios.length], name: ringItems[i][1], hv: 0,
  words: (ringItems[i][1] + " " + ringItems[i][2]).toLowerCase().split(/[^a-z0-9]+/), w: 0, h: 0
}));
const n = cards.length;
const matchesTag = (c, tag) => !tag || c.words.some(w => w.startsWith(tag));
spills.innerHTML = `<i class="sthumb" aria-hidden="true"></i>` + FILTERS.map(([label, tag], k) =>
  `<button type="button" class="spill" data-tag="${tag}" aria-pressed="${k === 0}">${label}<sup>${cards.filter(c => matchesTag(c, tag)).length}</sup></button>`).join("");

const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const wrap = x => Math.atan2(Math.sin(x), Math.cos(x));                /* angle to (-π, π] */
const travel = el => {
  const r = el.getBoundingClientRect();
  return clamp((innerHeight / 2 - (r.top + r.height / 2)) / ((innerHeight + r.height) / 2), -1, 1);
};

/* cards are laid out at their largest size and only ever scaled down */
let W = 0, H = 0, R0 = 0, h0 = 0, h1 = 0, hMax = 0;
const sizeStage = () => {
  W = ring.clientWidth; H = ring.clientHeight;
  R0 = Math.min(W * 0.44, H * 0.36);
  h0 = clamp(R0 * 0.2, 34, 74);
  h1 = clamp(Math.min(W, H) * 0.18, 80, 150);
  hMax = Math.min(H * 0.44, W * 0.7, 380);
  for (const c of cards) {
    c.h = hMax; c.w = hMax * c.r;
    c.el.style.width = c.w + "px"; c.el.style.height = c.h + "px";
  }
  hub.style.width = Math.min(440, R0 * 1.5) + "px";
};

/* stack state: which planes are in it, in what order, and how far in we are */
let order = [], filterTag = "", stackBorn = false, frontShown = -1, jumpTo = null;
const buildOrder = () => {
  const inSet = cards.map((_, i) => i).filter(i => matchesTag(cards[i], filterTag));
  /* the stack opens on the hero's print, then carries on round the ring */
  const start = inSet.includes(focus) ? inSet.indexOf(focus) : 0;
  order = inSet.slice(start).concat(inSet.slice(0, start));
};

let ang = -Math.PI / 2, t0 = null, ringVisible = true, sizedW = 0, sizedH = 0, introDone = false;
let pS = reduced ? 1 : 0, focus = 0, live = false, ringMode = false, travelS = 0;
let shownName = "", hoverIdx = -1, shownHint = "";
new IntersectionObserver(([e]) => { ringVisible = e.isIntersecting; if (ringVisible) wake(); }).observe(hero);

/* hero hover: the print lifts, straightens and tilts toward the cursor; the
   line under the headline reads its name */
const setHint = text => {
  if (text === shownHint) return;
  shownHint = text;
  hint.classList.remove("in"); void hint.offsetWidth;
  hint.textContent = text; hint.classList.add("in");
};
ring.addEventListener("pointermove", e => {
  const el = e.target.closest(".card");
  if (!el || !ringMode) return;
  const i = cards.findIndex(c => c.el === el);
  if (i !== hoverIdx) {
    if (hoverIdx >= 0) cards[hoverIdx].el.classList.remove("lift");
    hoverIdx = i; el.classList.add("lift");
  }
  /* offsetX/Y are in the print's own (rotated) space, so the tilt follows the
     cursor across the print whichever way the print is turned */
  const t = e.target, nx = e.offsetX / t.clientWidth - .5, ny = e.offsetY / t.clientHeight - .5;
  cards[i].in.style.setProperty("--ry", (nx * 26).toFixed(1) + "deg");
  cards[i].in.style.setProperty("--rx", (-ny * 26).toFixed(1) + "deg");
  wake();
});
ring.addEventListener("pointerout", e => {
  if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(".card") === e.target.closest(".card")) return;
  if (hoverIdx >= 0) cards[hoverIdx].el.classList.remove("lift");
  hoverIdx = -1; wake();
});

jobs.add((now, dt) => {
  if (!ringVisible) return false;
  if (ring.clientWidth !== sizedW || ring.clientHeight !== sizedH) {       /* measure lazily */
    sizedW = ring.clientWidth; sizedH = ring.clientHeight;
    if (!sizedW || !sizedH) return true;
    sizeStage();
  }
  if (t0 === null) t0 = now;

  const hr = hero.getBoundingClientRect();
  const target = reduced ? 1 : clamp(-hr.top / (hr.height - innerHeight), 0, 1);
  pS += (target - pS) * Math.min(1, dt * 0.006);

  const A = easeInOut(clamp(pS / 0.12, 0, 1));
  const B = clamp((pS - 0.12) / 0.18, 0, 1);
  const C = easeInOut(clamp((pS - 0.3) / 0.1, 0, 1));
  const D = easeInOut(clamp((pS - 0.4) / 0.1, 0, 1));
  const E = clamp((pS - 0.5) / 0.5, 0, 1);
  const still = 1 - A;                                   /* ring-only effects fade as the arch forms */
  if (!reduced) ang += dt * 0.00005 * still * (hoverIdx < 0 ? 1 : 0.08);

  const nowRing = introDone && pS < 0.015 && !reduced;
  if (nowRing !== ringMode) {
    ringMode = nowRing; stage.classList.toggle("ringmode", ringMode);
    if (!ringMode && hoverIdx >= 0) { cards[hoverIdx].el.classList.remove("lift"); hoverIdx = -1; }
  }

  const R1 = W >= 700 ? Math.max(H, W * 0.62) : H * 0.7;
  const rad = lerp(R0, R1, A) * (1 + B * 0.1);
  const cy = lerp(H / 2, H * 0.34 + R1, A);
  const size = lerp(h0, h1, A) * (1 + B * 0.25);
  const spin = easeInOut(B) * 1.5;

  /* the apex print is the one that stays, and the front of the stack */
  if (C === 0) {
    let best = Infinity;
    cards.forEach((c, i) => {
      const d = Math.abs(wrap(ang + spin + i * TAU / n + Math.PI / 2));
      if (d < best) { best = d; focus = i; }
    });
  }
  if (D === 0) stackBorn = false;
  else if (!stackBorn) { stackBorn = true; filterTag = ""; buildOrder(); syncPills(); }
  stage.classList.toggle("stack", D > 0.3);

  /* beat E: how far through the stack; scroll drives it, a click can jump */
  const travelTarget = E * Math.max(0, order.length - 1);
  travelS += (travelTarget - travelS) * Math.min(1, dt * 0.0045);
  const frontIdx = order[clamp(Math.round(travelS), 0, order.length - 1)];

  /* stack geometry: the front plane sits at depth 0, the rest recede up-right */
  const narrow = W < 760;
  const fx = W * (narrow ? 0.36 : 0.34), fy = H * (narrow ? 0.64 : 0.64);
  const sx = W * (narrow ? 0.065 : 0.062), sy = -H * (narrow ? 0.055 : 0.062), sz = 150;
  const planeS = Math.min(hMax, H * (narrow ? 0.3 : 0.46), W * (narrow ? 0.5 : 1)) / hMax;

  let intro = 1;
  cards.forEach((c, i) => {
    const p = reduced ? 1 : easeOut(clamp((now - t0 - i * 55) / 1800, 0, 1));
    intro = Math.min(intro, p);
    const isFocus = i === focus;
    c.hv += ((i === hoverIdx ? 1 : 0) - c.hv) * Math.min(1, dt * 0.005);

    /* beats A–C: ring → arch → one print. In the ring a slow wave travels
       round, so each print breathes outward in turn */
    const a = ang + spin + i * TAU / n + (1 - p) * 0.9;
    const wave = reduced ? 0 : Math.sin(a * 3 - now * 0.0009) * still;
    const r = (rad * (0.55 + 0.45 * p) + wave * 6 + c.hv * 14 * still) * (isFocus ? 1 : 1 + C * 0.4);
    let x = W / 2 + r * Math.cos(a), y = cy + r * Math.sin(a);
    let rot = wrap(a + Math.PI / 2) * 180 / Math.PI * (1 - 0.7 * c.hv * still);
    let s = size / hMax * (0.3 + 0.7 * p) * (1 + wave * 0.045 + c.hv * 0.35 * still);
    let op = (isFocus ? 1 : 1 - C) * Math.min(1, p * 3), z = isFocus || c.hv > 0.3 ? 3 : 1;
    let tz = 0, rX = 0, rY = 0;
    if (isFocus) { x = lerp(x, W / 2, C); y = lerp(y, H * 0.46, C); rot = lerp(rot, 0, C); s = lerp(s, 1, C); }

    /* beats D–E: the stack */
    if (D > 0) {
      const at = order.indexOf(i), pos = at < 0 ? null : at - travelS;
      let px, py, pz, po;
      if (pos === null) {                                  /* filtered out: slide away to the right */
        px = W * 1.2; py = fy - H * 0.2; pz = -600; po = 0;
      } else if (pos < 0) {                                /* passed: slip off to the lower left */
        px = fx + pos * W * 1.1; py = fy - pos * H * 0.3; pz = 0; po = pos < -1.5 ? 0 : 1;
      } else {
        px = fx + pos * sx; py = fy + pos * sy; pz = -pos * sz; po = pos > 6 ? clamp(7 - pos, 0, 1) : 1;
      }
      if (c.sx == null || !c.seen) Object.assign(c, { sx: px, sy: py, sz: pz, so: po, seen: true });
      const k = Math.min(1, dt * 0.0055);
      c.sx += (px - c.sx) * k; c.sy += (py - c.sy) * k; c.sz += (pz - c.sz) * k; c.so += (po - c.so) * k;
      const rank = pos === null ? 12 : Math.abs(pos);
      const dk = isFocus ? D : easeOut(clamp((D - 0.04 * Math.min(rank, 8)) / 0.68, 0, 1));
      x = lerp(x, c.sx, dk); y = lerp(y, c.sy, dk); s = lerp(s, planeS, dk);
      rot = lerp(rot, -3, dk); op = lerp(op, c.so, dk);
      tz = c.sz * dk; rY = -26 * dk; rX = 12 * dk;
      z = pos === null ? 0 : 500 - Math.round(pos * 10);
    } else c.seen = false;
    const depth = Math.abs(tz) > 0.5 || Math.abs(rY) > 0.05
      ? ` translateZ(${tz.toFixed(1)}px) rotateY(${rY.toFixed(2)}deg) rotateX(${rX.toFixed(2)}deg)` : "";
    c.el.style.transform = `translate(${(x - c.w / 2).toFixed(1)}px,${(y - c.h / 2).toFixed(1)}px)${depth} rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(4)})`;
    c.el.style.opacity = op.toFixed(3);
    c.el.style.zIndex = z;
  });
  if (intro >= 1) introDone = true;
  setHint(hoverIdx >= 0 && ringMode ? cards[hoverIdx].name : "Scroll to explore");

  /* supporting cast */
  hub.style.opacity = (1 - clamp(pS / 0.06, 0, 1)).toFixed(3);
  hub.style.transform = `translateY(${(-pS * 160).toFixed(1)}px)`;
  cap.style.opacity = (clamp((A - 0.55) / 0.3, 0, 1) * (1 - D)).toFixed(3);
  cap.style.top = lerp(H * 0.56, H * 0.46 + hMax / 2 + 26, C).toFixed(1) + "px";
  if (cards[focus].name !== shownName) {
    shownName = cards[focus].name;
    capName.classList.remove("in"); void capName.offsetWidth;
    capName.textContent = shownName; capName.classList.add("in");
  }
  /* the bar and caption bow out before the stage scrolls away */
  const ui = clamp((D - 0.6) / 0.4, 0, 1) * (1 - clamp((pS - 0.955) / 0.035, 0, 1));
  sbar.style.opacity = ui.toFixed(3); scap.style.opacity = ui.toFixed(3);
  if (D > 0 && frontIdx !== frontShown) {
    if (frontShown >= 0) cards[frontShown].el.classList.remove("front");
    frontShown = frontIdx; cards[frontIdx].el.classList.add("front");
    const [coll, title] = cards[frontIdx].name.split(" · ");
    scap.innerHTML = `<span><b>${String(order.indexOf(frontIdx) + 1).padStart(2, "0")}</b> / ${String(order.length).padStart(2, "0")} · ${coll}</span><span class="nm">${title}</span>`;
    scap.classList.remove("in"); void scap.offsetWidth; scap.classList.add("in");
  }
  const nowLive = D > 0.98;
  if (nowLive !== live) { live = nowLive; stage.classList.toggle("live", live); }

  /* the nav names the beat you're in while the stage owns the viewport */
  if (hr.top < innerHeight / 2 && hr.bottom > innerHeight / 2) setName(pS > 0.4 ? "Browse" : "Collections");

  return !reduced || intro < 1 || Math.abs(target - pS) > 0.0005 || Math.abs(travelTarget - travelS) > 0.001;
});
wake();

/* ---------- the stack ---------- */
/* scroll position (in px) that puts plane k of the current order at the front */
const scrollForPlane = k => {
  const track = hero.offsetHeight - innerHeight, e = order.length > 1 ? k / (order.length - 1) : 0;
  return hero.offsetTop + track * (0.5 + 0.5 * e);
};
const goToPlane = k => {
  const y = scrollForPlane(clamp(k, 0, order.length - 1));
  if (lenis) lenis.scrollTo(y, { duration: 1.4 }); else scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
};
const sthumb = $(".sthumb", spills), sfan = $("#sfan"), fanImgs = $$("img", sfan);
function moveThumb() {
  const b = $(`.spill[aria-pressed="true"]`, spills);
  if (!b) return;
  sthumb.style.width = b.offsetWidth + "px";
  sthumb.style.transform = `translateX(${b.offsetLeft}px)`;
}
function syncPills() {
  for (const b of $$(".spill", spills)) b.setAttribute("aria-pressed", String(b.dataset.tag === filterTag));
  moveThumb();
}
new ResizeObserver(moveThumb).observe(spills);

/* hovering a filter fans out three of its prints above it */
spills.addEventListener("pointerover", e => {
  const b = e.target.closest(".spill");
  if (!b || e.pointerType === "touch") return;
  const picks = cards.filter(c => matchesTag(c, b.dataset.tag)).slice(0, 3);
  fanImgs.forEach((img, k) => {
    const c = picks[k % picks.length];
    img.src = c.el.querySelector("img").src;
  });
  sfan.style.left = (spills.offsetLeft + b.offsetLeft - spills.scrollLeft + b.offsetWidth / 2) + "px";
  sfan.classList.add("on");
});
spills.addEventListener("pointerleave", () => sfan.classList.remove("on"));

/* a filter re-forms the stack from its own frames; the rest slide away */
spills.addEventListener("click", e => {
  const b = e.target.closest(".spill");
  if (!b || !live) return;
  filterTag = b.dataset.tag;
  const keep = order[clamp(Math.round(travelS), 0, order.length - 1)];
  const inSet = cards.map((_, i) => i).filter(i => matchesTag(cards[i], filterTag));
  const start = inSet.includes(keep) ? inSet.indexOf(keep) : 0;
  order = inSet.slice(start).concat(inSet.slice(0, start));
  syncPills(); frontShown = -1;
  goToPlane(0); wake();
});
$("#sgrid").addEventListener("click", () => goToPlane(0));

/* clicking a plane brings it to the front */
ring.addEventListener("click", e => {
  const el = e.target.closest(".card");
  if (!el || !live) return;
  const at = order.indexOf(cards.findIndex(c => c.el === el));
  if (at >= 0) goToPlane(at);
});

/* the CTA's knob is a small window onto the archive */
const kph = $(".seg.cta .kph");
if (kph) {
  let k = 0;
  const swapKnob = () => { kph.style.backgroundImage = `url(${pic(ringItems[k % n][0], 120, 120)})`; k += 7; };
  swapKnob();
  if (!reduced) setInterval(swapKnob, 2800);
}

/* ======================================================================
   03 SYSTEM — the panels take turns; hover or click to choose
   ====================================================================== */
const SYS = [
  ["Ingest", "Straight off the card, <em>proxies while you unpack.</em>", "RAW, PSD, R3D and 4K masters land from the card, Capture One or Frame.io, and proxies build before the van is empty.", 943],
  ["Rights", "Releases and licences <em>live on the file.</em>", "Model releases, licence windows and territories travel with the frame, and expire loudly before the image ships.", 64],
  ["Index", "Read from the pixels, <em>never typed.</em>", "Subject, light, colour and mood are read from the image itself. Nobody on your team writes a tag again.", 65],
  ["Versions", "Every grade stays <em>welded to its master.</em>", "Raw, grade and retouch stay stacked on the one frame. No more v7-FINAL-final-b.", 325],
  ["Share", "A link, <em>not a 40 GB zip.</em>", "Send a collection with expiry, watermarks and a read receipt, and see who opened it.", 399]
];
const sysEl = $("#sys"), sysd = $("#sysd"), sysH = $("#sysH"), sysP = $("#sysP");
sysEl.innerHTML = SYS.map(([name, , , id], i) =>
  `<button type="button" class="sp" aria-pressed="false"><span class="ph"><img decoding="async" src="${pic(id, 760, 930)}" alt="" loading="lazy"></span><span class="lb">${String(i + 1).padStart(2, "0")} <span class="nm">${name}</span><i></i></span></button>`).join("");
const sps = $$(".sp", sysEl);
let sysI = -1, sysHover = false, sysSeen = false;
const showSys = i => {
  if (i === sysI) return;
  sysI = i;
  sps.forEach((b, k) => { b.classList.toggle("on", k === i); b.setAttribute("aria-pressed", String(k === i)); });
  sysH.innerHTML = SYS[i][1]; sysP.textContent = SYS[i][2];
  sysd.classList.remove("in"); void sysd.offsetWidth; sysd.classList.add("in");
};
sps.forEach((b, k) => {
  b.addEventListener("click", () => showSys(k));
  b.addEventListener("mouseenter", () => { if (finePointer) showSys(k); });
  $(".lb i", b).addEventListener("animationend", () => showSys((sysI + 1) % SYS.length));
});
const syncSys = () => sysEl.classList.toggle("paused", sysHover || !sysSeen || reduced);
sysEl.addEventListener("mouseenter", () => { sysHover = true; syncSys(); });
sysEl.addEventListener("mouseleave", () => { sysHover = false; syncSys(); });
new IntersectionObserver(([e]) => { sysSeen = e.isIntersecting; syncSys(); }, { threshold: .35 }).observe(sysEl);
showSys(0); syncSys();

/* ======================================================================
   04 WORKFLOW — whichever step is centred owns the sticky media
   ====================================================================== */
const steps = $$(".step"), mediaFigs = $$(".m"), bignum = $("#bignum"), sticky = $("#how-sticky");
const setStep = i => {
  steps.forEach((s, k) => s.classList.toggle("on", k === i));
  mediaFigs.forEach((m, k) => m.classList.toggle("on", k === i));
  bignum.style.setProperty("--s", i);
};
setStep(0);
for (const s of steps) new IntersectionObserver(([e]) => { if (e.isIntersecting) setStep(+s.dataset.step); }, { rootMargin: "-45% 0px -45% 0px" }).observe(s);
const stepsWrap = $("#steps");
let lastHp = "";
jobs.add(() => {
  const r = stepsWrap.getBoundingClientRect();
  const v = clamp((innerHeight * 0.5 - r.top) / r.height, 0, 1).toFixed(3);
  if (v !== lastHp) { lastHp = v; sticky.style.setProperty("--hp", v); }
  return false;
});

/* ======================================================================
   05 FIELD NOTES — native scroll-snap rail, plus mouse drag
   ====================================================================== */
const rail = $("#rail"), railItems = [...rail.children];
$("#rTot").textContent = String(railItems.length).padStart(2, "0");
const railStep = () => railItems[1].offsetLeft - railItems[0].offsetLeft;
const railSync = () => {
  const max = rail.scrollWidth - rail.clientWidth;
  const idx = Math.round(rail.scrollLeft / railStep());
  $("#rIdx").textContent = String(clamp(idx + 1, 1, railItems.length)).padStart(2, "0");
  $("#rBar").style.setProperty("--rp", (max ? 12 + (rail.scrollLeft / max) * 88 : 100) + "%");
};
rail.addEventListener("scroll", railSync, { passive: true });
railSync();
$("#rPrev").addEventListener("click", () => rail.scrollBy({ left: -railStep(), behavior: reduced ? "auto" : "smooth" }));
$("#rNext").addEventListener("click", () => rail.scrollBy({ left: railStep(), behavior: reduced ? "auto" : "smooth" }));
let rDown = false, rX = 0, rL = 0;
rail.addEventListener("pointerdown", e => {
  if (e.pointerType !== "mouse") return;
  rDown = true; rX = e.clientX; rL = rail.scrollLeft;
  rail.classList.add("dragging"); rail.setPointerCapture(e.pointerId);
});
rail.addEventListener("pointermove", e => { if (rDown) rail.scrollLeft = rL - (e.clientX - rX); });
const railUp = () => {
  if (!rDown) return;
  rDown = false;
  const snapTo = Math.round(rail.scrollLeft / railStep()) * railStep();
  rail.classList.remove("dragging");
  rail.scrollTo({ left: snapTo, behavior: reduced ? "auto" : "smooth" });
};
rail.addEventListener("pointerup", railUp);
rail.addEventListener("pointercancel", railUp);

/* ======================================================================
   06 PRICING — the ruler sets the seats; the price rolls into place
   ====================================================================== */
const seats = $("#seats"), ruler = $("#ruler"), odo = $("#odo"), cycle = $("#cycle");
const PLANS = { studio: { mo: 24, yr: 19, name: "Studio" }, production: { mo: 48, yr: 38, name: "Production" } };
let billing = "mo";
/* each digit is a strip of 0–9 that slides to its number */
const setOdo = v => {
  const str = v.toLocaleString("en-US");
  if (odo.dataset.str?.length !== str.length) {
    odo.innerHTML = [...str].map((ch, i) => ch === "," ? `<span class="c">,</span>`
      : `<span class="d"><span style="--i:${i}">${[..."0123456789"].map(d => `<i>${d}</i>`).join("")}</span></span>`).join("");
    void odo.offsetWidth;
  }
  odo.dataset.str = str;
  [...str].forEach((ch, i) => { if (ch !== ",") odo.children[i].firstElementChild.style.setProperty("--n", ch); });
};
const price = () => {
  const n = +seats.value;
  ruler.style.setProperty("--pct", ((n - 1) / 39 * 100) + "%");
  $("#rbub").textContent = `${n} ${n === 1 ? "seat" : "seats"}`;
  const plan = PLANS[n <= 10 ? "studio" : "production"], each = plan[billing], total = n * each;
  $("#pplan").textContent = `${plan.name} · ${n} × $${each}`;
  $("#per").textContent = billing === "mo" ? "/ month" : "/ month, billed yearly";
  $("#priceSr").textContent = `$${total.toLocaleString("en-US")} a month on ${plan.name}`;
  setOdo(total);
};
seats.addEventListener("input", price);
cycle.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  for (const x of $$("button", cycle)) x.setAttribute("aria-pressed", String(x === b));
  billing = b.dataset.cycle; segBlob(cycle); price();
});
price();

/* ---------- finale arc + footer wordmark ---------- */
const arc = $("#arc");
let lastRoll = "";
if (!reduced) jobs.add(() => {
  const r = arc.getBoundingClientRect();
  if (r.top < innerHeight && r.bottom > 0) {
    const v = (travel(arc) * -0.85).toFixed(3);
    if (v !== lastRoll) { lastRoll = v; arc.style.setProperty("--roll", v); }
  }
  return false;
});
$("#signup").addEventListener("submit", e => {
  e.preventDefault();
  e.currentTarget.innerHTML = '<p class="done">Thank you — your workspace link is on its way.</p>';
});
const wm = $("#wordmark");
wm.innerHTML = [..."tess"].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join("") +
  [..."era"].map((ch, i) => `<span class="it" style="--i:${i + 4}">${ch}</span>`).join("");
io.observe(wm);

/* segmented blobs need real layout, so place them once fonts settle */
const placeBlobs = () => segBlob(cycle);
document.fonts.ready.then(placeBlobs);
addEventListener("resize", placeBlobs, { passive: true });
