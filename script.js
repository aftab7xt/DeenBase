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
        navigator.vibrate(10);
    }
}

function updateActiveNav(id) {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
    });
    document.getElementById(id).classList.add('active');
    triggerHaptic();
}

function toggleMenu() {
    document.getElementById('sideMenu').classList.toggle('open');
    document.getElementById('menuOverlay').classList.toggle('open');
    triggerHaptic();
}

function goHome() {
    const display = document.getElementById('display');
    display.innerHTML = homeHTML;
    document.getElementById('headerSearch').classList.add('hidden');
    document.getElementById('loader').classList.add('hidden');
    loadDailyHadith();
    updateActiveNav('navHome');
    history.pushState(null, "", window.location.pathname);
    window.scrollTo(0, 0);
}

function focusSearch() {
    const display = document.getElementById('display');
    if (display.querySelector('.welcome-screen')) {
        document.getElementById('heroInput').focus();
    } else {
        document.getElementById('headerInput').focus();
    }
    updateActiveNav('navSearch');
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
    doc.setAttribute('data-theme', target);
    localStorage.setItem('theme', target);
    triggerHaptic();
}

function updateFonts() {
    const arabic = document.getElementById('arabicSlider').value;
    const english = document.getElementById('engSlider').value;
    
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
    const arabic = localStorage.getItem('arabicSize');
    const english = localStorage.getItem('engSize');
    
    if (arabic) {
        document.getElementById('arabicSlider').value = arabic;
        document.querySelectorAll('.arabic').forEach(el => {
            el.style.fontSize = arabic + 'px';
        });
    }
    
    if (english) {
        document.getElementById('engSlider').value = english;
        document.querySelectorAll('.trans-text').forEach(el => {
            el.style.fontSize = english + 'px';
        });
    }
}

function openNotesModal(hadithNumber) {
    const hadith = favorites.find(f => f.hadithNumber === hadithNumber);
    if (!hadith) return;
    
    currentHadithForNote = hadith;
    const modal = document.getElementById('notesModal');
    const textarea = document.getElementById('notesTextarea');
    
    textarea.value = hadith.note || '';
    modal.classList.remove('hidden');
    setTimeout(() => textarea.focus(), 100);
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
            <div style="text-align:center; margin-top:50px;">
                <h3>No Favorites Yet</h3>
                <p>Tap the heart icon on any Hadith to save it here.</p>
                <button class="back-home-btn" onclick="goHome()">← Back to Home</button>
            </div>
        `;
        return;
    }
    
    display.innerHTML = `<h3 style="margin-bottom:20px; color:var(--primary);">Your Favorites (${favorites.length})</h3>`;
    
    const container = document.createElement('div');
    container.style.cssText = "border:1px solid var(--border); border-radius:12px; overflow:hidden;";
    
    favorites.forEach(h => {
        const card = document.createElement('div');
        card.className = 'compact-card';
        
        let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, '');
        if (preview.length > 80) preview = preview.substring(0, 80) + "...";
        
        let noteHTML = '';
        if (h.note) {
            noteHTML = `<div class="compact-note">📝 ${h.note}</div>`;
        }
        
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
            window.scrollTo(0, 0);
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
    
    const buttons = card.querySelectorAll('button');
    const notesSection = card.querySelector('.notes-section');
    const relatedSection = card.querySelector('.related-section');
    const addNotesBtn = card.querySelector('.add-notes-btn');
    
    const watermark = document.createElement('div');
    watermark.className = 'share-watermark';
    watermark.innerHTML = `
        <div class="share-logo">📖 DeenBase</div>
        <div class="share-url">aftab7xt.github.io/DeenBase</div>
    `;
    card.appendChild(watermark);
    
    buttons.forEach(b => b.style.display = 'none');
    if (notesSection) notesSection.style.display = 'none';
    if (relatedSection) relatedSection.style.display = 'none';
    if (addNotesBtn) addNotesBtn.style.display = 'none';
    
    try {
        const canvas = await html2canvas(card, {
            scale: 3,
            logging: false,
            useCORS: true
        });
        
        const link = document.createElement('a');
        link.download = `deenbase-hadith-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        
        showToast("Image saved!");
    } catch (err) {
        console.error(err);
        alert("Could not create image");
    }
    
    buttons.forEach(b => b.style.display = 'block');
    if (notesSection) notesSection.style.display = 'block';
    if (relatedSection) relatedSection.style.display = 'block';
    if (addNotesBtn) addNotesBtn.style.display = 'block';
    watermark.remove();
}

async function loadRelatedHadiths(currentHadith, container) {
    try {
        const currentNum = parseInt(currentHadith.hadithNumber);
        const relatedNums = [];
        
        for (let i = -2; i <= 2; i++) {
            if (i !== 0) {
                const num = currentNum + i;
                if (num > 0 && num <= 7563) {
                    relatedNums.push(num);
                }
            }
        }
        
        const relatedHadiths = [];
        
        for (const num of relatedNums) {
            try {
                const url = `https://hadithapi.com/api/hadiths?apiKey=${API_KEY}&book=sahih-bukhari&hadithNumber=${num}`;
                const response = await fetch(url);
                const result = await response.json();
                
                if (result.hadiths && result.hadiths.data.length > 0) {
                    relatedHadiths.push(result.hadiths.data[0]);
                }
            } catch (e) {
                console.log('Failed to load related:', num);
            }
        }
        
        if (relatedHadiths.length > 0) {
            const section = document.createElement('div');
            section.className = 'related-section';
            section.innerHTML = '<div class="related-title">📚 Related Hadiths</div>';
            
            relatedHadiths.forEach(h => {
                const card = document.createElement('div');
                card.className = 'related-card';
                
                let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, '');
                if (preview.length > 100) {
                    preview = preview.substring(0, 100) + "...";
                }
                
                card.innerHTML = `
                    <div class="related-header">Sahih Al-Bukhari - ${h.hadithNumber}</div>
                    <div class="related-preview">${preview}</div>
                `;
                
                card.onclick = () => {
                    fetchHadith(h.hadithNumber.toString());
                    window.scrollTo(0, 0);
                };
                
                section.appendChild(card);
            });
            
            container.appendChild(section);
        }
    } catch (e) {
        console.error('Error loading related hadiths:', e);
    }
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
    
    document.querySelectorAll('.history-dropdown').forEach(el => {
        el.classList.add('hidden');
    });
    
    const isNumber = !isNaN(query);
    const param = isNumber ? `hadithNumber=${query}` : `paginate=200`;
    
    try {
        const url = `https://hadithapi.com/api/hadiths?apiKey=${API_KEY}&book=sahih-bukhari&${param}`;
        const response = await fetch(url);
        const result = await response.json();
        
        loader.classList.add('hidden');
        
        if (result.hadiths && result.hadiths.data.length > 0) {
            if (isNumber) {
                renderFullCard(result.hadiths.data[0]);
            } else {
                const lower = query.toLowerCase();
                const filtered = result.hadiths.data.filter(h => 
                    h.hadithEnglish.toLowerCase().includes(lower)
                );
                
                if (filtered.length > 0) {
                    renderCompactList(filtered, query);
                } else {
                    display.innerHTML = "<p style='text-align:center; margin-top:20px;'>No matches found.</p>";
                }
            }
            
            history.pushState({ query: query }, "", "#" + query);
        } else {
            display.innerHTML = "<p style='text-align:center; margin-top:20px;'>No Hadiths found.</p>";
        }
    } catch (e) {
        loader.classList.add('hidden');
        display.innerHTML = "<p style='text-align:center; margin-top:20px;'>Connection Error.</p>";
    }
}

function renderCompactList(data, query) {
    const display = document.getElementById('display');
    
    display.innerHTML = `<div class='results-info'>Found ${data.length} results for "${query}"</div>`;
    
    const container = document.createElement('div');
    container.style.cssText = "border:1px solid var(--border); border-radius:12px; overflow:hidden;";
    
    data.forEach(h => {
        const card = document.createElement('div');
        card.className = 'compact-card';
        
        let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, '');
        if (preview.length > 120) {
            preview = preview.substring(0, 120) + "...";
        }
        
        card.innerHTML = `
            <div class="compact-header">
                <span>Sahih Al-Bukhari - ${h.hadithNumber}</span>
                <span>➔</span>
            </div>
            <div class="compact-preview">${preview}</div>
        `;
        
        card.onclick = () => {
            display.innerHTML = "";
            renderFullCard(h);
            window.scrollTo(0, 0);
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

function renderFullCard(h) {
    const display = document.getElementById('display');
    const favIcon = isFavorite(h.hadithNumber) ? "❤️" : "🤍";
    const isFav = isFavorite(h.hadithNumber);
    
    const card = document.createElement('div');
    card.className = 'card';
    
    const fav = favorites.find(f => f.hadithNumber === h.hadithNumber);
    const hasNote = fav && fav.note;
    
    let notesHTML = '';
    if (isFav) {
        if (hasNote) {
            notesHTML = `
                <div class="notes-section">
                    <div class="notes-header">
                        <div class="notes-title">📝 Your Notes</div>
                        <button class="notes-edit-btn" onclick="openNotesModal(${h.hadithNumber})">Edit</button>
                    </div>
                    <div class="notes-text">${fav.note}</div>
                </div>
            `;
        } else {
            notesHTML = `
                <button class="add-notes-btn" onclick="openNotesModal(${h.hadithNumber})">
                    📝 Add Personal Notes
                </button>
            `;
        }
    }
    
    card.innerHTML = `
        <div class="card-top-actions">
            <div>
                <div class="hadith-header">Sahih Al-Bukhari - ${h.hadithNumber}</div>
                <div class="hadith-grade">Grade: <span class="grade-badge">Sahih</span></div>
            </div>
            <button class="fav-btn">${favIcon}</button>
        </div>
        <p class="arabic">${h.hadithArabic}</p>
        <div class="lang-toggle">
            <span class="tab-eng active">English</span>
            <span class="tab-urdu">Urdu</span>
        </div>
        <div class="trans-content">
            <p class="trans-text content-eng">${h.hadithEnglish}</p>
            <p class="trans-text content-urdu hidden">${h.hadithUrdu}</p>
        </div>
        ${notesHTML}
        <div class="action-row">
            <button class="copy-btn">📋 Copy</button>
            <button class="share-btn">📸 Share Image</button>
        </div>
        <button class="back-home-btn">← Back to Home</button>
    `;
    
    const tabEng = card.querySelector('.tab-eng');
    const tabUrdu = card.querySelector('.tab-urdu');
    const contentEng = card.querySelector('.content-eng');
    const contentUrdu = card.querySelector('.content-urdu');
    
    tabEng.onclick = () => {
        tabEng.classList.add('active');
        tabUrdu.classList.remove('active');
        contentEng.classList.remove('hidden');
        contentUrdu.classList.add('hidden');
        triggerHaptic();
    };
    
    tabUrdu.onclick = () => {
        tabUrdu.classList.add('active');
        tabEng.classList.remove('active');
        contentUrdu.classList.remove('hidden');
        contentEng.classList.add('hidden');
        triggerHaptic();
    };
    
    card.querySelector('.copy-btn').onclick = () => {
        const text = `Sahih Bukhari ${h.hadithNumber}\n\n${h.hadithEnglish}`;
        fallbackCopyText(text);
        triggerHaptic();
    };
    
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
    
    dailySection.classList.remove('hidden');
    
    const shortHadithIDs = [1, 9, 13, 16, 33, 47, 50, 600, 6136, 6412];
    const today = new Date().getDate();
    const idToLoad = shortHadithIDs[today % shortHadithIDs.length];
    
    try {
        const url = `https://hadithapi.com/api/hadiths?apiKey=${API_KEY}&book=sahih-bukhari&hadithNumber=${idToLoad}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.hadiths && result.hadiths.data.length > 0) {
            const h = result.hadiths.data[0];
            let preview = h.hadithEnglish.replace(/<[^>]*>?/gm, '');
            
            if (preview.length > 150) {
                preview = preview.substring(0, 150) + "...";
            }
            
            dailyCard.innerHTML = `
                <div class="daily-quote">"${preview}"</div>
                <div class="daily-ref">Sahih Al-Bukhari - ${h.hadithNumber}</div>
            `;
            
            dailyCard.onclick = () => fetchHadith(h.hadithNumber);
        }
    } catch (e) {
        dailyCard.innerHTML = "Failed to load.";
    }
}

function getRandomHadith() {
    const randomNum = Math.floor(Math.random() * 7000) + 1;
    fetchHadith(randomNum);
}

function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast("Copied!");
    } catch (err) {
        alert('Unable to copy');
    }
    
    document.body.removeChild(textArea);
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg || "Copied to Clipboard!";
    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}
