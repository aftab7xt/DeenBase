const API_KEY = "$2y$10$83tRfHskMMReLlAtJiFNeQ5SO7xAxYwgGHIDxhLI4HPW8nRJP15";
const BASE = "https://hadithapi.com/api/hadiths";

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const randomBtn = document.getElementById("randomBtn");
const bookmarksBtn = document.getElementById("bookmarksBtn");
const dailyCard = document.getElementById("dailyCard");
const results = document.getElementById("results");
const overlay = document.getElementById("overlay");

let bookmarks = JSON.parse(localStorage.getItem("bookmarks")) || {};
let cache = JSON.parse(localStorage.getItem("hadithCache")) || {};

function showLoader(v){ overlay.classList.toggle("hidden",!v); }

function spinner(el){
  el.innerHTML="";
  const s=document.createElement("div");
  s.className="ios-spinner";
  for(let i=0;i<12;i++) s.appendChild(document.createElement("div"));
  el.appendChild(s);
}

async function fetchHadith(params){
  if(cache[params]) return cache[params];

  showLoader(true);
  try{
    const res=await fetch(`${BASE}?apiKey=${API_KEY}&book=sahih-bukhari&${params}`);
    const json=await res.json();
    const data=json.hadiths?.data||[];
    cache[params]=data;
    localStorage.setItem("hadithCache",JSON.stringify(cache));
    return data;
  }catch{
    return [];
  }finally{
    showLoader(false);
  }
}

function renderHadith(h){
  const saved = bookmarks[h.hadithNumber];
  return `
  <div class="card">
    <div class="hadith-ar">${h.hadithArabic}</div>
    <div class="hadith-text" data-lang="en">${h.hadithEnglish}</div>
    <div class="hadith-text hidden" data-lang="ur">${h.hadithUrdu}</div>
    <div class="hadith-ref">Sahih Al-Bukhari – ${h.hadithNumber}</div>

    <div class="card-actions">
      <button onclick="toggleLang(this)">Urdu</button>
      <button onclick="toggleBookmark(${h.hadithNumber})">
        ${saved ? "Bookmarked" : "Bookmark"}
      </button>
    </div>
  </div>`;
}

window.toggleLang = btn => {
  const card = btn.closest(".card");
  const en = card.querySelector('[data-lang="en"]');
  const ur = card.querySelector('[data-lang="ur"]');
  const isUr = !ur.classList.contains("hidden");
  en.classList.toggle("hidden", !isUr);
  ur.classList.toggle("hidden", isUr);
  btn.textContent = isUr ? "Urdu" : "English";
};

window.toggleBookmark = num => {
  if(bookmarks[num]) delete bookmarks[num];
  else bookmarks[num]=true;
  localStorage.setItem("bookmarks",JSON.stringify(bookmarks));
  alert("Updated bookmarks");
};

async function loadDaily(){
  spinner(dailyCard);
  const ids=[1,9,13,16,33];
  const id=ids[new Date().getDate()%ids.length];
  const data=await fetchHadith(`hadithNumber=${id}`);
  dailyCard.innerHTML=data.length?renderHadith(data[0]):"Failed to load";
}

searchBtn.onclick = async ()=>{
  const q=searchInput.value.trim();
  if(!q) return;
  const data = isNaN(q)
    ? await fetchHadith(`search=${encodeURIComponent(q)}&paginate=20`)
    : await fetchHadith(`hadithNumber=${q}`);
  results.innerHTML = data.length
    ? data.map(renderHadith).join("")
    : "<p>No results found.</p>";
};

randomBtn.onclick = async ()=>{
  const id=Math.floor(Math.random()*7000)+1;
  const data=await fetchHadith(`hadithNumber=${id}`);
  if(data.length) results.innerHTML=renderHadith(data[0]);
};

bookmarksBtn.onclick = ()=>{
  const nums=Object.keys(bookmarks);
  if(!nums.length){ results.innerHTML="<p>No bookmarks.</p>"; return; }
  Promise.all(nums.map(n=>fetchHadith(`hadithNumber=${n}`)))
    .then(arr=>{
      results.innerHTML=arr.flat().map(renderHadith).join("");
    });
};

loadDaily();
