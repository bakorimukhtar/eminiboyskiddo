// Loader
const loader = document.getElementById("loader");
window.addEventListener("load", () => {
  setTimeout(() => loader.classList.add("hidden"), 600);
});

// Explore -> menu overlay
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
menuScreen.addEventListener("click", (e) => { if (e.target === menuScreen) closeMenu(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

// Slider logic
const slides = Array.from(document.querySelectorAll(".slide"));
const capTitle = document.getElementById("capTitle");
const capLink = document.getElementById("capLink");
const capLinkText = document.getElementById("capLinkText");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let index = 0;

function applySlide(i) {
  slides.forEach((s, idx) => s.classList.toggle("is-active", idx === i));

  const active = slides[i];
  const title = active.getAttribute("data-title") || "";
  const cta = active.getAttribute("data-cta") || "";
  const href = active.getAttribute("data-href") || "#";

  capTitle.textContent = title;
  capLinkText.textContent = cta;
  capLink.setAttribute("href", href);
}

function next() {
  index = (index + 1) % slides.length;
  applySlide(index);
}
function prev() {
  index = (index - 1 + slides.length) % slides.length;
  applySlide(index);
}

nextBtn.addEventListener("click", next);
prevBtn.addEventListener("click", prev);

// Swipe support on mobile
let startX = null;
document.addEventListener("touchstart", (e) => {
  startX = e.touches?.[0]?.clientX ?? null;
}, { passive: true });

document.addEventListener("touchend", (e) => {
  const endX = e.changedTouches?.[0]?.clientX ?? null;
  if (startX == null || endX == null) return;
  const dx = endX - startX;
  if (Math.abs(dx) > 45) (dx < 0 ? next() : prev());
  startX = null;
}, { passive: true });

// Auto-play (optional)
let autoplay = setInterval(next, 6000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearInterval(autoplay);
  else autoplay = setInterval(next, 6000);
});

// Smoke canvas (cursor/touch reactive, same style as tour)
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

// Initialize caption from first slide
applySlide(0);

// helper (needs to exist before use)
function applySlide(i){
  slides.forEach((s, idx) => s.classList.toggle("is-active", idx === i));

  const active = slides[i];
  capTitle.textContent = active.getAttribute("data-title") || "";
  capLinkText.textContent = active.getAttribute("data-cta") || "";
  capLink.setAttribute("href", active.getAttribute("data-href") || "#");
}
