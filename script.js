document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    
    // Search Elements
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    // [CRITICAL FIX] Updated ID to match your new HTML
    const readerView = document.getElementById('view-reader'); 
    
    const readerContent = document.getElementById('reader-content');
    const backBtn = document.getElementById('back-to-results');
    const loader = document.getElementById('loader');

    // Home Elements
    const hotdContainer = document.getElementById('hotd-container');
    const dateBadge = document.getElementById('hero-date'); // Updated for Home Redesign

    // Library Elements
    const segments = document.querySelectorAll('.segment');
    const libraryTabs = document.querySelectorAll('.library-tab');
    const historyList = document.getElementById('history-list');
    const bookmarksList = document.getElementById('bookmarks-list');
    const historyEmpty = document.getElementById('history-empty');
    const bookmarksEmpty = document.getElementById('bookmarks-empty');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // Settings Elements
    const settingsOverlay = document.getElementById('settings-overlay');
    const closeSettingsBtn = document.getElementById('close-settings');
    const themeToggle = document.getElementById('theme-toggle');
    const themeLabel = document.getElementById('theme-label');
    const sliderArabic = document.getElementById('fs-arabic');
    const sliderEnglish = document.getElementById('fs-english');

    // --- Config & Storage Keys ---
    const RAW_API_KEY = '$2y$10$83tRfHskMMReLlAtJiFNeQ5SO7xAxYwgGHIDxhLI4HPW8nRJP15';
    const API_KEY = encodeURIComponent(RAW_API_KEY);
    const BASE_URL = 'https://hadithapi.com/api/hadiths';
    
    const HOTD_IDS = [1, 7, 13, 27, 42, 58, 9, 3, 52]; 
    const KEY_HOTD = 'deenbase_hotd_data';
    const KEY_DATE = 'deenbase_hotd_date';
    const KEY_HISTORY = 'deenbase_history';
    const KEY_BOOKMARKS = 'deenbase_bookmarks';
    const KEY_SETTINGS = 'deenbase_settings';

    // --- STATE ---
    let userSettings = { theme: 'dark', fsArabic: 1.6, fsEnglish: 1.0 };
    let lastActiveViewId = 'view-home'; 

    // --- INIT ---
    loadSettings();
    initHadithOfTheDay();
    setupNavigation();
    setupSearch();
    setupLibrary();
    setupSettingsEvents();

    // --- 1. SETTINGS LOGIC ---
    function loadSettings() {
        const stored = localStorage.getItem(KEY_SETTINGS);
        if (stored) userSettings = JSON.parse(stored);
        applySettings();
        sliderArabic.value = userSettings.fsArabic;
        sliderEnglish.value = userSettings.fsEnglish;
    }

    function applySettings() {
        if (userSettings.theme === 'light') {
            document.body.classList.add('light-theme');
            themeLabel.textContent = "Light Mode";
            themeToggle.querySelector('span').textContent = 'light_mode';
        } else {
            document.body.classList.remove('light-theme');
            themeLabel.textContent = "Dark Mode";
            themeToggle.querySelector('span').textContent = 'dark_mode';
        }
        document.documentElement.style.setProperty('--fs-arabic', userSettings.fsArabic + 'rem');
        document.documentElement.style.setProperty('--fs-english', userSettings.fsEnglish + 'rem');
    }

    function saveSettings() {
        localStorage.setItem(KEY_SETTINGS, JSON.stringify(userSettings));
    }

    function setupSettingsEvents() {
        const settingsBtn = document.getElementById('settings-nav-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                settingsOverlay.classList.remove('hidden');
            });
        }
        closeSettingsBtn.addEventListener('click', () => settingsOverlay.classList.add('hidden'));
        settingsOverlay.addEventListener('click', (e) => {
            if (e.target === settingsOverlay) settingsOverlay.classList.add('hidden');
        });

        themeToggle.addEventListener('click', () => {
            userSettings.theme = userSettings.theme === 'dark' ? 'light' : 'dark';
            applySettings();
            saveSettings();
        });

        sliderArabic.addEventListener('input', (e) => {
            userSettings.fsArabic = e.target.value;
            applySettings();
            saveSettings();
        });
        sliderEnglish.addEventListener('input', (e) => {
            userSettings.fsEnglish = e.target.value;
            applySettings();
            saveSettings();
        });
    }

    // --- 2. NAVIGATION ---
    function setupNavigation() {
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const clickedBtn = e.target.closest('.nav-item');
                const targetId = clickedBtn.getAttribute('data-target');

                if (targetId) {
                    lastActiveViewId = targetId;
                    navItems.forEach(nav => nav.classList.remove('active'));
                    clickedBtn.classList.add('active');

                    views.forEach(view => view.classList.remove('active-view'));
                    document.getElementById(targetId)?.classList.add('active-view');
                    
                    if(targetId === 'view-library') {
                        renderHistory(); renderBookmarks();
                    }
                }
            });
        });
    }

    // --- 3. LIBRARY ---
    function setupLibrary() {
        segments.forEach(seg => {
            seg.addEventListener('click', () => {
                segments.forEach(s => s.classList.remove('active'));
                seg.classList.add('active');
                libraryTabs.forEach(t => t.classList.remove('active-tab'));
                document.getElementById(`tab-${seg.dataset.tab}`).classList.add('active-tab');
            });
        });
        clearHistoryBtn.addEventListener('click', () => {
            localStorage.removeItem(KEY_HISTORY);
            renderHistory();
        });
    }

    // --- 4. STORAGE HELPERS ---
    function getStoredData(key) {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
    }
    function isBookmarked(hadithNumber) {
        return getStoredData(KEY_BOOKMARKS).some(b => b.hadithNumber == hadithNumber);
    }
    function toggleBookmark(hadith) {
        let bookmarks = getStoredData(KEY_BOOKMARKS);
        const index = bookmarks.findIndex(b => b.hadithNumber == hadith.hadithNumber);
        if (index === -1) bookmarks.unshift(hadith);
        else bookmarks.splice(index, 1);
        localStorage.setItem(KEY_BOOKMARKS, JSON.stringify(bookmarks));
        renderBookmarks();
        return index === -1;
    }
    function addToHistory(hadith) {
        let history = getStoredData(KEY_HISTORY);
        history = history.filter(h => h.hadithNumber != hadith.hadithNumber);
        history.unshift(hadith);
        if (history.length > 50) history.pop();
        localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
    }

    // --- 5. RENDERERS ---
    function renderHistory() {
        const history = getStoredData(KEY_HISTORY);
        if (history.length === 0) {
            historyList.innerHTML = ''; historyEmpty.classList.remove('hidden');
        } else {
            historyEmpty.classList.add('hidden');
            historyList.innerHTML = generateListHTML(history, 'history');
            attachListListeners('history', history);
        }
    }
    function renderBookmarks() {
        const bookmarks = getStoredData(KEY_BOOKMARKS);
        if (bookmarks.length === 0) {
            bookmarksList.innerHTML = ''; bookmarksEmpty.classList.remove('hidden');
        } else {
            bookmarksEmpty.classList.add('hidden');
            bookmarksList.innerHTML = generateListHTML(bookmarks, 'bookmark');
            attachListListeners('bookmark', bookmarks);
        }
    }
    function generateListHTML(list, type) {
        let html = '';
        list.forEach((hadith, index) => {
            const cleanText = (hadith.hadithEnglish || "").replace(/<[^>]*>?/gm, '');
            const preview = cleanText.substring(0, 60) + '...';
            const icon = type === 'history' ? 'history' : 'bookmark';
            html += `
                <div class="result-item ${type}-item" data-index="${index}">
                    <div class="result-ref">Bukhari ${hadith.hadithNumber}</div>
                    <div class="result-preview">${preview}</div>
                    <span class="material-icons-round cache-badge">${icon}</span>
                </div>
            `;
        });
        return html;
    }
    function attachListListeners(type, data) {
        document.querySelectorAll(`.${type}-item`).forEach(item => {
            item.addEventListener('click', () => {
                openReader(data[item.getAttribute('data-index')]);
            });
        });
    }

    // --- 6. HOME & HOTD ---
    async function initHadithOfTheDay() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date().toLocaleDateString('en-US', options);
        
        const dateEl = document.getElementById('hero-date'); 
        if(dateEl) dateEl.textContent = today;

        const storedDate = localStorage.getItem(KEY_DATE);
        const storedData = localStorage.getItem(KEY_HOTD);

        if (storedDate === today && storedData) {
            renderHOTD(JSON.parse(storedData));
        } else {
            const randomId = HOTD_IDS[Math.floor(Math.random() * HOTD_IDS.length)];
            await fetchAndCacheHOTD(randomId, today);
        }
    }

    async function fetchAndCacheHOTD(id, date) {
        try {
            const url = `${BASE_URL}?apiKey=${API_KEY}&book=sahih-bukhari&hadithNumber=${id}`;
            const res = await fetch(url);
            if(!res.ok) throw new Error("Err");
            const data = await res.json();
            const hadith = data?.hadiths?.data?.[0];
            if(hadith) {
                localStorage.setItem(KEY_DATE, date);
                localStorage.setItem(KEY_HOTD, JSON.stringify(hadith));
                renderHOTD(hadith);
            } else hotdContainer.innerHTML = '<p class="placeholder-message">Update failed</p>';
        } catch(e) { hotdContainer.innerHTML = '<p class="placeholder-message">Offline</p>'; }
    }

    function renderHOTD(hadith) {
        const arabicText = hadith.hadithArabic || "";
        const englishText = (hadith.hadithEnglish || "").replace(/<[^>]*>?/gm, '');
        const ref = `Bukhari ${hadith.hadithNumber}`;

        hotdContainer.innerHTML = `
            <div class="hotd-compact-card" id="hotd-click-target">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="result-ref">${ref}</span>
                    <span class="material-icons-round" style="font-size:16px; opacity:0.5;">open_in_full</span>
                </div>
                <div class="compact-arabic">${arabicText}</div>
                <div class="compact-english">${englishText}</div>
                <div class="tap-hint">
                    <span>Tap to read full hadith</span>
                    <span class="material-icons-round" style="font-size:14px;">arrow_forward</span>
                </div>
            </div>
        `;

        const cardBtn = document.getElementById('hotd-click-target');
        if (cardBtn) {
            cardBtn.addEventListener('click', () => openReader(hadith));
        }
    }

    // --- 7. SEARCH ---
    function setupSearch() {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
        backBtn.addEventListener('click', hideReader);
    }

    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;
        showLoader(); hideReader(); searchResults.innerHTML = '';

        try {
            const url = `${BASE_URL}?apiKey=${API_KEY}&book=sahih-bukhari&hadithNumber=${query}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Network');
            const data = await res.json();
            const list = data?.hadiths?.data;
            if (list && list.length > 0) renderSearchResults(list);
            else searchResults.innerHTML = '<p class="placeholder-message">No hadith found.</p>';
        } catch (error) {
            const history = getStoredData(KEY_HISTORY);
            const bookmarks = getStoredData(KEY_BOOKMARKS);
            const found = history.find(h => h.hadithNumber == query) || bookmarks.find(b => b.hadithNumber == query);
            if (found) renderSearchResults([found]);
            else searchResults.innerHTML = '<p class="placeholder-message" style="color:#ef4444;">Offline & not found.</p>';
        } finally { hideLoader(); }
    }

    function renderSearchResults(hadiths) {
        searchResults.innerHTML = generateListHTML(hadiths, 'result');
        document.querySelectorAll('.result-item').forEach((item, idx) => {
            item.addEventListener('click', () => {
                const selected = hadiths[idx];
                openReader(selected);
                addToHistory(selected);
            });
        });
    }

    // --- 8. READER VIEW (UPDATED FOR STEP 14) ---
    function openReader(hadith) {
        // Capture where we are right now before switching
        const currentView = document.querySelector('.active-view');
        if(currentView && currentView.id !== 'view-reader') {
            lastActiveViewId = currentView.id;
        }

        // Render content
        readerContent.innerHTML = generateCardHTML(hadith, 'reader-card');
        attachCardListeners(hadith, 'reader-card');

        // Switch to Independent Reader View
        views.forEach(view => view.classList.remove('active-view'));
        if(readerView) readerView.classList.add('active-view');
        
        document.getElementById('main-container').scrollTop = 0;
    }

    function hideReader() {
        if(readerView) readerView.classList.remove('active-view');
        
        // Go back to previous view
        const prevView = document.getElementById(lastActiveViewId);
        if(prevView) prevView.classList.add('active-view');
        
        // Update Bottom Nav
        navItems.forEach(nav => nav.classList.remove('active'));
        const navBtn = document.querySelector(`[data-target="${lastActiveViewId}"]`);
        if(navBtn) navBtn.classList.add('active');
    }

    // --- 9. CARD GENERATOR ---
    function generateCardHTML(hadith, uniqueId) {
        const englishText = hadith.hadithEnglish || "Translation not available.";
        const urduText = hadith.hadithUrdu || "Urdu translation not available.";
        const arabicText = hadith.hadithArabic || "";
        const refNumber = hadith.hadithNumber;
        const chapter = hadith.chapter?.chapterEnglish || "";
        
        const bookmarked = isBookmarked(refNumber);
        const iconName = bookmarked ? 'bookmark' : 'bookmark_border';
        const iconClass = bookmarked ? 'bookmarked' : '';

        return `
            <div class="hadith-card" id="${uniqueId}">
                <div class="hadith-header">
                    <div>
                        <span class="hadith-ref">Bukhari ${refNumber}</span>
                        <div style="font-size: 0.7rem; opacity: 0.7; margin-top:2px;">${chapter}</div>
                    </div>
                    <div class="card-controls">
                        <button class="share-btn" title="Share Image">
                            <span class="material-icons-round">ios_share</span>
                        </button>
                        <button class="copy-btn" title="Copy Text">
                            <span class="material-icons-round">content_copy</span>
                        </button>
                        <button class="bookmark-btn ${iconClass}">
                            <span class="material-icons-round">${iconName}</span>
                        </button>
                        <button class="lang-toggle">ENG</button>
                    </div>
                </div>
                <div class="hadith-arabic">${arabicText}</div>
                <div class="hadith-english">${englishText}</div>
                <div class="hadith-urdu">${urduText}</div>
            </div>
        `;
    }

    function attachCardListeners(hadith, cardId) {
        const card = document.getElementById(cardId);
        if(!card) return;

        // Language
        const langBtn = card.querySelector('.lang-toggle');
        const enText = card.querySelector('.hadith-english');
        const urText = card.querySelector('.hadith-urdu');
        langBtn.addEventListener('click', () => {
            if (enText.style.display === 'none') {
                enText.style.display = 'block'; urText.style.display = 'none';
                langBtn.textContent = 'ENG'; langBtn.style.background = 'rgba(255,255,255,0.1)';
            } else {
                enText.style.display = 'none'; urText.style.display = 'block';
                langBtn.textContent = 'URDU'; langBtn.style.background = 'var(--accent-color)'; langBtn.style.color = '#0f172a';
            }
        });

        // Bookmark
        const bmBtn = card.querySelector('.bookmark-btn');
        const bmIcon = bmBtn.querySelector('.material-icons-round');
        bmBtn.addEventListener('click', () => {
            const added = toggleBookmark(hadith);
            if(added) {
                bmIcon.textContent = 'bookmark'; bmBtn.classList.add('bookmarked');
                showToast("Saved to Bookmarks");
            } else {
                bmIcon.textContent = 'bookmark_border'; bmBtn.classList.remove('bookmarked');
                showToast("Removed from Bookmarks");
            }
        });

        // Copy
        const copyBtn = card.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            const textToCopy = `Sahih al-Bukhari ${hadith.hadithNumber}\n\n${hadith.hadithArabic}\n\n${hadith.hadithEnglish}\n\n(Via DeenBase)`;
            navigator.clipboard.writeText(textToCopy).then(() => showToast("Copied")).catch(() => showToast("Failed"));
        });

        // Share
        const shareBtn = card.querySelector('.share-btn');
        shareBtn.addEventListener('click', () => shareAsImage(cardId));
    }

    // --- 10. SHARE IMAGE ---
    async function shareAsImage(elementId) {
        if (typeof html2canvas === 'undefined') {
            alert("Library missing. Cannot share image."); return;
        }
        const element = document.getElementById(elementId);
        showToast("Generating...");
        try {
            const clone = element.cloneNode(true);
            clone.style.position = 'fixed'; clone.style.top = '-9999px'; clone.style.background = '#0f172a';
            clone.style.color = '#f8fafc'; clone.style.padding = '30px'; clone.style.width = '600px';
            if(clone.querySelector('.card-controls')) clone.querySelector('.card-controls').remove();
            
            const footer = document.createElement('div');
            footer.innerHTML = "DeenBase • Sahih al-Bukhari";
            footer.style.textAlign='center'; footer.style.marginTop='20px'; footer.style.opacity='0.5';
            clone.appendChild(footer);
            document.body.appendChild(clone);

            const canvas = await html2canvas(clone, { scale: 2, backgroundColor: '#0f172a', useCORS: true });
            document.body.removeChild(clone);

            canvas.toBlob(async (blob) => {
                const file = new File([blob], "hadith.png", { type: "image/png" });
                if (navigator.share) {
                    try { await navigator.share({ files: [file] }); } catch(e) { downloadImage(canvas); }
                } else { downloadImage(canvas); }
            });
        } catch (e) { showToast("Error"); }
    }

    function downloadImage(canvas) {
        const link = document.createElement('a');
        link.download = 'deenbase.png'; link.href = canvas.toDataURL();
        link.click();
    }

    // --- UTILS ---
    function showToast(message) {
        const toast = document.getElementById('toast-container');
        const msgSpan = document.getElementById('toast-message');
        if(toast && msgSpan) {
            msgSpan.textContent = message; toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 2000);
        }
    }
    function showLoader() { loader.classList.remove('hidden'); }
    function hideLoader() { loader.classList.add('hidden'); }

    // --- HOME CHIPS TRIGGER ---
    window.triggerTopic = function(keyword) {
        const searchNav = document.querySelector('[data-target="view-search"]');
        if(searchNav) searchNav.click();
        const input = document.getElementById('search-input');
        if(input) {
            input.value = keyword;
            const searchBtn = document.getElementById('search-btn');
            if(searchBtn) searchBtn.click();
        }
    };

    console.log("DeenBase: Step 14 (Final Complete) Loaded");
});
