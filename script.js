document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    
    // Search Elements
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const readerView = document.getElementById('reader-view');
    const readerContent = document.getElementById('reader-content');
    const backBtn = document.getElementById('back-to-results');
    const loader = document.getElementById('loader');

    // Home Elements
    const hotdContainer = document.getElementById('hotd-container');
    const dateBadge = document.getElementById('current-date');

    // Library Elements
    const segments = document.querySelectorAll('.segment');
    const libraryTabs = document.querySelectorAll('.library-tab');
    const historyList = document.getElementById('history-list');
    const bookmarksList = document.getElementById('bookmarks-list');
    const historyEmpty = document.getElementById('history-empty');
    const bookmarksEmpty = document.getElementById('bookmarks-empty');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // --- Config & Storage Keys ---
    const RAW_API_KEY = '$2y$10$83tRfHskMMReLlAtJiFNeQ5SO7xAxYwgGHIDxhLI4HPW8nRJP15';
    const API_KEY = encodeURIComponent(RAW_API_KEY);
    const BASE_URL = 'https://hadithapi.com/api/hadiths';
    
    const HOTD_IDS = [1, 7, 13, 27, 42, 58, 9, 3, 52]; 
    const STORAGE_KEY_HOTD = 'deenbase_hotd_data';
    const STORAGE_KEY_DATE = 'deenbase_hotd_date';
    const STORAGE_KEY_HISTORY = 'deenbase_history';
    const STORAGE_KEY_BOOKMARKS = 'deenbase_bookmarks';

    // --- INIT ---
    initHadithOfTheDay();
    setupNavigation();
    setupSearch();
    setupLibrary(); // Setup for both history and bookmarks

    // --- NAVIGATION ---
    function setupNavigation() {
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                navItems.forEach(nav => nav.classList.remove('active'));
                const clickedBtn = e.target.closest('.nav-item');
                clickedBtn.classList.add('active');

                views.forEach(view => view.classList.remove('active-view'));
                const targetId = clickedBtn.getAttribute('data-target');
                document.getElementById(targetId)?.classList.add('active-view');
                
                // Refresh Library when opened
                if(targetId === 'view-library') {
                    renderHistory();
                    renderBookmarks();
                }
            });
        });
    }

    // --- LIBRARY TABS (History vs Bookmarks) ---
    function setupLibrary() {
        segments.forEach(seg => {
            seg.addEventListener('click', () => {
                // Update Segment UI
                segments.forEach(s => s.classList.remove('active'));
                seg.classList.add('active');

                // Switch Tab Content
                libraryTabs.forEach(t => t.classList.remove('active-tab'));
                const tabId = `tab-${seg.dataset.tab}`;
                document.getElementById(tabId).classList.add('active-tab');
            });
        });

        clearHistoryBtn.addEventListener('click', () => {
            localStorage.removeItem(STORAGE_KEY_HISTORY);
            renderHistory();
        });
    }

    // --- STORAGE HELPERS ---
    function getStoredData(key) {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
    }

    function isBookmarked(hadithNumber) {
        const bookmarks = getStoredData(STORAGE_KEY_BOOKMARKS);
        return bookmarks.some(b => b.hadithNumber == hadithNumber);
    }

    function toggleBookmark(hadith) {
        let bookmarks = getStoredData(STORAGE_KEY_BOOKMARKS);
        const index = bookmarks.findIndex(b => b.hadithNumber == hadith.hadithNumber);

        if (index === -1) {
            // Add
            bookmarks.unshift(hadith);
        } else {
            // Remove
            bookmarks.splice(index, 1);
        }
        localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(bookmarks));
        
        // Refresh UI if in library view
        renderBookmarks();
        return index === -1; // returns true if added, false if removed
    }

    function addToHistory(hadith) {
        let history = getStoredData(STORAGE_KEY_HISTORY);
        history = history.filter(h => h.hadithNumber != hadith.hadithNumber);
        history.unshift(hadith);
        if (history.length > 50) history.pop();
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    }

    // --- RENDERERS ---

    function renderHistory() {
        const history = getStoredData(STORAGE_KEY_HISTORY);
        if (history.length === 0) {
            historyList.innerHTML = '';
            historyEmpty.classList.remove('hidden');
        } else {
            historyEmpty.classList.add('hidden');
            historyList.innerHTML = generateListHTML(history, 'history');
            attachListListeners('history', history);
        }
    }

    function renderBookmarks() {
        const bookmarks = getStoredData(STORAGE_KEY_BOOKMARKS);
        if (bookmarks.length === 0) {
            bookmarksList.innerHTML = '';
            bookmarksEmpty.classList.remove('hidden');
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
                const index = item.getAttribute('data-index');
                const selectedHadith = data[index];
                
                // Switch to Search View to read
                document.querySelector('[data-target="view-search"]').click();
                setTimeout(() => openReader(selectedHadith), 50);
            });
        });
    }

    // --- CORE HADITH LOGIC ---
    
    async function initHadithOfTheDay() {
        const today = new Date().toDateString();
        dateBadge.textContent = today;
        const storedDate = localStorage.getItem(STORAGE_KEY_DATE);
        const storedData = localStorage.getItem(STORAGE_KEY_HOTD);

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
                localStorage.setItem(STORAGE_KEY_DATE, date);
                localStorage.setItem(STORAGE_KEY_HOTD, JSON.stringify(hadith));
                renderHOTD(hadith);
            } else hotdContainer.innerHTML = '<p class="placeholder-message">Update failed</p>';
        } catch(e) { hotdContainer.innerHTML = '<p class="placeholder-message">Offline</p>'; }
    }

    function renderHOTD(hadith) {
        hotdContainer.innerHTML = generateCardHTML(hadith, 'hotd-card');
        attachCardListeners(hadith, 'hotd-card');
    }

    // --- SEARCH ---
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
            // Offline fallback
            const history = getStoredData(STORAGE_KEY_HISTORY);
            const bookmarks = getStoredData(STORAGE_KEY_BOOKMARKS);
            const found = history.find(h => h.hadithNumber == query) || bookmarks.find(b => b.hadithNumber == query);
            
            if (found) renderSearchResults([found]);
            else searchResults.innerHTML = '<p class="placeholder-message" style="color:#ef4444;">Offline & not found.</p>';
        } finally { hideLoader(); }
    }

    function renderSearchResults(hadiths) {
        searchResults.innerHTML = generateListHTML(hadiths, 'result');
        // Custom listener for search results to add to history
        document.querySelectorAll('.result-item').forEach((item, idx) => {
            item.addEventListener('click', () => {
                const selected = hadiths[idx];
                openReader(selected);
                addToHistory(selected);
            });
        });
    }

    function openReader(hadith) {
        readerContent.innerHTML = generateCardHTML(hadith, 'reader-card');
        attachCardListeners(hadith, 'reader-card');
        searchResults.classList.add('hidden');
        document.querySelector('.sticky-search').classList.add('hidden');
        readerView.classList.remove('hidden');
        document.getElementById('main-container').scrollTop = 0;
    }

    function hideReader() {
        readerView.classList.add('hidden');
        searchResults.classList.remove('hidden');
        document.querySelector('.sticky-search').classList.remove('hidden');
    }

    // --- UI GENERATORS ---

    function generateCardHTML(hadith, uniqueId) {
        const englishText = hadith.hadithEnglish || "Translation not available.";
        const urduText = hadith.hadithUrdu || "Urdu translation not available.";
        const arabicText = hadith.hadithArabic || "";
        const refNumber = hadith.hadithNumber;
        const chapter = hadith.chapter?.chapterEnglish || "";
        
        // Check bookmark state
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

        // Toggle Language
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

        // Toggle Bookmark
        const bmBtn = card.querySelector('.bookmark-btn');
        const bmIcon = bmBtn.querySelector('.material-icons-round');
        
        bmBtn.addEventListener('click', () => {
            const added = toggleBookmark(hadith);
            if(added) {
                bmIcon.textContent = 'bookmark';
                bmBtn.classList.add('bookmarked');
            } else {
                bmIcon.textContent = 'bookmark_border';
                bmBtn.classList.remove('bookmarked');
            }
        });
    }

    // --- UTILS ---
    function showLoader() { loader.classList.remove('hidden'); }
    function hideLoader() { loader.classList.add('hidden'); }

    console.log("DeenBase: Step 7 Loaded");
});
