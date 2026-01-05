const API_KEY = "$2y$10$83tRfHskMMReLlAtJiFNeQ5SO7xAxYwgGHIDxhLI4HPW8nRJP15";
const BASE_URL = "https://hadithapi.com/api/hadiths";

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const randomBtn = document.getElementById("randomBtn");
const dailyCard = document.getElementById("dailyCard");
const results = document.getElementById("results");
const overlay = document.getElementById("overlay");

function showLoader(show) {
  overlay.classList.toggle("hidden", !show);
}

function createSpinner(container) {
  container.innerHTML = "";
  const s = document.createElement("div");
  s.className = "ios-spinner";
  for (let i = 0; i < 12; i++) s.appendChild(document.createElement("div"));
  container.appendChild(s);
}

async function fetchHadith(params) {
  showLoader(true);
  try {
    const res = await fetch(`${BASE_URL}?apiKey=${API_KEY}&book=sahih-bukhari&${params}`);
    const data = await res.json();
    return data.hadiths?.data || [];
  } catch {
    return [];
  } finally {
    showLoader(false);
  }
}

function renderHadith(h) {
  return `
    <div class="card">
      <div class="hadith-ar">${h.hadithArabic}</div>
      <div class="hadith-en">${h.hadithEnglish}</div>
      <div class="hadith-ref">Sahih Al-Bukhari – ${h.hadithNumber}</div>
    </div>
  `;
}

async function loadDaily() {
  createSpinner(dailyCard);
  const ids = [1, 9, 13, 16, 33];
  const id = ids[new Date().getDate() % ids.length];
  const data = await fetchHadith(`hadithNumber=${id}`);
  dailyCard.innerHTML = data.length ? renderHadith(data[0]) : "Failed to load.";
}

searchBtn.onclick = async () => {
  const q = searchInput.value.trim();
  if (!q) return;
  results.innerHTML = "";
  const data = isNaN(q)
    ? await fetchHadith(`search=${encodeURIComponent(q)}&paginate=20`)
    : await fetchHadith(`hadithNumber=${q}`);

  results.innerHTML = data.length
    ? data.map(renderHadith).join("")
    : "<p style='color:#94a3b8'>No results found.</p>";
};

randomBtn.onclick = async () => {
  const id = Math.floor(Math.random() * 7000) + 1;
  const data = await fetchHadith(`hadithNumber=${id}`);
  if (data.length) {
    results.innerHTML = renderHadith(data[0]);
  }
};

loadDaily();
