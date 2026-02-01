import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://huquhmswcygwtuxmwfhg.supabase.co";
const SUPABASE_KEY = "sb_publishable_iTAzRpmW5gNYvbETn4IXdg_kJ0mZgju";

// Public page: use anon/publishable key; RLS must allow reads for anon where needed.
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COVER_BUCKET = "release_covers";

// Elements
const loader = document.getElementById("loader");
const hero = document.getElementById("hero");
const bgPhoto = document.getElementById("bgPhoto");
const coverChip = document.getElementById("coverChip");
const coverImg = document.getElementById("coverImg");

const releaseTitle = document.getElementById("releaseTitle");
const releaseMeta = document.getElementById("releaseMeta");
const platformGrid = document.getElementById("platformGrid");
const availabilityText = document.getElementById("availabilityText");
const errorBox = document.getElementById("errorBox");

const shareBtn = document.getElementById("shareBtn");
const copyBtn = document.getElementById("copyBtn");

const menuBtn = document.getElementById("menuBtn");
const menuScreen = document.getElementById("menuScreen");
const menuClose = document.getElementById("menuClose");
const openAdmin = document.getElementById("openAdmin");

// New (for the updated HTML cards)
const subscribeForm = document.getElementById("subscribeForm");
const subscribeEmail = document.getElementById("subscribeEmail");
const subscribeBtn = document.getElementById("subscribeBtn");

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function showError(text) {
  errorBox.textContent = text;
  errorBox.style.display = "block";
}

function hideLoader() {
  loader.classList.add("hidden");
}

function fmtType(t) {
  return (t || "").toUpperCase() || "RELEASE";
}

function normalizeLinks(links) {
  if (!links || typeof links !== "object") return {};
  const out = {};
  // keep core 4 you asked for, but you can still store others later
  for (const k of ["spotify", "apple_music", "youtube", "audiomack"]) {
    const v = (links[k] || "").toString().trim();
    if (v) out[k] = v;
  }
  return out;
}

function platformLabel(key) {
  return ({
    apple_music: "Apple Music",
    spotify: "Spotify",
    youtube: "YouTube",
    audiomack: "Audiomack",
    boomplay: "Boomplay",
    deezer: "Deezer",
    soundcloud: "SoundCloud"
  })[key] || key;
}

/**
 * Use Simple Icons (brand colored) instead of grey inline SVGs
 * https://cdn.simpleicons.org/<slug>
 */
function iconUrl(key) {
  const map = {
    spotify: "spotify",
    youtube: "youtube",
    apple_music: "applemusic",
    audiomack: "audiomack",
    boomplay: "boomplay",
    deezer: "deezer",
    soundcloud: "soundcloud"
  };
  const slug = map[key];
  return slug ? `https://cdn.simpleicons.org/${slug}` : null;
}

function platformIconHtml(key) {
  const url = iconUrl(key);
  const alt = platformLabel(key);
  if (!url) return `<span style="font-size:12px;opacity:.9;">?</span>`;
  return `<img src="${url}" width="24" height="24" alt="${alt}">`;
}

async function logClick(release_link_id, platform) {
  try {
    // Works only if anon INSERT is allowed on release_link_clicks
    await supabase.from("release_link_clicks").insert({
      release_link_id,
      platform,
      user_agent: navigator.userAgent || null,
      referrer: document.referrer || null,
      ip_hash: null
    });
  } catch {
    // Don’t break UX if analytics fails
  }
}

async function getReleaseBySlug(slug) {
  // 1) fetch release_links row (must be publicly readable for active slugs)
  const { data: linkRows, error: lErr } = await supabase
    .from("release_links")
    .select("id,slug,release_id,is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .limit(1);

  if (lErr) throw lErr;
  const linkRow = linkRows?.[0];
  if (!linkRow) return null;

  // 2) fetch release details (you must allow anon SELECT for the rows you want public)
  const { data: relRows, error: rErr } = await supabase
    .from("releases")
    .select("id,release_type,title,featured_artists,release_date,release_year,description,links,tracks,cover_path")
    .eq("id", linkRow.release_id)
    .limit(1);

  if (rErr) throw rErr;
  const rel = relRows?.[0];
  if (!rel) return null;

  return { link: linkRow, release: rel };
}

function getCoverPublicUrl(path) {
  if (!path) return null;
  const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

function renderPlatforms(links, onClick) {
  platformGrid.innerHTML = "";

  // Your request: keep only these 4 platforms visible
  const order = ["spotify", "apple_music", "youtube", "audiomack"];

  // Keep grid look (7 columns) but render only 4 icons
  for (const key of order) {
    const url = links[key] || null;

    const a = document.createElement("a");
    a.className = "picon";
    a.href = url || "#";
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", platformLabel(key));

    a.style.opacity = url ? "1" : "0.35";
    a.style.pointerEvents = url ? "auto" : "none";

    a.innerHTML = platformIconHtml(key);

    if (url) {
      a.addEventListener("click", () => onClick(key, url));
    }

    platformGrid.appendChild(a);
  }
}

function smoke(canvas) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  function resize() {
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
  }
  resize();

  const blobs = Array.from({ length: 16 }).map(() => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.08 + Math.random() * 0.18,
    vx: (-0.25 + Math.random() * 0.5) * 0.003,
    vy: (-0.25 + Math.random() * 0.5) * 0.003,
    a: 0.05 + Math.random() * 0.08
  }));

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    for (const b of blobs) {
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < -0.2) b.x = 1.2;
      if (b.x > 1.2) b.x = -0.2;
      if (b.y < -0.2) b.y = 1.2;
      if (b.y > 1.2) b.y = -0.2;

      const gx = b.x * w;
      const gy = b.y * h;
      const gr = b.r * Math.min(w, h);

      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      g.addColorStop(0, `rgba(255,255,255,${b.a})`);
      g.addColorStop(1, "rgba(255,255,255,0)");

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  tick();
}

(async function init() {
  try {
    smoke(document.getElementById("bg"));

    const slug = qs("slug");
    if (!slug) {
      showError("Missing slug. Example: /r.html?slug=your-release-slug");
      hideLoader();
      return;
    }

    const res = await getReleaseBySlug(slug);
    if (!res) {
      showError("This release link is inactive or not found.");
      hideLoader();
      return;
    }

    const { link, release } = res;

    const coverUrl = getCoverPublicUrl(release.cover_path);
    if (coverUrl) {
      bgPhoto.src = coverUrl;
      coverImg.src = coverUrl;
      coverChip.style.display = "block";
    } else {
      coverChip.style.display = "none";
    }

    releaseTitle.textContent = release.title || "";
    const metaBits = [
      fmtType(release.release_type),
      release.featured_artists ? `feat. ${release.featured_artists}` : null,
      release.release_year ? String(release.release_year) : null
    ].filter(Boolean);
    releaseMeta.textContent = metaBits.join(" • ");

    const links = normalizeLinks(release.links);
    const linkCount = Object.keys(links).length;
    availabilityText.textContent = linkCount ? "CHOOSE YOUR PLATFORM" : "LINKS COMING SOON";

    renderPlatforms(links, async (platform) => {
      await logClick(link.id, platform);
    });

    // Share + copy
    const pageUrl = window.location.href;

    shareBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        if (navigator.share) {
          await navigator.share({ title: `Boyskido — ${release.title || "Release"}`, url: pageUrl });
        } else {
          await navigator.clipboard.writeText(pageUrl);
          shareBtn.textContent = "Copied";
          setTimeout(() => (shareBtn.innerHTML = `Share <span class="mini-arrow">↗</span>`), 900);
        }
      } catch {}
    });

    copyBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await navigator.clipboard.writeText(pageUrl);
      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy link"), 900);
    });

    // Subscribe UI only (no backend yet)
    if (subscribeForm && subscribeEmail && subscribeBtn) {
      subscribeForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = (subscribeEmail.value || "").trim();
        if (!email) return;

        // Later: insert into your subscribers table
        subscribeBtn.textContent = "Saved";
        subscribeBtn.disabled = true;

        setTimeout(() => {
          subscribeBtn.textContent = "Subscribe";
          subscribeBtn.disabled = false;
          subscribeEmail.value = "";
        }, 1200);
      });
    }

    // Menu
    menuBtn.addEventListener("click", () => hero.classList.add("menu-open"));
    menuClose.addEventListener("click", () => hero.classList.remove("menu-open"));
    menuScreen.addEventListener("click", (e) => {
      if (e.target === menuScreen) hero.classList.remove("menu-open");
    });

    openAdmin.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "./admin/login.html";
    });

    hideLoader();
  } catch (e) {
    showError(e?.message || "Failed to load release.");
    hideLoader();
  }
})();
