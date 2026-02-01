import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://huquhmswcygwtuxmwfhg.supabase.co";
const SUPABASE_KEY = "sb_publishable_iTAzRpmW5gNYvbETn4IXdg_kJ0mZgju";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET = "event_flyers";

// --- Elements
const form = document.getElementById("eventForm");
const resetBtn = document.getElementById("resetBtn");
const saveBtn = document.getElementById("saveBtn");
const msg = document.getElementById("msg");
const ok = document.getElementById("ok");

const flyerInput = document.getElementById("flyer");
const flyerPreview = document.getElementById("flyerPreview");
const flyerPlaceholder = document.getElementById("flyerPlaceholder");

const ticketsWrap = document.getElementById("ticketsWrap");
const addTicketBtn = document.getElementById("addTicketBtn");

const userEmailEl = document.getElementById("userEmail");

// --- Helpers
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
  // getUser() performs a network request and returns an authenticated user object. [web:109]
  const { data: { user }, error } = await supabase.auth.getUser(); // [web:109]
  if (error) throw error;

  if (!user) {
    window.location.href = "./login.html";
    return null;
  }

  if (userEmailEl) userEmailEl.textContent = user.email ?? "";
  return user;
}

function slugFileName(name = "flyer") {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// --- Ticket UI
function ticketRowTemplate() {
  return `
    <div class="ticketRow rounded-2xl border border-white/10 bg-white/5 p-4">
      <div class="grid grid-cols-1 sm:grid-cols-5 gap-3 items-start">
        <div class="sm:col-span-3">
          <label class="block text-[11px] uppercase tracking-[0.14em] text-white/60">Ticket name</label>
          <div class="mt-2 relative">
            <span class="absolute inset-y-0 left-3 grid place-items-center text-white/40">
              <i class="fa-solid fa-ticket"></i>
            </span>
            <input
              type="text"
              class="ticketName w-full rounded-xl border border-white/15 bg-black/30 pl-10 pr-4 py-3 outline-none focus:border-white/30"
              placeholder="Regular / VIP / Table / Backstage..."
            />
          </div>
        </div>

        <div class="sm:col-span-2">
          <label class="block text-[11px] uppercase tracking-[0.14em] text-white/60">Price (₦)</label>
          <div class="mt-2 relative">
            <span class="absolute inset-y-0 left-3 grid place-items-center text-white/40">
              <i class="fa-solid fa-naira-sign"></i>
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              class="ticketPrice w-full rounded-xl border border-white/15 bg-black/30 pl-10 pr-12 py-3 outline-none focus:border-white/30"
              placeholder="0"
            />
            <button type="button"
              class="removeTicketBtn absolute inset-y-0 right-2 my-2 px-3 rounded-xl border border-white/10 bg-black/20 hover:bg-red-500/10 text-white/70"
              aria-label="Remove ticket">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function addTicketRow(defaultName = "", defaultPrice = "") {
  if (!ticketsWrap) throw new Error("ticketsWrap not found. Check the element id in HTML.");

  ticketsWrap.insertAdjacentHTML("beforeend", ticketRowTemplate());
  const row = ticketsWrap.lastElementChild;

  const nameEl = row.querySelector(".ticketName");
  const priceEl = row.querySelector(".ticketPrice");
  const removeBtn = row.querySelector(".removeTicketBtn");

  nameEl.value = defaultName;
  priceEl.value = defaultPrice;

  removeBtn.addEventListener("click", () => row.remove());
}

function getTicketsFromUI() {
  const rows = [...ticketsWrap.querySelectorAll(".ticketRow")];

  const tickets = rows.map(r => {
    const name = (r.querySelector(".ticketName")?.value || "").trim();
    const priceStr = r.querySelector(".ticketPrice")?.value;
    const price = priceStr === "" ? null : Number(priceStr);

    return { name, price };
  });

  // Validation: require name + numeric price (allow 0)
  const cleaned = tickets.filter(t =>
    t.name &&
    t.price !== null &&
    !Number.isNaN(t.price) &&
    t.price >= 0
  );

  return cleaned;
}

// --- Flyer preview
flyerInput?.addEventListener("change", () => {
  clearMessages();
  const file = flyerInput.files?.[0];
  if (!file) {
    flyerPreview.classList.add("hidden");
    flyerPlaceholder.classList.remove("hidden");
    flyerPreview.src = "";
    return;
  }

  const url = URL.createObjectURL(file);
  flyerPreview.src = url;
  flyerPreview.classList.remove("hidden");
  flyerPlaceholder.classList.add("hidden");
});

// --- Buttons
addTicketBtn?.addEventListener("click", (e) => {
  e.preventDefault(); // extra safety inside form
  clearMessages();
  addTicketRow("", "0");
});

resetBtn?.addEventListener("click", () => {
  form.reset();
  clearMessages();

  flyerPreview.classList.add("hidden");
  flyerPlaceholder.classList.remove("hidden");
  flyerPreview.src = "";

  ticketsWrap.innerHTML = "";
  addTicketRow("Regular", "0");
});

// --- Submit
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessages();

  saveBtn.disabled = true;
  saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

  try {
    const user = await requireAuthAndShowUser();
    if (!user) return;

    const title = document.getElementById("title").value.trim();
    const venue = document.getElementById("venue").value.trim();
    const city = document.getElementById("city").value.trim();
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value || null;
    const organizer_contact = document.getElementById("organizer_contact").value.trim() || null;
    const notes = document.getElementById("notes").value.trim() || null;

    if (!title) throw new Error("Event title is required.");
    if (!date) throw new Error("Event date is required.");

    const tickets = getTicketsFromUI();
    if (tickets.length === 0) {
      throw new Error("Add at least one ticket with a name and price (0 for free).");
    }

    // Upload flyer (optional)
    let flyer_path = null;
    const flyerFile = flyerInput.files?.[0] || null;

    if (flyerFile) {
      const ext = flyerFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const safe = slugFileName(title).slice(0, 60) || "event";
      const filePath = `events/${safe}-${Date.now()}.${ext}`;

      // Upload API [web:64]
      const { error: upErr } = await supabase
        .storage
        .from(BUCKET)
        .upload(filePath, flyerFile, { upsert: true, contentType: flyerFile.type }); // [web:64]

      if (upErr) throw upErr;
      flyer_path = filePath;
    }

    const payload = {
      title,
      venue: venue || null,
      city: city || null,
      event_date: date,
      event_time: time,
      organizer_contact,
      notes,
      flyer_path,
      tickets,              // JSONB array
      created_by: user.id
    };

    const { error } = await supabase
      .from("events")
      .insert(payload)
      .select(); // return inserted row when chained [web:69]

    if (error) throw error;

    showOk("Event saved successfully.");
    setTimeout(() => window.location.href = "./events.html", 800);
  } catch (err) {
    showError(err?.message || "Failed to save event.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save event`;
  }
});

// --- Init
(async function init() {
  try {
    await requireAuthAndShowUser();
    // Ensure there is at least one ticket row visible on load
    if (ticketsWrap && ticketsWrap.children.length === 0) addTicketRow("Regular", "0");
  } catch (e) {
    // If auth fails, requireAuthAndShowUser redirects; otherwise show error.
    if (e?.message) showError(e.message);
  }
})();
