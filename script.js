// Konfigurasi Supabase untuk website undangan.
// Ganti kedua nilai di bawah dengan Project URL dan Publishable key milik proyek Nanda's Company.
// Gunakan publishable key (sb_publishable_...), JANGAN gunakan secret/service_role key.
const SUPABASE_URL = "https://ldjfupxunudonkftptab.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DXJvuYp0J_CL3qo6ier34Q_FZ0NJlsy";

// Ubah tanggal acara di bawah ini sesuai tanggal pernikahan.
const weddingDate = new Date("2026-12-20T08:00:00+07:00").getTime();

function updateCountdown() {
  const distance = weddingDate - Date.now();
  const safeDistance = Math.max(0, distance);
  const values = {
    days: Math.floor(safeDistance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((safeDistance / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((safeDistance / (1000 * 60)) % 60),
    seconds: Math.floor((safeDistance / 1000) % 60)
  };
  for (const [id, value] of Object.entries(values)) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value).padStart(2, "0");
  }
}
updateCountdown();
setInterval(updateCountdown, 1000);

const cover = document.getElementById("cover");
const music = document.getElementById("weddingMusic");
const openButton = document.getElementById("openInvitation");
const musicToggle = document.getElementById("musicToggle");

openButton?.addEventListener("click", async () => {
  cover?.classList.add("is-hidden");
  try {
    await music?.play();
    if (musicToggle) musicToggle.innerHTML = "♫ <span>Musik aktif</span>";
  } catch {
    // Musik bisa gagal jika file belum tersedia; undangan tetap terbuka.
  }
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
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(row)
  });

  if (!response.ok) {
    // Do not show raw server details to guests.
    throw new Error("Data belum berhasil disimpan. Silakan coba lagi beberapa saat.");
  }
}
async function getInvitationId() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("invitation");

  if (!slug) {
    throw new Error("Kode undangan tidak ditemukan di URL.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/get_public_invitation_id`,
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
// RSVP: maps HTML form fields to the rsvps table column names.
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
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("invitation");

    if (!slug) {
      throw new Error("Kode undangan tidak ditemukan di URL.");
    }
    
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
  
    setFormNote(note, "Terima kasih! Konfirmasi kehadiran Anda berhasil dikirim.");
  } catch (error) {
    setFormNote(note, error.message || "Konfirmasi belum berhasil dikirim.", true);
  } finally {
    if (button) button.disabled = false;
  }
});

// Guestbook: stores each guest message in the separate guestbook table.
// This template intentionally does not read/display guestbook rows publicly.
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
  setFormNote(note, "Mengirim ucapan...");
  try {
    await insertPublicRow("guestbook", {
      guest_name: guestName,
      message
    });
    form.reset();
    setFormNote(note, "Terima kasih! Ucapan dan doa Anda berhasil dikirim.");
  } catch (error) {
    setFormNote(note, error.message || "Ucapan belum berhasil dikirim.", true);
  } finally {
    if (button) button.disabled = false;
  }
});
