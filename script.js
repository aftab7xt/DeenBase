const API_KEY = "$2y$10$83tRfHskMMReLlAtJiFNeQ5SO7xAxYwgGHIDxhLI4HPW8nRJP15";
let homeHTML = "";
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];

window.onload = function() {
    homeHTML = document.getElementById('display').innerHTML;
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    loadDailyHadith();
};

function triggerHaptic() { if (navigator.vibrate) navigator.vibrate(10); }

function updateActiveNav(id) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    triggerHaptic();
}

function goHome() {
    const display = document.getElementById('display');
    display.innerHTML = homeHTML;
    document.getElementById('headerSearch').classList.add('hidden');
    document.getElementById('loader').classList.add('hidden');
    loadDailyHadith();
    updateActiveNav('navHome');
    window.scrollTo(0, 0);
}

function focusSearch() {
    const heroInput = document.getElementById('heroInput');
    if (heroInput) {
        heroInput.focus();
    } else {
        document.getElementById('headerSearch').classList.remove('hidden');
        document.getElementById('headerInput').focus();
    }
    updateActiveNav('navSearch');
}

async function fetchHadith(query) {
    if(!query) return;
    triggerHaptic();
    const display = document.getElementById('display');
    const loader = document.getElementById('loader');
    
    loader.classList.remove('hidden');
    document.getElementById('headerSearch').classList.remove('hidden');
    document.getElementById('headerInput').value = query;

    try {
        const isNum = !isNaN(query);
        const url = `https://hadithapi.com/api/hadiths?apiKey=${API_KEY}&book=sahih-bukhari&${isNum ? 'hadithNumber=' + query : 'paginate=50'}`;
        const response = await fetch(url);
        const result = await response.json();
        
        loader.classList.add('hidden');
        if (result.hadiths && result.hadiths.data.length > 0) {
            if (isNum) {
                renderFullCard(result.hadiths.data[0]);
            } else {
                const filtered = result.hadiths.data.filter(h => h.hadithEnglish.toLowerCase().includes(query.toLowerCase()));
                renderCompactList(filtered, query);
            }
        } else {
            display.innerHTML = "<p style='text-align:center; padding:40px;'>No results found.</p>";
        }
    } catch (e) {
        loader.classList.add('hidden');
        display.innerHTML = "<p style='text-align:center; padding:40px;'>Connection error.</p>";
    }
}

function renderFullCard(h) {
    const display = document.getElementById('display');
    const isFav = favorites.some(f => f.hadithNumber === h.hadithNumber);
    
    display.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:15px;">
                <div>
                    <h3 style="color:var(--primary);">Sahih Al-Bukhari - ${h.hadithNumber}</h3>
                    <small>Grade: Sahih</small>
                </div>
                <button onclick="toggleFav(this, ${h.hadithNumber})" style="background:none; border:none; font-size:24px; cursor:pointer;">
                    ${isFav ? '❤️' : '🤍'}
                </button>
            </div>
            <p class="arabic">${h.hadithArabic}</p>
            <p class="trans-text">${h.hadithEnglish}</p>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="search-wrapper" style="flex:1; justify-content:center; background:var(--primary); color:white; border:none;" onclick="goHome()">Back Home</button>
            </div>
        </div>
    `;
}

function renderCompactList(data, query) {
    const display = document.getElementById('display');
    display.innerHTML = `<h4 style="margin-bottom:15px;">Results for "${query}"</h4>`;
    data.forEach(h => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.padding = '15px';
        div.style.cursor = 'pointer';
        div.innerHTML = `<strong>Hadith ${h.hadithNumber}</strong><p style="font-size:14px; color:var(--text-secondary);">${h.hadithEnglish.substring(0, 100)}...</p>`;
        div.onclick = () => renderFullCard(h);
        display.appendChild(div);
    });
}

async function loadDailyHadith() {
    const dailyCard = document.getElementById('dailyCard');
    if (!dailyCard) return;
    try {
        const id = [1, 10, 50, 100][new Date().getDate() % 4];
        const res = await fetch(`https://hadithapi.com/api/hadiths?apiKey=${API_KEY}&book=sahih-bukhari&hadithNumber=${id}`);
        const data = await res.json();
        const h = data.hadiths.data[0];
        dailyCard.innerHTML = `<i>"${h.hadithEnglish.substring(0, 120)}..."</i><br><br><strong>- Hadith ${h.hadithNumber}</strong>`;
        dailyCard.onclick = () => renderFullCard(h);
    } catch (e) { dailyCard.innerHTML = "Welcome to DeenBase"; }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('theme', target);
    triggerHaptic();
}

function getRandomHadith() { fetchHadith(Math.floor(Math.random() * 7000) + 1); }
