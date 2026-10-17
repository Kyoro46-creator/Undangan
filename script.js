
const SUPABASE_URL = "https://ldjfupxunudonkftptab.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DXJvuYp0J_CL3qo6ier34Q_FZ0NJlsy";

let weddingDate = null;
let countdownTimer = null;

function updateCountdown() {
  const ids = ["days", "hours", "minutes", "seconds"];
  const elements = Object.fromEntries(
    ids.map(id => [id, document.getElementById(id)])
  );

  if (!weddingDate) {
    for (const element of Object.values(elements)) {
      if (element) element.textContent = "--";
    }
    return;
  }

  const distance = Math.max(0, weddingDate - Date.now());

  const values = {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((distance / (1000 * 60)) % 60),
    seconds: Math.floor((distance / 1000) % 60)
  };

  for (const [id, value] of Object.entries(values)) {
    if (elements[id]) {
      elements[id].textContent = String(value).padStart(2, "0");
    }
  }
}

function setWeddingDate(dateString) {
  if (countdownTimer) clearInterval(countdownTimer);

  const parsedDate = dateString ? new Date(dateString).getTime() : NaN;
  weddingDate = Number.isFinite(parsedDate) ? parsedDate : null;

  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
}

updateCountdown();

const cover = document.getElementById("cover");
const music = document.getElementById("weddingMusic");
const openButton = document.getElementById("openInvitation");
const musicToggle = document.getElementById("musicToggle");

openButton?.addEventListener("click", () => {
  if (!cover || cover.classList.contains("is-opening")) return;

  cover.classList.add("is-opening");

  // Tunggu tirai selesai bergerak sebelum menyembunyikan sampul.
  window.setTimeout(() => {
    cover.classList.add("is-hidden");
  }, 1400);
});
musicToggle?.addEventListener("click", async () => {
  if (!music) return;
  if (music.paused) {
    try {
      await music.play();
      musicToggle.innerHTML = "♫ <span>Musik aktif</span>";
    } catch {
      musicToggle.innerHTML = "♫ <span>Musik belum tersedia</span>";
    }
  } else {
    music.pause();
    musicToggle.innerHTML = "♫ <span>Putar musik</span>";
  }
});

function isSupabaseConfigured() {
  return SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("GANTI_DENGAN") &&
    SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_") &&
    !SUPABASE_PUBLISHABLE_KEY.includes("GANTI_DENGAN");
}

function setFormNote(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.setAttribute("aria-live", "polite");
  element.style.color = isError ? "#a12626" : "";
}

async function insertPublicRow(table, row) {
  if (!isSupabaseConfigured()) {
    throw new Error("Konfigurasi Supabase belum diisi. Hubungi pengelola undangan.");
  }

  const response = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      Prefer: "return=minimal"
    },
    body: JSON.stringify(row)
  });

  if (!response.ok) {
    // Do not show raw server details to guests.
    throw new Error("Data belum berhasil disimpan. Silakan coba lagi beberapa saat.");
  }
}

async function getInvitationId() {
  if (!isSupabaseConfigured()) {
    throw new Error("Konfigurasi Supabase belum diisi.");
  }

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("invitation");
  if (!slug) {
    throw new Error("Kode undangan tidak ditemukan di URL.");
  }

  const response = await fetch(
    `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/rpc/get_public_invitation_id`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      },
      body: JSON.stringify({ p_slug: slug })
    }
  );

  if (!response.ok) {
    throw new Error("Gagal memeriksa kode undangan.");
  }

  const invitationId = await response.json();
  if (!invitationId) {
    throw new Error("Undangan tidak ditemukan atau tidak aktif.");
  }

  return invitationId;
}

// RSVP: menyimpan konfirmasi dan menghubungkannya ke undangan yang sedang dibuka.
document.getElementById("rsvpForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const note = document.getElementById("formNote");
  const button = form.querySelector('button[type="submit"]');
  const data = new FormData(form);

  const guestName = String(data.get("name") || "").trim();
  const attendance = String(data.get("attendance") || "").trim();
  const guestCount = Number.parseInt(String(data.get("guests") || "1"), 10);
  const message = String(data.get("message") || "").trim();

  if (!guestName || guestName.length > 80 ||
      !["Hadir", "Tidak hadir"].includes(attendance) ||
      !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 4 ||
      message.length > 500) {
    setFormNote(note, "Periksa kembali isian formulir, lalu coba lagi.", true);
    return;
  }

  if (button) button.disabled = true;
  setFormNote(note, "Mengirim konfirmasi...", false);

  try {
    const invitationId = await getInvitationId();
    await insertPublicRow("rsvps", {
      invitation_id: invitationId,
      guest_name: guestName,
      attendance,
      guest_count: guestCount,
      message: message || null
    });

    form.reset();
    setFormNote(note, "Terima kasih! Konfirmasi kehadiran Anda berhasil dikirim.", false);
  } catch (error) {
    setFormNote(note, error.message || "Konfirmasi belum berhasil dikirim.", true);
  } finally {
    if (button) button.disabled = false;
  }
});

// Guestbook: menyimpan ucapan dan menghubungkannya ke undangan yang sedang dibuka.
// Template ini tidak membaca atau menampilkan entri buku tamu secara publik.
document.getElementById("guestbookForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const note = document.getElementById("guestbookNote");
  const button = form.querySelector('button[type="submit"]');
  const data = new FormData(form);

  const guestName = String(data.get("name") || "").trim();
  const message = String(data.get("message") || "").trim();

  if (!guestName || guestName.length > 80 || !message || message.length > 500) {
    setFormNote(note, "Nama wajib diisi dan ucapan maksimal 500 karakter.", true);
    return;
  }

  if (button) button.disabled = true;
  setFormNote(note, "Mengirim ucapan...", false);

  try {
    const invitationId = await getInvitationId();
    await insertPublicRow("guestbook", {
      invitation_id: invitationId,
      guest_name: guestName,
      message
    });

    form.reset();
    setFormNote(note, "Terima kasih! Ucapan dan doa Anda berhasil dikirim.", false);
  } catch (error) {
    setFormNote(note, error.message || "Ucapan belum berhasil dikirim.", true);
  } finally {
    if (button) button.disabled = false;
  }
});
async function loadInvitationNames() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("invitation");

  if (!slug) return;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_public_invitation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({ p_slug: slug })
      }
    );

    if (!response.ok) {
      throw new Error("Gagal mengambil data undangan");
    }

    const invitation = await response.json();
    setWeddingDate(invitation?.wedding_date);
    if (!invitation || !invitation.couple_names) return;

    const names = invitation.couple_names;
    const parts = names.split(/\s*&\s*|\s+dan\s+/i);
    const bride = (parts[0] || names).trim();
    const groom = (parts[1] || "").trim();

    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    setText("coverNames", names);
    setText("photoCaption", `${names} · 2026`);
    setText("brideName", bride);
    setText("groomName", groom);
    setText("brideInitial", bride.charAt(0).toUpperCase());
    setText("groomInitial", groom.charAt(0).toUpperCase());
    setText("footerNames", names);
    document.title = `Undangan Pernikahan | ${names}`;
  } catch (error) {
    console.error("Gagal memuat nama undangan:", error);
  }
}

loadInvitationNames();

/* ===== AKTIFKAN ANIMASI SCROLL ===== */

(() => {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reduceMotion) return;

  const revealGroups = [
    {
      selector: ".hero-copy",
      animation: "reveal-from-left"
    },
    {
      selector: ".hero-photo",
      animation: "reveal-from-right"
    },
    {
      selector: ".intro > .eyebrow, .intro > h2, .intro > .body-copy",
      animation: "reveal-on-scroll"
    },
    {
      selector: ".person",
      animation: "reveal-on-scroll"
    },
    {
      selector: ".ampersand",
      animation: "reveal-on-scroll"
    },
    {
      selector: ".event-inner > *",
      animation: "reveal-on-scroll"
    },
    {
      selector: ".event-card",
      animation: "reveal-on-scroll"
    },
    {
      selector: ".gallery-section > *",
      animation: "reveal-on-scroll"
    },
    {
      selector: ".gallery-grid img",
      animation: "reveal-on-scroll"
    },
    {
      selector: ".video-box",
      animation: "reveal-on-scroll"
    },
    {
      selector: ".rsvp-inner > *",
      animation: "reveal-on-scroll"
    },
    {
      selector: "footer > *",
      animation: "reveal-on-scroll"
    }
  ];

  const elements = new Set();

  revealGroups.forEach(group => {
    document.querySelectorAll(group.selector).forEach(element => {
      element.classList.add(...group.animation.split(" "));
      elements.add(element);
    });
  });

  if (!("IntersectionObserver" in window)) {
    elements.forEach(element => {
      element.classList.add("is-visible");
    });
    return;
  }

  const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
    } else {
      // Sembunyikan kembali ketika keluar dari layar,
      // agar animasi dapat berjalan lagi saat digulir kembali.
      entry.target.classList.remove("is-visible");
    }
  });
}, {
  threshold: 0.12,
  rootMargin: "0px 0px -35px 0px"
});

elements.forEach(element => observer.observe(element));
})();


