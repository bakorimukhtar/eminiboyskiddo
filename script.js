// =====================
// Loader
// =====================
const loader = document.getElementById("loader");
window.addEventListener("load", () => {
  if (!loader) return;
  setTimeout(() => loader.classList.add("hidden"), 700);
});

// =====================
// Explore -> Menu overlay
// =====================
const hero = document.getElementById("hero");
const menuScreen = document.getElementById("menuScreen");
const exploreBtn = document.getElementById("exploreBtn");
const closeMenuBtn = document.getElementById("closeMenuBtn");

function isMenuOpen() {
  return !!hero && hero.classList.contains("menu-open");
}

function openMenu() {
  if (!hero || !menuScreen) return;
  hero.classList.add("menu-open");
  menuScreen.setAttribute("aria-hidden", "false");
}

function closeMenu() {
  if (!hero || !menuScreen) return;
  hero.classList.remove("menu-open");
  menuScreen.setAttribute("aria-hidden", "true");
}

exploreBtn?.addEventListener("click", openMenu);
closeMenuBtn?.addEventListener("click", closeMenu);

// Close when tapping outside inner content
menuScreen?.addEventListener("click", (e) => {
  if (e.target === menuScreen) closeMenu();
});

// Close on ESC
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

// ============================
// Smoke that reacts to cursor
// ============================
const canvas = document.getElementById("bg");
const ctx = canvas?.getContext?.("2d", { alpha: true });

if (canvas && ctx) {
  let w, h, dpr;
  let particles = [];
  const pointer = { x: 0, y: 0, vx: 0, vy: 0, active: false };

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = canvas.width = Math.floor(window.innerWidth * dpr);
    h = canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    // reset particles
    particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (25 + Math.random() * 140) * dpr,
      vx: (-0.18 + Math.random() * 0.36) * dpr,
      vy: (-0.12 + Math.random() * 0.24) * dpr,
      a: 0.02 + Math.random() * 0.05,
    }));
  }

  window.addEventListener("resize", resize);
  resize();

  function setPointer(clientX, clientY) {
    // If menu is open, don't react (clean UX)
    if (isMenuOpen()) return;

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
    if (isMenuOpen()) return;
    const t = e.touches[0];
    if (t) setPointer(t.clientX, t.clientY);
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (isMenuOpen()) return;
    const t = e.touches[0];
    if (t) setPointer(t.clientX, t.clientY);
  }, { passive: true });

  window.addEventListener("touchend", () => { pointer.active = false; }, { passive: true });

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // vignette
    const vg = ctx.createRadialGradient(
      w * 0.5, h * 0.5, 0,
      w * 0.5, h * 0.5, Math.max(w, h) * 0.75
    );
    vg.addColorStop(0, "rgba(0,0,0,0.05)");
    vg.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    // smoke blobs
    ctx.globalCompositeOperation = "lighter";

    const influence = pointer.active ? 1 : 0.25;
    const pushRadius = 220 * dpr;

    for (const p of particles) {
      // drift
      p.x += p.vx;
      p.y += p.vy;

      // wrap
      if (p.x < -p.r) p.x = w + p.r;
      if (p.x > w + p.r) p.x = -p.r;
      if (p.y < -p.r) p.y = h + p.r;
      if (p.y > h + p.r) p.y = -p.r;

      // pointer push
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const dist = Math.hypot(dx, dy);

      if (dist < pushRadius) {
        const force = (1 - dist / pushRadius) * 0.9 * influence;
        p.x += (dx / (dist + 0.001)) * force * 18;
        p.y += (dy / (dist + 0.001)) * force * 18;

        p.x += pointer.vx * force * 0.6;
        p.y += pointer.vy * force * 0.6;
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

    // decay pointer activity if mouse stops
    pointer.vx *= 0.92;
    pointer.vy *= 0.92;

    // if menu is open, calm it down faster
    if (isMenuOpen()) {
      pointer.vx *= 0.80;
      pointer.vy *= 0.80;
      pointer.active = false;
    } else if (Math.abs(pointer.vx) + Math.abs(pointer.vy) < 0.02) {
      pointer.active = false;
    }

    requestAnimationFrame(draw);
  }

  draw();
}
