import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://huquhmswcygwtuxmwfhg.supabase.co";
const SUPABASE_KEY = "sb_publishable_iTAzRpmW5gNYvbETn4IXdg_kJ0mZgju";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* Sidebar */
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

/* Auth + logout */
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

/* UI */
const refreshBtn = document.getElementById("refreshBtn");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

const totalCount = document.getElementById("totalCount");
const newCount = document.getElementById("newCount");
const resolvedCount = document.getElementById("resolvedCount");

const shownCount = document.getElementById("shownCount");
const listWrap = document.getElementById("listWrap");
const emptyState = document.getElementById("emptyState");
const pageMsg = document.getElementById("pageMsg");

/* Modal */
const modal = document.getElementById("modal");
const modalOverlay = document.getElementById("modalOverlay");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const mCloseBtn2 = document.getElementById("mCloseBtn2");
const modalMsg = document.getElementById("modalMsg");

const mName = document.getElementById("mName");
const mMeta = document.getElementById("mMeta");
const mMessage = document.getElementById("mMessage");
const mEmail = document.getElementById("mEmail");
const mPhone = document.getElementById("mPhone");
const mStatus = document.getElementById("mStatus");
const mSaveBtn = document.getElementById("mSaveBtn");
const mDeleteBtn = document.getElementById("mDeleteBtn");

function showPageError(t) {
  pageMsg.textContent = t;
  pageMsg.classList.remove("hidden");
}
function hidePageError() {
  pageMsg.classList.add("hidden");
}
function setModalError(t) {
  modalMsg.textContent = t;
  modalMsg.classList.remove("hidden");
}
function clearModalError() {
  modalMsg.classList.add("hidden");
}

function openModal() {
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  clearModalError();
  current = null;
}

modalOverlay.addEventListener("click", closeModal);
modalCloseBtn.addEventListener("click", closeModal);
mCloseBtn2.addEventListener("click", closeModal);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});

function fmtDateTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts;
  }
}
function badge(status) {
  const map = {
    new: "border-emerald-300/25 bg-emerald-500/10 text-emerald-200/90",
    in_progress: "border-amber-300/25 bg-amber-500/10 text-amber-200/90",
    resolved: "border-sky-300/25 bg-sky-500/10 text-sky-200/90",
    spam: "border-rose-300/25 bg-rose-500/10 text-rose-200/90",
  };
  return map[status] || "border-white/15 bg-white/5 text-white/70";
}

let all = [];
let current = null;

function matchesSearch(row, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    (row.name || "").toLowerCase().includes(s) ||
    (row.email || "").toLowerCase().includes(s) ||
    (row.phone || "").toLowerCase().includes(s) ||
    (row.message || "").toLowerCase().includes(s)
  );
}

function cardTemplate(b) {
  const preferred = (b.preferred_contact || "email").toUpperCase();
  const subtitle = `${fmtDateTime(b.created_at)} • ${preferred}`;
  const preview = (b.message || "").trim().slice(0, 140);

  return `
    <article class="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-extrabold truncate">${b.name || "Unknown"}</div>
          <div class="mt-1 text-[11px] tracking-[0.14em] uppercase text-white/60">${subtitle}</div>
        </div>

        <span class="shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black tracking-[0.14em] uppercase ${badge(b.status)}">
          ${b.status || "new"}
        </span>
      </div>

      <div class="mt-3 text-[12px] text-white/70 leading-relaxed">
        ${preview || "—"}
      </div>

      <div class="mt-3 flex items-center justify-between gap-3">
        <div class="text-[11px] text-white/55">
          <i class="fa-solid fa-at text-white/35"></i>
          <span class="ml-2">${b.email || "—"}</span>
        </div>

        <button data-id="${b.id}"
          class="viewBtn rounded-xl border border-white/15 bg-black/20 hover:bg-white/10 px-3 py-2 text-[11px] font-black tracking-[0.18em] uppercase inline-flex items-center gap-2">
          <i class="fa-solid fa-eye"></i>
          View
        </button>
      </div>
    </article>
  `;
}

function render() {
  const q = (searchInput.value || "").trim();
  const status = statusFilter.value;

  const filtered = all
    .filter(r => matchesSearch(r, q))
    .filter(r => status === "all" ? true : r.status === status);

  totalCount.textContent = String(all.length);
  newCount.textContent = String(all.filter(x => x.status === "new").length);
  resolvedCount.textContent = String(all.filter(x => x.status === "resolved").length);

  shownCount.textContent = `${filtered.length} shown`;
  listWrap.innerHTML = filtered.map(cardTemplate).join("");
  emptyState.classList.toggle("hidden", filtered.length !== 0);

  document.querySelectorAll(".viewBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const row = all.find(x => x.id === id);
      if (row) showDetails(row);
    });
  });
}

function showDetails(b) {
  current = b;
  clearModalError();

  mName.textContent = b.name || "Unknown";
  mMeta.textContent = `${fmtDateTime(b.created_at)} • ${(b.preferred_contact || "email").toUpperCase()} • ${(b.status || "new").toUpperCase()}`;

  mMessage.textContent = b.message || "—";

  if (b.email) {
    mEmail.textContent = b.email;
    mEmail.href = `mailto:${b.email}`;
  } else {
    mEmail.textContent = "—";
    mEmail.removeAttribute("href");
  }

  if (b.phone) {
    mPhone.textContent = b.phone;
    // WhatsApp deep link (safe default)
    const digits = b.phone.replace(/[^\d+]/g, "");
    mPhone.href = `https://wa.me/${digits.replace(/^\+/, "")}`;
  } else {
    mPhone.textContent = "—";
    mPhone.removeAttribute("href");
  }

  mStatus.value = b.status || "new";
  openModal();
}

mSaveBtn.addEventListener("click", async () => {
  if (!current) return;

  try {
    clearModalError();
    mSaveBtn.disabled = true;
    mSaveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

    const nextStatus = mStatus.value;

    const { error } = await supabase
      .from("bookings")
      .update({ status: nextStatus })
      .eq("id", current.id);

    if (error) throw error;

    current.status = nextStatus;
    await fetchBookings();
    showDetails(all.find(x => x.id === current.id) || current);
  } catch (e) {
    setModalError(e?.message || "Failed to update status.");
  } finally {
    mSaveBtn.disabled = false;
    mSaveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save`;
  }
});

mDeleteBtn.addEventListener("click", async () => {
  if (!current) return;
  const sure = confirm("Delete this booking request? This cannot be undone.");
  if (!sure) return;

  try {
    clearModalError();
    mDeleteBtn.disabled = true;
    mDeleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Deleting...`;

    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", current.id);

    if (error) throw error;

    closeModal();
    await fetchBookings();
  } catch (e) {
    setModalError(e?.message || "Failed to delete booking.");
  } finally {
    mDeleteBtn.disabled = false;
    mDeleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i> Delete`;
  }
});

async function fetchBookings() {
  hidePageError();

  // Basic select + order usage. [web:125][web:232]
  const { data, error } = await supabase
    .from("bookings")
    .select("id,name,email,phone,preferred_contact,message,status,created_at")
    .order("created_at", { ascending: false }); // [web:232]

  if (error) throw error;

  all = data || [];
  render();
}

refreshBtn.addEventListener("click", fetchBookings);
searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);

(async function init() {
  try {
    const session = await requireAuth();
    if (!session) return;
    await fetchBookings();
  } catch (e) {
    showPageError(e?.message || "Failed to load bookings.");
  }
})();
