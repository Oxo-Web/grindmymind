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
  startX: 200,  // position du point de départ
  gap: 240,     // distance entre deux étapes
  roadTop: 320,
  roadH: 48,
  cardW: 184,
  cardH: 216,
  borneH: 30,   // hauteur d'une borne kilométrique
  stem: 24,     // longueur du fil entre la borne et la carte
};
const DRIVE_MS = 1800; // durée du trajet du van (comme dans le CSS)
const VAN_PARK = 96;   // le van se gare juste avant la dernière borne

const CATEGORIES = {
  sante:     { label: "Santé" },
  travail:   { label: "Travail" },
  relations: { label: "Relations" },
};

/* ---------- 2. Raccourcis & utilitaires ---------- */
const $ = (selector) => document.querySelector(selector);

const ui = {
  scene: $("#scene"), track: $("#track"), world: $("#world"),
  far: $("#far"), van: $("#van"),
  legend: $("#legend"), empty: $("#empty"), toast: $("#toast"),
  menuBtn: $("#menuBtn"), menuPop: $("#menuPop"), importInput: $("#importInput"),
  dialog: $("#stepDialog"), form: $("#stepForm"), dialogTitle: $("#dialogTitle"),
  submitBtn: $("#submitBtn"), fTitle: $("#fTitle"), fDate: $("#fDate"),
  fPhoto: $("#fPhoto"), fNote: $("#fNote"), noteCount: $("#noteCount"),
  dropzone: $("#dropzone"), dzEmpty: $("#dzEmpty"), dzPreview: $("#dzPreview"), preview: $("#preview"),
  confirm: $("#confirmDialog"), confirmTitle: $("#confirmTitle"),
  confirmText: $("#confirmText"), confirmOk: $("#confirmOk"),
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Icône du sprite défini dans index.html
const icon = (name) => `<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`;

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
    { day: "numeric", month: "long", year: "numeric" });
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
    toast("Stockage plein. Exporte une sauvegarde, puis retire des photos.", "error");
    return false;
  }
}

function sortedSteps() {
  return [...steps].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
}

const xOf = (index) => LAYOUT.startX + (index + 1) * LAYOUT.gap;

/* ---------- 4. Décor : silhouettes d'une seule teinte par route ---------- */
// Forêt (santé), ville (travail), village (relations)
const decorMakers = {
  tree() {
    return { w: 48, h: 76, svg: `<svg viewBox="0 0 48 76"><rect x="22" y="40" width="4" height="36" rx="2"/><circle cx="24" cy="26" r="20"/></svg>` };
  },
  pine() {
    return { w: 40, h: 88, svg: `<svg viewBox="0 0 40 88"><rect x="18" y="66" width="4" height="22" rx="2"/><path d="M20 0 L40 70 H0 Z"/></svg>` };
  },
  bush() {
    return { w: 52, h: 24, svg: `<svg viewBox="0 0 52 24"><path d="M0 24 Q0 6 16 6 Q22 0 32 2 Q48 2 52 24 Z"/></svg>` };
  },
  building(rand) {
    const w = 34 + Math.floor(rand() * 24);
    const h = 60 + Math.floor(rand() * 70);
    let windows = "";
    for (let y = 10; y < h - 12; y += 12) {
      for (let x = 7; x < w - 8; x += 9) windows += `<rect x="${x}" y="${y}" width="4" height="6" fill="#fff" opacity=".45"/>`;
    }
    return { w, h, svg: `<svg viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" rx="2"/>${windows}</svg>` };
  },
  house(rand) {
    const w = 40 + Math.floor(rand() * 14);
    return { w, h: 44, svg: `<svg viewBox="0 0 ${w} 44"><path d="M0 20 L${w / 2} 0 L${w} 20 V44 H0 Z"/>
      <rect x="${w / 2 - 5}" y="28" width="10" height="16" fill="#fff" opacity=".45"/></svg>` };
  },
};

const DECOR_TONE = {
  sante: "color-mix(in srgb, var(--sante) 32%, var(--prairie))",
  travail: "color-mix(in srgb, #7d93a8 45%, var(--prairie))",
  relations: "color-mix(in srgb, var(--relations) 28%, var(--prairie))",
  start: "color-mix(in srgb, var(--encre) 10%, var(--prairie))",
};

function makeDecor(kind, rand) {
  const r = rand();
  switch (kind) {
    case "sante":     return r < 0.5 ? decorMakers.pine() : r < 0.85 ? decorMakers.tree() : decorMakers.bush();
    case "travail":   return r < 0.85 ? decorMakers.building(rand) : decorMakers.bush();
    case "relations": return r < 0.5 ? decorMakers.house(rand) : r < 0.85 ? decorMakers.tree() : decorMakers.bush();
    default:          return r < 0.5 ? decorMakers.tree() : decorMakers.bush();
  }
}

function addDecor(frag, fromX, toX, kind, seed) {
  const rand = seededRandom(seed);
  const count = Math.max(2, Math.round((toX - fromX) / 100));
  for (let k = 0; k < count; k++) {
    const item = makeDecor(kind, rand);
    const scale = 0.8 + rand() * 0.35;
    const w = item.w * scale, h = item.h * scale;
    const x = fromX + ((toX - fromX) * (k + 0.5)) / count + (rand() - 0.5) * 34;
    const node = el("div", "decor", {
      left: `${x - w / 2}px`, top: `${LAYOUT.roadTop + 2 - h}px`,
      width: `${w}px`, height: `${h}px`, color: DECOR_TONE[kind],
    });
    node.innerHTML = item.svg;
    frag.append(node);
  }
}

const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

// Collines lointaines (défilent plus lentement : effet de profondeur)
ui.far.style.backgroundImage = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 120" preserveAspectRatio="none">
  <path d="M0 120V70C90 40 160 30 250 52S420 96 520 62S700 8 800 34S940 80 1000 70V120Z" fill="#d3dee5"/></svg>`);

const WARNING_SVG = `<svg viewBox="0 0 28 46" width="28" height="46" aria-hidden="true">
  <rect x="12.5" y="22" width="3" height="24" fill="#8a96a0"/>
  <path d="M14 2 L26 24 H2 Z" fill="#fff" stroke="#c8372d" stroke-width="3" stroke-linejoin="round"/>
  <rect x="12.8" y="9" width="2.4" height="8" rx="1.2" fill="#1e2a33"/><circle cx="14" cy="20" r="1.5" fill="#1e2a33"/></svg>`;

/* ---------- 5. Dessin de la frise ---------- */
function render({ animate = true, newId = null } = {}) {
  const list = sortedSteps();
  const lastX = list.length ? xOf(list.length - 1) : LAYOUT.startX;
  const width = Math.max(ui.scene.clientWidth, lastX + 560);
  ui.track.style.width = `${width}px`;

  const frag = document.createDocumentFragment();
  frag.append(el("div", "road future", { left: "0px", width: `${width}px` }));
  addDecor(frag, 0, LAYOUT.startX, "start", "depart");
  frag.append(sign(LAYOUT.startX - 140, "Départ", "start"));

  list.forEach((step, i) => {
    const x = xOf(i);
    const prevX = i === 0 ? LAYOUT.startX : xOf(i - 1);
    addDecor(frag, prevX, x, step.cat, step.id);
    frag.append(el("div", `road ${step.cat}`, { left: `${prevX}px`, width: `${x - prevX}px` }));
    if (step.type === "panne") {
      const w = el("div", "warning", { left: `${x + 40}px` });
      w.innerHTML = WARNING_SVG;
      frag.append(w);
    }
    frag.append(buildCard(step, i, x, step.id === newId));
  });

  if (list.length) frag.append(sign(lastX + 300, "À suivre", "end"));

  ui.world.replaceChildren(frag);
  ui.empty.hidden = list.length > 0;
  renderLegend(list);
  moveVan(list.length ? lastX - VAN_PARK : LAYOUT.startX, list.at(-1)?.type === "panne", animate);
}

function sign(x, text, kind) {
  const node = el("div", `sign ${kind}`, { left: `${x}px` });
  node.innerHTML = `<span class="board">${esc(text)}</span><span class="post"></span>`;
  return node;
}

function buildCard(step, index, x, isNew) {
  const frag = document.createDocumentFragment();
  const above = index % 2 === 0;
  const { roadTop, roadH, cardW, cardH, borneH, stem } = LAYOUT;
  const color = `var(--${step.cat})`;

  // Borne kilométrique (numéro de l'étape) côté carte, puis le fil
  const borneTop = above ? roadTop - borneH : roadTop + roadH + 2;
  const cardTop = above ? borneTop - stem - cardH : borneTop + borneH + stem;
  const borne = el("div", "borne", { left: `${x}px`, top: `${borneTop}px`, "--c": color });
  borne.textContent = index + 1;
  frag.append(
    el("div", "stem", {
      left: `${x}px`, top: `${above ? cardTop + cardH : borneTop + borneH}px`,
      height: `${stem}px`, "--c": color,
    }),
    borne,
  );

  const pin = el("div", `pin${step.type === "panne" ? " panne" : ""}${isNew ? " is-new" : ""}`, {
    left: `${x - cardW / 2}px`, top: `${cardTop}px`, "--c": color,
  });
  pin.dataset.id = step.id;

  const cat = CATEGORIES[step.cat];
  const date = esc(formatDate(step.date));
  const photo = step.photo
    ? `<img class="photo" src="${esc(step.photo)}" alt="" loading="lazy">`
    : `<div class="photo placeholder">${icon(step.cat)}</div>`;
  const isPanne = step.type === "panne";

  pin.innerHTML = `
    <div class="card" tabindex="0" role="button" aria-pressed="false"
         aria-label="Étape ${index + 1} : ${esc(step.title)}, ${date}. Retourner la carte">
      <div class="card-inner">
        <div class="face front">
          ${photo}
          ${isPanne ? `<span class="badge">${icon("alert")}Panne</span>` : ""}
          <span class="flip-hint">${icon("flip")}</span>
          <p class="title">${esc(step.title)}</p>
          <p class="date">${date}</p>
        </div>
        <div class="face back">
          <p class="back-route"><i></i>${cat.label}${isPanne ? `<span class="panne-tag">Panne</span>` : ""}</p>
          <p class="note${step.note ? "" : " empty"}">${step.note ? esc(step.note) : "Aucune note. Modifie l'étape pour en ajouter une."}</p>
          <div class="actions">
            <button type="button" class="mini-btn" data-action="edit">${icon("pencil")}Modifier</button>
            <button type="button" class="mini-btn danger" data-action="delete" aria-label="Supprimer" title="Supprimer">${icon("trash")}</button>
          </div>
        </div>
      </div>
    </div>`;
  frag.append(pin);
  return frag;
}

function renderLegend(list) {
  const items = Object.entries(CATEGORIES).map(([key, cat]) => {
    const n = list.filter((s) => s.cat === key).length;
    return `<li style="--c: var(--${key})"><i></i>${cat.label}${list.length ? ` <b>${n}</b>` : ""}</li>`;
  });
  const pannes = list.filter((s) => s.type === "panne").length;
  if (pannes) items.push(`<li class="alert">${icon("alert")}${plural(pannes, "panne")}</li>`);
  ui.legend.innerHTML = items.join("");
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
  ui.submitBtn.textContent = step ? "Enregistrer les modifications" : "Ajouter l'étape";
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
  if (!file.type.startsWith("image/")) { toast("Ce fichier n'est pas une image. Choisis un JPG ou un PNG.", "error"); return; }
  try {
    pendingPhoto = await resizeImage(file);
    updatePhotoUI();
  } catch {
    toast("Image illisible (format HEIC ?). Choisis un JPG ou un PNG.", "error");
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
  toast(isEdit ? "Modifications enregistrées" : "Étape ajoutée");
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
  toast(`Frise exportée (${plural(steps.length, "étape")})`);
}

async function importFile(file) {
  let parsed;
  try { parsed = JSON.parse(await file.text()); }
  catch { toast("Ce fichier n'est pas une sauvegarde Grind My Mind.", "error"); return; }

  const raw = Array.isArray(parsed) ? parsed : parsed?.steps;
  const incoming = Array.isArray(raw) ? raw.map(normalizeStep).filter(Boolean) : [];
  if (!incoming.length) { toast("Ce fichier ne contient aucune étape.", "error"); return; }

  const ok = await confirmAsk({
    title: `Importer ${plural(incoming.length, "étape")} ?`,
    text: "Elles s'ajoutent à ta frise. Une étape déjà présente est remplacée par la version du fichier.",
    okLabel: "Importer",
  });
  if (!ok) return;

  const byId = new Map(steps.map((s) => [s.id, s]));
  incoming.forEach((s) => byId.set(s.id, s));
  if (commit([...byId.values()])) {
    render();
    toast(`${plural(incoming.length, "étape")} importée${incoming.length > 1 ? "s" : ""}`);
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

// Menu « Sauvegarde »
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
      title: `Supprimer « ${step.title} » ?`,
      text: "L'étape disparaît de ta frise. Exporte une sauvegarde avant si tu veux la garder.",
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

// Parallaxe : les collines défilent plus lentement que la route
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
