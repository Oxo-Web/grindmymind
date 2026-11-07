/* =========================================================
   Grind My Mind — logique
   1. Réglages            6. Le van
   2. Raccourcis & utils  7. Fenêtre « étape »
   3. Données             8. Export / import
   4. Décor               9. Petites interactions
   5. Dessin de la frise 10. Démarrage
   ========================================================= */
"use strict";

/* ---------- 1. Réglages ---------- */
const STORAGE_KEY = "grind-my-mind.steps.v1";

// Doit correspondre aux variables --road-top / --road-h du CSS
const LAYOUT = {
  startX: 170,   // position du point de départ
  gap: 250,      // distance entre deux étapes
  roadTop: 380,
  roadH: 56,
  cardW: 184,
  cardH: 236,
  stemAbove: 34, // longueur du fil sous une carte du haut
  stemBelow: 40, // longueur du fil au-dessus d'une carte du bas
};
const DRIVE_MS = 1800; // durée du trajet du van (comme dans le CSS)

const CATEGORIES = {
  sante:     { label: "Santé",     emoji: "🌿" },
  travail:   { label: "Travail",   emoji: "💼" },
  relations: { label: "Relations", emoji: "❤️" },
};
const TYPES = { etape: "Ça avance", panne: "Panne" };
const TILTS = [-3, 2, -1.5, 2.5, -2, 1.5];

/* ---------- 2. Raccourcis & utilitaires ---------- */
const $ = (selector) => document.querySelector(selector);

const ui = {
  scene: $("#scene"), track: $("#track"), world: $("#world"),
  far: $("#far"), hills: $("#hills"), van: $("#van"),
  stats: $("#stats"), empty: $("#empty"), toast: $("#toast"),
  menuBtn: $("#menuBtn"), menuPop: $("#menuPop"), importInput: $("#importInput"),
  dialog: $("#stepDialog"), form: $("#stepForm"), dialogTitle: $("#dialogTitle"),
  submitBtn: $("#submitBtn"), fTitle: $("#fTitle"), fDate: $("#fDate"),
  fPhoto: $("#fPhoto"), fNote: $("#fNote"), noteCount: $("#noteCount"),
  dropzone: $("#dropzone"), dzEmpty: $("#dzEmpty"), dzPreview: $("#dzPreview"), preview: $("#preview"),
  confirm: $("#confirmDialog"), confirmTitle: $("#confirmTitle"),
  confirmText: $("#confirmText"), confirmOk: $("#confirmOk"),
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Protège le texte saisi avant de l'insérer dans la page
function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function el(tag, className, styles = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [key, value] of Object.entries(styles)) {
    if (key.startsWith("--")) node.style.setProperty(key, value); // variable CSS
    else node.style[key] = value;
  }
  return node;
}

function uid() {
  return window.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

function formatDate(iso) {
  return new Date(iso + "T00:00").toLocaleDateString("fr-FR",
    { day: "numeric", month: "short", year: "numeric" });
}

const plural = (n, word) => `${n} ${word}${n > 1 ? "s" : ""}`;

// Générateur aléatoire « stable » : même graine = même décor à chaque affichage
function seededRandom(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const pick = (rand, list) => list[Math.floor(rand() * list.length)];

/* ---------- 3. Données ---------- */
let steps = loadSteps();

// Vérifie et nettoie une étape (utile pour le stockage ET l'import)
function normalizeStep(s) {
  if (!s || typeof s !== "object") return null;
  const title = typeof s.title === "string" ? s.title.trim().slice(0, 60) : "";
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(s.date) || !CATEGORIES[s.cat]) return null;
  return {
    id: typeof s.id === "string" && s.id ? s.id : uid(),
    title,
    date: s.date,
    cat: s.cat,
    type: s.type === "panne" ? "panne" : "etape",
    photo: typeof s.photo === "string" && s.photo.startsWith("data:image/") ? s.photo : null,
    note: typeof s.note === "string" ? s.note.slice(0, 280) : "",
    createdAt: Number(s.createdAt) || Date.now(),
  };
}

function loadSteps() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(raw) ? raw.map(normalizeStep).filter(Boolean) : [];
  } catch {
    return [];
  }
}

// N'applique les changements que si la sauvegarde a réussi
function commit(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    steps = next;
    return true;
  } catch {
    toast("Mémoire du navigateur pleine : exporte une sauvegarde puis retire quelques photos.", "error");
    return false;
  }
}

function sortedSteps() {
  return [...steps].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
}

const xOf = (index) => LAYOUT.startX + (index + 1) * LAYOUT.gap;

/* ---------- 4. Décor (SVG dessinés en code) ---------- */
const COLORS = {
  greens: ["#5fb36a", "#4fa25e", "#79c27a", "#3f9157"],
  pinks: ["#f6a5c0", "#f38fb0", "#ffc2d4"],
  buildings: ["#8fa6c6", "#a4b6d0", "#7f95b8", "#b7aacf", "#9fb3c9"],
};

const decorMakers = {
  roundTree(rand, colors = COLORS.greens) {
    const c = pick(rand, colors);
    return { w: 70, h: 100, svg: `<svg viewBox="0 0 70 100">
      <rect x="32" y="56" width="6" height="44" rx="3" fill="#8a6a4b"/>
      <circle cx="35" cy="40" r="25" fill="${c}"/><circle cx="21" cy="53" r="16" fill="${c}"/>
      <circle cx="49" cy="52" r="17" fill="${c}"/><circle cx="27" cy="31" r="9" fill="#fff" opacity=".2"/></svg>` };
  },
  pine(rand) {
    const c = pick(rand, COLORS.greens);
    return { w: 50, h: 110, svg: `<svg viewBox="0 0 50 110">
      <rect x="22" y="86" width="6" height="24" rx="2" fill="#7a5c40"/>
      <path d="M25 2 L44 40 H34 L48 66 H36 L50 92 H0 L14 66 H2 L16 40 H6 Z" fill="${c}"/></svg>` };
  },
  bush(rand) {
    const c = pick(rand, COLORS.greens);
    return { w: 56, h: 30, svg: `<svg viewBox="0 0 56 30">
      <ellipse cx="18" cy="20" rx="16" ry="11" fill="${c}"/><ellipse cx="36" cy="17" rx="18" ry="14" fill="${c}"/>
      <ellipse cx="32" cy="11" rx="7" ry="4" fill="#fff" opacity=".18"/></svg>` };
  },
  building(rand) {
    const w = 44 + Math.floor(rand() * 28);
    const h = 70 + Math.floor(rand() * 80);
    const c = pick(rand, COLORS.buildings);
    let windows = "";
    for (let y = 12; y < h - 14; y += 14) {
      for (let x = 8; x < w - 10; x += 11) {
        const lit = rand() < 0.35;
        windows += `<rect x="${x}" y="${y}" width="6" height="8" rx="1" fill="${lit ? "#ffe39a" : "#fff"}" opacity="${lit ? 0.95 : 0.45}"/>`;
      }
    }
    const antenna = rand() < 0.4 ? `<rect x="${w / 2 - 1}" y="0" width="2" height="10" fill="${c}"/>` : "";
    return { w, h: h + 10, svg: `<svg viewBox="0 0 ${w} ${h + 10}">${antenna}
      <rect x="0" y="10" width="${w}" height="${h}" rx="3" fill="${c}"/>
      <g transform="translate(0 10)">${windows}</g></svg>` };
  },
  flowers(rand) {
    const heads = [0, 1, 2].map((i) => {
      const x = 8 + i * 12, y = 10 + rand() * 8;
      const c = pick(rand, ["#ee5d7a", "#ffd166", "#ffffff", "#f6a5c0"]);
      return `<line x1="${x}" y1="${y}" x2="${x}" y2="34" stroke="#4f9a5a" stroke-width="2"/>
        <circle cx="${x}" cy="${y}" r="5" fill="${c}"/><circle cx="${x}" cy="${y}" r="1.8" fill="#f4a12e"/>`;
    }).join("");
    return { w: 40, h: 34, svg: `<svg viewBox="0 0 40 34">${heads}</svg>` };
  },
};

// Chaque route a son paysage : forêt (santé), ville (travail), cerisiers (relations)
function makeDecor(kind, rand) {
  const r = rand();
  switch (kind) {
    case "sante":     return r < 0.45 ? decorMakers.roundTree(rand) : r < 0.85 ? decorMakers.pine(rand) : decorMakers.bush(rand);
    case "travail":   return r < 0.85 ? decorMakers.building(rand) : decorMakers.bush(rand);
    case "relations": return r < 0.55 ? decorMakers.roundTree(rand, COLORS.pinks) : decorMakers.flowers(rand);
    default:          return r < 0.6 ? decorMakers.roundTree(rand) : decorMakers.bush(rand);
  }
}

function addDecor(frag, fromX, toX, kind, seed) {
  const rand = seededRandom(seed);
  const count = Math.max(2, Math.round((toX - fromX) / 85));
  for (let k = 0; k < count; k++) {
    const item = makeDecor(kind, rand);
    const scale = 0.75 + rand() * 0.4;
    const w = item.w * scale, h = item.h * scale;
    const x = fromX + ((toX - fromX) * (k + 0.5)) / count + (rand() - 0.5) * 30;
    const node = el("div", "decor", {
      left: `${x - w / 2}px`, top: `${LAYOUT.roadTop + 6 - h}px`,
      width: `${w}px`, height: `${h}px`,
    });
    node.innerHTML = item.svg;
    frag.append(node);
  }
}

const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

ui.far.style.backgroundImage = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 170" preserveAspectRatio="none">
  <path d="M0 170V100L70 72L130 96L220 38L300 90L380 58L450 94L540 30L620 86L700 60L780 98L850 74L900 100V170Z" fill="#f2bea6"/>
  <path d="M220 38L238 50L226 49L214 55L206 50Z M540 30L558 43L546 42L534 48L526 42Z" fill="#fff" opacity=".7"/>
  <path d="M0 170V128L90 100L170 132L260 92L350 126L440 104L520 136L610 96L700 124L790 106L900 128V170Z" fill="#e7a897"/></svg>`);
ui.hills.style.backgroundImage = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 36" preserveAspectRatio="none">
  <path d="M0 36V22Q52 4 105 18T210 16T315 20T420 22V36Z" fill="#b0d995"/></svg>`);

const WARNING_SVG = `<svg viewBox="0 0 34 50" width="34" height="50" aria-hidden="true">
  <rect x="15.5" y="26" width="3" height="24" rx="1.5" fill="#8a6a4b"/>
  <path d="M17 2 L32 28 H2 Z" fill="#fff" stroke="#d9342b" stroke-width="3.5" stroke-linejoin="round"/>
  <rect x="15.6" y="10" width="2.8" height="9" rx="1.4" fill="#1f1b24"/><circle cx="17" cy="23" r="1.8" fill="#1f1b24"/></svg>`;

/* ---------- 5. Dessin de la frise ---------- */
function render({ animate = true, newId = null } = {}) {
  const list = sortedSteps();
  const lastX = list.length ? xOf(list.length - 1) : LAYOUT.startX;
  const width = Math.max(ui.scene.clientWidth, lastX + 560);
  ui.track.style.width = `${width}px`;

  const frag = document.createDocumentFragment();
  frag.append(el("div", "road future", { left: "0px", width: `${width}px` }));
  addDecor(frag, 0, LAYOUT.startX, "start", "depart");
  frag.append(sign(LAYOUT.startX - 80, "Départ", "start"));

  list.forEach((step, i) => {
    const x = xOf(i);
    const prevX = i === 0 ? LAYOUT.startX : xOf(i - 1);
    addDecor(frag, prevX, x, step.cat, step.id);
    frag.append(el("div", `road ${step.cat}`, { left: `${prevX}px`, width: `${x - prevX}px` }));
    if (step.type === "panne") {
      const w = el("div", "warning", { left: `${x - 125}px` });
      w.innerHTML = WARNING_SVG;
      frag.append(w);
    }
    frag.append(buildCard(step, i, x, step.id === newId));
  });

  if (list.length) frag.append(sign(lastX + 300, "À suivre…", "end"));

  ui.world.replaceChildren(frag);
  ui.empty.hidden = list.length > 0;
  renderStats(list);
  moveVan(lastX, list.at(-1)?.type === "panne", animate);
}

function sign(x, text, kind) {
  const node = el("div", `sign ${kind}`, { left: `${x}px` });
  node.innerHTML = `<span class="board">${esc(text)}</span><span class="post"></span>`;
  return node;
}

function buildCard(step, index, x, isNew) {
  const frag = document.createDocumentFragment();
  const above = index % 2 === 0;
  const { roadTop, roadH, cardW, cardH, stemAbove, stemBelow } = LAYOUT;
  const top = above ? roadTop - stemAbove - cardH : roadTop + roadH + stemBelow;
  const color = `var(--${step.cat})`;

  frag.append(el("div", "stem", {
    left: `${x}px`,
    top: `${above ? top + cardH : roadTop + roadH}px`,
    height: `${above ? stemAbove : stemBelow}px`,
  }));
  frag.append(el("div", `milestone${above ? "" : " below"}`, { left: `${x}px`, "--c": color }));

  const cat = CATEGORIES[step.cat];
  const pin = el("div", `pin${step.type === "panne" ? " panne" : ""}${isNew ? " is-new" : ""}`, {
    left: `${x - cardW / 2}px`, top: `${top}px`,
  });
  pin.style.setProperty("--tilt", `${TILTS[index % TILTS.length]}deg`);
  pin.style.setProperty("--c", color);
  pin.dataset.id = step.id;

  const photo = step.photo
    ? `<img class="photo" src="${esc(step.photo)}" alt="" loading="lazy">`
    : `<div class="photo placeholder" aria-hidden="true">${cat.emoji}</div>`;
  const date = esc(formatDate(step.date));

  pin.innerHTML = `
    <div class="card" tabindex="0" role="button" aria-pressed="false"
         aria-label="${esc(step.title)}, ${date}. Retourner la carte">
      <div class="card-inner">
        <div class="face front">
          <span class="tape"></span>
          ${photo}
          ${step.type === "panne" ? `<span class="stamp">Panne</span>` : ""}
          <span class="flip-hint" aria-hidden="true">↻</span>
          <p class="title">${esc(step.title)}</p>
          <p class="meta"><span>${date}</span><span>${cat.label}</span></p>
        </div>
        <div class="face back">
          <span class="tape"></span>
          <p class="back-head"><i></i>${cat.label} · ${TYPES[step.type]}</p>
          <p class="note${step.note ? "" : " empty"}">${step.note ? esc(step.note) : "Pas encore de petit mot…"}</p>
          <div class="actions">
            <button type="button" class="mini-btn" data-action="edit">Modifier</button>
            <button type="button" class="mini-btn danger" data-action="delete">Supprimer</button>
          </div>
        </div>
      </div>
    </div>`;
  frag.append(pin);
  return frag;
}

function renderStats(list) {
  if (!list.length) { ui.stats.replaceChildren(); return; }
  const pannes = list.filter((s) => s.type === "panne").length;
  const chips = [`<span class="stat">🚐 <b>${list.length}</b> ${list.length > 1 ? "étapes" : "étape"}</span>`];
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const n = list.filter((s) => s.cat === key).length;
    if (n) chips.push(`<span class="stat" style="--c: var(--${key})"><i></i><b>${n}</b> ${cat.label}</span>`);
  }
  if (pannes) chips.push(`<span class="stat">💨 <b>${pannes}</b> ${pannes > 1 ? "pannes" : "panne"}</span>`);
  ui.stats.innerHTML = chips.join("");
}

/* ---------- 6. Le van ---------- */
let vanTimer;

function moveVan(x, broken, animate) {
  const van = ui.van;
  const from = parseFloat(van.style.left);
  const moving = animate && !reducedMotion && !Number.isNaN(from) && from !== x;

  clearTimeout(vanTimer);
  van.classList.toggle("no-anim", !moving);
  van.classList.toggle("reverse", moving && x < from);

  if (moving) {
    van.classList.remove("broken");
    van.classList.add("driving");
    vanTimer = setTimeout(() => {
      van.classList.remove("driving");
      van.classList.toggle("broken", broken);
    }, DRIVE_MS);
  } else {
    van.classList.remove("driving");
    van.classList.toggle("broken", broken);
  }

  van.style.left = `${x}px`;
  ui.scene.scrollTo({ left: x - ui.scene.clientWidth * 0.45, behavior: moving ? "smooth" : "auto" });
}

/* ---------- 7. Fenêtre « étape » (ajout / modification) ---------- */
let editingId = null;
let pendingPhoto = null;

function openStepDialog(step = null) {
  editingId = step?.id ?? null;
  ui.form.reset();
  ui.dialogTitle.textContent = step ? "Modifier l'étape" : "Nouvelle étape";
  ui.submitBtn.textContent = step ? "Enregistrer" : "Ajouter l'étape";
  ui.fTitle.value = step?.title ?? "";
  ui.fDate.value = step?.date ?? today();
  ui.form.elements.cat.value = step?.cat ?? "travail";
  ui.form.elements.type.value = step?.type ?? "etape";
  ui.fNote.value = step?.note ?? "";
  ui.noteCount.textContent = ui.fNote.value.length;
  pendingPhoto = step?.photo ?? null;
  updatePhotoUI();
  closeMenu();
  ui.dialog.showModal();
  ui.fTitle.focus();
}

function updatePhotoUI() {
  ui.dzEmpty.hidden = !!pendingPhoto;
  ui.dzPreview.hidden = !pendingPhoto;
  if (pendingPhoto) ui.preview.src = pendingPhoto;
  else ui.preview.removeAttribute("src");
}

// Réduit la photo avant de la garder (sinon la mémoire du navigateur sature vite)
function resizeImage(file, max = 640) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image illisible")); };
    img.src = url;
  });
}

ui.fPhoto.addEventListener("change", async () => {
  const file = ui.fPhoto.files[0];
  ui.dropzone.classList.remove("dragover");
  if (!file) return;
  if (!file.type.startsWith("image/")) { toast("Ce fichier n'est pas une image.", "error"); return; }
  try {
    pendingPhoto = await resizeImage(file);
    updatePhotoUI();
  } catch {
    toast("Cette image n'a pas pu être lue (format HEIC ?). Essaie en JPG ou PNG.", "error");
  }
  ui.fPhoto.value = "";
});

$("#removePhoto").addEventListener("click", () => { pendingPhoto = null; updatePhotoUI(); });
ui.dropzone.addEventListener("dragenter", () => ui.dropzone.classList.add("dragover"));
ui.dropzone.addEventListener("dragleave", () => ui.dropzone.classList.remove("dragover"));
ui.fNote.addEventListener("input", () => { ui.noteCount.textContent = ui.fNote.value.length; });

ui.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = {
    title: ui.fTitle.value.trim(),
    date: ui.fDate.value,
    cat: ui.form.elements.cat.value,
    type: ui.form.elements.type.value,
    photo: pendingPhoto,
    note: ui.fNote.value.trim(),
  };
  if (!data.title) { ui.fTitle.focus(); return; }

  const isEdit = !!editingId;
  const id = editingId ?? uid();
  const next = isEdit
    ? steps.map((s) => (s.id === id ? { ...s, ...data } : s))
    : [...steps, { id, ...data, createdAt: Date.now() }];

  if (!commit(next)) return;
  ui.dialog.close();
  render({ newId: isEdit ? null : id });
  toast(isEdit ? "Étape mise à jour ✏️"
    : data.type === "panne" ? "Panne notée. Le van repartira 💨"
    : "En route ! 🚐");
});

document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => ui.dialog.close()));
// Clic sur le fond sombre = fermer
ui.dialog.addEventListener("click", (e) => { if (e.target === ui.dialog) ui.dialog.close(); });

/* Confirmation (remplace le confirm() du navigateur) */
function confirmAsk({ title, text, okLabel = "OK", danger = false }) {
  ui.confirmTitle.textContent = title;
  ui.confirmText.textContent = text;
  ui.confirmOk.textContent = okLabel;
  ui.confirmOk.className = `btn ${danger ? "danger" : "primary"}`;
  ui.confirm.returnValue = "";
  ui.confirm.showModal();
  return new Promise((resolve) => {
    ui.confirm.addEventListener("close", () => resolve(ui.confirm.returnValue === "ok"), { once: true });
  });
}

/* ---------- 8. Export / import ---------- */
function exportData() {
  closeMenu();
  const payload = { app: "grind-my-mind", version: 1, exportedAt: new Date().toISOString(), steps };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = el("a");
  a.href = url;
  a.download = `grind-my-mind-${today()}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Sauvegarde téléchargée 💾 (${plural(steps.length, "étape")})`);
}

async function importFile(file) {
  let parsed;
  try { parsed = JSON.parse(await file.text()); }
  catch { toast("Ce fichier n'est pas une sauvegarde valide.", "error"); return; }

  const raw = Array.isArray(parsed) ? parsed : parsed?.steps;
  const incoming = Array.isArray(raw) ? raw.map(normalizeStep).filter(Boolean) : [];
  if (!incoming.length) { toast("Aucune étape trouvée dans ce fichier.", "error"); return; }

  const ok = await confirmAsk({
    title: "Importer la sauvegarde ?",
    text: `${plural(incoming.length, "étape")} vont être ajoutées à ta frise. Si une étape existe déjà, elle sera remplacée par celle du fichier.`,
    okLabel: "Importer",
  });
  if (!ok) return;

  const byId = new Map(steps.map((s) => [s.id, s]));
  incoming.forEach((s) => byId.set(s.id, s));
  if (commit([...byId.values()])) {
    render();
    toast(`${plural(incoming.length, "étape")} importée${incoming.length > 1 ? "s" : ""} ✅`);
  }
}

$("#exportBtn").addEventListener("click", exportData);
$("#importBtn").addEventListener("click", () => { closeMenu(); ui.importInput.click(); });
ui.importInput.addEventListener("change", () => {
  const file = ui.importInput.files[0];
  ui.importInput.value = "";
  if (file) importFile(file);
});

/* ---------- 9. Petites interactions ---------- */

// Menu « ⋯ »
function closeMenu() {
  ui.menuPop.hidden = true;
  ui.menuBtn.setAttribute("aria-expanded", "false");
}
ui.menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = ui.menuPop.hidden;
  ui.menuPop.hidden = !open;
  ui.menuBtn.setAttribute("aria-expanded", String(open));
});

// Cartes : retourner, modifier, supprimer
function setFlipped(pin, flipped) {
  pin.classList.toggle("flipped", flipped);
  pin.querySelector(".card").setAttribute("aria-pressed", String(flipped));
}
function unflipAll(except = null) {
  ui.world.querySelectorAll(".pin.flipped").forEach((p) => { if (p !== except) setFlipped(p, false); });
}

ui.world.addEventListener("click", async (e) => {
  const pin = e.target.closest(".pin");
  if (!pin) return;
  const step = steps.find((s) => s.id === pin.dataset.id);
  const action = e.target.closest("[data-action]")?.dataset.action;

  if (action === "edit") { openStepDialog(step); return; }
  if (action === "delete") {
    const ok = await confirmAsk({
      title: "Supprimer cette étape ?",
      text: `« ${step.title} » va disparaître de ta frise. Pense à exporter une sauvegarde si tu veux la garder.`,
      okLabel: "Supprimer",
      danger: true,
    });
    if (ok && commit(steps.filter((s) => s.id !== step.id))) {
      render();
      toast("Étape supprimée");
    }
    return;
  }
  unflipAll(pin);
  setFlipped(pin, !pin.classList.contains("flipped"));
});

ui.world.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("card")) {
    e.preventDefault();
    e.target.click();
  }
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu")) closeMenu();
  if (!e.target.closest(".pin") && !e.target.closest("dialog")) unflipAll();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeMenu(); unflipAll(); }
  const typing = e.target.closest?.("input, textarea, [contenteditable]");
  const dialogOpen = ui.dialog.open || ui.confirm.open;
  if ((e.key === "n" || e.key === "N") && !typing && !dialogOpen && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    openStepDialog();
  }
});

$("#addBtn").addEventListener("click", () => openStepDialog());
$("#emptyAddBtn").addEventListener("click", () => openStepDialog());

// Molette verticale = défilement horizontal (si la page ne défile pas en hauteur)
ui.scene.addEventListener("wheel", (e) => {
  const canScrollY = ui.scene.scrollHeight > ui.scene.clientHeight + 1;
  if (!canScrollY && !e.ctrlKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    ui.scene.scrollLeft += e.deltaY;
    e.preventDefault();
  }
}, { passive: false });

// Parallaxe : les montagnes défilent plus lentement que la route
let parallaxFrame = 0;
ui.scene.addEventListener("scroll", () => {
  cancelAnimationFrame(parallaxFrame);
  parallaxFrame = requestAnimationFrame(() => {
    ui.far.style.transform = `translate3d(${ui.scene.scrollLeft * 0.6}px, 0, 0)`;
  });
}, { passive: true });

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => render({ animate: false }), 150);
});

/* Petit message en bas de l'écran */
let toastTimer;
function toast(message, kind = "info") {
  ui.toast.textContent = message;
  ui.toast.dataset.kind = kind;
  ui.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 3000);
}

/* ---------- 10. Démarrage ---------- */
render({ animate: false });
