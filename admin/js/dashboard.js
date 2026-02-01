import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://huquhmswcygwtuxmwfhg.supabase.co";
const SUPABASE_KEY = "sb_publishable_iTAzRpmW5gNYvbETn4IXdg_kJ0mZgju";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* Elements */
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const openSidebarBtn = document.getElementById("openSidebarBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");

const logoutBtn = document.getElementById("logoutBtn");
const dashMsg = document.getElementById("dashMsg");
const sessionStatus = document.getElementById("sessionStatus");

const userEmail = document.getElementById("userEmail");
const userId = document.getElementById("userId");
const userRole = document.getElementById("userRole");

const statEvents = document.getElementById("statEvents");
const statReleases = document.getElementById("statReleases");
const statBookings = document.getElementById("statBookings");
const statSubscribers = document.getElementById("statSubscribers");

function showError(text) {
  dashMsg.textContent = text;
  dashMsg.classList.remove("hidden");
}
function clearError() {
  dashMsg.classList.add("hidden");
}

function openSidebar() {
  sidebar?.classList.remove("-translate-x-full");
  overlay?.classList.remove("hidden");
}
function closeSidebar() {
  sidebar?.classList.add("-translate-x-full");
  overlay?.classList.add("hidden");
}

openSidebarBtn?.addEventListener("click", openSidebar);
closeSidebarBtn?.addEventListener("click", closeSidebar);
overlay?.addEventListener("click", closeSidebar);

function setStat(el, value) {
  if (!el) return;
  el.textContent = value === null || value === undefined ? "—" : String(value);
}

/* Auth guard */
async function requireAuth() {
  // getSession can be null if not signed in. [web:37]
  const { data: { session }, error } = await supabase.auth.getSession(); // [web:37]
  if (error) throw error;
  if (!session) {
    window.location.href = "./login.html";
    return null;
  }
  return session;
}

async function loadUser() {
  // getUser() makes a network request and returns trusted user data. [web:109]
  const { data: { user }, error } = await supabase.auth.getUser(); // [web:109]
  if (error) throw error;

  userEmail.textContent = user?.email ?? "";
  userId.textContent = user?.id ?? "—";
  userRole.textContent = "authenticated";
  sessionStatus.textContent = "Active";
}

/* Stats helpers */
async function countRows(table, filters = []) {
  let q = supabase.from(table).select("*", { count: "exact", head: true }); // [web:125]
  for (const f of filters) q = f(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function loadStats() {
  // Show placeholders while loading
  setStat(statEvents, "…");
  setStat(statReleases, "…");
  setStat(statBookings, "…");
  setStat(statSubscribers, "…");

  // Change these if your table names differ:
  // events, releases, bookings, subscribers
  const [
    eventsCount,
    releasesCount,
    newBookingsCount,
    subscribersCount
  ] = await Promise.all([
    countRows("events"),
    countRows("releases"),
    countRows("bookings", [(q) => q.eq("status", "new")]), // filter usage [web:233]
    countRows("subscribers")
  ]);

  setStat(statEvents, eventsCount);
  setStat(statReleases, releasesCount);
  setStat(statBookings, newBookingsCount);
  setStat(statSubscribers, subscribersCount);
}

/* Logout */
logoutBtn?.addEventListener("click", async () => {
  try {
    logoutBtn.disabled = true;
    logoutBtn.textContent = "Logging out...";

    const { error } = await supabase.auth.signOut(); // [web:35]
    if (error) throw error;

    window.location.href = "./login.html";
  } catch (e) {
    showError(e?.message || "Logout failed.");
    logoutBtn.disabled = false;
    logoutBtn.textContent = "Logout";
  }
});

/* Init */
(async function init() {
  try {
    clearError();
    sessionStatus.textContent = "Checking…";

    const session = await requireAuth();
    if (!session) return;

    await loadUser();
    await loadStats();
  } catch (e) {
    showError(e?.message || "Something went wrong.");
    sessionStatus.textContent = "Error";
  }
})();
