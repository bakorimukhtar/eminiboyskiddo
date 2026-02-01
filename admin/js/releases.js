import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://huquhmswcygwtuxmwfhg.supabase.co";
const SUPABASE_KEY = "sb_publishable_iTAzRpmW5gNYvbETn4IXdg_kJ0mZgju";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET = "release_covers";

// Change this to your deployed domain later (e.g., https://boyskido.com)
const PUBLIC_BASE_URL = window.location.origin;

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
document.getElementById("openSidebarBtn")?.addEventListener("click", () => {
  sidebar.classList.remove("-translate-x-full");
  overlay.classList.remove("hidden");
});
document.getElementById("closeSidebarBtn")?.addEventListener("click", () => {
  sidebar.classList.add("-translate-x-full");
  overlay.classList.add("hidden");
});
overlay?.addEventListener("click", () => {
  sidebar.classList.add("-translate-x-full");
  overlay.classList.add("hidden");
});

const userEmailEl = document.getElementById("userEmail");
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "./login.html";
});

async function requireAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) {
    window.location.href = "./login.html";
    return null;
  }
  userEmailEl.textContent = session.user?.email ?? "";
  return session;
}

const releasesCount = document.getElementById("releasesCount");
const shownCount = document.getElementById("shownCount");
const releasesGrid = document.getElementById("releasesGrid");
const emptyState = document.getElementById("emptyState");
const pageMsg = document.getElementById("pageMsg");

const refreshBtn = document.getElementById("refreshBtn");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

function showPageError(t) {
  pageMsg.textContent = t;
  pageMsg.classList.remove("hidden");
}
function hidePageError() {
  pageMsg.classList.add("hidden");
}

function getCoverUrl(path) {
  if (!path) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

function normalizeLinks(links) {
  if (!links || typeof links !== "object") return {};
  const out = {};
  for (const k of ["apple_music", "spotify", "youtube", "audiomack"]) {
    const v = (links[k] || "").toString().trim();
    if (v) out[k] = v;
  }
  return out;
}

function normalizeTracks(tracks) {
  if (!Array.isArray(tracks)) return [];
  return tracks
    .map(t => ({ title: (t?.title || "").toString().trim(), featured_artists: (t?.featured_artists || "").toString().trim() || null }))
    .filter(t => t.title);
}

function matchesSearch(r, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    (r.title || "").toLowerCase().includes(s) ||
    (r.release_type || "").toLowerCase().includes(s) ||
    (r.featured_artists || "").toLowerCase().includes(s)
  );
}

function fmtType(t) {
  if (!t) return "—";
  return t.toUpperCase();
}

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
}

function linkLabel(key) {
  return ({
    apple_music: "Apple Music",
    spotify: "Spotify",
    youtube: "YouTube",
    audiomack: "Audiomack"
  })[key] || key;
}

function linkIcon(key) {
  return ({
    apple_music: "fa-brands fa-apple",
    spotify: "fa-brands fa-spotify",
    youtube: "fa-brands fa-youtube",
    audiomack: "fa-solid fa-music"
  })[key] || "fa-solid fa-link";
}

let allReleases = [];
let current = null;
let currentSlug = null;
let currentLinkId = null;

function cardTemplate(r) {
  const coverUrl = getCoverUrl(r.cover_path);
  const meta = `${fmtType(r.release_type)} • ${r.release_date || "—"}`;

  return `
    <article class="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden">
      <div class="aspect-[16/10] bg-black/40 relative">
        ${coverUrl ? `<img src="${coverUrl}" class="w-full h-full object-cover" loading="lazy" alt="Cover" />`
        : `<div class="absolute inset-0 grid place-items-center text-white/55">
             <div class="text-center">
               <i class="fa-regular fa-image text-2xl"></i>
               <div class="mt-2 text-[11px] tracking-[0.14em] uppercase">No cover</div>
             </div>
           </div>`}
        <div class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/75 to-transparent">
          <div class="text-[11px] tracking-[0.14em] uppercase text-white/70">${meta}</div>
          <div class="mt-1 text-sm font-extrabold line-clamp-1">${r.title || "Untitled"}</div>
        </div>
      </div>

      <div class="p-4">
        <div class="text-[12px] text-white/70 line-clamp-1">
          <i class="fa-solid fa-hashtag text-white/40"></i>
          <span class="ml-2">${r.release_year || "—"}</span>
          ${r.featured_artists ? `<span class="ml-2 text-white/50">• feat. ${r.featured_artists}</span>` : ""}
        </div>

        <div class="mt-3 flex items-center justify-between gap-3">
          <div class="text-[11px] text-white/55">
            <i class="fa-solid fa-link text-white/35"></i>
            <span class="ml-2">${Object.keys(normalizeLinks(r.links)).length} link(s)</span>
          </div>

          <button data-id="${r.id}"
            class="viewBtn rounded-xl border border-white/15 bg-black/20 hover:bg-white/10 px-3 py-2 text-[11px] font-black tracking-[0.18em] uppercase inline-flex items-center gap-2">
            <i class="fa-solid fa-eye"></i>
            View
          </button>
        </div>
      </div>
    </article>
  `;
}

function render() {
  const q = (searchInput.value || "").trim();
  const filtered = allReleases.filter(r => matchesSearch(r, q));

  const sorted = [...filtered].sort((a, b) => {
    const av = (a.release_date || "");
    const bv = (b.release_date || "");
    return sortSelect.value === "oldest" ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  releasesCount.textContent = String(allReleases.length);
  shownCount.textContent = `${sorted.length} shown`;
  releasesGrid.innerHTML = sorted.map(cardTemplate).join("");
  emptyState.classList.toggle("hidden", sorted.length !== 0);

  document.querySelectorAll(".viewBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const r = allReleases.find(x => x.id === id);
      if (r) showDetails(r);
    });
  });
}

/* ---------- Modal ---------- */
const modal = document.getElementById("modal");
const modalOverlay = document.getElementById("modalOverlay");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const mCloseBtn2 = document.getElementById("mCloseBtn2");
const modalMsg = document.getElementById("modalMsg");

const mTitle = document.getElementById("mTitle");
const mMeta = document.getElementById("mMeta");
const mCover = document.getElementById("mCover");
const mCoverEmpty = document.getElementById("mCoverEmpty");
const mPublicLink = document.getElementById("mPublicLink");
const mDesc = document.getElementById("mDesc");
const mLinks = document.getElementById("mLinks");
const mTracksWrap = document.getElementById("mTracksWrap");
const mTracks = document.getElementById("mTracks");
const mClicks = document.getElementById("mClicks");
const mSlug = document.getElementById("mSlug");
const mGenLinkBtn = document.getElementById("mGenLinkBtn");
const mCopyBtn = document.getElementById("mCopyBtn");
const mEditBtn = document.getElementById("mEditBtn");
const mDeleteBtn = document.getElementById("mDeleteBtn");

function openModal() {
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  modalMsg.classList.add("hidden");
  current = null;
  currentSlug = null;
  currentLinkId = null;
}
modalOverlay.addEventListener("click", closeModal);
modalCloseBtn.addEventListener("click", closeModal);
mCloseBtn2.addEventListener("click", closeModal);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});

function setModalError(t) {
  modalMsg.textContent = t;
  modalMsg.classList.remove("hidden");
}
function clearModalError() {
  modalMsg.classList.add("hidden");
}

async function loadSmartLinkAndClicks(releaseId) {
  // Load link row (if exists)
  const { data: links, error } = await supabase
    .from("release_links")
    .select("id,slug,is_active")
    .eq("release_id", releaseId)
    .limit(1);

  if (error) throw error;

  if (links && links.length) {
    currentLinkId = links[0].id;
    currentSlug = links[0].slug;
  } else {
    currentLinkId = null;
    currentSlug = null;
  }

  // Load click count (simple)
  if (!currentLinkId) {
    mClicks.textContent = "0 clicks";
    return;
  }

  const { count, error: cErr } = await supabase
    .from("release_link_clicks")
    .select("*", { count: "exact", head: true })
    .eq("release_link_id", currentLinkId);

  if (cErr) throw cErr;
  mClicks.textContent = `${count || 0} clicks`;
}

function renderModalLinks(linksObj) {
  const links = normalizeLinks(linksObj);
  const keys = Object.keys(links);

  if (keys.length === 0) {
    mLinks.innerHTML = `<span class="text-[12px] text-white/60">No streaming links yet.</span>`;
    return;
  }

  mLinks.innerHTML = keys.map(k => `
    <a href="${links[k]}" target="_blank" rel="noopener"
       class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[12px] text-white/75 hover:bg-white/10">
      <i class="${linkIcon(k)} text-white/70"></i>
      ${linkLabel(k)}
      <i class="fa-solid fa-up-right-from-square text-white/40"></i>
    </a>
  `).join("");
}

function showDetails(r) {
  current = r;
  clearModalError();

  mTitle.textContent = r.title || "Untitled";
  mMeta.textContent = `${fmtType(r.release_type)} • ${r.release_date || "—"} • ${r.release_year || "—"}`;

  mDesc.textContent = (r.description || "").trim() || "—";
  renderModalLinks(r.links);

  const tracks = normalizeTracks(r.tracks);
  if (tracks.length) {
    mTracksWrap.classList.remove("hidden");
    mTracks.textContent = tracks.map((t, i) => `${i + 1}. ${t.title}${t.featured_artists ? " (feat. " + t.featured_artists + ")" : ""}`).join("\n");
  } else {
    mTracksWrap.classList.add("hidden");
  }

  // Cover
  const coverUrl = getCoverUrl(r.cover_path);
  if (coverUrl) {
    mCover.src = coverUrl;
    mCover.classList.remove("hidden");
    mCoverEmpty.classList.add("hidden");
  } else {
    mCover.src = "";
    mCover.classList.add("hidden");
    mCoverEmpty.classList.remove("hidden");
  }

  // Edit placeholder (you’ll create edit_release.html next)
  mEditBtn.href = `./edit_release.html?id=${encodeURIComponent(r.id)}`;

  // Smart link UI defaults
  mSlug.textContent = "—";
  mPublicLink.classList.add("hidden");
  mClicks.textContent = "—";

  openModal();

  // Load smart link + clicks async
  loadSmartLinkAndClicks(r.id)
    .then(() => {
      if (currentSlug) {
        mSlug.textContent = currentSlug;
        const url = `${PUBLIC_BASE_URL}/r.html?slug=${encodeURIComponent(currentSlug)}`;
        mPublicLink.href = url;
        mPublicLink.classList.remove("hidden");
      } else {
        mSlug.textContent = "Not generated";
      }
    })
    .catch(e => setModalError(e?.message || "Failed to load smart link."));
}

function genCandidateSlug(r) {
  const base = slugify(`${r.title}-${r.release_year || ""}`) || slugify(r.title) || "release";
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${rand}`;
}

mCopyBtn.addEventListener("click", async () => {
  if (!currentSlug) return;
  const url = `${PUBLIC_BASE_URL}/r.html?slug=${encodeURIComponent(currentSlug)}`;
  await navigator.clipboard.writeText(url);
  mCopyBtn.innerHTML = `<i class="fa-solid fa-check"></i> Copied`;
  setTimeout(() => (mCopyBtn.innerHTML = `<i class="fa-solid fa-copy"></i> Copy`), 900);
});

mGenLinkBtn.addEventListener("click", async () => {
  if (!current) return;

  try {
    clearModalError();
    mGenLinkBtn.disabled = true;
    mGenLinkBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating...`;

    // If already exists, do nothing
    if (currentSlug) {
      mGenLinkBtn.disabled = false;
      mGenLinkBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Generate`;
      return;
    }

    const session = await supabase.auth.getSession();
    const userId = session?.data?.session?.user?.id || null;

    const slug = genCandidateSlug(current);

    const { data, error } = await supabase
      .from("release_links")
      .insert({ release_id: current.id, slug, created_by: userId })
      .select(); // returning row [web:69]

    if (error) throw error;

    currentSlug = data?.[0]?.slug || slug;
    currentLinkId = data?.[0]?.id || null;

    mSlug.textContent = currentSlug;
    const url = `${PUBLIC_BASE_URL}/r.html?slug=${encodeURIComponent(currentSlug)}`;
    mPublicLink.href = url;
    mPublicLink.classList.remove("hidden");

    await loadSmartLinkAndClicks(current.id);
  } catch (e) {
    setModalError(e?.message || "Failed to generate smart link.");
  } finally {
    mGenLinkBtn.disabled = false;
    mGenLinkBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Generate`;
  }
});

mDeleteBtn.addEventListener("click", async () => {
  if (!current) return;
  const sure = confirm("Delete this release? This cannot be undone.");
  if (!sure) return;

  try {
    clearModalError();
    mDeleteBtn.disabled = true;
    mDeleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Deleting...`;

    const { error } = await supabase.from("releases").delete().eq("id", current.id);
    if (error) throw error;

    closeModal();
    await fetchReleases();
  } catch (e) {
    setModalError(e?.message || "Failed to delete release.");
  } finally {
    mDeleteBtn.disabled = false;
    mDeleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i> Delete`;
  }
});

refreshBtn.addEventListener("click", () => fetchReleases());
searchInput.addEventListener("input", () => render());
sortSelect.addEventListener("change", () => render());

async function fetchReleases() {
  hidePageError();

  const { data, error } = await supabase
    .from("releases")
    .select("id,release_type,title,featured_artists,release_date,release_year,description,links,tracks,cover_path,created_at")
    .order("release_date", { ascending: false });

  if (error) throw error;
  allReleases = data || [];
  render();
}

(async function init() {
  try {
    const session = await requireAuth();
    if (!session) return;
    await fetchReleases();
  } catch (e) {
    showPageError(e?.message || "Failed to load releases.");
  }
})();
