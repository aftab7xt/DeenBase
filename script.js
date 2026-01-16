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
    
    // --- NEW: Autocomplete Container (v5.2) ---
    const autocompleteList = document.getElementById('autocomplete-list');

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

    function saveSearchQuery(query) {
        if (!query || query.length < 2) return;
        let queries = getStoredData(KEY_QUERIES);
        
        // Filter out duplicates (case-insensitive)
        queries = queries.filter(q => q.toLowerCase() !== query.toLowerCase());
        
        // Add to start and limit to 10
        queries.unshift(query);
        if (queries.length > 10) queries.pop(); 
        
        localStorage.setItem(KEY_QUERIES, JSON.stringify(queries));
    }

    // --- Config & Storage Keys ---
    const RAW_API_KEY = '$2y$10$83tRfHskMMReLlAtJiFNeQ5SO7xAxYwgGHIDxhLI4HPW8nRJP15';
    const API_KEY = encodeURIComponent(RAW_API_KEY);
    const BASE_URL = 'https://hadithapi.com/api/hadiths';
    
    const HOTD_IDS = [1, 7, 13, 27, 42, 58, 9, 3, 52]; 
    const KEY_HOTD = 'deenbase_hotd_data';
    const KEY_DATE = 'deenbase_hotd_date';
    const KEY_HISTORY = 'deenbase_history';
    const KEY_QUERIES = 'deenbase_search_queries';
    const KEY_BOOKMARKS = 'deenbase_bookmarks';
    const KEY_SETTINGS = 'deenbase_settings';
    
    // --- SMART-HIDE NAVIGATION LOGIC ---
    let lastScrollTop = 0;
    const navBar = document.querySelector('.bottom-nav');
    const scrollContainer = document.getElementById('main-container');

    // Only proceed if the elements exist
    if (navBar && scrollContainer) {
        scrollContainer.addEventListener('scroll', () => {
            let scrollTop = scrollContainer.scrollTop;

            // Check if user scrolled more than 50px (buffer to prevent flickering)
            if (Math.abs(lastScrollTop - scrollTop) <= 5) return;

            if (scrollTop > lastScrollTop && scrollTop > 50) {
                // Scrolling Down - Hide Nav
                navBar.classList.add('nav-hidden');
            } else {
                // Scrolling Up - Show Nav
                navBar.classList.remove('nav-hidden');
            }
            
            lastScrollTop = scrollTop;
        }, { passive: true });
    }

    // --- REGISTER SERVICE WORKER & PWA INSTALL ---
    let deferredPrompt;
    let autoHideTimer; // Timer variable to handle auto-exit
    const installBanner = document.getElementById('pwa-install-banner');
    const installBtn = document.getElementById('pwa-install-btn');
    const closeBanner = document.getElementById('pwa-close');

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch((err) => console.log('Service Worker Failed', err));
    }

    // Capture the browser's install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // 1. Enter after 1 second delay
        setTimeout(() => {
            if (installBanner && deferredPrompt) {
                installBanner.classList.remove('hidden');

                // 2. Automatically hide after 7 seconds
                autoHideTimer = setTimeout(() => {
                    if (installBanner) installBanner.classList.add('hidden');
                }, 7000);
            }
        }, 1000);
    });

    // Handle the Install button click
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                // Stop the 7s auto-hide timer so it doesn't close mid-install
                clearTimeout(autoHideTimer);

                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User ${outcome} the install prompt`);
                deferredPrompt = null;
                
                if (installBanner) installBanner.classList.add('hidden');
            }
        });
    }

    // Handle the Close button click
    if (closeBanner) {
        closeBanner.addEventListener('click', () => {
            // Stop the auto-hide timer and close immediately
            clearTimeout(autoHideTimer);
            if (installBanner) installBanner.classList.add('hidden');
        });
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
        
        // 1. If Reader is open, close it and stop
        if (readerView && readerView.classList.contains('active-view')) {
            hideReader();
            return; 
        }

        // 2. If gestured back, check which view to show
        if (event.state && event.state.view) {
            navigateToTab(event.state.view);
        } else {
            // 3. No state means we are back at the entry point (Home)
            navigateToTab('view-home');
        }
    });

    // --- 2. NAVIGATION ---
function setupNavigation() {
    const navIndicator = document.querySelector('.nav-indicator');
    
    navItems.forEach((item) => {
        item.addEventListener('click', (e) => {
            const clickedBtn = e.target.closest('.nav-item');
            const targetId = clickedBtn.getAttribute('data-target');

            if (targetId) {
                // ADDED: Push the new state to the browser history
                if (targetId !== lastActiveViewId) {
                    history.pushState({ view: targetId }, "", `#${targetId.replace('view-', '')}`);
                }

                lastActiveViewId = targetId;
                
                // --- YOUR ALIGNMENT LOGIC (Kept) ---
                const leftPosition = clickedBtn.offsetLeft;
                const itemWidth = clickedBtn.offsetWidth;

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
// Helper function to handle the UI switch for the back gesture
function navigateToTab(targetId) {
    const navIndicator = document.querySelector('.nav-indicator');
    const clickedBtn = document.querySelector(`[data-target="${targetId}"]`);
    
    if (!clickedBtn) return;

    lastActiveViewId = targetId;

    // --- REUSE YOUR ALIGNMENT LOGIC ---
    const leftPosition = clickedBtn.offsetLeft;
    const itemWidth = clickedBtn.offsetWidth;
    if (navIndicator) {
        navIndicator.style.left = `${leftPosition}px`;
        navIndicator.style.width = `${itemWidth}px`;
    }

    // Update active visual states
    navItems.forEach(nav => nav.classList.remove('active'));
    clickedBtn.classList.add('active');
    views.forEach(view => view.classList.remove('active-view'));
    
    const targetView = document.getElementById(targetId);
    if (targetView) targetView.classList.add('active-view');

    // Refresh dynamic content if needed
    if(targetId === 'view-search' && searchInput.value === '') renderRecentSearches();
    if(targetId === 'view-library') renderBookmarks();
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
    const queries = getStoredData(KEY_QUERIES);
    
    if (queries.length === 0) {
        if (searchHistoryContainer) searchHistoryContainer.classList.add('hidden');
        return;
    }

    if (searchHistoryContainer) searchHistoryContainer.classList.remove('hidden');
    
    let html = '';
    queries.forEach((query) => {
        html += `
            <div class="result-item recent-query-item" data-query="${query}">
                <div class="result-ref">${query}</div>
                <span class="material-icons-round cache-badge" style="opacity:0.4;">history</span>
            </div>`;
    });
    
    recentSearchesList.innerHTML = html;
    
    // Re-attach listeners so clicking a keyword triggers a search
    const items = recentSearchesList.querySelectorAll('.recent-query-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const val = item.getAttribute('data-query');
            searchInput.value = val;
            if (clearSearchBtn) clearSearchBtn.classList.remove('hidden');
            performSearch();
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
      /* --- 7. SEARCH & AUTOCOMPLETE LOGIC (v5.2) --- */

    // Helper: Prevents API spam by waiting 500ms after typing
    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    // Helper: Fetches live suggestions silently
    async function fetchLiveSuggestions(query) {
        const autoList = document.getElementById('autocomplete-list');
        if (!autoList) return;

        try {
            // 1. Silent Fetch (No loader, background only)
            const url = `${BASE_URL}?apiKey=${API_KEY}&book=sahih-bukhari&hadithEnglish=${encodeURIComponent(query)}`;
            const res = await fetch(url);
            if (!res.ok) return; 
            
            const data = await res.json();
            const list = data?.hadiths?.data;

            if (list && list.length > 0) {
                // 2. Limit to Top 5 results to keep the dropdown clean
                const topResults = list.slice(0, 5);
                
                let html = '';
                topResults.forEach(h => {
                    // Clean text for preview (remove HTML tags & limit length)
                    const cleanText = (h.hadithEnglish || "").replace(/<[^>]*>?/gm, '').substring(0, 50) + "...";
                    
                    html += `
                    <div class="suggestion-item">
                        <span class="material-icons-round" style="font-size:18px; opacity:0.5;">search</span>
                        <div style="display:flex; flex-direction:column; gap:2px; overflow:hidden;">
                            <span style="font-size:0.9rem; font-weight:500;">Bukhari ${h.hadithNumber}</span>
                            <span style="font-size:0.8rem; opacity:0.7; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${cleanText}</span>
                        </div>
                    </div>`;
                });

                autoList.innerHTML = html;
                autoList.classList.remove('hidden');

                // 3. Attach Click Listeners
                const items = autoList.querySelectorAll('.suggestion-item');
                items.forEach((item, index) => {
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // UX UPGRADE: Open the reader DIRECTLY on click
                        openReader(topResults[index]); 
                        addToHistory(topResults[index]);
                        
                        // Cleanup
                        autoList.classList.add('hidden');
                        searchInput.blur(); 
                    });
                });

            } else {
                autoList.classList.add('hidden');
            }
        } catch (e) {
            console.log("Autocomplete offline"); // Silent fail
        }
    }

    // Main Search Controller
    function setupSearch() {
        // 1. Regular Search Button
        searchBtn.addEventListener('click', () => {
            document.getElementById('autocomplete-list')?.classList.add('hidden');
            performSearch();
        });
        
        // 2. Clear Button Logic
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearSearchBtn.classList.add('hidden');
                searchResults.innerHTML = '';
                document.getElementById('autocomplete-list')?.classList.add('hidden'); 
                renderRecentSearches();
                searchInput.focus();
            });
        }
        
        // Clear Recent History Button (Restored)
        const clearRecentBtn = document.getElementById('clear-recent-btn');
        if (clearRecentBtn) {
            clearRecentBtn.addEventListener('click', () => {
                localStorage.removeItem(KEY_HISTORY);
                searchHistoryContainer.classList.add('hidden');
                showToast("Recent searches cleared");
            });
        }

        // 3. LIVE INPUT LISTENER (The Autocomplete Trigger)
        searchInput.addEventListener('input', debounce((e) => {
            const val = e.target.value.trim();
            
            // Toggle 'X' button
            if (val.length > 0) clearSearchBtn.classList.remove('hidden');
            else clearSearchBtn.classList.add('hidden');

            // Handle Empty State
            if (val === '') {
                searchResults.innerHTML = '';
                document.getElementById('autocomplete-list')?.classList.add('hidden');
                renderRecentSearches();
                return;
            }

            // Trigger API only if 3+ chars (saves data usage)
            if (val.length >= 3) {
                fetchLiveSuggestions(val);
            } else {
                document.getElementById('autocomplete-list')?.classList.add('hidden');
            }
        }, 500)); // Waits 500ms after you stop typing

        // 4. Handle Enter Key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('autocomplete-list')?.classList.add('hidden');
                performSearch();
            }
        });
        
        // 5. Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target !== searchInput) {
                document.getElementById('autocomplete-list')?.classList.add('hidden');
            }
        });
    }

  async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) {
        renderRecentSearches();
        return;
    }
    
    // Save the actual search string to your keyword history
    saveSearchQuery(query); 

    if(searchHistoryContainer) searchHistoryContainer.classList.add('hidden');
    showLoader(); 
    if (typeof hideReader === 'function') hideReader(); 
    searchResults.innerHTML = '';

    try {
        let url;
        const isNumber = /^\d+$/.test(query); 

        if (isNumber) {
            url = `${BASE_URL}?apiKey=${API_KEY}&book=sahih-bukhari&hadithNumber=${query}`;
        } else {
            url = `${BASE_URL}?apiKey=${API_KEY}&book=sahih-bukhari&hadithEnglish=${encodeURIComponent(query)}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('Network');
        const data = await res.json();
        
        const list = data?.hadiths?.data;
        if (list && list.length > 0) {
            renderSearchResults(list);
        } else {
            searchResults.innerHTML = `
                <div class="placeholder-content">
                    <span class="material-icons-round" style="opacity:0.5; font-size: 48px;">search_off</span>
                    <p style="margin-top: 16px;">No results for "${query}"</p>
                </div>`;
        }
    } catch (error) {
        console.error("Search Error:", error);
        // Fallback to local data if available
        const bookmarks = getStoredData(KEY_BOOKMARKS);
        const found = bookmarks.find(b => b.hadithNumber == query);
        
        if (found) renderSearchResults([found]);
        else searchResults.innerHTML = '<p class="placeholder-message" style="color:#ef4444;">No results found or you are offline.</p>';
    } finally { 
        hideLoader(); 
    }
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

// --- 10. SHARE IMAGE (v4.1 Moctale Style Footer) ---
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
        
        // 1. Base Image Styling
        clone.style.position = 'fixed';
        clone.style.top = '-9999px';
        clone.style.left = '0';
        clone.style.width = '600px'; 
        clone.style.maxWidth = '600px';
        clone.style.backgroundColor = '#1C1C1E'; 
        clone.style.color = '#FFFFFF';           
        clone.style.border = 'none';
        clone.style.borderRadius = '0'; 
        clone.style.padding = '50px 50px 40px 50px'; 
        
        const controls = clone.querySelector('.card-controls');
        if(controls) controls.remove();

        // 2. Custom Footer Layout (Based on Doodles)
        const footer = document.createElement('div');
        footer.style.marginTop = '40px';
        footer.style.display = 'flex';
        footer.style.alignItems = 'center';
        footer.style.justifyContent = 'space-between'; // Pushes line left and branding right
        footer.style.width = '100%';

        footer.innerHTML = `
            <div style="flex-grow: 1; height: 1px; background: rgba(255, 255, 255, 0.2); margin-right: 20px;"></div>
            
            <div style="display:flex; align-items:center; gap:15px;">
                <img src="assets/logo.png" style="height: 90px; width: auto; object-fit: contain;">
                
                <div style="font-family:'Archivo Black', sans-serif; color:#FFFFFF; font-weight:400; letter-spacing:0.15em; font-size:1.6rem; text-transform:uppercase;">
                    DEENBASE
                </div>
            </div>
        `;
        clone.appendChild(footer);

        document.body.appendChild(clone);

        // 3. Render
        const canvas = await html2canvas(clone, {
            scale: 2, 
            backgroundColor: '#1C1C1E', 
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
                        text: 'Read more at tinyurl.com/DeenBase'
                    });
                } catch (err) {
                    console.log('Share cancelled');
                }
            } else {
                const link = document.createElement('a');
                link.download = 'deenbase-hadith.png';
                link.href = canvas.toDataURL();
                link.click();
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
// --- BACK TO TOP LOGIC (v5.2) ---
const backToTopBtn = document.getElementById('back-to-top');
const mainAppContainer = document.getElementById('main-container');

if (backToTopBtn && mainAppContainer) {
    // 1. Detect scrolling on the main container
    mainAppContainer.addEventListener('scroll', () => {
        // Show button after scrolling down 300px
        if (mainAppContainer.scrollTop > 300) {
            backToTopBtn.classList.remove('hidden');
        } else {
            backToTopBtn.classList.add('hidden');
        }
    }, { passive: true });

    // 2. Smoothly scroll to top when clicked
    backToTopBtn.addEventListener('click', () => {
        mainAppContainer.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}
