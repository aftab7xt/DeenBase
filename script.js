const apiKey = "$2y$10$83tRfHskMMReLlAtJiFNeQ5SO7xAxYwgGHIDxhLI4HPW8nRJP15";
let homeHTML = ""; 
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];

// Bukhari has 97 Books. Listed major ones here for Explore.
// You can expand this list later or fetch it dynamically if needed.
const bukhariBooks = [
    { id: 1, title: "Revelation" }, { id: 2, title: "Belief" }, { id: 3, title: "Knowledge" },
    { id: 4, title: "Ablution" }, { id: 5, title: "Bathing (Ghusl)" }, { id: 6, title: "Menstrual Periods" },
    { id: 7, title: "Rubbing hands and feet (Tayammum)" }, { id: 8, title: "Prayers (Salat)" },
    { id: 9, title: "Virtues of Prayer" }, { id: 10, title: "Call to Prayer (Adhan)" },
    { id: 11, title: "Friday Prayer" }, { id: 12, title: "Fear Prayer" },
    { id: 13, title: "Two Eids" }, { id: 14, title: "Witr Prayer" },
    { id: 15, title: "Invoking Allah for Rain" }, { id: 16, title: "Eclipses" },
    { id: 17, title: "Prostration of Quran" }, { id: 18, title: "Shortening Prayers" },
    { id: 19, title: "Night Prayer (Tahajjud)" }, { id: 20, title: "Virtues of Prayer in Makkah/Madinah" },
    { id: 21, title: "Actions while Praying" }, { id: 22, title: "Forgetfulness in Prayer" },
    { id: 23, title: "Funerals (Al-Janaa'iz)" }, { id: 24, title: "Zakat (Charity)" },
    { id: 25, title: "Hajj (Pilgrimage)" }, { id: 26, title: "Umrah" },
    { id: 27, title: "Pilgrims Prevented" }, { id: 28, title: "Penalty of Hunting" },
    { id: 29, title: "Virtues of Madinah" }, { id: 30, title: "Fasting (Saum)" },
    { id: 31, title: "Tarawih Prayers" }, { id: 32, title: "Virtues of the Night of Qadr" },
    { id: 33, title: "Retiring to a Mosque for Remembrance (I'tikaf)" }, { id: 34, title: "Sales and Trade" }
];

window.onload = function() {
    const display = document.getElementById('display');
    homeHTML = display.innerHTML;
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    
    loadFonts();
    loadDailyHadith();
    const hash = window.location.hash.substring(1);
    if(hash) {
        if(hash.startsWith('book-')) {
            // Handle direct link to a book
            const bookId = hash.replace('book-', '');
            // Find title for header (optional, or fetch fresh)
            const book = bukhariBooks.find(b => b.id == bookId);
            fetchHadithsByBook(bookId, book ? book.title : 'Book ' + bookId, false);
        } else {
            fetchHadith(decodeURIComponent(hash));
        }
    }
};

window.onpopstate = function(event) {
    if (event.state) {
        if (event.state.query) fetchHadith(event.state.query, false);
        else if (event.state.bookId) fetchHadithsByBook(event.state.bookId, event.state.bookTitle, false);
        else goHome(false);
    } else {
        goHome(false);
    }
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

// === EXPLORE & BOOKS LOGIC (FIXED) ===
function showExplore() {
    updateActiveNav('navExplore');
    const display = document.getElementById('display');
    
    // Generate Grid of Books
    let booksHTML = "";
    bukhariBooks.forEach(book => {
        booksHTML += `
            <div class="book-card" onclick="fetchHadithsByBook('${book.id}', '${book.title}')">
                <div class="book-number">Book ${book.id}</div>
                <div class="book-title">${book.title}</div>
            </div>
        `;
    });

    display.innerHTML = `
        <div id="exploreScreen">
            <h3 style="margin: 20px 0 15px 0; color:var(--primary); font-family: 'Zalando Sans SemiExpanded', sans-serif;">Browse by Books</h3>
            <div class="books-grid">
                ${booksHTML}
            </div>
            <button class="back-home-btn" onclick="goHome()">← Back to Home</button>
        </div>
    `;
    
    window.scrollTo(0,0);
    triggerHaptic();
}

async function fetchHadithsByBook(bookId, bookTitle, pushHistory = true) {
    const display = document.getElementById('display');
    const loader = document.getElementById('loader');
    const headerSearch = document.getElementById('headerSearch');
    
    display.innerHTML = "";
    loader.classList.remove('hidden');
    headerSearch.classList.remove('hidden'); // Show header search to allow filtering
    
    // NOTE: 'chapter' param in this API corresponds to the Book ID (Kitab)
    const url = `https://hadithapi.com/api/hadiths?apiKey=${apiKey}&book=sahih-bukhari&chapter=${bookId}&paginate=300`; // Limit to 300 for performance

    try {
        const response = await fetch(url);
        const result = await response.json();
        loader.classList.add('hidden');

        if (result.hadiths && result.hadiths.data.length > 0) {
            renderBookContents(result.hadiths.data, bookTitle);
            
            if(pushHistory) {
                history.pushState({bookId: bookId, bookTitle: bookTitle}, "", "#book-" + bookId);
            }
        } else {
            display.innerHTML = "<p style='text-align:center; margin-top:20px;'>No Hadiths found in this book.</p>";
        }
    } catch (e) {
        loader.classList.add('hidden');
        display.innerHTML = "<p style='text-align:center; margin-top:20px;'>Connection Error.</p>";
    }
}

function renderBookContents(data, title) {
    const display = document.getElementById('display');
    
    // Book Header
    const headerHtml = `
        <div style="margin-bottom:20px; padding: 0 5px;">
            <div style="font-size:12px; color:var(--secondary-text); text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">Book of</div>
            <h2 style="margin:0; color:var(--primary); font-family:'Zalando Sans SemiExpanded', sans-serif; font-size: 22px;">${title}</h2>
            <div style="font-size:13px; opacity:0.7; margin-top:5px;">${data.length} Hadiths</div>
        </div>
    `;

    const listContainer = document.createElement('div');
    listContainer.style.cssText = "border-radius:20px; overflow:hidden; border:1px solid var(--border); box-shadow:var(--shadow);";

    data.forEach(h => {
        const item = document.createElement('div');
        item.className = 'compact-card';
        let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, ''); 
        if(preview.length > 100) preview = preview.substring(0, 100) + "...";
        
        item.innerHTML = `
            <div class="compact-header">
                <span>Hadith ${h.hadithNumber}</span>
                <span style="opacity:0.5;">➔</span>
            </div>
            <div class="compact-preview">${preview}</div>
        `;
        item.onclick = () => { display.innerHTML=""; renderFullCard(h); window.scrollTo(0,0); };
        listContainer.appendChild(item);
    });

    display.innerHTML = headerHtml;
    display.appendChild(listContainer);
    
    const btn = document.createElement('button');
    btn.className = "back-home-btn";
    btn.innerText = "← Back to Books";
    btn.onclick = () => showExplore();
    display.appendChild(btn);
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
    if (!e.target.closest('.search-container') && !e.target.closest('.hero-search-container')) {
        document.querySelectorAll('.history-dropdown').forEach(el => el.classList.add('hidden'));
    }
});

// === SEARCH LOGIC ===
function focusSearch() {
    const heroInput = document.getElementById('heroInput');
    const headerSearch = document.getElementById('headerSearch');

    if (document.body.contains(heroInput)) {
        heroInput.focus();
        window.scrollTo(0, 0);
    } else if (!headerSearch.classList.contains('hidden')) {
        document.getElementById('headerInput').focus();
    } else {
        goHome();
        setTimeout(() => {
            const newHero = document.getElementById('heroInput');
            if(newHero) { newHero.focus(); window.scrollTo(0, 0); }
        }, 50);
    }
    updateActiveNav('navSearch');
    triggerHaptic();
}

function searchFromHero() { const q = document.getElementById('heroInput').value; if(q) fetchHadith(q); }
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

// === FAVORITES SYSTEM ===
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
