const API_KEY = "$2y$10$83tRfHskMMReLlAtJiFNeQ5SO7xAxYwgGHIDxhLI4HPW8nRJP15";
let homeHTML = "";
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
let currentHadithForNote = null;

window.onload = function() {
    const display = document.getElementById('display');
    homeHTML = display.innerHTML;
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    loadFonts();
    loadDailyHadith();
    
    const hash = window.location.hash.substring(1);
    if (hash) {
        fetchHadith(decodeURIComponent(hash));
    }
};

function triggerHaptic() {
    if (navigator.vibrate) {
        navigator.vibrate(15); // Slightly longer for iOS feel
    }
}

function updateActiveNav(id) {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
    });
    const activeItem = document.getElementById(id);
    if(activeItem) activeItem.classList.add('active');
    triggerHaptic();
}

function toggleMenu() {
    document.getElementById('sideMenu').classList.toggle('open');
    document.getElementById('menuOverlay').classList.toggle('open');
    triggerHaptic();
}

function goHome() {
    const display = document.getElementById('display');
    display.style.opacity = '0';
    setTimeout(() => {
        display.innerHTML = homeHTML;
        display.style.opacity = '1';
        document.getElementById('headerSearch').classList.add('hidden');
        document.getElementById('loader').classList.add('hidden');
        loadDailyHadith();
        updateActiveNav('navHome');
        history.pushState(null, "", window.location.pathname);
        window.scrollTo({top: 0, behavior: 'smooth'});
    }, 200);
}

function focusSearch() {
    updateActiveNav('navSearch');
    const display = document.getElementById('display');
    if (display.querySelector('.welcome-screen')) {
        document.getElementById('heroInput').focus();
    } else {
        document.getElementById('headerInput').focus();
    }
    triggerHaptic();
}

function saveHistory(query) {
    if (!query) return;
    searchHistory = searchHistory.filter(item => item !== query);
    searchHistory.unshift(query);
    if (searchHistory.length > 5) {
        searchHistory.pop();
    }
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

function showHistory(context) {
    const container = document.getElementById(context + 'History');
    if (!container) return;
    
    if (searchHistory.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    let html = '';
    searchHistory.forEach(term => {
        html += `<div class="history-item" onclick="fetchHadith('${term}')">🕒 ${term}</div>`;
    });
    html += `<div class="clear-history" onclick="clearHistory()">Clear History</div>`;
    container.innerHTML = html;
    container.classList.remove('hidden');
}

function clearHistory() {
    searchHistory = [];
    localStorage.removeItem('searchHistory');
    document.querySelectorAll('.history-dropdown').forEach(el => {
        el.classList.add('hidden');
    });
    triggerHaptic();
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-container') && !e.target.closest('.hero-search')) {
        document.querySelectorAll('.history-dropdown').forEach(el => {
            el.classList.add('hidden');
        });
    }
});

function searchFromHero() {
    const q = document.getElementById('heroInput').value;
    if (q) fetchHadith(q);
}

function searchFromHeader() {
    const q = document.getElementById('headerInput').value;
    if (q) fetchHadith(q);
}

function toggleTheme() {
    const doc = document.documentElement;
    const current = doc.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    
    // Smooth transition for theme change
    document.body.style.transition = "all 0.5s ease";
    doc.setAttribute('data-theme', target);
    localStorage.setItem('theme', target);
    triggerHaptic();
}

function updateFonts() {
    const arabic = document.getElementById('arabicSlider').value;
    const english = document.getElementById('engSlider').value;
    
    document.getElementById('arabicValue').textContent = arabic + 'px';
    document.getElementById('engValue').textContent = english + 'px';
    
    document.querySelectorAll('.arabic').forEach(el => {
        el.style.fontSize = arabic + 'px';
    });
    
    document.querySelectorAll('.trans-text').forEach(el => {
        el.style.fontSize = english + 'px';
    });
    
    localStorage.setItem('arabicSize', arabic);
    localStorage.setItem('engSize', english);
}

function loadFonts() {
    const arabic = localStorage.getItem('arabicSize') || '26';
    const english = localStorage.getItem('engSize') || '17';
    
    const aS = document.getElementById('arabicSlider');
    const eS = document.getElementById('engSlider');
    if(aS) aS.value = arabic;
    if(eS) eS.value = english;
    
    const aV = document.getElementById('arabicValue');
    const eV = document.getElementById('engValue');
    if(aV) aV.textContent = arabic + 'px';
    if(eV) eV.textContent = english + 'px';
    
    document.querySelectorAll('.arabic').forEach(el => {
        el.style.fontSize = arabic + 'px';
    });
    
    document.querySelectorAll('.trans-text').forEach(el => {
        el.style.fontSize = english + 'px';
    });
}

function openNotesModal(hadithNumber) {
    const hadith = favorites.find(f => f.hadithNumber === hadithNumber);
    if (!hadith) return;
    
    currentHadithForNote = hadith;
    const modal = document.getElementById('notesModal');
    const textarea = document.getElementById('notesTextarea');
    
    textarea.value = hadith.note || '';
    modal.classList.remove('hidden');
    setTimeout(() => textarea.focus(), 300);
    triggerHaptic();
}

function closeNotesModal() {
    document.getElementById('notesModal').classList.add('hidden');
    document.getElementById('notesTextarea').value = '';
    currentHadithForNote = null;
    triggerHaptic();
}

function saveNote() {
    if (!currentHadithForNote) return;
    
    const note = document.getElementById('notesTextarea').value.trim();
    const hadithNumber = currentHadithForNote.hadithNumber;
    
    const index = favorites.findIndex(f => f.hadithNumber === hadithNumber);
    if (index !== -1) {
        favorites[index].note = note;
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }
    
    closeNotesModal();
    showToast(note ? "Note saved!" : "Note removed!");
    
    const display = document.getElementById('display');
    if (display.querySelector('.card')) {
        renderFullCard(currentHadithForNote);
    }
}

function isFavorite(id) {
    return favorites.some(f => f.hadithNumber === id);
}

function toggleFavorite(btn, hadithObj) {
    triggerHaptic();
    
    if (isFavorite(hadithObj.hadithNumber)) {
        favorites = favorites.filter(f => f.hadithNumber !== hadithObj.hadithNumber);
        btn.innerHTML = "🤍";
        showToast("Removed from Favorites");
    } else {
        hadithObj.note = "";
        favorites.push(hadithObj);
        btn.innerHTML = "❤️";
        showToast("Saved to Favorites");
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function showFavorites() {
    updateActiveNav('navFav');
    const display = document.getElementById('display');
    
    if (favorites.length === 0) {
        display.innerHTML = `
            <div style="text-align:center; margin-top:50px; animation: slideUpFade 0.5s ease;">
                <div style="font-size:60px; margin-bottom:20px;">📂</div>
                <h3>No Favorites Yet</h3>
                <p style="color:var(--text-secondary);">Your collection is empty.</p>
                <button class="back-home-btn" onclick="goHome()">← Back to Home</button>
            </div>
        `;
        return;
    }
    
    display.innerHTML = `<h3 style="margin-bottom:20px; font-size:24px;">Your Favorites</h3>`;
    
    const container = document.createElement('div');
    container.style.cssText = "border:1px solid var(--border); border-radius:18px; overflow:hidden; background:var(--card); backdrop-filter:blur(10px);";
    
    favorites.forEach((h, index) => {
        const card = document.createElement('div');
        card.className = 'compact-card';
        card.style.animationDelay = (index * 0.05) + 's';
        
        let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, '');
        if (preview.length > 80) preview = preview.substring(0, 80) + "...";
        
        let noteHTML = h.note ? `<div class="compact-note">📝 ${h.note}</div>` : '';
        
        card.innerHTML = `
            <div class="compact-header">
                <span>Sahih Al-Bukhari - ${h.hadithNumber}</span>
                <span>❤️</span>
            </div>
            <div class="compact-preview">${preview}</div>
            ${noteHTML}
        `;
        
        card.onclick = () => {
            display.innerHTML = "";
            renderFullCard(h);
            window.scrollTo({top: 0, behavior: 'smooth'});
        };
        
        container.appendChild(card);
    });
    
    display.appendChild(container);
    
    const btn = document.createElement('button');
    btn.className = "back-home-btn";
    btn.innerText = "← Back to Home";
    btn.onclick = () => goHome();
    display.appendChild(btn);
}

async function shareCard(card) {
    triggerHaptic();
    const watermark = document.createElement('div');
    watermark.className = 'share-watermark';
    watermark.innerHTML = `<div class="share-logo">📖 DeenBase</div><div class="share-url">aftab7xt.github.io/DeenBase</div>`;
    card.appendChild(watermark);
    
    const hideSelectors = ['.fav-btn', '.lang-toggle', '.action-row', '.back-home-btn', '.notes-edit-btn', '.add-notes-btn', '.related-section'];
    hideSelectors.forEach(sel => {
        const el = card.querySelector(sel);
        if(el) el.style.display = 'none';
    });

    try {
        const canvas = await html2canvas(card, {
            scale: 3,
            backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#000000' : '#f2f2f7',
            borderRadius: 20
        });
        const link = document.createElement('a');
        link.download = `hadith-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast("Image Exported");
    } catch (err) {
        showToast("Error saving image");
    }

    hideSelectors.forEach(sel => {
        const el = card.querySelector(sel);
        if(el) el.style.display = '';
    });
    watermark.remove();
}

async function loadRelatedHadiths(currentHadith, container) {
    try {
        const currentNum = parseInt(currentHadith.hadithNumber);
        const relatedNums = [currentNum - 1, currentNum + 1].filter(n => n > 0 && n <= 7563);
        
        const section = document.createElement('div');
        section.className = 'related-section';
        section.innerHTML = '<div class="related-title">More from Bukhari</div>';
        
        for (const num of relatedNums) {
            const url = `https://hadithapi.com/api/hadiths?apiKey=${API_KEY}&book=sahih-bukhari&hadithNumber=${num}`;
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.hadiths && result.hadiths.data[0]) {
                const h = result.hadiths.data[0];
                const card = document.createElement('div');
                card.className = 'related-card';
                let preview = h.hadithEnglish.substring(0, 90) + "...";
                card.innerHTML = `<div class="related-header">Hadith ${h.hadithNumber}</div><div class="related-preview">${preview}</div>`;
                card.onclick = () => fetchHadith(h.hadithNumber.toString());
                section.appendChild(card);
            }
        }
        container.appendChild(section);
    } catch (e) {}
}

async function fetchHadith(query) {
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
    
    const isNumber = !isNaN(query);
    const param = isNumber ? `hadithNumber=${query}` : `paginate=100`;
    
    try {
        const url = `https://hadithapi.com/api/hadiths?apiKey=${API_KEY}&book=sahih-bukhari&${param}`;
        const response = await fetch(url);
        const result = await response.json();
        
        loader.classList.add('hidden');
        
        if (result.hadiths && result.hadiths.data.length > 0) {
            if (isNumber) {
                renderFullCard(result.hadiths.data[0]);
            } else {
                const filtered = result.hadiths.data.filter(h => h.hadithEnglish.toLowerCase().includes(query.toLowerCase()));
                renderCompactList(filtered, query);
            }
            history.pushState({ query: query }, "", "#" + query);
            window.scrollTo({top: 0, behavior: 'smooth'});
        } else {
            display.innerHTML = "<p style='text-align:center;'>No Results Found.</p>";
        }
    } catch (e) {
        loader.classList.add('hidden');
        display.innerHTML = "<p style='text-align:center;'>Error.</p>";
    }
}

function renderCompactList(data, query) {
    const display = document.getElementById('display');
    display.innerHTML = `<div class='results-info'>Search: "${query}"</div>`;
    const container = document.createElement('div');
    container.style.cssText = "border:1px solid var(--border); border-radius:18px; overflow:hidden; background:var(--card);";
    
    data.forEach(h => {
        const card = document.createElement('div');
        card.className = 'compact-card';
        card.innerHTML = `<div class="compact-header"><span>Hadith ${h.hadithNumber}</span><span>➔</span></div><div class="compact-preview">${h.hadithEnglish.substring(0, 100)}...</div>`;
        card.onclick = () => { renderFullCard(h); window.scrollTo(0, 0); };
        container.appendChild(card);
    });
    display.appendChild(container);
    const btn = document.createElement('button');
    btn.className = "back-home-btn"; btn.innerText = "← Back"; btn.onclick = () => goHome();
    display.appendChild(btn);
}

function renderFullCard(h) {
    const display = document.getElementById('display');
    display.innerHTML = "";
    const favIcon = isFavorite(h.hadithNumber) ? "❤️" : "🤍";
    const isFav = isFavorite(h.hadithNumber);
    
    const card = document.createElement('div');
    card.className = 'card';
    const fav = favorites.find(f => f.hadithNumber === h.hadithNumber);
    const hasNote = fav && fav.note;
    
    let notesHTML = isFav ? (hasNote ? 
        `<div class="notes-section"><div class="notes-header"><div class="notes-title">Notes</div><button class="notes-edit-btn" onclick="openNotesModal(${h.hadithNumber})">Edit</button></div><div class="notes-text">${fav.note}</div></div>` : 
        `<button class="add-notes-btn" onclick="openNotesModal(${h.hadithNumber})">📝 Add Notes</button>`) : '';
    
    card.innerHTML = `
        <div class="card-top-actions">
            <div><div class="hadith-header">Sahih Al-Bukhari ${h.hadithNumber}</div><div class="hadith-grade"><span class="grade-badge">Sahih</span></div></div>
            <button class="fav-btn">${favIcon}</button>
        </div>
        <p class="arabic">${h.hadithArabic}</p>
        <div class="lang-toggle"><span class="tab-eng active">English</span><span class="tab-urdu">Urdu</span></div>
        <div class="trans-content"><p class="trans-text content-eng">${h.hadithEnglish}</p><p class="trans-text content-urdu hidden">${h.hadithUrdu}</p></div>
        ${notesHTML}
        <div class="action-row"><button class="copy-btn">📋 Copy</button><button class="share-btn">📸 Share</button></div>
        <button class="back-home-btn">← Home</button>
    `;
    
    const tE = card.querySelector('.tab-eng'), tU = card.querySelector('.tab-urdu'), cE = card.querySelector('.content-eng'), cU = card.querySelector('.content-urdu');
    tE.onclick = () => { tE.classList.add('active'); tU.classList.remove('active'); cE.classList.remove('hidden'); cU.classList.add('hidden'); triggerHaptic(); };
    tU.onclick = () => { tU.classList.add('active'); tE.classList.remove('active'); cU.classList.remove('hidden'); cE.classList.add('hidden'); triggerHaptic(); };
    
    card.querySelector('.copy-btn').onclick = () => { fallbackCopyText(`Bukhari ${h.hadithNumber}\n\n${h.hadithEnglish}`); triggerHaptic(); };
    card.querySelector('.share-btn').onclick = () => shareCard(card);
    card.querySelector('.back-home-btn').onclick = () => goHome();
    card.querySelector('.fav-btn').onclick = (e) => toggleFavorite(e.target, h);
    
    display.appendChild(card);
    loadRelatedHadiths(h, card);
    loadFonts();
}

async function loadDailyHadith() {
    const dailySection = document.getElementById('dailySection');
    const dailyCard = document.getElementById('dailyCard');
    if (!dailySection || !dailyCard) return;
    
    const ids = [1, 9, 13, 16, 33, 47, 50, 600, 6136, 6412];
    const id = ids[new Date().getDate() % ids.length];
    
    try {
        const response = await fetch(`https://hadithapi.com/api/hadiths?apiKey=${API_KEY}&book=sahih-bukhari&hadithNumber=${id}`);
        const result = await response.json();
        if (result.hadiths && result.hadiths.data[0]) {
            const h = result.hadiths.data[0];
            dailyCard.innerHTML = `<div class="daily-quote">"${h.hadithEnglish.substring(0, 140)}..."</div><div class="daily-ref">Bukhari - ${h.hadithNumber}</div>`;
            dailyCard.onclick = () => fetchHadith(h.hadithNumber);
            dailySection.classList.remove('hidden');
        }
    } catch (e) {}
}

function getRandomHadith() { fetchHadith(Math.floor(Math.random() * 7000) + 1); }

function fallbackCopyText(text) {
    const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); showToast("Copied"); } catch (e) {}
    document.body.removeChild(t);
}

function showToast(msg) {
    const t = document.getElementById("toast"); t.innerText = msg; t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2500);
}
