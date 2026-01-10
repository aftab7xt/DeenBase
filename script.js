document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    
    // Search Elements (Update this block)
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const searchHistoryContainer = document.getElementById('search-history-container'); // NEW
    const recentSearchesList = document.getElementById('recent-searches-list');         // NEW

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
    
        // --- STEP 27: REGISTER SERVICE WORKER ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch((err) => console.log('Service Worker Failed', err));
    }


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
    // --- STEP 17: HANDLE NATIVE BACK GESTURE ---
    window.addEventListener('popstate', (event) => {
        // If the browser goes "back" and the reader is open, we close it
        const readerView = document.getElementById('view-reader');
        if (readerView && readerView.classList.contains('active-view')) {
            hideReader();
        }
    });

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
                    // ADD THIS:
                    if(targetId === 'view-search' && searchInput.value === '') {
                        renderRecentSearches();
                    }

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
        // --- STEP 18: RENDER SEARCH HISTORY ---
    function renderRecentSearches() {
        const history = getStoredData(KEY_HISTORY).slice(0, 5); // Get top 5 items
        
        if (history.length === 0) {
            searchHistoryContainer.classList.add('hidden');
            return;
        }

        searchHistoryContainer.classList.remove('hidden');
        
        // We reuse the generator but give it a unique class 'recent-item' to avoid conflicts
        let html = '';
        history.forEach((hadith, index) => {
            const cleanText = (hadith.hadithEnglish || "").replace(/<[^>]*>?/gm, '');
            const preview = cleanText.substring(0, 60) + '...';
            html += `
                <div class="result-item recent-item" data-index="${index}">
                    <div class="result-ref">Bukhari ${hadith.hadithNumber}</div>
                    <div class="result-preview">${preview}</div>
                    <span class="material-icons-round cache-badge" style="opacity:0.4;">history</span>
                </div>
            `;
        });
        recentSearchesList.innerHTML = html;

        // Attach listeners specifically to these recent items
        const items = recentSearchesList.querySelectorAll('.recent-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const index = item.getAttribute('data-index');
                openReader(history[index]);
                addToHistory(history[index]); // Move to top of history
            });
        });
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
        
        // Update: Handle input changes to toggle history/results
        searchInput.addEventListener('input', (e) => {
            if (e.target.value.trim() === '') {
                searchResults.innerHTML = '';
                renderRecentSearches();
            }
        });

        searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
        
        // In-app back button
        backBtn.addEventListener('click', () => {
            history.back(); 
        });
    }

    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            renderRecentSearches(); // Show history if empty
            return;
        }
        
        // Hide history when searching
        if(searchHistoryContainer) searchHistoryContainer.classList.add('hidden');
        
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
        
        // FIX: Only select items INSIDE the searchResults container
        const items = searchResults.querySelectorAll('.result-item');
        
        items.forEach((item, idx) => {
            item.addEventListener('click', () => {
                const selected = hadiths[idx];
                openReader(selected);
                addToHistory(selected);
            });
        });
    }

    function openReader(hadith) {
        const currentView = document.querySelector('.active-view');
        if(currentView && currentView.id !== 'view-reader') {
            lastActiveViewId = currentView.id;
        }

        // STEP 17: Push a new state to history so the back button works
        // We add a hash '#reader' so the URL changes slightly
        history.pushState({ view: 'reader' }, "Reader", "#reader");

        readerContent.innerHTML = generateCardHTML(hadith, 'reader-card');
        attachCardListeners(hadith, 'reader-card');

        views.forEach(view => view.classList.remove('active-view'));
        const readerView = document.getElementById('view-reader');
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
    // --- STEP 26: SHARE IMAGE (Brand Update) ---
    async function shareAsImage(elementId) {
        if (typeof html2canvas === 'undefined') {
            alert("Error: html2canvas library missing. Check internet/script tag.");
            return;
        }

        const element = document.getElementById(elementId);
        if (!element) return;

        showToast("Generating image...");

        try {
            // 1. Create a clone to style specifically for the image
            const clone = element.cloneNode(true);
            
            // 2. Set the branding styles for the export
            clone.style.position = 'fixed';
            clone.style.top = '-9999px';
            clone.style.left = '0';
            clone.style.width = '600px'; 
            clone.style.maxWidth = '600px';
            
            // BRAND COLORS: Deep Green Background & Off-White Text
            clone.style.backgroundColor = '#0F222D'; 
            clone.style.color = '#F0F7F4';
            
            // Add a Premium Gold Border
            clone.style.border = '2px solid #CCA352';
            clone.style.borderRadius = '20px';
            
            clone.style.padding = '40px';
            
            // Remove the interactive buttons (Copy, Share, etc.) from the image
            const controls = clone.querySelector('.card-controls');
            if(controls) controls.remove();

            // 3. Add a branded footer
            const footer = document.createElement('div');
            footer.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin-top:30px; padding-top:20px; border-top:1px solid rgba(204, 163, 82, 0.3);">
                    <span style="font-family:serif; color:#CCA352; font-weight:300; letter-spacing:0.05em; font-size:1.2rem;">aftab7xt.github.io/DeenBase/</span>
                </div>
            `;
            clone.appendChild(footer);

            document.body.appendChild(clone);

            // 4. Capture the image
            const canvas = await html2canvas(clone, {
                scale: 2, // High resolution
                backgroundColor: null, // Transparent around the border radius
                useCORS: true,
                logging: false 
            });

            document.body.removeChild(clone);

            // 5. Share or Download
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    showToast("Image generation failed");
                    return;
                }

                const file = new File([blob], "deenbase-hadith.png", { type: "image/png" });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'DeenBase Hadith',
                            text: 'Read this hadith on DeenBase.'
                        });
                    } catch (err) {
                        // User cancelled share
                        console.log('Share cancelled');
                    }
                } else {
                    downloadImage(canvas);
                }
            });

        } catch (error) {
            console.error(error);
            showToast("Error generating image");
        }
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
    // --- STEP 16: LOGO CLICK ---
    const logoHeader = document.querySelector('.logo-wrapper');
    if (logoHeader) {
        logoHeader.addEventListener('click', () => {
            // We simply click the hidden logic of the Home Navigation button
            const homeBtn = document.querySelector('[data-target="view-home"]');
            if (homeBtn) homeBtn.click();
            
            // Optional: Scroll to top of home
            const container = document.getElementById('main-container');
            if(container) container.scrollTop = 0;
        });
    }

    console.log("DeenBase: Step 14 (Final Complete) Loaded");
});
