const appHeader = document.querySelector('.app-header');

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    
    // Search Elements
    const searchBtn = document.getElementById('search-btn-view');
    const searchInput = document.getElementById('search-input-view');
    const clearSearchBtn = document.getElementById('clear-search-view');
    const searchResults = document.getElementById('search-results');
    const searchHistoryContainer = document.getElementById('search-history-container');
    const recentSearchesList = document.getElementById('recent-searches-list');

    // Reader Elements
    const readerView = document.getElementById('view-reader'); 
    const readerContent = document.getElementById('reader-content');
    const loader = document.getElementById('loader');

    // Home Elements
    const hotdContainer = document.getElementById('hotd-container');
    const dateBadge = document.getElementById('hero-date');

    // Library Elements (simplified - bookmarks only)
    const bookmarksList = document.getElementById('bookmarks-list');
    const bookmarksEmpty = document.getElementById('bookmarks-empty');

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
    
    // --- REGISTER SERVICE WORKER ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch((err) => console.log('Service Worker Failed', err));
    }

    // --- STATE ---
    let userSettings = { theme: 'dark', oled: false, font: 'Amiri', fsArabic: 1.6, fsEnglish: 1.0 };
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
        // 1. Theme Logic
        if (userSettings.theme === 'light') {
            document.body.classList.add('light-theme');
            document.body.classList.remove('oled-mode'); 
            themeLabel.textContent = "Light Mode";
            themeToggle.querySelector('span').textContent = 'light_mode';
            
            const oledContainer = document.getElementById('oled-container');
            if(oledContainer) {
                oledContainer.style.opacity = '0.5';
                oledContainer.style.pointerEvents = 'none';
            }
        } else {
            document.body.classList.remove('light-theme');
            themeLabel.textContent = "Dark Mode";
            themeToggle.querySelector('span').textContent = 'dark_mode';
            
            const oledContainer = document.getElementById('oled-container');
            if(oledContainer) {
                oledContainer.style.opacity = '1';
                oledContainer.style.pointerEvents = 'auto';
            }

            // 2. OLED Logic
            const oledSwitch = document.getElementById('oled-toggle');
            if (userSettings.oled) {
                document.body.classList.add('oled-mode');
                if(oledSwitch) oledSwitch.checked = true;
            } else {
                document.body.classList.remove('oled-mode');
                if(oledSwitch) oledSwitch.checked = false;
            }
        }

        // 3. Font Logic
        document.documentElement.style.setProperty('--fs-arabic', userSettings.fsArabic + 'rem');
        document.documentElement.style.setProperty('--fs-english', userSettings.fsEnglish + 'rem');
        
        const arabicElements = document.querySelectorAll('.hadith-arabic, .compact-arabic, .greeting-arabic');
        arabicElements.forEach(el => {
            el.style.fontFamily = `'${userSettings.font}', serif`;
        });
        
        document.querySelectorAll('[data-font]').forEach(btn => {
            if(btn.dataset.font === userSettings.font) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }

    function saveSettings() {
        localStorage.setItem(KEY_SETTINGS, JSON.stringify(userSettings));
    }

function setupSettingsEvents() {
    // OLED Toggle
    const oledToggle = document.getElementById('oled-toggle');
    if(oledToggle) {
        oledToggle.addEventListener('change', (e) => {
            userSettings.oled = e.target.checked;
            applySettings();
            saveSettings();
        });
    }

    // Font Style Buttons
    const fontBtns = document.querySelectorAll('[data-font]');
    fontBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            userSettings.font = btn.dataset.font;
            applySettings();
            saveSettings();
        });
    });

    // Theme Toggle (FIXED - removed overlay code)
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            console.log('Theme toggle clicked!'); // DEBUG
            console.log('Current theme:', userSettings.theme); // DEBUG
            
            userSettings.theme = userSettings.theme === 'dark' ? 'light' : 'dark';
            
            console.log('New theme:', userSettings.theme); // DEBUG
            
            applySettings();
            saveSettings();
        });
    }

    // Font Size Sliders
    const sliderArabic = document.getElementById('fs-arabic');
    const sliderEnglish = document.getElementById('fs-english');
    
    // Initialize fills on load
    updateSliderFill(sliderArabic);
    updateSliderFill(sliderEnglish);
    
    if (sliderArabic) {
        sliderArabic.addEventListener('input', (e) => {
            userSettings.fsArabic = e.target.value;
            applySettings();
            saveSettings();
            updateSliderFill(e.target); // <--- Updates fill while dragging
        });
    }
    
    if (sliderEnglish) {
        sliderEnglish.addEventListener('input', (e) => {
            userSettings.fsEnglish = e.target.value;
            applySettings();
            saveSettings();
            updateSliderFill(e.target); // <--- Updates fill while dragging
        });
    }
}

    // --- HANDLE NATIVE BACK GESTURE ---
    window.addEventListener('popstate', (event) => {
        const readerView = document.getElementById('view-reader');
        if (readerView && readerView.classList.contains('active-view')) {
            hideReader();
        }
    });

    // --- 2. NAVIGATION ---
    function setupNavigation() {
    const navIndicator = document.querySelector('.nav-indicator');
    
    navItems.forEach((item, index) => {
        item.addEventListener('click', (e) => {
            const clickedBtn = e.target.closest('.nav-item');
            const targetId = clickedBtn.getAttribute('data-target');

            if (targetId) {
                lastActiveViewId = targetId;
                
                            // --- NEW ALIGNMENT LOGIC ---
            // 1. Get the exact geometry of the clicked button
            const leftPosition = clickedBtn.offsetLeft;
            const itemWidth = clickedBtn.offsetWidth;

            // 2. Apply directly to the indicator
            if (navIndicator) {
                navIndicator.style.left = `${leftPosition}px`;
                navIndicator.style.width = `${itemWidth}px`;
            }

                
                navItems.forEach(nav => nav.classList.remove('active'));
                clickedBtn.classList.add('active');
                views.forEach(view => view.classList.remove('active-view'));
                document.getElementById(targetId)?.classList.add('active-view');
                
                if(targetId === 'view-search' && searchInput.value === '') {
                    renderRecentSearches();
                }
                if(targetId === 'view-library') {
                    renderBookmarks();
                }
            }
        });
    });
}

// --- 3. LIBRARY ---
function setupLibrary() {
    // Library now only shows bookmarks, no tabs needed
    // Remove all tab switching logic
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
    function renderRecentSearches() {
        const history = getStoredData(KEY_HISTORY).slice(0, 10); 
        
        if (history.length === 0) {
            searchHistoryContainer.classList.add('hidden');
            return;
        }

        searchHistoryContainer.classList.remove('hidden');
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
        const items = recentSearchesList.querySelectorAll('.recent-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const index = item.getAttribute('data-index');
                openReader(history[index]);
                addToHistory(history[index]);
            });
        });
    }

function generateListHTML(list, type) {
    let html = '';
    list.forEach((hadith, index) => {
        const cleanText = (hadith.hadithEnglish || "").replace(/<[^>]*>?/gm, '');
        const preview = cleanText.substring(0, 60) + '...';
        const icon = type === 'history' ? 'history' : 'bookmark';
        html += `<div class="result-item ${type}-item" data-index="${index}"><div class="result-ref">Bukhari ${hadith.hadithNumber}</div><div class="result-preview">${preview}</div><span class="material-icons-round cache-badge">${icon}</span></div>`;
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
        
        searchInput.addEventListener('input', (e) => {
            if (e.target.value.trim() === '') {
                searchResults.innerHTML = '';
                renderRecentSearches();
            }
        });
        // Clear Recent button
    const clearRecentBtn = document.getElementById('clear-recent-btn');
    if (clearRecentBtn) {
        clearRecentBtn.addEventListener('click', () => {
            localStorage.removeItem(KEY_HISTORY);
            searchHistoryContainer.classList.add('hidden');
            showToast("Recent searches cleared");
        });
    }
            // Inside setupSearch()
    if (clearSearchBtn) {
        // 1. Show/Hide X based on typing
        searchInput.addEventListener('input', (e) => {
            if (e.target.value.length > 0) {
                clearSearchBtn.classList.remove('hidden');
            } else {
                clearSearchBtn.classList.add('hidden');
            }
        });

        // 2. Clear input when X is clicked
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.classList.add('hidden');
            searchResults.innerHTML = '';
            renderRecentSearches(); // Re-show history
            searchInput.focus();
        });
    }

        searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
    }

    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            renderRecentSearches();
            return;
        }
        
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
        const items = searchResults.querySelectorAll('.result-item');
        items.forEach((item, idx) => {
            item.addEventListener('click', () => {
                const selected = hadiths[idx];
                openReader(selected);
                addToHistory(selected);
            });
        });
    }

    // --- 8. READER LOGIC (UPDATED) ---
    function openReader(hadith) {
        const currentView = document.querySelector('.active-view');
        if(currentView && currentView.id !== 'view-reader') {
            lastActiveViewId = currentView.id;
        }

        history.pushState({ view: 'reader' }, "Reader", "#reader");
        readerContent.innerHTML = generateCardHTML(hadith, 'reader-card');
        attachCardListeners(hadith, 'reader-card');
    
    // === ADD BOTTOM BUTTON LISTENERS (after HTML is in DOM) ===
    setTimeout(() => {
        const langBtnBottom = document.querySelector('.lang-toggle-bottom');
        const copyBtnBottom = document.querySelector('.copy-btn-bottom');
        const shareBtnBottom = document.querySelector('.share-btn-bottom');
        
        if (langBtnBottom) {
            let showingEnglish = true;
            langBtnBottom.addEventListener('click', () => {
                console.log('BOTTOM BUTTON CLICKED! showingEnglish =', showingEnglish);
                
                const enTextElement = document.querySelector('.hadith-english');
                const urTextElement = document.querySelector('.hadith-urdu');
                
                if (showingEnglish) {
                    console.log('Switching to URDU');
                    enTextElement.style.display = 'none'; 
                    urTextElement.style.display = 'block';
                    langBtnBottom.querySelector('.action-label').textContent = 'URDU';
                    langBtnBottom.setAttribute('data-lang', 'URDU');
                    showingEnglish = false;
                } else {
                    console.log('Switching to ENGLISH');
                    enTextElement.style.display = 'block'; 
                    urTextElement.style.display = 'none';
                    langBtnBottom.querySelector('.action-label').textContent = 'ENG';
                    langBtnBottom.setAttribute('data-lang', 'ENG');
                    showingEnglish = true;
                }
            });
        }
        
        if (copyBtnBottom) {
            copyBtnBottom.addEventListener('click', () => {
                console.log('COPY BUTTON CLICKED!');
                const textToCopy = `Sahih al-Bukhari ${hadith.hadithNumber}\n\n${hadith.hadithArabic}\n\n${hadith.hadithEnglish}\n\n(Via DeenBase)`;
                navigator.clipboard.writeText(textToCopy)
                    .then(() => showToast("Copied"))
                    .catch(() => showToast("Failed"));
            });
        }
        
        if (shareBtnBottom) {
            shareBtnBottom.addEventListener('click', () => {
                console.log('SHARE BUTTON CLICKED!');
                shareAsImage('reader-card');
            });
        }
    }, 100); // Wait 100ms for DOM to fully render

        views.forEach(view => view.classList.remove('active-view'));
        readerView.classList.add('active-view');
        
// --- FIX: HIDE SEARCH BAR IN READER ---
if (appHeader) appHeader.classList.add('reader-active');
// headerSearch no longer exists
        
        document.getElementById('main-container').scrollTop = 0;
    }

    function hideReader() {
        readerView.classList.add('closing');

        setTimeout(() => {
            readerView.classList.remove('active-view', 'closing');
            const prevView = document.getElementById(lastActiveViewId);
            if(prevView) prevView.classList.add('active-view');
            
// --- FIX: RESTORE HEADER STATE ---
if (appHeader) appHeader.classList.remove('reader-active');
// headerSearch no longer exists

            navItems.forEach(nav => nav.classList.remove('active'));
            const navBtn = document.querySelector(`[data-target="${lastActiveViewId}"]`);
            if(navBtn) navBtn.classList.add('active');
        }, 300);
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
        
        <div class="reader-action-bar glass">
            <button class="action-bar-btn share-btn-bottom" title="Share Image">
                <span class="material-icons-round">ios_share</span>
                <span class="action-label">Share</span>
            </button>
            <button class="action-bar-btn copy-btn-bottom" title="Copy Text">
                <span class="material-icons-round">content_copy</span>
                <span class="action-label">Copy</span>
            </button>
            <button class="action-bar-btn lang-toggle-bottom" data-lang="ENG">
                <span class="material-icons-round">translate</span>
                <span class="action-label">ENG</span>
            </button>
        </div>
    `;
}

    function attachCardListeners(hadith, cardId) {
    const card = document.getElementById(cardId);
    if(!card) return;

    // Language (TOP button)
    const langBtn = card.querySelector('.lang-toggle');
    const enText = card.querySelector('.hadith-english');
    const urText = card.querySelector('.hadith-urdu');
    langBtn.addEventListener('click', () => {
        if (enText.style.display === 'none') {
            enText.style.display = 'block'; 
            urText.style.display = 'none';
            langBtn.textContent = 'ENG'; 
            langBtn.style.background = 'rgba(255,255,255,0.1)';
        } else {
            enText.style.display = 'none'; 
            urText.style.display = 'block';
            langBtn.textContent = 'URDU'; 
            langBtn.style.background = 'var(--accent-color)'; 
            langBtn.style.color = '#0f172a';
        }
    });

    // Bookmark (TOP button) - UPDATED
    const bmBtn = card.querySelector('.bookmark-btn');
    const bmIcon = bmBtn.querySelector('.material-icons-round');
    
    bmBtn.addEventListener('click', () => {
        const added = toggleBookmark(hadith);
        
        if(added) {
            // Case 1: Adding Bookmark
            bmIcon.textContent = 'bookmark'; 
            bmBtn.classList.add('bookmarked');
            bmBtn.classList.remove('unbookmarked'); // Safety cleanup
            showToast("Saved to Bookmarks");
        } else {
            // Case 2: Removing Bookmark
            bmIcon.textContent = 'bookmark_border'; 
            bmBtn.classList.remove('bookmarked');
            
            // --- NEW: Trigger the "Exit" Animation ---
            bmBtn.classList.add('unbookmarked');
            
            // Remove the class after animation finishes (clean up)
            setTimeout(() => {
                bmBtn.classList.remove('unbookmarked');
            }, 300);
            
            showToast("Removed from Bookmarks");
        }
    });

    // Copy (TOP button)
    const copyBtn = card.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
        const textToCopy = `Sahih al-Bukhari ${hadith.hadithNumber}\n\n${hadith.hadithArabic}\n\n${hadith.hadithEnglish}\n\n(Via DeenBase)`;
        navigator.clipboard.writeText(textToCopy)
            .then(() => showToast("Copied"))
            .catch(() => showToast("Failed"));
    });

    // Share (TOP button)
    const shareBtn = card.querySelector('.share-btn');
    shareBtn.addEventListener('click', () => shareAsImage(cardId));
}

    // --- 10. SHARE IMAGE ---
    async function shareAsImage(elementId) {
        if (typeof html2canvas === 'undefined') {
            alert("Error: html2canvas library missing. Check internet/script tag.");
            return;
        }

        const element = document.getElementById(elementId);
        if (!element) return;

        showToast("Generating image...");

        try {
            const clone = element.cloneNode(true);
            
            clone.style.position = 'fixed';
            clone.style.top = '-9999px';
            clone.style.left = '0';
            clone.style.width = '600px'; 
            clone.style.maxWidth = '600px';
            
            clone.style.backgroundColor = '#0F222D'; 
            clone.style.color = '#F0F7F4';
            
            clone.style.border = '2px solid #CCA352';
            clone.style.borderRadius = '20px';
            
            clone.style.padding = '40px';
            
            const controls = clone.querySelector('.card-controls');
            if(controls) controls.remove();

            const footer = document.createElement('div');
            footer.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin-top:30px; padding-top:20px; border-top:1px solid rgba(204, 163, 82, 0.3);">
                    <span style="font-family:serif; color:#CCA352; font-weight:300; letter-spacing:0.05em; font-size:1.2rem;">aftab7xt.github.io/DeenBase/</span>
                </div>
            `;
            clone.appendChild(footer);

            document.body.appendChild(clone);

            const canvas = await html2canvas(clone, {
                scale: 2, 
                backgroundColor: null, 
                useCORS: true,
                logging: false 
            });

            document.body.removeChild(clone);

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
    let toastTimeout; // Variable to track the timer

    function showToast(message) {
        const toast = document.getElementById('toast-container');
        const msgSpan = document.getElementById('toast-message');
        
        if(toast && msgSpan) {
            // 1. Reset state (in case it's currently closing)
            toast.classList.remove('hidden', 'closing');
            
            // 2. Set Content
            msgSpan.textContent = message; 
            
            // 3. Clear previous timer if exists (prevents early closing)
            if (toastTimeout) clearTimeout(toastTimeout);
            
            // 4. Set new timer
            toastTimeout = setTimeout(() => {
                // Trigger exit animation
                toast.classList.add('closing');
                
                // Wait for animation to finish (300ms) then actually hide
                toast.addEventListener('animationend', () => {
                    if(toast.classList.contains('closing')) {
                        toast.classList.add('hidden');
                        toast.classList.remove('closing');
                    }
                }, { once: true });
                
            }, 2000); // Visible for 2 seconds
        }
    }

    function showLoader() { loader.classList.remove('hidden'); }
    function hideLoader() { loader.classList.add('hidden'); }

    // --- CHIPS TRIGGER ---
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
    
    // --- HOME LOGO SCROLL ---
    const logoHeader = document.querySelector('.logo-wrapper');
    if (logoHeader) {
        logoHeader.addEventListener('click', () => {
            const homeBtn = document.querySelector('[data-target="view-home"]');
            if (homeBtn) homeBtn.click();
            const container = document.getElementById('main-container');
            if(container) container.scrollTop = 0;
        });
    }

    console.log("DeenBase: v1.0 Loaded");
});
    // Add this Helper Function inside setupNavigation or globally
    function updateIndicatorPosition() {
        const activeBtn = document.querySelector('.nav-item.active');
        const navIndicator = document.querySelector('.nav-indicator');
        
        if (activeBtn && navIndicator) {
            navIndicator.style.left = `${activeBtn.offsetLeft}px`;
            navIndicator.style.width = `${activeBtn.offsetWidth}px`;
        }
    }

    // Call it immediately on load
    setTimeout(updateIndicatorPosition, 100); // Small delay to ensure layout is ready

    // Update on resize (in case user rotates phone)
    window.addEventListener('resize', updateIndicatorPosition);
    // Helper: Fills the slider track with accent color based on value
    function updateSliderFill(slider) {
        if (!slider) return;
        
        // Calculate percentage: (value - min) / (max - min) * 100
        const val = (slider.value - slider.min) / (slider.max - slider.min) * 100;
        
        // Dynamic CSS Gradient: 
        // Left side = Accent Color (var(--accent-color))
        // Right side = Faded Track (rgba 255,255,255, 0.1)
        // We use CSS variables so it works in Dark AND Light mode automatically
        slider.style.background = `linear-gradient(to right, var(--accent-color) ${val}%, rgba(128, 128, 128, 0.2) ${val}%)`;
    }
