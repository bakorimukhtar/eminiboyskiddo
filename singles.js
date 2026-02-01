import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://huquhmswcygwtuxmwfhg.supabase.co";
const SUPABASE_KEY = "sb_publishable_iTAzRpmW5gNYvbETn4IXdg_kJ0mZgju";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COVERS_BUCKET = "release_covers";
const PUBLIC_BASE_URL = window.location.origin;
const ROTATE_MS = 10000;

/* Loader */
const loader = document.getElementById("loader");
function hideLoader(){ loader?.classList.add("hidden"); }
window.addEventListener("load", () => setTimeout(hideLoader, 600));

/* Explore menu */
const page = document.getElementById("page");
const menuScreen = document.getElementById("menuScreen");
const exploreBtn = document.getElementById("exploreBtn");
const closeMenuBtn = document.getElementById("closeMenuBtn");

function openMenu() { page.classList.add("menu-open"); menuScreen.setAttribute("aria-hidden","false"); }
function closeMenu(){ page.classList.remove("menu-open"); menuScreen.setAttribute("aria-hidden","true"); }

exploreBtn?.addEventListener("click", openMenu);
closeMenuBtn?.addEventListener("click", closeMenu);
menuScreen?.addEventListener("click", (e)=>{ if(e.target===menuScreen) closeMenu(); });
window.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeMenu(); });

/* Slider + caption elements */
const slider = document.getElementById("slider");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const capTitle = document.getElementById("capTitle");
const capLink = document.getElementById("capLink");
const capLinkText = document.getElementById("capLinkText");
const capActions = document.getElementById("capActions");
const capSub = document.getElementById("capSub");

let singles = [];
let slides = [];
let index = 0;
let autoplay = null;

function escapeHtml(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function getCoverUrl(path){
  if(!path) return null;
  const { data } = supabase.storage.from(COVERS_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null; // public buckets [web:9]
}

function normalizeLinks(links){
  if(!links || typeof links !== "object") return {};
  const out = {};
  for(const k of ["apple_music","spotify","youtube","audiomack"]){
    const v = (links[k] || "").toString().trim();
    if(v) out[k] = v;
  }
  return out;
}

function linkIcon(key){
  return ({
    apple_music: "fa-brands fa-apple",
    spotify: "fa-brands fa-spotify",
    youtube: "fa-brands fa-youtube",
    audiomack: "fa-solid fa-music"
  })[key] || "fa-solid fa-link";
}

function linkLabel(key){
  return ({
    apple_music: "Apple Music",
    spotify: "Spotify",
    youtube: "YouTube",
    audiomack: "Audiomack"
  })[key] || key;
}

/* Secure: only read existing slug (no public insert) */
async function loadSlugForRelease(releaseId){
  const { data, error } = await supabase
    .from("release_links")
    .select("slug,is_active")
    .eq("release_id", releaseId)
    .limit(1);
  if(error) throw error;
  const row = data?.[0];
  if(!row?.slug) return null;
  if(row.is_active === false) return null;
  return row.slug;
}

function setActiveSlide(i){
  slides.forEach((s, idx) => s.classList.toggle("is-active", idx === i));
  const r = singles[i];
  if(!r) return;

  capTitle.textContent = (r.title || "Single").toUpperCase();
  capLinkText.textContent = "BACK TO MUSIC";
  capLink.setAttribute("href", "./music.html");

  // Actions (stream links + share)
  capActions.innerHTML = "";
  capSub.textContent = "";

  const links = normalizeLinks(r.links);
  const keys = Object.keys(links);

  if(keys.length){
    capSub.textContent = r.featured_artists ? `feat. ${r.featured_artists}` : (r.release_date ? `Released: ${r.release_date}` : "");
    for(const k of keys){
      const a = document.createElement("a");
      a.className = "cap-pill";
      a.href = links[k];
      a.target = "_blank";
      a.rel = "noopener";
      a.innerHTML = `<i class="${linkIcon(k)}"></i> ${escapeHtml(linkLabel(k))}`;
      capActions.appendChild(a);
    }
  } else {
    capSub.textContent = r.featured_artists ? `feat. ${r.featured_artists}` : "";
    const disabled = document.createElement("span");
    disabled.className = "cap-pill secondary";
    disabled.innerHTML = `<i class="fa-solid fa-link"></i> No streaming links`;
    capActions.appendChild(disabled);
  }

  // Share smart link button (loads slug on demand)
  const shareBtn = document.createElement("button");
  shareBtn.type = "button";
  shareBtn.className = "cap-pill secondary";
  shareBtn.innerHTML = `<i class="fa-solid fa-share-nodes"></i> Share`;
  shareBtn.addEventListener("click", async () => {
    try{
      shareBtn.disabled = true;
      shareBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Share`;

      const slug = await loadSlugForRelease(r.id);
      if(!slug){
        shareBtn.innerHTML = `<i class="fa-solid fa-ban"></i> Not available`;
        setTimeout(()=>{ shareBtn.innerHTML = `<i class="fa-solid fa-share-nodes"></i> Share`; shareBtn.disabled=false; }, 900);
        return;
      }

      const url = `${PUBLIC_BASE_URL}/r.html?slug=${encodeURIComponent(slug)}`;
      await navigator.clipboard.writeText(url);
      shareBtn.innerHTML = `<i class="fa-solid fa-check"></i> Copied`;
      setTimeout(()=>{ shareBtn.innerHTML = `<i class="fa-solid fa-share-nodes"></i> Share`; shareBtn.disabled=false; }, 900);
    } catch(e){
      shareBtn.disabled = false;
      shareBtn.innerHTML = `<i class="fa-solid fa-share-nodes"></i> Share`;
      // don’t block UI; silent fail
    }
  });
  capActions.appendChild(shareBtn);
}

function next(){
  if(!slides.length) return;
  index = (index + 1) % slides.length;
  setActiveSlide(index);
}

function prev(){
  if(!slides.length) return;
  index = (index - 1 + slides.length) % slides.length;
  setActiveSlide(index);
}

nextBtn?.addEventListener("click", () => { next(); restartAutoplay(); });
prevBtn?.addEventListener("click", () => { prev(); restartAutoplay(); });

function restartAutoplay(){
  if(autoplay) clearInterval(autoplay);
  autoplay = setInterval(next, ROTATE_MS);
}

async function fetchSingles(){
  // Public SELECT must be allowed by RLS for releases + release_links (for share button to work)
  const { data, error } = await supabase
    .from("releases")
    .select("id,release_type,title,featured_artists,release_date,release_year,links,cover_path,created_at")
    .eq("release_type", "single")
    .order("release_date", { ascending: false });

  if(error) throw error;
  singles = data || [];
}

function buildSlides(){
  // Remove existing slide elements (keep prev/next buttons)
  slider.querySelectorAll(".slide").forEach(n => n.remove());

  slides = singles.map((r, idx) => {
    const coverUrl = getCoverUrl(r.cover_path);

    const article = document.createElement("article");
    article.className = "slide" + (idx === 0 ? " is-active" : "");
    article.setAttribute("data-title", r.title || "SINGLES");

    const img = document.createElement("img");
    img.className = "slide-img";
    img.alt = (r.title || "Single") + " cover";
    img.src = coverUrl || ""; // if empty, it will show blank; better than using local fallback
    article.appendChild(img);

    const overlay = document.createElement("div");
    overlay.className = "slide-overlay";
    overlay.setAttribute("aria-hidden", "true");
    article.appendChild(overlay);

    slider.appendChild(article);
    return article;
  });
}

document.addEventListener("visibilitychange", () => {
  if(document.hidden) { if(autoplay) clearInterval(autoplay); }
  else restartAutoplay();
});

/* Init */
(async function init(){
  try{
    await fetchSingles();
    buildSlides();

    if(!singles.length){
      capTitle.textContent = "SINGLES";
      capLinkText.textContent = "BACK TO MUSIC";
      capLink.setAttribute("href", "./music.html");
      capActions.innerHTML = `<span class="cap-pill secondary"><i class="fa-solid fa-music"></i> No singles yet</span>`;
      return;
    }

    index = 0;
    setActiveSlide(0);
    restartAutoplay();
  } catch(e){
    capTitle.textContent = "SINGLES";
    capLinkText.textContent = "BACK TO MUSIC";
    capLink.setAttribute("href", "./music.html");
    capActions.innerHTML = `<span class="cap-pill secondary"><i class="fa-solid fa-triangle-exclamation"></i> Failed to load</span>`;
  } finally {
    hideLoader();
  }
})();

/* Smoke canvas (same as your music.js) */
const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d", { alpha: true });

let w, h, dpr;
let particles = [];
const pointer = { x: 0, y: 0, vx: 0, vy: 0, active: false };

function resize() {
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  w = canvas.width = Math.floor(window.innerWidth * dpr);
  h = canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  particles = Array.from({ length: 85 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: (22 + Math.random() * 130) * dpr,
    vx: (-0.16 + Math.random() * 0.32) * dpr,
    vy: (-0.10 + Math.random() * 0.20) * dpr,
    a: 0.02 + Math.random() * 0.05,
  }));
}
window.addEventListener("resize", resize);
resize();

function setPointer(clientX, clientY) {
  const x = clientX * dpr;
  const y = clientY * dpr;
  pointer.vx = (x - pointer.x) * 0.35;
  pointer.vy = (y - pointer.y) * 0.35;
  pointer.x = x;
  pointer.y = y;
  pointer.active = true;
}

window.addEventListener("mousemove", (e) => setPointer(e.clientX, e.clientY), { passive: true });
window.addEventListener("touchstart", (e) => { const t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY); }, { passive: true });
window.addEventListener("touchmove", (e) => { const t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY); }, { passive: true });
window.addEventListener("touchend", () => { pointer.active = false; }, { passive: true });

function draw() {
  ctx.clearRect(0, 0, w, h);

  const vg = ctx.createRadialGradient(w*0.5, h*0.5, 0, w*0.5, h*0.5, Math.max(w,h)*0.8);
  vg.addColorStop(0, "rgba(0,0,0,0.05)");
  vg.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,w,h);

  ctx.globalCompositeOperation = "lighter";

  const influence = pointer.active ? 1 : 0.22;
  const pushRadius = 220 * dpr;

  for (const p of particles) {
    p.x += p.vx; p.y += p.vy;

    if (p.x < -p.r) p.x = w + p.r;
    if (p.x > w + p.r) p.x = -p.r;
    if (p.y < -p.r) p.y = h + p.r;
    if (p.y > h + p.r) p.y = -p.r;

    const dx = p.x - pointer.x;
    const dy = p.y - pointer.y;
    const dist = Math.hypot(dx, dy);

    if (dist < pushRadius) {
      const force = (1 - dist / pushRadius) * 0.9 * influence;
      p.x += (dx / (dist + 0.001)) * force * 16;
      p.y += (dy / (dist + 0.001)) * force * 16;
      p.x += pointer.vx * force * 0.55;
      p.y += pointer.vy * force * 0.55;
    }

    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    grad.addColorStop(0, `rgba(255,255,255,${p.a})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";
  pointer.vx *= 0.92;
  pointer.vy *= 0.92;
  if (Math.abs(pointer.vx) + Math.abs(pointer.vy) < 0.02) pointer.active = false;

  requestAnimationFrame(draw);
}
draw();
