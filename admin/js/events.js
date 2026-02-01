import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://huquhmswcygwtuxmwfhg.supabase.co";
const SUPABASE_KEY = "sb_publishable_iTAzRpmW5gNYvbETn4IXdg_kJ0mZgju";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Bucket used earlier in add_events.js
const BUCKET = "event_flyers";

/* ---------------- Sidebar ---------------- */
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

/* ---------------- Auth + logout ---------------- */
const userEmailEl = document.getElementById("userEmail");
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "./login.html";
});

async function requireAuth() {
  const { data: { session }, error } = await supabase.auth.getSession(); // [web:37]
  if (error) throw error;
  if (!session) {
    window.location.href = "./login.html";
    return null;
  }
  userEmailEl.textContent = session.user?.email ?? "";
  return session;
}

/* ---------------- UI elements ---------------- */
const pageMsg = document.getElementById("pageMsg");
const refreshBtn = document.getElementById("refreshBtn");
const searchInput = document.getElementById("searchInput");

const tabUpcoming = document.getElementById("tabUpcoming");
const tabPast = document.getElementById("tabPast");
const upcomingWrap = document.getElementById("upcomingWrap");
const pastWrap = document.getElementById("pastWrap");

const upcomingList = document.getElementById("upcomingList");
const pastList = document.getElementById("pastList");

const upcomingCount = document.getElementById("upcomingCount");
const pastCount = document.getElementById("pastCount");
const eventsCount = document.getElementById("eventsCount");

const upcomingEmpty = document.getElementById("upcomingEmpty");
const pastEmpty = document.getElementById("pastEmpty");

/* ---------------- Modal elements ---------------- */
const modal = document.getElementById("modal");
const modalOverlay = document.getElementById("modalOverlay");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const mCloseBtn2 = document.getElementById("mCloseBtn2");
const modalMsg = document.getElementById("modalMsg");

const mTitle = document.getElementById("mTitle");
const mMeta = document.getElementById("mMeta");
const mFlyer = document.getElementById("mFlyer");
const mFlyerEmpty = document.getElementById("mFlyerEmpty");
const mFlyerOpen = document.getElementById("mFlyerOpen");
const mDateTime = document.getElementById("mDateTime");
const mVenue = document.getElementById("mVenue");
const mTickets = document.getElementById("mTickets");
const mOrganizerLink = document.getElementById("mOrganizerLink");
const mNotesWrap = document.getElementById("mNotesWrap");
const mNotes = document.getElementById("mNotes");
const mDeleteBtn = document.getElementById("mDeleteBtn");

let allEvents = [];
let activeTab = "upcoming";
let currentModalEvent = null;

/* ---------------- Helpers ---------------- */
function showPageError(text) {
  pageMsg.textContent = text;
  pageMsg.classList.remove("hidden");
}
function hidePageError() {
  pageMsg.classList.add("hidden");
}

function openModal() {
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  modalMsg.classList.add("hidden");
  currentModalEvent = null;
}

modalOverlay.addEventListener("click", closeModal);
modalCloseBtn.addEventListener("click", closeModal);
mCloseBtn2.addEventListener("click", closeModal);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});

function fmtDate(dateStr) {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return dateStr;
  }
}

function fmtMoney(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2
  }).format(Number(n));
}

function getFlyerUrl(flyer_path) {
  if (!flyer_path) return null;
  // Public bucket helper; if bucket isn't public, url won't load. [web:79]
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(flyer_path); // [web:79]
  return data?.publicUrl ?? null;
}

function matchesSearch(ev, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    (ev.title || "").toLowerCase().includes(s) ||
    (ev.venue || "").toLowerCase().includes(s) ||
    (ev.city || "").toLowerCase().includes(s)
  );
}

function isUpcoming(ev) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(ev.event_date + "T00:00:00");
  return d >= today;
}

function normalizeTickets(tickets) {
  // Expecting JSONB array: [{name, price}, ...]
  if (!Array.isArray(tickets)) return [];
  return tickets
    .map(t => ({
      name: (t?.name ?? "").toString().trim(),
      price: (t?.price === "" || t?.price === null || t?.price === undefined) ? null : Number(t.price)
    }))
    .filter(t => t.name);
}

function ticketChipsHTML(tickets, max = 2) {
  const list = normalizeTickets(tickets);
  if (list.length === 0) {
    return `<span class="text-[11px] text-white/55"><i class="fa-solid fa-ticket text-white/35"></i><span class="ml-2">No tickets</span></span>`;
  }

  const shown = list.slice(0, max);
  const more = list.length - shown.length;

  const chips = shown.map(t => {
    const price = (t.price === null || Number.isNaN(t.price)) ? "" : ` • ${fmtMoney(t.price)}`;
    const label = `${t.name}${price}`;
    return `
      <span class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-white/70">
        <i class="fa-solid fa-ticket text-white/35"></i>
        <span class="whitespace-nowrap">${label}</span>
      </span>
    `;
  }).join("");

  const moreChip = more > 0
    ? `<span class="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-white/60">+${more} more</span>`
    : "";

  return `<div class="flex flex-wrap gap-2">${chips}${moreChip}</div>`;
}

function ticketsListText(tickets) {
  const list = normalizeTickets(tickets);
  if (list.length === 0) return "No tickets added.";

  return list.map(t => {
    const price = (t.price === null || Number.isNaN(t.price)) ? "—" : fmtMoney(t.price);
    return `${t.name} • ${price}`;
  }).join("\n");
}

/* ---------------- Rendering ---------------- */
function cardTemplate(ev) {
  const flyerUrl = getFlyerUrl(ev.flyer_path);
  const when = `${fmtDate(ev.event_date)}${ev.event_time ? " • " + ev.event_time.slice(0, 5) : ""}`;
  const place = [ev.venue, ev.city].filter(Boolean).join(" • ") || "—";

  return `
    <article class="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden">
      <div class="aspect-[16/10] bg-black/40 relative">
        ${flyerUrl ? `
          <img src="${flyerUrl}" alt="Event flyer" class="w-full h-full object-cover" loading="lazy" />
        ` : `
          <div class="absolute inset-0 grid place-items-center text-white/55">
            <div class="text-center">
              <i class="fa-regular fa-image text-2xl"></i>
              <div class="mt-2 text-[11px] tracking-[0.14em] uppercase">No flyer</div>
            </div>
          </div>
        `}
        <div class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/75 to-transparent">
          <div class="text-[11px] tracking-[0.14em] uppercase text-white/70">${when}</div>
          <div class="mt-1 text-sm font-extrabold line-clamp-1">${ev.title ?? "Untitled event"}</div>
        </div>
      </div>

      <div class="p-4">
        <div class="text-[12px] text-white/70 line-clamp-1">
          <i class="fa-solid fa-location-dot text-white/40"></i>
          <span class="ml-2">${place}</span>
        </div>

        <div class="mt-3 flex items-end justify-between gap-3">
          <div class="flex-1">
            ${ticketChipsHTML(ev.tickets, 2)}
          </div>

          <button data-id="${ev.id}"
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
  const filtered = allEvents.filter(ev => matchesSearch(ev, q));

  const upcoming = filtered.filter(isUpcoming).sort((a, b) => a.event_date.localeCompare(b.event_date));
  const past = filtered.filter(ev => !isUpcoming(ev)).sort((a, b) => b.event_date.localeCompare(a.event_date));

  eventsCount.textContent = String(filtered.length);
  upcomingCount.textContent = `${upcoming.length} shown`;
  pastCount.textContent = `${past.length} shown`;

  upcomingList.innerHTML = upcoming.map(cardTemplate).join("");
  pastList.innerHTML = past.map(cardTemplate).join("");

  upcomingEmpty.classList.toggle("hidden", upcoming.length !== 0);
  pastEmpty.classList.toggle("hidden", past.length !== 0);

  document.querySelectorAll(".viewBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const ev = allEvents.find(x => x.id === id);
      if (ev) showDetails(ev);
    });
  });
}

function showDetails(ev) {
  currentModalEvent = ev;
  modalMsg.classList.add("hidden");

  const when = `${fmtDate(ev.event_date)}${ev.event_time ? " • " + ev.event_time.slice(0, 5) : ""}`;
  const place = [ev.venue, ev.city].filter(Boolean).join(" • ") || "—";

  mTitle.textContent = ev.title || "Untitled event";
  mMeta.textContent = place;
  mDateTime.textContent = when;
  mVenue.textContent = place;

  // Tickets: multi-ticket render (newline list)
  mTickets.textContent = ticketsListText(ev.tickets);

  if (ev.organizer_contact) {
    mOrganizerLink.href = ev.organizer_contact;
    mOrganizerLink.classList.remove("hidden");
  } else {
    mOrganizerLink.classList.add("hidden");
  }

  if (ev.notes) {
    mNotes.textContent = ev.notes;
    mNotesWrap.classList.remove("hidden");
  } else {
    mNotesWrap.classList.add("hidden");
  }

  const flyerUrl = getFlyerUrl(ev.flyer_path);
  if (flyerUrl) {
    mFlyer.src = flyerUrl;
    mFlyer.classList.remove("hidden");
    mFlyerEmpty.classList.add("hidden");

    mFlyerOpen.href = flyerUrl;
    mFlyerOpen.classList.remove("hidden");
  } else {
    mFlyer.src = "";
    mFlyer.classList.add("hidden");
    mFlyerEmpty.classList.remove("hidden");
    mFlyerOpen.classList.add("hidden");
  }

  openModal();
}

/* ---------------- Data ---------------- */
async function fetchEvents() {
  hidePageError();

  // Include tickets JSONB in select. [web:125]
  const { data, error } = await supabase
    .from("events")
    .select("id,title,venue,city,event_date,event_time,tickets,organizer_contact,notes,flyer_path,created_at") // [web:125]
    .order("event_date", { ascending: true });

  if (error) throw error;

  allEvents = (data || []).map(ev => ({
    ...ev,
    tickets: normalizeTickets(ev.tickets)
  }));

  render();
}

/* ---------------- Tabs / search ---------------- */
tabUpcoming.addEventListener("click", () => {
  activeTab = "upcoming";
  upcomingWrap.classList.remove("hidden");
  pastWrap.classList.add("hidden");

  tabUpcoming.classList.add("bg-white/10");
  tabUpcoming.classList.remove("bg-black/20");
  tabPast.classList.add("bg-black/20");
  tabPast.classList.remove("bg-white/10");
});

tabPast.addEventListener("click", () => {
  activeTab = "past";
  pastWrap.classList.remove("hidden");
  upcomingWrap.classList.add("hidden");

  tabPast.classList.add("bg-white/10");
  tabPast.classList.remove("bg-black/20");
  tabUpcoming.classList.add("bg-black/20");
  tabUpcoming.classList.remove("bg-white/10");
});

searchInput.addEventListener("input", render);
refreshBtn.addEventListener("click", fetchEvents);

/* ---------------- Delete (optional) ---------------- */
mDeleteBtn.addEventListener("click", async () => {
  if (!currentModalEvent) return;

  const sure = confirm("Delete this event? This cannot be undone.");
  if (!sure) return;

  try {
    mDeleteBtn.disabled = true;
    mDeleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Deleting...`;

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", currentModalEvent.id); // [web:91]

    if (error) throw error;

    closeModal();
    await fetchEvents();
  } catch (e) {
    modalMsg.textContent = e?.message || "Failed to delete event.";
    modalMsg.classList.remove("hidden");
  } finally {
    mDeleteBtn.disabled = false;
    mDeleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i> Delete event`;
  }
});

/* ---------------- Init ---------------- */
(async function init() {
  try {
    const session = await requireAuth();
    if (!session) return;

    tabUpcoming.click();
    await fetchEvents();
  } catch (e) {
    showPageError(e?.message || "Failed to load events.");
  }
})();
