let state = {
  images: [],
  categories: [],
  factions: [],
  tags: [],
  collections: [],
  activeTags: new Set(),
  search: "",
  category: "",
  faction: "",
  collection: "",
  selectMode: false,
  selected: new Set(),
};

const $ = (sel) => document.querySelector(sel);
const grid = $("#grid");
const emptyState = $("#empty-state");

function toast(msg, isError) {
  const el = $("#toast");
  el.textContent = msg;
  el.style.background = isError ? "var(--danger)" : "var(--accent)";
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.hidden = true), 2200);
}

async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

async function loadData() {
  const [data, collections] = await Promise.all([api("/api/images"), api("/api/collections")]);
  state.images = data.images;
  state.categories = data.categories;
  state.factions = data.factions;
  state.tags = data.tags;
  state.collections = collections;
  populateFilters();
  render();
}

function collectionById(id) {
  return state.collections.find((c) => c.id === id);
}

function populateFilters() {
  const catSel = $("#filter-category");
  const facSel = $("#filter-faction");
  const keep = (sel, val) => Array.from(sel.options).some((o) => o.value === val);

  catSel.innerHTML = '<option value="">All categories</option>' +
    state.categories.map((c) => `<option value="${c}">${c}</option>`).join("");
  facSel.innerHTML = '<option value="">All factions</option>' +
    state.factions.map((f) => `<option value="${f}">${f}</option>`).join("");
  catSel.value = keep(catSel, state.category) ? state.category : "";
  facSel.value = keep(facSel, state.faction) ? state.faction : "";

  renderTagBar();

  $("#collection-bar").innerHTML = state.collections
    .map((c) => `<button class="tag-chip${state.collection === c.id ? " active" : ""}" data-collection="${c.id}">${c.name} (${c.image_ids.length})</button>`)
    .join("") + `<button class="tag-chip new-chip" data-new-collection>+ New collection</button>`;

  renderCollectionHeader();
}

// Only offer tags that occur on images in the selected category.
function visibleTags() {
  if (!state.category) return state.tags;
  const tags = new Set();
  for (const img of state.images) {
    if (img.category === state.category) (img.tags || []).forEach((t) => tags.add(t));
  }
  return [...tags].sort();
}

function renderTagBar() {
  $("#tag-bar").innerHTML = visibleTags()
    .map((t) => `<button class="tag-chip${state.activeTags.has(t) ? " active" : ""}" data-tag="${t}">${t}</button>`)
    .join("");
}

function renderCollectionHeader() {
  const header = $("#collection-header");
  if (!state.collection) {
    header.hidden = true;
    return;
  }
  const col = collectionById(state.collection);
  if (!col) {
    state.collection = "";
    header.hidden = true;
    return;
  }
  header.hidden = false;
  header.innerHTML = `
    <span class="name">${col.name}</span>
    <span class="desc">${col.description || ""}</span>
    <button data-act="rename">Rename</button>
    <button data-act="describe">Edit description</button>
    <button data-act="delete" class="danger">Delete collection</button>
    <button data-act="clear">✕ Clear filter</button>
  `;
  header.querySelector('[data-act="clear"]').addEventListener("click", () => {
    state.collection = "";
    populateFilters();
    render();
  });
  header.querySelector('[data-act="rename"]').addEventListener("click", async () => {
    const name = prompt("Rename collection:", col.name);
    if (!name || !name.trim()) return;
    await api(`/api/collections/${col.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    await loadData();
  });
  header.querySelector('[data-act="describe"]').addEventListener("click", async () => {
    const desc = prompt("Collection description:", col.description || "");
    if (desc === null) return;
    await api(`/api/collections/${col.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: desc }),
    });
    await loadData();
  });
  header.querySelector('[data-act="delete"]').addEventListener("click", async () => {
    if (!confirm(`Delete the collection "${col.name}"? The images themselves are not affected.`)) return;
    await api(`/api/collections/${col.id}`, { method: "DELETE" });
    state.collection = "";
    await loadData();
    toast("Collection deleted");
  });
}

function searchableText(img) {
  return [img.subject, img.subject_label, img.variant, img.category, img.faction, img.notes, ...(img.tags || [])]
    .join(" ")
    .toLowerCase();
}

function matches(img) {
  if (state.category && img.category !== state.category) return false;
  if (state.faction && img.faction !== state.faction) return false;
  if (state.activeTags.size && !(img.tags || []).some((t) => state.activeTags.has(t))) return false;
  if (state.collection && !(img.collection_ids || []).includes(state.collection)) return false;
  if (!state.search) return true;
  const words = state.search.toLowerCase().split(/\s+/).filter(Boolean);
  const text = searchableText(img);
  return words.every((w) => text.includes(w));
}

function siblingsOf(img) {
  return state.images.filter((i) => i.category === img.category && i.subject === img.subject);
}

function groupKey(img) {
  return `${img.category}:${img.subject}`;
}

// A subject's whole set of images is represented by its main image by
// default. If the active filters match *every* image in that set equally
// (a trait like gender/ethnicity/faction that all its variants share), it
// stays collapsed to just the main. If the filters only match *some* of a
// subject's images (an era, an outfit, a specific moment), those matching
// variants are shown instead of the main — that's the whole point of
// tagging a variant differently in the first place.
function computeVisibleCards() {
  const groups = new Map();
  for (const img of state.images) {
    const key = groupKey(img);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(img);
  }

  const cards = [];
  for (const groupImages of groups.values()) {
    const matchingImages = groupImages.filter(matches);
    if (!matchingImages.length) continue;
    if (matchingImages.length === groupImages.length) {
      cards.push(groupImages.find((g) => g.is_main) || groupImages[0]);
    } else {
      cards.push(...matchingImages);
    }
  }
  return cards;
}

function render() {
  let filtered;

  if (state.collection) {
    // Collections are a hand-curated, ordered sequence of specific images —
    // show exactly what was picked, in the order it was picked, no collapsing.
    filtered = state.images.filter(matches);
    const col = collectionById(state.collection);
    if (col) {
      const order = col.image_ids;
      filtered.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    }
  } else {
    filtered = computeVisibleCards();
    filtered.sort((a, b) =>
      a.category.localeCompare(b.category) ||
      a.subject_label.toLowerCase().localeCompare(b.subject_label.toLowerCase()) ||
      (a.variant || "").localeCompare(b.variant || "")
    );
  }

  emptyState.hidden = filtered.length > 0;
  grid.innerHTML = filtered.map(cardHtml).join("");

  grid.querySelectorAll(".card").forEach((cardEl) => {
    const id = cardEl.dataset.id;
    cardEl.addEventListener("click", (e) => {
      if (e.target.closest(".icon-btn")) return;
      if (state.selectMode) {
        toggleSelect(id);
      } else {
        openModal(id);
      }
    });
  });
  grid.querySelectorAll("[data-copy-image]").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyImageToClipboard(btn.dataset.copyImage);
    })
  );
  grid.querySelectorAll("[data-copy-path]").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyText(btn.dataset.copyPath);
    })
  );
  grid.querySelectorAll("[data-remove-from-collection]").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await api(`/api/collections/${state.collection}/images/${encodeURIComponent(btn.dataset.removeFromCollection)}`, { method: "DELETE" });
      toast("Removed from collection");
      await loadData();
    })
  );
}

function cardHtml(img) {
  const sibCount = siblingsOf(img).length;
  const tags = (img.tags || []).slice(0, 4).map((t) => `<span class="tag-chip">${t}</span>`).join("");
  const selected = state.selected.has(img.id);
  return `
    <div class="card${state.selectMode ? " selectable" : ""}${selected ? " selected" : ""}" data-id="${img.id}">
      <div class="thumb-wrap">
        <img src="${img.thumb_url}" loading="lazy" alt="${img.subject_label}">
        ${state.selectMode ? `<span class="select-check">${selected ? "✓" : ""}</span>` : ""}
        ${img.is_main ? '<span class="badge main">★ main</span>' : ""}
        ${sibCount > 1 ? `<span class="badge" style="right:6px;left:auto;">${sibCount} variants</span>` : ""}
        ${img.missing ? '<span class="badge missing">file missing</span>' : ""}
        ${!state.selectMode ? `
        <div class="quick-actions">
          ${state.collection ? `<button class="icon-btn" data-remove-from-collection="${img.id}" title="Remove from this collection">✕</button>` : ""}
          <button class="icon-btn" data-copy-image="${img.media_url}" title="Copy image to clipboard">⧉</button>
          <button class="icon-btn" data-copy-path="${escapeAttr(img.abs_path)}" title="Copy file path">🔗</button>
        </div>` : ""}
      </div>
      <div class="card-body">
        <div class="card-title">${img.subject_label}${img.variant ? ` — ${img.variant}` : ""}</div>
        <div class="card-sub">${img.category}${img.faction ? " · " + img.faction : ""}</div>
        <div class="card-tags">${tags}</div>
      </div>
    </div>`;
}

function escapeAttr(s) {
  return (s || "").replace(/"/g, "&quot;");
}

// --- search / filters ---

$("#search").addEventListener("input", (e) => {
  state.search = e.target.value;
  render();
});
$("#filter-category").addEventListener("change", (e) => {
  state.category = e.target.value;
  state.activeTags.clear();
  renderTagBar();
  render();
});
$("#filter-faction").addEventListener("change", (e) => {
  state.faction = e.target.value;
  render();
});
$("#tag-bar").addEventListener("click", (e) => {
  const btn = e.target.closest(".tag-chip");
  if (!btn) return;
  const tag = btn.dataset.tag;
  state.activeTags.has(tag) ? state.activeTags.delete(tag) : state.activeTags.add(tag);
  populateFilters();
  render();
});
$("#collection-bar").addEventListener("click", async (e) => {
  const newBtn = e.target.closest("[data-new-collection]");
  if (newBtn) {
    const name = prompt("New collection name:");
    if (!name || !name.trim()) return;
    await api("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    await loadData();
    return;
  }
  const btn = e.target.closest("[data-collection]");
  if (!btn) return;
  const id = btn.dataset.collection;
  state.collection = state.collection === id ? "" : id;
  populateFilters();
  render();
});

$("#btn-rescan").addEventListener("click", async () => {
  const res = await api("/api/scan", { method: "POST" });
  toast(`Rescanned: ${res.added} new, ${res.missing} missing`);
  await loadData();
});

// --- select mode ---

function toggleSelect(id) {
  state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);
  render();
  updateSelectBar();
}

function updateSelectBar() {
  $("#select-bar").hidden = !state.selectMode;
  $("#select-count").textContent = `${state.selected.size} selected`;
}

$("#btn-select-mode").addEventListener("click", () => {
  state.selectMode = !state.selectMode;
  $("#btn-select-mode").classList.toggle("primary", state.selectMode);
  if (!state.selectMode) state.selected.clear();
  updateSelectBar();
  render();
});
$("#btn-select-done").addEventListener("click", () => $("#btn-select-mode").click());
$("#btn-select-clear").addEventListener("click", () => {
  state.selected.clear();
  render();
  updateSelectBar();
});

$("#btn-add-to-collection").addEventListener("click", (e) => {
  if (!state.selected.size) {
    toast("Select at least one image first", true);
    return;
  }
  openMenu(e.currentTarget, [
    ...state.collections.map((c) => ({ label: `${c.name} (${c.image_ids.length})`, action: () => addSelectedTo(c.id) })),
    { label: "+ New collection…", action: createCollectionFromSelection },
  ]);
});

async function addSelectedTo(cid) {
  await api(`/api/collections/${cid}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_ids: Array.from(state.selected) }),
  });
  toast(`Added ${state.selected.size} image(s) to collection`);
  state.selected.clear();
  await loadData();
  updateSelectBar();
}

async function createCollectionFromSelection() {
  const name = prompt("New collection name:");
  if (!name || !name.trim()) return;
  const col = await api("/api/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim(), image_ids: Array.from(state.selected) }),
  });
  toast(`Created "${col.name}" with ${state.selected.size} image(s)`);
  state.selected.clear();
  await loadData();
  updateSelectBar();
}

function openMenu(anchor, items) {
  closeMenu();
  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.className = "menu";
  menu.id = "active-menu";
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${rect.top - 8}px`;
  menu.style.transform = "translateY(-100%)";
  menu.innerHTML = items
    .map((it, i) => (it.divider ? "<hr>" : `<button data-i="${i}">${it.label}</button>`))
    .join("");
  document.body.appendChild(menu);
  menu.querySelectorAll("button[data-i]").forEach((btn) => {
    btn.addEventListener("click", () => {
      items[Number(btn.dataset.i)].action();
      closeMenu();
    });
  });
  setTimeout(() => document.addEventListener("click", closeMenuOnOutside), 0);
}

function closeMenuOnOutside(e) {
  if (!e.target.closest("#active-menu")) closeMenu();
}

function closeMenu() {
  const m = document.getElementById("active-menu");
  if (m) m.remove();
  document.removeEventListener("click", closeMenuOnOutside);
}

// --- clipboard ---

function loadImageEl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function copyImageToClipboard(url) {
  try {
    const img = await loadImageEl(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    toast("Image copied to clipboard");
  } catch (e) {
    toast("Copy failed — " + e.message, true);
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  } catch (e) {
    toast("Copy failed — " + e.message, true);
  }
}

// --- detail / edit modal ---

function openModal(id) {
  const img = state.images.find((i) => i.id === id);
  if (!img) return;
  renderModal(img);
  $("#modal-backdrop").hidden = false;
}

function closeModal() {
  $("#modal-backdrop").hidden = true;
}

function closeAddModal() {
  $("#add-backdrop").hidden = true;
}

$("#modal-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "modal-backdrop") closeModal();
});
$("#add-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "add-backdrop") closeAddModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!$("#add-backdrop").hidden) closeAddModal();
  else if (!$("#modal-backdrop").hidden) closeModal();
  closeMenu();
});

function renderModal(img) {
  const siblings = siblingsOf(img);
  const catOptions = state.categories.map((c) => `<option value="${c}"${c === img.category ? " selected" : ""}>${c}</option>`).join("");
  const colChecklist = state.collections
    .map((c) => `<label><input type="checkbox" data-cid="${c.id}" ${(img.collection_ids || []).includes(c.id) ? "checked" : ""}> ${c.name}</label>`)
    .join("") || '<span style="color:var(--text-dim); font-size:12px;">No collections yet.</span>';

  $("#modal").innerHTML = `
    <h2>${img.subject_label}${img.variant ? " — " + img.variant : ""}</h2>
    <div class="modal-columns">
      <div class="modal-preview">
        <img src="${img.media_url}" alt="">
        <div class="modal-actions" style="justify-content:flex-start;">
          <button data-act="copy-image">Copy image</button>
          <button data-act="copy-path">Copy absolute path</button>
          <button data-act="copy-relpath">Copy relative path</button>
          <button data-act="open-folder">Open in Explorer</button>
          <button data-act="tokenize" title="Make a round Roll20 token (saved under tokens/)">Tokenize</button>
        </div>
        <div class="variant-strip">
          ${siblings.map((s) => `<div class="variant-thumb${s.id === img.id ? " current" : ""}" data-id="${s.id}"><img src="${s.thumb_url}"></div>`).join("")}
          <div class="variant-thumb add-new" data-act="add-variant" title="Add another image for this subject">+</div>
        </div>
      </div>
      <div class="modal-form">
        <div>
          <label>Subject</label>
          <input id="f-subject" value="${escapeAttr(img.subject)}">
        </div>
        <div>
          <label>Display name</label>
          <input id="f-label" value="${escapeAttr(img.subject_label)}">
        </div>
        <div>
          <label>Variant / moment (optional)</label>
          <input id="f-variant" value="${escapeAttr(img.variant)}" placeholder="e.g. coronation, young, elder">
        </div>
        <div style="display:flex; gap:10px;">
          <div style="flex:1;">
            <label>Category</label>
            <select id="f-category">${catOptions}</select>
          </div>
          <div style="flex:1;">
            <label>Faction / group</label>
            <input id="f-faction" value="${escapeAttr(img.faction)}" list="faction-list">
          </div>
        </div>
        <div>
          <label>Tags (comma separated)</label>
          <input id="f-tags" value="${escapeAttr((img.tags || []).join(", "))}">
        </div>
        <div>
          <label>Notes</label>
          <textarea id="f-notes">${img.notes || ""}</textarea>
        </div>
        <div class="checkbox-row">
          <input type="checkbox" id="f-main" ${img.is_main ? "checked" : ""}>
          <label style="margin:0;">Main image for this subject</label>
        </div>
        <div>
          <label>Collections</label>
          <div class="collection-checklist" id="collection-checklist">${colChecklist}</div>
          <div class="new-collection-row">
            <input id="f-new-collection" placeholder="+ new collection name">
            <button data-act="new-collection">Add</button>
          </div>
        </div>
        <div class="modal-actions">
          <button data-act="delete" class="danger">Delete entry</button>
          <button data-act="close">Close</button>
          <button data-act="save" class="primary">Save</button>
        </div>
      </div>
    </div>
    <datalist id="faction-list">${state.factions.map((f) => `<option value="${f}">`).join("")}</datalist>
  `;

  $("#modal").querySelectorAll(".variant-thumb[data-id]").forEach((el) =>
    el.addEventListener("click", () => renderModal(state.images.find((i) => i.id === el.dataset.id)))
  );
  $('[data-act="add-variant"]').addEventListener("click", () => {
    closeModal();
    openAddModal({ subject: img.subject, subject_label: img.subject_label, category: img.category, faction: img.faction });
  });
  $('[data-act="copy-image"]').addEventListener("click", () => copyImageToClipboard(img.media_url));
  $('[data-act="copy-path"]').addEventListener("click", () => copyText(img.abs_path));
  $('[data-act="copy-relpath"]').addEventListener("click", () => copyText(img.rel_path));
  $('[data-act="open-folder"]').addEventListener("click", async () => {
    const r = await api(`/api/open-folder/${encodeURIComponent(img.id)}`, { method: "POST" });
    if (!r.opened) toast(r.reason || "Not supported on this OS", true);
  });
  $('[data-act="tokenize"]').addEventListener("click", async () => {
    const size = prompt("Token size in pixels (Roll20 squares are 70 px):", "280");
    if (!size) return;
    try {
      const token = await api(`/api/images/${encodeURIComponent(img.id)}/tokenize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size: parseInt(size, 10) }),
      });
      toast(`Token saved: ${token.rel_path}`);
      await loadData();
      renderModal(state.images.find((i) => i.id === token.id));
    } catch (err) {
      toast(`Tokenize failed: ${err.message}`, true);
    }
  });
  $('[data-act="close"]').addEventListener("click", closeModal);
  $('[data-act="delete"]').addEventListener("click", async () => {
    if (!confirm(`Remove "${img.subject_label}" from the catalog?\n\nOK = remove from catalog only.\nCancel = keep.`)) return;
    const alsoFile = confirm("Also delete the actual file from disk? (This cannot be undone.)");
    await api(`/api/images/${encodeURIComponent(img.id)}?delete_file=${alsoFile}`, { method: "DELETE" });
    closeModal();
    toast("Deleted");
    await loadData();
  });
  $('[data-act="save"]').addEventListener("click", async () => {
    const payload = {
      subject: $("#f-subject").value,
      subject_label: $("#f-label").value,
      variant: $("#f-variant").value,
      category: $("#f-category").value,
      faction: $("#f-faction").value,
      tags: $("#f-tags").value,
      notes: $("#f-notes").value,
      is_main: $("#f-main").checked,
    };
    await api(`/api/images/${encodeURIComponent(img.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    closeModal();
    toast("Saved");
    await loadData();
  });
  $("#collection-checklist").querySelectorAll("input[type=checkbox]").forEach((cb) =>
    cb.addEventListener("change", async () => {
      const cid = cb.dataset.cid;
      if (cb.checked) {
        await api(`/api/collections/${cid}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_ids: [img.id] }),
        });
      } else {
        await api(`/api/collections/${cid}/images/${encodeURIComponent(img.id)}`, { method: "DELETE" });
      }
      await loadData();
    })
  );
  $('[data-act="new-collection"]').addEventListener("click", async () => {
    const name = $("#f-new-collection").value.trim();
    if (!name) return;
    await api("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, image_ids: [img.id] }),
    });
    toast(`Created "${name}" and added this image`);
    await loadData();
  });
}

// --- add flow ---

let pendingFiles = [];

function openAddModal(prefill) {
  pendingFiles = [];
  $("#add-list").innerHTML = "";
  $("#add-backdrop").hidden = false;
  $("#add-backdrop").dataset.prefill = prefill ? JSON.stringify(prefill) : "";
}

$("#btn-add").addEventListener("click", () => openAddModal());
$("#btn-add-cancel").addEventListener("click", closeAddModal);

const dropzone = $("#dropzone");
const fileInput = $("#file-input");
dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dropzone.classList.add("drag");
});
dropzone.addEventListener("dragover", (e) => e.preventDefault());
dropzone.addEventListener("dragleave", (e) => {
  if (!dropzone.contains(e.relatedTarget)) dropzone.classList.remove("drag");
});
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropzone.classList.remove("drag");
  addFiles(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")));
});
fileInput.addEventListener("change", () => {
  addFiles(Array.from(fileInput.files));
  fileInput.value = "";
});

// Without this, dropping a file anywhere outside the dropzone (or missing it
// slightly) makes the browser navigate the whole tab to that image file —
// this is what "gets stuck" when drag-and-drop goes wrong.
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  if (!dropzone.contains(e.target)) e.preventDefault();
});

const EXT_BY_MIME = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/bmp": "bmp" };

document.addEventListener("paste", (e) => {
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  const imageItems = Array.from(items).filter((it) => it.type.startsWith("image/"));
  if (!imageItems.length) return;
  e.preventDefault();
  if ($("#add-backdrop").hidden) openAddModal();
  const files = imageItems.map((it, i) => {
    const blob = it.getAsFile();
    const ext = EXT_BY_MIME[blob.type] || "png";
    return new File([blob], `pasted_${Date.now()}_${i}.${ext}`, { type: blob.type });
  });
  addFiles(files);
  toast(`Pasted ${files.length} image(s) — fill in the details and Upload`);
});

function addFiles(files) {
  const prefill = $("#add-backdrop").dataset.prefill ? JSON.parse($("#add-backdrop").dataset.prefill) : {};
  for (const file of files) {
    const idx = pendingFiles.length;
    pendingFiles.push(file);
    const url = URL.createObjectURL(file);
    const guessSubject = prefill.subject || file.name.replace(/\.[^.]+$/, "");
    const row = document.createElement("div");
    row.className = "add-row";
    row.dataset.idx = idx;
    row.innerHTML = `
      <img src="${url}">
      <div class="fields">
        <input class="f-subject" placeholder="subject slug" value="${escapeAttr(prefill.subject || guessSubject)}">
        <input class="f-label" placeholder="display name" value="${escapeAttr(prefill.subject_label || "")}">
        <input class="f-variant" placeholder="variant / moment (optional)">
        <select class="f-category">${state.categories.map((c) => `<option${c === (prefill.category || state.category || "characters") ? " selected" : ""}>${c}</option>`).join("")}</select>
        <input class="f-faction" placeholder="faction / group" value="${escapeAttr(prefill.faction || "")}" list="faction-list-add">
        <input class="f-tags full" placeholder="tags, comma, separated">
      </div>`;
    $("#add-list").appendChild(row);
  }
  if (!document.getElementById("faction-list-add")) {
    const dl = document.createElement("datalist");
    dl.id = "faction-list-add";
    dl.innerHTML = state.factions.map((f) => `<option value="${f}">`).join("");
    document.body.appendChild(dl);
  }
}

$("#btn-add-submit").addEventListener("click", async () => {
  const rows = Array.from(document.querySelectorAll(".add-row"));
  if (!rows.length) {
    toast("Add at least one image first", true);
    return;
  }
  for (const row of rows) {
    const idx = Number(row.dataset.idx);
    const file = pendingFiles[idx];
    const fd = new FormData();
    fd.append("file", file);
    fd.append("subject", row.querySelector(".f-subject").value);
    fd.append("subject_label", row.querySelector(".f-label").value);
    fd.append("variant", row.querySelector(".f-variant").value);
    fd.append("category", row.querySelector(".f-category").value);
    fd.append("faction", row.querySelector(".f-faction").value);
    fd.append("tags", row.querySelector(".f-tags").value);
    await api("/api/images", { method: "POST", body: fd });
  }
  closeAddModal();
  toast(`Added ${rows.length} image(s)`);
  await loadData();
});

loadData();
