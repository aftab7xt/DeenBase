const apiKey = "$2y$10$83tRfHskMMReLlAtJiFNeQ5SO7xAxYwgGHIDxhLI4HPW8nRJP15";
let homeHTML = ""; 
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];

window.onload = function() {
    const display = document.getElementById('display');
    homeHTML = display.innerHTML;
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    
    loadFonts();
    loadDailyHadith();
    const hash = window.location.hash.substring(1);
    if(hash) fetchHadith(decodeURIComponent(hash));
};

window.onpopstate = function(event) {
    if (event.state && event.state.query) fetchHadith(event.state.query, false);
    else goHome(false);
};

// === HAPTIC & NAV ===
function triggerHaptic() { if (navigator.vibrate) navigator.vibrate(10); }
function updateActiveNav(id) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    triggerHaptic();
}

// === MENU TOGGLE ===
function toggleMenu() {
    document.getElementById('sideMenu').classList.toggle('open');
    document.getElementById('menuOverlay').classList.toggle('open');
    triggerHaptic();
    updateActiveNav('navMenu');
}

function goHome(pushHistory = true) {
    const display = document.getElementById('display');
    display.innerHTML = homeHTML;
    document.getElementById('headerSearch').classList.add('hidden');
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('headerInput').value = "";
    loadDailyHadith(); 
    updateActiveNav('navHome');
    if(pushHistory) history.pushState(null, "", window.location.pathname);
    triggerHaptic();
    window.scrollTo(0,0);
}

// === ACTIVATE SEARCH FROM NAV ===
function activateSearchMode() {
    updateActiveNav('navSearch');
    const headerSearch = document.getElementById('headerSearch');
    const headerInput = document.getElementById('headerInput');
    
    // Ensure header search is visible
    headerSearch.classList.remove('hidden');
    headerInput.focus();
    triggerHaptic();
}

// === SEARCH HISTORY ===
function saveHistory(query) {
    if(!query) return;
    searchHistory = searchHistory.filter(item => item !== query);
    searchHistory.unshift(query);
    if(searchHistory.length > 5) searchHistory.pop();
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}
function showHistory(context) {
    const container = document.getElementById(context + 'History');
    if(!container) return;
    if(searchHistory.length === 0) { container.classList.add('hidden'); return; }
    let html = '';
    searchHistory.forEach(term => html += `<div class="history-item" onclick="fetchHadith('${term}')"><span class="history-icon">🕒</span> ${term}</div>`);
    html += `<div class="clear-history" onclick="clearHistory()">Clear History</div>`;
    container.innerHTML = html;
    container.classList.remove('hidden');
}
function clearHistory() {
    searchHistory = [];
    localStorage.removeItem('searchHistory');
    document.querySelectorAll('.history-dropdown').forEach(el => el.classList.add('hidden'));
    triggerHaptic();
}
document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-container')) {
        document.querySelectorAll('.history-dropdown').forEach(el => el.classList.add('hidden'));
    }
});

function searchFromHeader() { const q = document.getElementById('headerInput').value; if(q) fetchHadith(q); }

// === SETTINGS ===
function toggleTheme() {
    const doc = document.documentElement;
    const target = doc.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    doc.setAttribute('data-theme', target);
    localStorage.setItem('theme', target);
    triggerHaptic();
}
function updateFonts() {
    const a = document.getElementById('arabicSlider').value;
    const e = document.getElementById('engSlider').value;
    document.documentElement.style.setProperty('--arabic-sz', a + 'px');
    document.documentElement.style.setProperty('--trans-sz', e + 'px');
    localStorage.setItem('arabicSize', a);
    localStorage.setItem('engSize', e);
}
function loadFonts() {
    const a = localStorage.getItem('arabicSize');
    const e = localStorage.getItem('engSize');
    if(a) { document.documentElement.style.setProperty('--arabic-sz', a + 'px'); document.getElementById('arabicSlider').value = a; }
    if(e) { document.documentElement.style.setProperty('--trans-sz', e + 'px'); document.getElementById('engSlider').value = e; }
}

// === FAVORITES ===
function isFavorite(id) { return favorites.some(f => f.hadithNumber === id); }
function toggleFavorite(btn, hadithObj) {
    triggerHaptic();
    if (isFavorite(hadithObj.hadithNumber)) {
        favorites = favorites.filter(f => f.hadithNumber !== hadithObj.hadithNumber);
        btn.innerHTML = "🤍"; 
        showToast("Removed from Favorites");
    } else {
        favorites.push(hadithObj);
        btn.innerHTML = "❤️"; 
        showToast("Saved to Favorites");
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
}
function showFavorites() {
    updateActiveNav('navFav');
    const display = document.getElementById('display');
    if(favorites.length === 0) {
        display.innerHTML = `<div style="text-align:center; margin-top:50px;"><h3>No Favorites Yet</h3><p>Tap the heart icon on any Hadith to save it here.</p><button class="back-home-btn" onclick="goHome()" style="text-align:center;">← Back to Home</button></div>`;
        return;
    }
    display.innerHTML = `<h3 style="margin-bottom:20px; color:var(--primary);">Your Favorites (${favorites.length})</h3>`;
    const listContainer = document.createElement('div');
    favorites.forEach(h => {
        const item = document.createElement('div');
        item.className = 'compact-card';
        let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, ''); 
        if(preview.length > 80) preview = preview.substring(0, 80) + "...";
        item.innerHTML = `<div class="compact-header"><span class="compact-id">#${h.hadithNumber}</span><span style="font-size:12px;">❤️</span></div><div class="compact-preview">${preview}</div>`;
        item.onclick = () => { display.innerHTML=""; renderFullCard(h); window.scrollTo(0,0); };
        listContainer.appendChild(item);
    });
    display.appendChild(listContainer);
    const btn = document.createElement('button');
    btn.className = "back-home-btn";
    btn.innerText = "← Back to Home";
    btn.onclick = () => goHome();
    display.appendChild(btn);
}

// === SHARE & RENDER ===
async function shareCard(card) {
    triggerHaptic();
    const btns = card.querySelectorAll('button');
    const watermark = document.createElement('div');
    watermark.className = 'watermark';
    watermark.innerText = "Read at aftab7xt.github.io/DeenBase/";
    card.appendChild(watermark);
    watermark.style.display = 'block';
    btns.forEach(b => b.style.display = 'none');
    try {
        const bgColor = getComputedStyle(document.body).getPropertyValue('--card-bg');
        const canvas = await html2canvas(card, { backgroundColor: bgColor, scale: 2 });
        const link = document.createElement('a');
        link.download = 'deenbase-share.png';
        link.href = canvas.toDataURL();
        link.click();
    } catch(err) { alert("Could not create image"); }
    btns.forEach(b => b.style.display = 'block');
    watermark.remove();
}

async function fetchHadith(query, pushHistory = true) {
    saveHistory(query);
    triggerHaptic();
    const display = document.getElementById('display');
    const loader = document.getElementById('loader');
    const headerSearch = document.getElementById('headerSearch');
    const headerInput = document.getElementById('headerInput');
    display.innerHTML = ""; 
    loader.classList.remove('hidden'); 
    headerSearch.classList.remove('hidden'); // Ensure search is visible on results page
    headerInput.value = query; 
    document.querySelectorAll('.history-dropdown').forEach(el => el.classList.add('hidden'));
    
    const isNumber = !isNaN(query);
    const param = isNumber ? `hadithNumber=${query}` : `paginate=200`;
    
    try {
        const url = `https://hadithapi.com/api/hadiths?apiKey=${apiKey}&book=sahih-bukhari&${param}`;
        const response = await fetch(url);
        const result = await response.json();
        loader.classList.add('hidden');
        if (result.hadiths && result.hadiths.data.length > 0) {
            if (isNumber) renderFullCard(result.hadiths.data[0]);
            else {
                const lower = query.toLowerCase();
                const filtered = result.hadiths.data.filter(h => h.hadithEnglish.toLowerCase().includes(lower));
                if (filtered.length > 0) renderCompactList(filtered, query);
                else display.innerHTML = "<p style='text-align:center; margin-top:20px; color:var(--text);'>No matches found.</p>";
            }
            if(pushHistory) history.pushState({query: query}, "", "#" + query);
        } else { display.innerHTML = "<p style='text-align:center; margin-top:20px; color:var(--text);'>No Hadiths found.</p>"; }
    } catch (e) { loader.classList.add('hidden'); display.innerHTML = "<p style='text-align:center; margin-top:20px; color:var(--text);'>Connection Error.</p>"; }
}

function renderCompactList(data, query) {
    const display = document.getElementById('display');
    display.innerHTML = `<div class='results-info'>Found ${data.length} results for "${query}"</div>`;
    const list = document.createElement('div');
    data.forEach(h => {
        const item = document.createElement('div');
        item.className = 'compact-card';
        let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, ''); 
        if(preview.length > 120) preview = preview.substring(0, 120) + "...";
        item.innerHTML = `<div class="compact-header"><span class="compact-id">#${h.hadithNumber}</span><span style="font-size:12px; opacity:0.5;">➔</span></div><div class="compact-preview">${preview}</div>`;
        item.onclick = () => { display.innerHTML=""; renderFullCard(h); window.scrollTo(0,0); };
        list.appendChild(item);
    });
    display.appendChild(list);
    const btn = document.createElement('button');
    btn.className = "back-home-btn";
    btn.innerText = "← Back to Home";
    btn.onclick = () => goHome();
    display.appendChild(btn);
}

function renderFullCard(h) {
    const display = document.getElementById('display');
    const shareText = `Sahih Bukhari ${h.hadithNumber}\n\n${h.hadithEnglish}`;
    const grade = h.status ? h.status : "Sahih"; 
    const favIcon = isFavorite(h.hadithNumber) ? "❤️" : "🤍";
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="card-top-actions">
            <div><div class="hadith-header">Sahih Al-Bukhari - ${h.hadithNumber}</div><div class="hadith-grade">Grade: <span class="grade-badge">${grade}</span></div></div>
            <button class="fav-btn">${favIcon}</button>
        </div>
        <p class="arabic">${h.hadithArabic}</p>
        <div class="lang-toggle"><span class="tab-eng active">English</span><span class="tab-urdu">Urdu</span></div>
        <div class="trans-content"><p class="trans-text content-eng">${h.hadithEnglish}</p><p class="trans-text content-urdu hidden urdu-font" style="direction:rtl; text-align:right;">${h.hadithUrdu}</p></div>
        <div class="action-row"><button class="copy-btn">📋 Copy</button><button class="share-btn">📸 Share Image</button></div>
        <button class="back-home-btn">← Back to Home</button>
    `;
    const tabEng = card.querySelector('.tab-eng'); const tabUrdu = card.querySelector('.tab-urdu');
    const contentEng = card.querySelector('.content-eng'); const contentUrdu = card.querySelector('.content-urdu');
    tabEng.onclick = () => { tabEng.classList.add('active'); tabUrdu.classList.remove('active'); contentEng.classList.remove('hidden'); contentUrdu.classList.add('hidden'); triggerHaptic(); };
    tabUrdu.onclick = () => { tabUrdu.classList.add('active'); tabEng.classList.remove('active'); contentUrdu.classList.remove('hidden'); contentEng.classList.add('hidden'); triggerHaptic(); };
    card.querySelector('.copy-btn').onclick = () => { fallbackCopyText(shareText); triggerHaptic(); };
    card.querySelector('.share-btn').onclick = () => shareCard(card);
    card.querySelector('.back-home-btn').onclick = () => { goHome(); triggerHaptic(); };
    card.querySelector('.fav-btn').onclick = (e) => toggleFavorite(e.target, h);
    display.appendChild(card);
}

async function loadDailyHadith() {
    const dailySection = document.getElementById('dailySection');
    const dailyCard = document.getElementById('dailyCard');
    if(!dailySection || !dailyCard) return;
    dailySection.classList.remove('hidden');
    const shortHadithIDs = [1, 9, 13, 16, 33, 47, 50, 600, 6136, 6412];
    const today = new Date().getDate();
    const idToLoad = shortHadithIDs[today % shortHadithIDs.length];
    try {
        const url = `https://hadithapi.com/api/hadiths?apiKey=${apiKey}&book=sahih-bukhari&hadithNumber=${idToLoad}`;
        const response = await fetch(url);
        const result = await response.json();
        if (result.hadiths && result.hadiths.data.length > 0) {
            const h = result.hadiths.data[0];
            let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, ''); 
            if(preview.length > 150) preview = preview.substring(0, 150) + "...";
            dailyCard.innerHTML = `<div class="daily-quote">"${preview}"</div><div class="daily-ref">Sahih Al-Bukhari - ${h.hadithNumber}</div>`;
            dailyCard.onclick = () => fetchHadith(h.hadithNumber);
        }
    } catch (e) { dailyCard.innerHTML = "Failed to load."; }
}

function getRandomHadith() { fetchHadith(Math.floor(Math.random() * 7000) + 1); }
function fallbackCopyText(text) {
    const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); showToast("Copied!"); } catch (err) { alert('Unable to copy'); }
    document.body.removeChild(textArea);
}
function showToast(msg) {
    const toast = document.getElementById("toast"); toast.innerText = msg || "Copied to Clipboard!"; toast.className = "show";
    setTimeout(() => { toast.className = ""; }, 3000);
}        const item = document.createElement('div');
        item.className = 'compact-card';
        let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, ''); 
        if(preview.length > 80) preview = preview.substring(0, 80) + "...";
        item.innerHTML = `<div class="compact-header"><span>Sahih Al-Bukhari - ${h.hadithNumber}</span><span>❤️</span></div><div class="compact-preview">${preview}</div>`;
        item.onclick = () => { display.innerHTML=""; renderFullCard(h); window.scrollTo(0,0); };
        listContainer.appendChild(item);
    });
    display.appendChild(listContainer);
    const btn = document.createElement('button');
    btn.className = "back-home-btn";
    btn.innerText = "← Back to Home";
    btn.onclick = () => goHome();
    display.appendChild(btn);
}

// === SHARE & RENDER ===
async function shareCard(card) {
    triggerHaptic();
    const btns = card.querySelectorAll('button');
    const watermark = document.createElement('div');
    watermark.className = 'watermark';
    watermark.innerText = "Read at aftab7xt.github.io/DeenBase/";
    card.appendChild(watermark);
    watermark.style.display = 'block';
    btns.forEach(b => b.style.display = 'none');
    try {
        const bgColor = getComputedStyle(document.body).getPropertyValue('--card-bg');
        const canvas = await html2canvas(card, { backgroundColor: bgColor, scale: 2 });
        const link = document.createElement('a');
        link.download = 'deenbase-share.png';
        link.href = canvas.toDataURL();
        link.click();
    } catch(err) { alert("Could not create image"); }
    btns.forEach(b => b.style.display = 'block');
    watermark.remove();
}

async function fetchHadith(query, pushHistory = true) {
    saveHistory(query);
    triggerHaptic();
    const display = document.getElementById('display');
    const loader = document.getElementById('loader');
    const headerSearch = document.getElementById('headerSearch');
    const headerInput = document.getElementById('headerInput');
    display.innerHTML = ""; 
    loader.classList.remove('hidden'); 
    headerSearch.classList.remove('hidden'); 
    headerInput.value = query; 
    document.querySelectorAll('.history-dropdown').forEach(el => el.classList.add('hidden'));
    
    const isNumber = !isNaN(query);
    const param = isNumber ? `hadithNumber=${query}` : `paginate=200`;
    
    try {
        const url = `https://hadithapi.com/api/hadiths?apiKey=${apiKey}&book=sahih-bukhari&${param}`;
        const response = await fetch(url);
        const result = await response.json();
        loader.classList.add('hidden');
        if (result.hadiths && result.hadiths.data.length > 0) {
            if (isNumber) renderFullCard(result.hadiths.data[0]);
            else {
                const lower = query.toLowerCase();
                const filtered = result.hadiths.data.filter(h => h.hadithEnglish.toLowerCase().includes(lower));
                if (filtered.length > 0) renderCompactList(filtered, query);
                else display.innerHTML = "<p style='text-align:center; margin-top:20px; color:var(--text);'>No matches found.</p>";
            }
            if(pushHistory) history.pushState({query: query}, "", "#" + query);
        } else { display.innerHTML = "<p style='text-align:center; margin-top:20px; color:var(--text);'>No Hadiths found.</p>"; }
    } catch (e) { loader.classList.add('hidden'); display.innerHTML = "<p style='text-align:center; margin-top:20px; color:var(--text);'>Connection Error.</p>"; }
}

function renderCompactList(data, query) {
    const display = document.getElementById('display');
    display.innerHTML = `<div class='results-info'>Found ${data.length} results for "${query}"</div>`;
    const list = document.createElement('div');
    data.forEach(h => {
        const item = document.createElement('div');
        item.className = 'compact-card';
        let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, ''); 
        if(preview.length > 120) preview = preview.substring(0, 120) + "...";
        item.innerHTML = `<div class="compact-header"><span class="compact-id">#${h.hadithNumber}</span><span style="font-size:12px; opacity:0.5;">➔</span></div><div class="compact-preview">${preview}</div>`;
        item.onclick = () => { display.innerHTML=""; renderFullCard(h); window.scrollTo(0,0); };
        list.appendChild(item);
    });
    display.appendChild(list);
    const btn = document.createElement('button');
    btn.className = "back-home-btn";
    btn.innerText = "← Back to Home";
    btn.onclick = () => goHome();
    display.appendChild(btn);
}

function renderFullCard(h) {
    const display = document.getElementById('display');
    const shareText = `Sahih Bukhari ${h.hadithNumber}\n\n${h.hadithEnglish}`;
    const grade = h.status ? h.status : "Sahih"; 
    const favIcon = isFavorite(h.hadithNumber) ? "❤️" : "🤍";
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="card-top-actions">
            <div><div class="hadith-header">Sahih Al-Bukhari - ${h.hadithNumber}</div><div class="hadith-grade">Grade: <span class="grade-badge">${grade}</span></div></div>
            <button class="fav-btn">${favIcon}</button>
        </div>
        <p class="arabic">${h.hadithArabic}</p>
        <div class="lang-toggle"><span class="tab-eng active">English</span><span class="tab-urdu">Urdu</span></div>
        <div class="trans-content"><p class="trans-text content-eng">${h.hadithEnglish}</p><p class="trans-text content-urdu hidden urdu-font" style="direction:rtl; text-align:right;">${h.hadithUrdu}</p></div>
        <div class="action-row"><button class="copy-btn">📋 Copy</button><button class="share-btn">📸 Share Image</button></div>
        <button class="back-home-btn">← Back to Home</button>
    `;
    const tabEng = card.querySelector('.tab-eng'); const tabUrdu = card.querySelector('.tab-urdu');
    const contentEng = card.querySelector('.content-eng'); const contentUrdu = card.querySelector('.content-urdu');
    tabEng.onclick = () => { tabEng.classList.add('active'); tabUrdu.classList.remove('active'); contentEng.classList.remove('hidden'); contentUrdu.classList.add('hidden'); triggerHaptic(); };
    tabUrdu.onclick = () => { tabUrdu.classList.add('active'); tabEng.classList.remove('active'); contentUrdu.classList.remove('hidden'); contentEng.classList.add('hidden'); triggerHaptic(); };
    card.querySelector('.copy-btn').onclick = () => { fallbackCopyText(shareText); triggerHaptic(); };
    card.querySelector('.share-btn').onclick = () => shareCard(card);
    card.querySelector('.back-home-btn').onclick = () => { goHome(); triggerHaptic(); };
    card.querySelector('.fav-btn').onclick = (e) => toggleFavorite(e.target, h);
    display.appendChild(card);
}

async function loadDailyHadith() {
    const dailySection = document.getElementById('dailySection');
    const dailyCard = document.getElementById('dailyCard');
    if(!dailySection || !dailyCard) return;
    dailySection.classList.remove('hidden');
    const shortHadithIDs = [1, 9, 13, 16, 33, 47, 50, 600, 6136, 6412];
    const today = new Date().getDate();
    const idToLoad = shortHadithIDs[today % shortHadithIDs.length];
    try {
        const url = `https://hadithapi.com/api/hadiths?apiKey=${apiKey}&book=sahih-bukhari&hadithNumber=${idToLoad}`;
        const response = await fetch(url);
        const result = await response.json();
        if (result.hadiths && result.hadiths.data.length > 0) {
            const h = result.hadiths.data[0];
            let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, ''); 
            if(preview.length > 150) preview = preview.substring(0, 150) + "...";
            dailyCard.innerHTML = `<div class="daily-quote">"${preview}"</div><div class="daily-ref">Sahih Al-Bukhari - ${h.hadithNumber}</div>`;
            dailyCard.onclick = () => fetchHadith(h.hadithNumber);
        }
    } catch (e) { dailyCard.innerHTML = "Failed to load."; }
}

function getRandomHadith() { fetchHadith(Math.floor(Math.random() * 7000) + 1); }
function fallbackCopyText(text) {
    const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); showToast("Copied!"); } catch (err) { alert('Unable to copy'); }
    document.body.removeChild(textArea);
}
function showToast(msg) {
    const toast = document.getElementById("toast"); toast.innerText = msg || "Copied to Clipboard!"; toast.className = "show";
    setTimeout(() => { toast.className = ""; }, 3000);
}    }
    display.innerHTML = `<h3 style="margin-bottom:20px; color:var(--text);">Your Favorites (${favorites.length})</h3>`;
    const listContainer = document.createElement('div');
    favorites.forEach(h => {
        const item = document.createElement('div');
        item.className = 'compact-card';
        let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, ''); 
        if(preview.length > 80) preview = preview.substring(0, 80) + "...";
        item.innerHTML = `<div class="compact-header"><span class="compact-id">#${h.hadithNumber}</span><span style="font-size:12px;">❤️</span></div><div class="compact-preview">${preview}</div>`;
        item.onclick = () => { display.innerHTML=""; renderFullCard(h); window.scrollTo(0,0); };
        listContainer.appendChild(item);
    });
    display.appendChild(listContainer);
    const btn = document.createElement('button');
    btn.className = "back-home-btn";
    btn.innerText = "← Back to Home";
    btn.onclick = () => goHome();
    display.appendChild(btn);
}

// === SHARE & RENDER ===
async function shareCard(card) {
    triggerHaptic();
    const btns = card.querySelectorAll('button');
    const watermark = document.createElement('div');
    watermark.className = 'watermark';
    watermark.innerText = "Read at aftab7xt.github.io/DeenBase/";
    card.appendChild(watermark);
    watermark.style.display = 'block';
    btns.forEach(b => b.style.display = 'none');
    try {
        const bgColor = getComputedStyle(document.body).getPropertyValue('--card-bg');
        const canvas = await html2canvas(card, { backgroundColor: bgColor, scale: 2 });
        const link = document.createElement('a');
        link.download = 'deenbase-share.png';
        link.href = canvas.toDataURL();
        link.click();
    } catch(err) { alert("Could not create image"); }
    btns.forEach(b => b.style.display = 'block');
    watermark.remove();
}

async function fetchHadith(query, pushHistory = true) {
    saveHistory(query);
    triggerHaptic();
    const display = document.getElementById('display');
    const loader = document.getElementById('loader');
    const headerSearch = document.getElementById('headerSearch');
    const headerInput = document.getElementById('headerInput');
    display.innerHTML = ""; 
    loader.classList.remove('hidden'); 
    headerSearch.classList.remove('hidden'); 
    headerInput.value = query; 
    document.querySelectorAll('.history-dropdown').forEach(el => el.classList.add('hidden'));
    
    const isNumber = !isNaN(query);
    const param = isNumber ? `hadithNumber=${query}` : `paginate=200`;
    
    try {
        const url = `https://hadithapi.com/api/hadiths?apiKey=${apiKey}&book=sahih-bukhari&${param}`;
        const response = await fetch(url);
        const result = await response.json();
        loader.classList.add('hidden');
        if (result.hadiths && result.hadiths.data.length > 0) {
            if (isNumber) renderFullCard(result.hadiths.data[0]);
            else {
                const lower = query.toLowerCase();
                const filtered = result.hadiths.data.filter(h => h.hadithEnglish.toLowerCase().includes(lower));
                if (filtered.length > 0) renderCompactList(filtered, query);
                else display.innerHTML = "<p style='text-align:center; margin-top:20px; color:var(--text);'>No matches found.</p>";
            }
            if(pushHistory) history.pushState({query: query}, "", "#" + query);
        } else { display.innerHTML = "<p style='text-align:center; margin-top:20px; color:var(--text);'>No Hadiths found.</p>"; }
    } catch (e) { loader.classList.add('hidden'); display.innerHTML = "<p style='text-align:center; margin-top:20px; color:var(--text);'>Connection Error.</p>"; }
}

function renderCompactList(data, query) {
    const display = document.getElementById('display');
    display.innerHTML = `<div class='results-info'>Found ${data.length} results for "${query}"</div>`;
    const list = document.createElement('div');
    data.forEach(h => {
        const item = document.createElement('div');
        item.className = 'compact-card';
        let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, ''); 
        if(preview.length > 120) preview = preview.substring(0, 120) + "...";
        item.innerHTML = `<div class="compact-header"><span class="compact-id">#${h.hadithNumber}</span><span style="font-size:12px; opacity:0.5;">➔</span></div><div class="compact-preview">${preview}</div>`;
        item.onclick = () => { display.innerHTML=""; renderFullCard(h); window.scrollTo(0,0); };
        list.appendChild(item);
    });
    display.appendChild(list);
    const btn = document.createElement('button');
    btn.className = "back-home-btn";
    btn.innerText = "← Back to Home";
    btn.onclick = () => goHome();
    display.appendChild(btn);
}

function renderFullCard(h) {
    const display = document.getElementById('display');
    const shareText = `Sahih Bukhari ${h.hadithNumber}\n\n${h.hadithEnglish}`;
    const grade = h.status ? h.status : "Sahih"; 
    const favIcon = isFavorite(h.hadithNumber) ? "❤️" : "🤍";
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="card-top-actions">
            <div><div class="hadith-header">Sahih Al-Bukhari - ${h.hadithNumber}</div><div class="hadith-grade">Grade: <span class="grade-badge">${grade}</span></div></div>
            <button class="fav-btn">${favIcon}</button>
        </div>
        <p class="arabic">${h.hadithArabic}</p>
        <div class="lang-toggle"><span class="tab-eng active">English</span><span class="tab-urdu">Urdu</span></div>
        <div class="trans-content"><p class="trans-text content-eng">${h.hadithEnglish}</p><p class="trans-text content-urdu hidden urdu-font" style="direction:rtl; text-align:right;">${h.hadithUrdu}</p></div>
        <div class="action-row"><button class="copy-btn">📋 Copy</button><button class="share-btn">📸 Share Image</button></div>
        <button class="back-home-btn">← Back to Home</button>
    `;
    const tabEng = card.querySelector('.tab-eng'); const tabUrdu = card.querySelector('.tab-urdu');
    const contentEng = card.querySelector('.content-eng'); const contentUrdu = card.querySelector('.content-urdu');
    tabEng.onclick = () => { tabEng.classList.add('active'); tabUrdu.classList.remove('active'); contentEng.classList.remove('hidden'); contentUrdu.classList.add('hidden'); triggerHaptic(); };
    tabUrdu.onclick = () => { tabUrdu.classList.add('active'); tabEng.classList.remove('active'); contentUrdu.classList.remove('hidden'); contentEng.classList.add('hidden'); triggerHaptic(); };
    card.querySelector('.copy-btn').onclick = () => { fallbackCopyText(shareText); triggerHaptic(); };
    card.querySelector('.share-btn').onclick = () => shareCard(card);
    card.querySelector('.back-home-btn').onclick = () => { goHome(); triggerHaptic(); };
    card.querySelector('.fav-btn').onclick = (e) => toggleFavorite(e.target, h);
    display.appendChild(card);
}

async function loadDailyHadith() {
    const dailySection = document.getElementById('dailySection');
    const dailyCard = document.getElementById('dailyCard');
    if(!dailySection || !dailyCard) return;
    dailySection.classList.remove('hidden');
    const shortHadithIDs = [1, 9, 13, 16, 33, 47, 50, 600, 6136, 6412];
    const today = new Date().getDate();
    const idToLoad = shortHadithIDs[today % shortHadithIDs.length];
    try {
        const url = `https://hadithapi.com/api/hadiths?apiKey=${apiKey}&book=sahih-bukhari&hadithNumber=${idToLoad}`;
        const response = await fetch(url);
        const result = await response.json();
        if (result.hadiths && result.hadiths.data.length > 0) {
            const h = result.hadiths.data[0];
            let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, ''); 
            if(preview.length > 150) preview = preview.substring(0, 150) + "...";
            dailyCard.innerHTML = `<div class="daily-quote">"${preview}"</div><div class="daily-ref">Sahih Al-Bukhari - ${h.hadithNumber}</div>`;
            dailyCard.onclick = () => fetchHadith(h.hadithNumber);
        }
    } catch (e) { dailyCard.innerHTML = "Failed to load."; }
}

function getRandomHadith() { fetchHadith(Math.floor(Math.random() * 7000) + 1); }
function fallbackCopyText(text) {
    const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); showToast("Copied!"); } catch (err) { alert('Unable to copy'); }
    document.body.removeChild(textArea);
}
function showToast(msg) {
    const toast = document.getElementById("toast"); toast.innerText = msg || "Copied to Clipboard!"; toast.className = "show";
    setTimeout(() => { toast.className = ""; }, 3000);
}        showToast("Removed from Favorites");
    } else {
        favorites.push(hadithObj);
        btn.innerHTML = "❤️"; 
        showToast("Saved to Favorites");
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
}
function showFavorites() {
    updateActiveNav('navFav');
    const display = document.getElementById('display');
    if(favorites.length === 0) {
        display.innerHTML = `<div style="text-align:center; margin-top:50px;"><h3>No Favorites Yet</h3><p>Tap the heart icon on any Hadith to save it here.</p><button class="back-home-btn" onclick="goHome()" style="text-align:center;">← Back to Home</button></div>`;
        return;
    }
    display.innerHTML = `<h3 style="margin-bottom:20px; color:var(--primary);">Your Favorites (${favorites.length})</h3>`;
    const listContainer = document.createElement('div');
    listContainer.style.cssText = "border-radius:20px; overflow:hidden; border:1px solid var(--border); box-shadow:var(--shadow);";
    favorites.forEach(h => {
        const item = document.createElement('div');
        item.className = 'compact-card';
        let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, ''); 
        if(preview.length > 80) preview = preview.substring(0, 80) + "...";
        item.innerHTML = `<div class="compact-header"><span>Sahih Al-Bukhari - ${h.hadithNumber}</span><span>❤️</span></div><div class="compact-preview">${preview}</div>`;
        item.onclick = () => { display.innerHTML=""; renderFullCard(h); window.scrollTo(0,0); };
        listContainer.appendChild(item);
    });
    display.appendChild(listContainer);
    const btn = document.createElement('button');
    btn.className = "back-home-btn";
    btn.innerText = "← Back to Home";
    btn.onclick = () => goHome();
    display.appendChild(btn);
}

// === SHARE AS IMAGE ===
async function shareCard(card) {
    triggerHaptic();
    const btns = card.querySelectorAll('button');
    const watermark = document.createElement('div');
    watermark.className = 'watermark';
    watermark.innerText = "Read at aftab7xt.github.io/DeenBase/";
    card.appendChild(watermark);
    watermark.style.display = 'block';
    btns.forEach(b => b.style.display = 'none');
    try {
        const bgColor = getComputedStyle(document.body).getPropertyValue('--card-bg');
        const canvas = await html2canvas(card, { backgroundColor: bgColor, scale: 2 });
        const link = document.createElement('a');
        link.download = 'deenbase-share.png';
        link.href = canvas.toDataURL();
        link.click();
    } catch(err) { alert("Could not create image"); }
    btns.forEach(b => b.style.display = 'block');
    watermark.remove();
}

async function fetchHadith(query, pushHistory = true) {
    saveHistory(query);
    triggerHaptic();
    const display = document.getElementById('display');
    const loader = document.getElementById('loader');
    const headerSearch = document.getElementById('headerSearch');
    const headerInput = document.getElementById('headerInput');
    display.innerHTML = ""; 
    loader.classList.remove('hidden'); 
    headerSearch.classList.remove('hidden'); 
    headerInput.value = query; 
    document.querySelectorAll('.history-dropdown').forEach(el => el.classList.add('hidden'));
    
    const isNumber = !isNaN(query);
    const param = isNumber ? `hadithNumber=${query}` : `paginate=200`;
    
    try {
        const url = `https://hadithapi.com/api/hadiths?apiKey=${apiKey}&book=sahih-bukhari&${param}`;
        const response = await fetch(url);
        const result = await response.json();
        loader.classList.add('hidden');
        if (result.hadiths && result.hadiths.data.length > 0) {
            if (isNumber) renderFullCard(result.hadiths.data[0]);
            else {
                const lower = query.toLowerCase();
                const filtered = result.hadiths.data.filter(h => h.hadithEnglish.toLowerCase().includes(lower));
                if (filtered.length > 0) renderCompactList(filtered, query);
                else display.innerHTML = "<p style='text-align:center; margin-top:20px;'>No matches found.</p>";
            }
            if(pushHistory) history.pushState({query: query}, "", "#" + query);
        } else { display.innerHTML = "<p style='text-align:center; margin-top:20px;'>No Hadiths found.</p>"; }
    } catch (e) { loader.classList.add('hidden'); display.innerHTML = "<p style='text-align:center; margin-top:20px;'>Connection Error.</p>"; }
}

function renderCompactList(data, query) {
    const display = document.getElementById('display');
    display.innerHTML = `<div class='results-info'>Found ${data.length} results for "${query}"</div>`;
    const list = document.createElement('div');
    list.style.cssText = "border-radius:20px; overflow:hidden; border:1px solid var(--border); box-shadow:var(--shadow);";
    data.forEach(h => {
        const item = document.createElement('div');
        item.className = 'compact-card';
        let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, ''); 
        if(preview.length > 120) preview = preview.substring(0, 120) + "...";
        item.innerHTML = `<div class="compact-header"><span>Sahih Al-Bukhari - ${h.hadithNumber}</span><span>➔</span></div><div class="compact-preview">${preview}</div>`;
        item.onclick = () => { display.innerHTML=""; renderFullCard(h); window.scrollTo(0,0); };
        list.appendChild(item);
    });
    display.appendChild(list);
    const btn = document.createElement('button');
    btn.className = "back-home-btn";
    btn.innerText = "← Back to Home";
    btn.onclick = () => goHome();
    display.appendChild(btn);
}

function renderFullCard(h) {
    const display = document.getElementById('display');
    const shareText = `Sahih Bukhari ${h.hadithNumber}\n\n${h.hadithEnglish}`;
    const grade = h.status ? h.status : "Sahih"; 
    const favIcon = isFavorite(h.hadithNumber) ? "❤️" : "🤍";
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="card-top-actions">
            <div><div class="hadith-header">Sahih Al-Bukhari - ${h.hadithNumber}</div><div class="hadith-grade">Grade: <span class="grade-badge">${grade}</span></div></div>
            <button class="fav-btn">${favIcon}</button>
        </div>
        <p class="arabic">${h.hadithArabic}</p>
        <div class="lang-toggle"><span class="tab-eng active">English</span><span class="tab-urdu">Urdu</span></div>
        <div class="trans-content"><p class="trans-text content-eng">${h.hadithEnglish}</p><p class="trans-text content-urdu hidden urdu-font" style="direction:rtl; text-align:right;">${h.hadithUrdu}</p></div>
        <div class="action-row"><button class="copy-btn">📋 Copy</button><button class="share-btn">📸 Share Image</button></div>
        <button class="back-home-btn">← Back to Home</button>
    `;
    const tabEng = card.querySelector('.tab-eng'); const tabUrdu = card.querySelector('.tab-urdu');
    const contentEng = card.querySelector('.content-eng'); const contentUrdu = card.querySelector('.content-urdu');
    tabEng.onclick = () => { tabEng.classList.add('active'); tabUrdu.classList.remove('active'); contentEng.classList.remove('hidden'); contentUrdu.classList.add('hidden'); triggerHaptic(); };
    tabUrdu.onclick = () => { tabUrdu.classList.add('active'); tabEng.classList.remove('active'); contentUrdu.classList.remove('hidden'); contentEng.classList.add('hidden'); triggerHaptic(); };
    card.querySelector('.copy-btn').onclick = () => { fallbackCopyText(shareText); triggerHaptic(); };
    card.querySelector('.share-btn').onclick = () => shareCard(card);
    card.querySelector('.back-home-btn').onclick = () => { goHome(); triggerHaptic(); };
    card.querySelector('.fav-btn').onclick = (e) => toggleFavorite(e.target, h);
    display.appendChild(card);
}

async function loadDailyHadith() {
    const dailySection = document.getElementById('dailySection');
    const dailyCard = document.getElementById('dailyCard');
    if(!dailySection || !dailyCard) return;
    dailySection.classList.remove('hidden');
    const shortHadithIDs = [1, 9, 13, 16, 33, 47, 50, 600, 6136, 6412];
    const today = new Date().getDate();
    const idToLoad = shortHadithIDs[today % shortHadithIDs.length];
    try {
        const url = `https://hadithapi.com/api/hadiths?apiKey=${apiKey}&book=sahih-bukhari&hadithNumber=${idToLoad}`;
        const response = await fetch(url);
        const result = await response.json();
        if (result.hadiths && result.hadiths.data.length > 0) {
            const h = result.hadiths.data[0];
            let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, ''); 
            if(preview.length > 150) preview = preview.substring(0, 150) + "...";
            dailyCard.innerHTML = `<div class="daily-quote">"${preview}"</div><div class="daily-ref">Sahih Al-Bukhari - ${h.hadithNumber}</div>`;
            dailyCard.onclick = () => fetchHadith(h.hadithNumber);
        }
    } catch (e) { dailyCard.innerHTML = "Failed to load."; }
}

function getRandomHadith() { fetchHadith(Math.floor(Math.random() * 7000) + 1); }
function fallbackCopyText(text) {
    const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); showToast("Copied!"); } catch (err) { alert('Unable to copy'); }
    document.body.removeChild(textArea);
}
function showToast(msg) {
    const toast = document.getElementById("toast"); toast.innerText = msg || "Copied to Clipboard!"; toast.className = "show";
    setTimeout(() => { toast.className = ""; }, 3000);
}
