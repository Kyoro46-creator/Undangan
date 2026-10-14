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

// Form ini belum menyimpan data. Pada tahap berikutnya, hubungkan ke Supabase
// atau layanan backend yang aman sebelum dipakai untuk undangan sungguhan.
document.getElementById("rsvpForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const note = document.getElementById("formNote");
  if (note) {
    note.textContent = "Formulir demo berfungsi, tetapi data belum dikirim atau disimpan. Hubungkan ke database sebelum dipublikasikan untuk tamu.";
  }
});
