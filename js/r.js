import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://huquhmswcygwtuxmwfhg.supabase.co";
const SUPABASE_KEY = "sb_publishable_iTAzRpmW5gNYvbETn4IXdg_kJ0mZgju";

// Public page: use anon/publishable key; RLS must allow reads for anon where needed. [web:19][web:162]
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
  for (const k of ["apple_music", "spotify", "youtube", "audiomack"]) {
    const v = (links[k] || "").toString().trim();
    if (v) out[k] = v;
  }
  return out;
}

function iconSVG(key) {
  // Minimal inline SVGs so you don't need external images
  const common = `width="24" height="24" viewBox="0 0 24 24" fill="none"`;
  if (key === "spotify") return `<svg ${common}><path fill="white" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm4.6 14.4a.75.75 0 0 1-1.03.26c-2.83-1.73-6.39-2.12-10.57-1.17a.75.75 0 1 1-.33-1.46c4.57-1.04 8.52-.59 11.68 1.35.36.22.48.69.25 1.02Zm1.2-2.68a.9.9 0 0 1-1.24.3c-3.24-1.98-8.17-2.55-12-1.38a.9.9 0 1 1-.52-1.72c4.35-1.31 9.75-.68 13.44 1.56.42.25.55.8.32 1.24Zm.1-2.84c-3.88-2.3-10.28-2.52-13.98-1.4a1.05 1.05 0 0 1-.6-2.01c4.25-1.29 11.32-1.04 15.78 1.62a1.05 1.05 0 1 1-1.2 1.79Z"/></svg>`;
  if (key === "youtube") return `<svg ${common}><path fill="white" d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.8 4.6 12 4.6 12 4.6s-5.8 0-7.5.5A3 3 0 0 0 2.4 7.2 31.7 31.7 0 0 0 2 12s.1 2.8.4 4.8a3 3 0 0 0 2.1 2.1c1.7.5 7.5.5 7.5.5s5.8 0 7.5-.5a3 3 0 0 0 2.1-2.1c.3-2 .4-4.8.4-4.8s-.1-2.8-.4-4.8ZM10.2 15.3V8.7L16 12l-5.8 3.3Z"/></svg>`;
  if (key === "apple_music") return `<svg ${common}><path fill="white" d="M16 2v12.2a2.8 2.8 0 1 1-1.5-2.5V6.1L9 7.4V15a2.8 2.8 0 1 1-1.5-2.5V5.9L16 4Z"/></svg>`;
  if (key === "audiomack") return `<svg ${common}><path fill="white" d="M4 16.5c2.1-2.4 4.5-3.7 8-3.7s5.9 1.3 8 3.7l-1.5 1.2c-1.7-2-3.7-3-6.5-3s-4.8 1-6.5 3L4 16.5Zm0-4c2.6-3 5.7-4.7 8-4.7s5.4 1.7 8 4.7l-1.5 1.2c-2.2-2.6-4.7-3.9-6.5-3.9S7.8 11 5.5 13.7L4 12.5Z"/></svg>`;
  return `<svg ${common}><path fill="white" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 11h-2V7h2v6Zm0 4h-2v-2h2v2Z"/></svg>`;
}

function platformLabel(key) {
  return ({
    apple_music: "Apple Music",
    spotify: "Spotify",
    youtube: "YouTube",
    audiomack: "Audiomack"
  })[key] || key;
}

async function logClick(release_link_id, platform) {
  try {
    // This will only work if you allowed anon INSERT on release_link_clicks. [web:162]
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

  // getPublicUrl only works for public buckets. [web:79]
  const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path); // [web:79]
  return data?.publicUrl ?? null;
}

function renderPlatforms(links, onClick) {
  platformGrid.innerHTML = "";

  // Always render 7 spots (your grid is built for 7); hide missing by disabling.
  const order = ["spotify", "apple_music", "youtube", "audiomack", "boomplay", "deezer", "soundcloud"];

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

    a.innerHTML = iconSVG(key);

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
      // keep default dark background
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

    renderPlatforms(links, async (platform, url) => {
      await logClick(link.id, platform);
      // let the browser open it
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
          setTimeout(() => (shareBtn.textContent = "Share ↗"), 900);
        }
      } catch {}
    });

    copyBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await navigator.clipboard.writeText(pageUrl);
      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy link"), 900);
    });

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
