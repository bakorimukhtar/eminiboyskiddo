import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://huquhmswcygwtuxmwfhg.supabase.co";
const SUPABASE_KEY = "sb_publishable_iTAzRpmW5gNYvbETn4IXdg_kJ0mZgju";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FLYER_BUCKET = "event_flyers";

/* Loader */
const loader = document.getElementById("loader");
window.addEventListener("load", () => {
  setTimeout(() => loader.classList.add("hidden"), 600);
});

/* Explore -> menu overlay */
const page = document.getElementById("page");
const menuScreen = document.getElementById("menuScreen");
const exploreBtn = document.getElementById("exploreBtn");
const closeMenuBtn = document.getElementById("closeMenuBtn");

function openMenu() {
  page.classList.add("menu-open");
  menuScreen.setAttribute("aria-hidden", "false");
}
function closeMenu() {
  page.classList.remove("menu-open");
  menuScreen.setAttribute("aria-hidden", "true");
}

exploreBtn.addEventListener("click", openMenu);
closeMenuBtn.addEventListener("click", closeMenu);

menuScreen.addEventListener("click", (e) => {
  if (e.target === menuScreen) closeMenu();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

/* Supabase events UI */
const searchInput = document.getElementById("searchInput");
const searchHint = document.getElementById("searchHint");
const upcomingWrap = document.getElementById("upcomingWrap");
const pastWrap = document.getElementById("pastWrap");
const noEvents = document.getElementById("noEvents");

let allUpcoming = [];
let allPast = [];

function getPublicFlyerUrl(path) {
  if (!path) return null;
  // getPublicUrl works only if bucket is public. [web:79]
  const { data } = supabase.storage.from(FLYER_BUCKET).getPublicUrl(path); // [web:79]
  return data?.publicUrl ?? null;
}

function fmtDate(dateStr) {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return dateStr;
  }
}

function eventCard(e, isPast = false) {
  const flyer = getPublicFlyerUrl(e.flyer_path);
  const title = e.title || "Event";
  const place = [e.venue, e.city].filter(Boolean).join(" • ") || "—";
  const when = e.event_date ? fmtDate(e.event_date) : "—";
  const time = e.event_time ? String(e.event_time) : null;

  // Optional: Google Maps search
  const mapsQ = encodeURIComponent([e.venue, e.city].filter(Boolean).join(" "));
  const mapsUrl = mapsQ ? `https://www.google.com/maps/search/?api=1&query=${mapsQ}` : "#";

  return `
    <article class="event-card">
      ${flyer ? `<img class="event-flyer" src="${flyer}" alt="${title} flyer" loading="lazy">` : `<div class="event-flyer"></div>`}
      <div class="event-body">
        <h3 class="event-title">${escapeHtml(title)}</h3>
        <p class="event-meta">${escapeHtml(when)}${time ? ` • ${escapeHtml(time)}` : ""}<br>${escapeHtml(place)}</p>

        <div class="event-actions">
          <a class="event-btn ${isPast ? "secondary" : ""}" href="${mapsUrl}" target="_blank" rel="noopener">
            <i class="fa-solid fa-location-dot"></i>
            Map
          </a>
          <a class="event-btn" href="./contact.html">
            <i class="fa-regular fa-envelope"></i>
            Book
          </a>
        </div>
      </div>
    </article>
  `;
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function applySearch(list, q) {
  if (!q) return list;
  const s = q.toLowerCase();
  return list.filter(e => {
    return (
      (e.title || "").toLowerCase().includes(s) ||
      (e.city || "").toLowerCase().includes(s) ||
      (e.venue || "").toLowerCase().includes(s)
    );
  });
}

function render() {
  const q = (searchInput?.value || "").trim();

  const upcoming = applySearch(allUpcoming, q);
  const past = applySearch(allPast, q);

  upcomingWrap.innerHTML = upcoming.map(e => eventCard(e, false)).join("");
  pastWrap.innerHTML = past.map(e => eventCard(e, true)).join("");

  const totalShown = upcoming.length + past.length;
  noEvents.classList.toggle("hidden", totalShown !== 0);

  if (searchHint) {
    searchHint.textContent = q ? `SHOWING RESULTS FOR: ${q.toUpperCase()}` : "UPCOMING EVENTS + RECENT PAST EVENTS";
  }
}

async function fetchEvents(q = "") {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Build query (public SELECT must be allowed by RLS). [web:162]
  let query = supabase
    .from("events")
    .select("id,title,venue,city,event_date,event_time,flyer_path,tickets") // keep small payload
    .order("event_date", { ascending: true }); // [web:232]

  // Search server-side if user typed something:
  if (q) {
    // Using OR + ILIKE pattern, common approach. [web:269][web:274]
    const pattern = `%${q}%`;
    query = query.or(`title.ilike.${pattern},venue.ilike.${pattern},city.ilike.${pattern}`); // [web:269]
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data || [];

  // Split: upcoming vs past (show a few past)
  const upcoming = rows.filter(e => (e.event_date || "") >= todayStr);
  const past = rows.filter(e => (e.event_date || "") < todayStr)
    .sort((a, b) => String(b.event_date).localeCompare(String(a.event_date)))
    .slice(0, 6);

  allUpcoming = upcoming;
  allPast = past;
  render();
}

let searchTimer = null;
searchInput?.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    try {
      const q = (searchInput.value || "").trim();
      await fetchEvents(q);
    } catch {
      // If fetch fails, keep current view; no hard crash
    }
  }, 250);
});

/* Init events */
(async function initEvents() {
  try {
    await fetchEvents("");
  } catch (e) {
    // If RLS policy is missing you’ll see an error here.
    upcomingWrap.innerHTML = "";
    pastWrap.innerHTML = "";
    noEvents.classList.remove("hidden");
    if (searchHint) searchHint.textContent = e?.message ? `ERROR: ${e.message}` : "ERROR LOADING EVENTS";
  }
})();

/* Smoke canvas (unchanged from your file) */
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
window.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  if (t) setPointer(t.clientX, t.clientY);
}, { passive: true });
window.addEventListener("touchmove", (e) => {
  const t = e.touches[0];
  if (t) setPointer(t.clientX, t.clientY);
}, { passive: true });
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
    p.x += p.vx;
    p.y += p.vy;

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
