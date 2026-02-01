import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://huquhmswcygwtuxmwfhg.supabase.co";
const SUPABASE_KEY = "sb_publishable_iTAzRpmW5gNYvbETn4IXdg_kJ0mZgju";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Storage bucket for covers
const BUCKET = "release_covers";

// Elements
const userEmailEl = document.getElementById("userEmail");

const form = document.getElementById("releaseForm");
const resetBtn = document.getElementById("resetBtn");
const saveBtn = document.getElementById("saveBtn");
const msg = document.getElementById("msg");
const ok = document.getElementById("ok");

const releaseTypeEl = document.getElementById("release_type");
const titleLabel = document.getElementById("titleLabel");
const titleEl = document.getElementById("title");

const featuredWrap = document.getElementById("featuredWrap");
const featuredEl = document.getElementById("featured_artists");

const releaseDateEl = document.getElementById("release_date");
const releaseYearText = document.getElementById("releaseYearText");

const appleEl = document.getElementById("apple_music");
const spotifyEl = document.getElementById("spotify");
const youtubeEl = document.getElementById("youtube");
const audiomackEl = document.getElementById("audiomack");

const tracksSection = document.getElementById("tracksSection");
const tracksWrap = document.getElementById("tracksWrap");
const addTrackBtn = document.getElementById("addTrackBtn");

const coverInput = document.getElementById("cover");
const coverPreview = document.getElementById("coverPreview");
const coverPlaceholder = document.getElementById("coverPlaceholder");

const descriptionEl = document.getElementById("description");

function showError(text) {
  msg.textContent = text;
  msg.classList.remove("hidden");
  ok.classList.add("hidden");
}
function showOk(text) {
  ok.textContent = text;
  ok.classList.remove("hidden");
  msg.classList.add("hidden");
}
function clearMessages() {
  msg.classList.add("hidden");
  ok.classList.add("hidden");
}

async function requireAuthAndShowUser() {
  // Using getUser so we have a real authenticated user object. [web:109]
  const { data: { user }, error } = await supabase.auth.getUser(); // [web:109]
  if (error) throw error;

  if (!user) {
    window.location.href = "./login.html";
    return null;
  }
  userEmailEl.textContent = user.email ?? "";
  return user;
}

function slugFileName(name = "cover") {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/* -------- UI: release type rules -------- */
function applyReleaseTypeUI() {
  const type = releaseTypeEl.value;

  // Title label changes
  if (type === "single" || type === "collab") {
    titleLabel.textContent = "Track name";
    titleEl.placeholder = "Enter track name";
  } else {
    titleLabel.textContent = type === "ep" ? "EP name" : "Album name";
    titleEl.placeholder = type === "ep" ? "Enter EP name" : "Enter album name";
  }

  // Featured artists only for collab
  if (type === "collab") {
    featuredWrap.classList.remove("hidden");
  } else {
    featuredWrap.classList.add("hidden");
    featuredEl.value = "";
  }

  // Tracks only for EP/Album
  if (type === "ep" || type === "album") {
    tracksSection.classList.remove("hidden");
    if (tracksWrap.children.length === 0) addTrackRow();
  } else {
    tracksSection.classList.add("hidden");
    tracksWrap.innerHTML = "";
  }
}

/* -------- UI: tracks builder (EP/Album) -------- */
function trackRowTemplate() {
  return `
    <div class="trackRow rounded-2xl border border-white/10 bg-white/5 p-4">
      <div class="grid grid-cols-1 sm:grid-cols-6 gap-3 items-start">
        <div class="sm:col-span-3">
          <label class="block text-[11px] uppercase tracking-[0.14em] text-white/60">Track title</label>
          <div class="mt-2 relative">
            <span class="absolute inset-y-0 left-3 grid place-items-center text-white/40">
              <i class="fa-solid fa-music"></i>
            </span>
            <input type="text"
              class="trackTitle w-full rounded-xl border border-white/15 bg-black/30 pl-10 pr-4 py-3 outline-none focus:border-white/30"
              placeholder="Track name" />
          </div>
        </div>

        <div class="sm:col-span-2">
          <label class="block text-[11px] uppercase tracking-[0.14em] text-white/60">Featured artist(s)</label>
          <div class="mt-2 relative">
            <span class="absolute inset-y-0 left-3 grid place-items-center text-white/40">
              <i class="fa-solid fa-user-plus"></i>
            </span>
            <input type="text"
              class="trackFeat w-full rounded-xl border border-white/15 bg-black/30 pl-10 pr-4 py-3 outline-none focus:border-white/30"
              placeholder="Optional" />
          </div>
        </div>

        <div class="sm:col-span-1">
          <label class="block text-[11px] uppercase tracking-[0.14em] text-white/60">Remove</label>
          <button type="button"
            class="removeTrackBtn mt-2 w-full rounded-xl border border-white/10 bg-black/20 hover:bg-red-500/10 px-4 py-3 text-xs font-black tracking-[0.18em] uppercase inline-flex items-center justify-center gap-2 text-white/80">
            <i class="fa-solid fa-trash"></i>
            Del
          </button>
        </div>
      </div>
    </div>
  `;
}

function addTrackRow(defaultTitle = "", defaultFeat = "") {
  tracksWrap.insertAdjacentHTML("beforeend", trackRowTemplate());
  const row = tracksWrap.lastElementChild;
  row.querySelector(".trackTitle").value = defaultTitle;
  row.querySelector(".trackFeat").value = defaultFeat;

  row.querySelector(".removeTrackBtn").addEventListener("click", () => row.remove());
}

function getTracksFromUI() {
  const rows = [...tracksWrap.querySelectorAll(".trackRow")];
  const tracks = rows.map(r => {
    const title = (r.querySelector(".trackTitle")?.value || "").trim();
    const featured_artists = (r.querySelector(".trackFeat")?.value || "").trim();
    return {
      title,
      featured_artists: featured_artists || null
    };
  }).filter(t => t.title);
  return tracks;
}

/* -------- UI: release date -> year text -------- */
releaseDateEl.addEventListener("change", () => {
  clearMessages();
  const v = releaseDateEl.value;
  if (!v) releaseYearText.textContent = "—";
  else releaseYearText.textContent = new Date(v + "T00:00:00").getFullYear();
});

/* -------- UI: cover preview -------- */
coverInput.addEventListener("change", () => {
  clearMessages();
  const file = coverInput.files?.[0];
  if (!file) {
    coverPreview.classList.add("hidden");
    coverPlaceholder.classList.remove("hidden");
    coverPreview.src = "";
    return;
  }
  const url = URL.createObjectURL(file);
  coverPreview.src = url;
  coverPreview.classList.remove("hidden");
  coverPlaceholder.classList.add("hidden");
});

/* -------- Buttons -------- */
addTrackBtn.addEventListener("click", (e) => {
  e.preventDefault();
  clearMessages();
  addTrackRow();
});

releaseTypeEl.addEventListener("change", () => {
  clearMessages();
  applyReleaseTypeUI();
});

resetBtn.addEventListener("click", () => {
  form.reset();
  clearMessages();

  coverPreview.classList.add("hidden");
  coverPlaceholder.classList.remove("hidden");
  coverPreview.src = "";

  tracksWrap.innerHTML = "";
  releaseYearText.textContent = "—";
  applyReleaseTypeUI();
});

/* -------- Submit -------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessages();

  saveBtn.disabled = true;
  saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

  try {
    const user = await requireAuthAndShowUser();
    if (!user) return;

    const release_type = releaseTypeEl.value;
    const title = titleEl.value.trim();
    const featured_artists = (featuredEl.value || "").trim() || null;

    const release_date = releaseDateEl.value;
    const description = (descriptionEl.value || "").trim() || null;

    if (!release_type) throw new Error("Release type is required.");
    if (!title) throw new Error("Title is required.");
    if (!release_date) throw new Error("Release date is required.");

    if (release_type === "collab" && !featured_artists) {
      throw new Error("Featured artist(s) is required for collab releases.");
    }

    // links JSON
    const links = {
      apple_music: (appleEl.value || "").trim() || null,
      spotify: (spotifyEl.value || "").trim() || null,
      youtube: (youtubeEl.value || "").trim() || null,
      audiomack: (audiomackEl.value || "").trim() || null
    };

    // tracks JSON (only EP/Album)
    let tracks = [];
    if (release_type === "ep" || release_type === "album") {
      tracks = getTracksFromUI();
      if (tracks.length === 0) throw new Error("Add at least one track for EP/Album.");
    }

    // Upload cover (optional)
    let cover_path = null;
    const file = coverInput.files?.[0] || null;

    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safe = slugFileName(title).slice(0, 60) || "release";
      const filePath = `releases/${safe}-${Date.now()}.${ext}`;

      // Standard upload with contentType/upsert options. [web:65][web:64]
      const { error: upErr } = await supabase
        .storage
        .from(BUCKET)
        .upload(filePath, file, { contentType: file.type });


      if (upErr) throw upErr;
      cover_path = filePath;
    }

    const payload = {
      release_type,
      title,
      featured_artists,
      release_date,
      description,
      links,
      tracks,
      cover_path,
      created_by: user.id
    };

    const { error } = await supabase
      .from("releases")
      .insert(payload)
      .select(); // return inserted row [web:69]

    if (error) throw error;

    showOk("Release saved successfully.");
    setTimeout(() => window.location.href = "./releases.html", 900);
  } catch (err) {
    showError(err?.message || "Failed to save release.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save release`;
  }
});

/* -------- Init -------- */
(async function init() {
  try {
    await requireAuthAndShowUser();
    applyReleaseTypeUI();
  } catch (e) {
    if (e?.message) showError(e.message);
  }
})();
