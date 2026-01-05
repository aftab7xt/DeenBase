document.querySelectorAll('.ios-spinner').forEach(spinner => {
    if (!spinner.children.length) {
        for (let i = 0; i < 12; i++) spinner.appendChild(document.createElement('div'));
    }
});
const API_KEY = "$2y$10$83tRfHskMMReLlAtJiFNeQ5SO7xAxYwgGHIDxhLI4HPW8nRJP15";

let homeHTML = "";
let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];

window.onload = function () {
    const display = document.getElementById("display");
    homeHTML = display.innerHTML;

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
    }

    loadFonts();
    loadDailyHadith();
};

function triggerHaptic() {
    if (navigator.vibrate) navigator.vibrate(10);
}

function updateActiveNav(id) {
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
    const target = document.getElementById(id);
    if (target) target.classList.add("active");
    triggerHaptic();
}

function toggleMenu() {
    document.getElementById("sideMenu").classList.toggle("open");
    document.getElementById("menuOverlay").classList.toggle("open");
    triggerHaptic();
}

function goHome() {
    const display = document.getElementById("display");
    display.innerHTML = homeHTML;
    document.getElementById("headerSearch").classList.add("hidden");
    document.getElementById("loader").classList.add("hidden");
    loadDailyHadith();
    updateActiveNav("navHome");
    window.scrollTo(0, 0);
}

function focusSearch() {
    const heroInput = document.getElementById("heroInput");
    if (heroInput) {
        heroInput.focus();
    } else {
        document.getElementById("headerSearch").classList.remove("hidden");
        document.getElementById("headerInput").focus();
    }
    updateActiveNav("navSearch");
    triggerHaptic();
}

function searchFromHero() {
    const q = document.getElementById("heroInput").value.trim();
    if (q) fetchHadith(q);
}

function searchFromHeader() {
    const q = document.getElementById("headerInput").value.trim();
    if (q) fetchHadith(q);
}

function saveSearch(query) {
    if (!query) return;
    searchHistory = searchHistory.filter(q => q !== query);
    searchHistory.unshift(query);
    searchHistory = searchHistory.slice(0, 10);
    localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
}

async function fetchHadith(query) {
    triggerHaptic();
    saveSearch(query);

    const display = document.getElementById("display");
    const loader = document.getElementById("loader");
    const headerSearch = document.getElementById("headerSearch");
    const headerInput = document.getElementById("headerInput");

    display.innerHTML = "";
    loader.classList.remove("hidden");
    headerSearch.classList.remove("hidden");
    headerInput.value = query;

    const isNumber = !isNaN(query);
    const param = isNumber
        ? `hadithNumber=${query}`
        : `search=${encodeURIComponent(query)}&paginate=50`;

    try {
        const url = `https://hadithapi.com/api/hadiths?apiKey=${API_KEY}&book=sahih-bukhari&${param}`;
        const response = await fetch(url);
        const result = await response.json();

        loader.classList.add("hidden");

        if (!result.hadiths || !result.hadiths.data || result.hadiths.data.length === 0) {
            display.innerHTML = "<p style='text-align:center; padding:30px;'>No Hadiths found.</p>";
            return;
        }

        if (isNumber) {
            renderFullCard(result.hadiths.data[0]);
        } else {
            renderCompactList(result.hadiths.data, query);
        }
    } catch (err) {
        loader.classList.add("hidden");
        display.innerHTML = "<p style='text-align:center; padding:30px;'>Connection Error.</p>";
    }
}

function renderCompactList(data, query) {
    const display = document.getElementById("display");
    display.innerHTML = `<div style="margin-bottom:15px; color:var(--text-secondary);">Results for "${query}" (${data.length})</div>`;

    const container = document.createElement("div");
    container.style.cssText = "border:1px solid var(--border); border-radius:12px; overflow:hidden;";

    data.forEach(h => {
        const card = document.createElement("div");
        card.className = "compact-card";

        const preview = h.hadithEnglish
            .replace(/<[^>]*>?/gm, "")
            .substring(0, 100) + "...";

        card.innerHTML = `
            <div class="compact-header">
                <span>Sahih Al-Bukhari - ${h.hadithNumber}</span>
                <span>➔</span>
            </div>
            <div class="compact-preview">${preview}</div>
        `;

        card.onclick = () => {
            renderFullCard(h);
            window.scrollTo(0, 0);
        };

        container.appendChild(card);
    });

    display.appendChild(container);

    const btn = document.createElement("button");
    btn.className = "back-home-btn";
    btn.innerText = "← Back to Home";
    btn.onclick = goHome;
    display.appendChild(btn);
}

function renderFullCard(h) {
    const display = document.getElementById("display");
    document.getElementById("headerSearch").classList.add("hidden");

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
        <div class="hadith-header">Sahih Al-Bukhari - ${h.hadithNumber}</div>

        <p class="arabic">${h.hadithArabic}</p>

        <div class="lang-toggle">
            <span class="tab-eng active">English</span>
            <span class="tab-urdu">Urdu</span>
        </div>

        <div class="trans-content">
            <p class="trans-text content-eng">${h.hadithEnglish}</p>
            <p class="trans-text content-urdu hidden">${h.hadithUrdu}</p>
        </div>

        <div class="action-row">
            <button class="copy-btn">📋 Copy</button>
            <button class="share-btn">📸 Share Image</button>
        </div>

        <button class="back-home-btn">← Back to Home</button>
    `;

    const tabEng = card.querySelector(".tab-eng");
    const tabUrdu = card.querySelector(".tab-urdu");
    const contentEng = card.querySelector(".content-eng");
    const contentUrdu = card.querySelector(".content-urdu");

    tabEng.onclick = () => {
        tabEng.classList.add("active");
        tabUrdu.classList.remove("active");
        contentEng.classList.remove("hidden");
        contentUrdu.classList.add("hidden");
    };

    tabUrdu.onclick = () => {
        tabUrdu.classList.add("active");
        tabEng.classList.remove("active");
        contentUrdu.classList.remove("hidden");
        contentEng.classList.add("hidden");
    };

    card.querySelector(".copy-btn").onclick = () => {
        fallbackCopyText(`Sahih Bukhari ${h.hadithNumber}\n\n${h.hadithEnglish}`);
        triggerHaptic();
    };

    card.querySelector(".share-btn").onclick = () => shareCard(card);
    card.querySelector(".back-home-btn").onclick = goHome;

    display.innerHTML = "";
    display.appendChild(card);
    loadFonts();
}

async function loadDailyHadith() {
    const dailySection = document.getElementById("dailySection");
    const dailyCard = document.getElementById("dailyCard");
    if (!dailySection || !dailyCard) return;

    dailySection.classList.remove("hidden");

    const ids = [1, 9, 13, 16, 33];
    const id = ids[new Date().getDate() % ids.length];

    try {
        const res = await fetch(
            `https://hadithapi.com/api/hadiths?apiKey=${API_KEY}&book=sahih-bukhari&hadithNumber=${id}`
        );
        const data = await res.json();

        if (data.hadiths && data.hadiths.data.length) {
            const h = data.hadiths.data[0];
            const preview = h.hadithEnglish.replace(/<[^>]*>?/gm, "").substring(0, 150) + "...";

            dailyCard.innerHTML = `
                <div class="daily-quote">"${preview}"</div>
                <div class="daily-ref">Sahih Al-Bukhari - ${h.hadithNumber}</div>
            `;

            dailyCard.onclick = () => fetchHadith(h.hadithNumber);
        }
    } catch {
        dailyCard.innerText = "Failed to load daily Hadith.";
    }
}

function getRandomHadith() {
    fetchHadith(Math.floor(Math.random() * 7000) + 1);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const target = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", target);
    localStorage.setItem("theme", target);
    triggerHaptic();
}

function updateFonts() {
    const arabic = document.getElementById("arabicSlider").value;
    const english = document.getElementById("engSlider").value;

    document.getElementById("arabicValue").textContent = arabic + "px";
    document.getElementById("engValue").textContent = english + "px";

    document.querySelectorAll(".arabic").forEach(el => el.style.fontSize = arabic + "px");
    document.querySelectorAll(".trans-text").forEach(el => el.style.fontSize = english + "px");

    localStorage.setItem("arabicSize", arabic);
    localStorage.setItem("engSize", english);
}

function loadFonts() {
    const arabic = localStorage.getItem("arabicSize") || "26";
    const english = localStorage.getItem("engSize") || "16";

    document.querySelectorAll(".arabic").forEach(el => el.style.fontSize = arabic + "px");
    document.querySelectorAll(".trans-text").forEach(el => el.style.fontSize = english + "px");
}

function fallbackCopyText(text) {
    const t = document.createElement("textarea");
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    document.body.removeChild(t);
    showToast("Copied!");
}

function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
}
