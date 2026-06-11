class Upgrade {
    constructor(name, title, description, iconUrl, price, count) {
        this.name = name;
        this.title = title;
        this.description = description;
        this.iconUrl = iconUrl;
        this.price = price;
        this.count = count;
    }
}

const upgrades = [
    new Upgrade("clicker", "Clicker", "Multiplies cookies per click", "res/upgrade_icons/clicker.png", 15, 0),
    new Upgrade("flower", "VictorFlower", "Nice flower does cool stuff", "res/upgrade_icons/flower.png", 45, 0),
    new Upgrade("kid", "VictorKid", "Clicks 4x automatically but weakens your click by 1", "res/upgrade_icons/kid-victor.png", 85, 0),
    new Upgrade("gym", "VictorGym", "Trains your click for +3 Victors per click", "res/upgrade_icons/victorGym.png", 100, 0),
    new Upgrade("garden", "VictorGarden", "Grows +10 Victors automatically every second", "res/upgrade_icons/victorGarden.png", 175, 0),
    new Upgrade("factory", "VictorFactory", "Produces +50 Victors per second and +2 Victors per click", "res/upgrade_icons/victorFactory.png", 225, 0),
];

// Unlock thresholds
const unlockAt = {
    clicker: 0,
    flower:  100,
    kid:     175,
    gym:     225,
    garden:  300,
    factory: 400,
};

const permanentlyUnlocked = new Set();

upgrades.forEach(u => u.originalPrice = u.price);

const cookieButton = document.getElementById("cookie_button");
const counterText = document.getElementById("counter_text");
const rateText = document.querySelector(".rate_text");
const cookieContainer = document.querySelector(".cookie_container");
const rebirthButton = document.getElementById("rebirth_button");

let cookieCount = 1000000000;
let cookiesPerSecond = 0;
let clickMultiplier = 1;
let totalClicks = 0;
let manualClicks = 0;
let picChanged = 0;
let sessionSeconds = 0;
let midnightClicked = false;
let threeAmClicked = false;
let secretCodeEntered = false;
let ogabeekTyped = false;
let lotteryWon = false;
let goldenVictorClicked = 0;
let secretVictorFound = false;
let bgClicks = 0;
let lastActivityTime = Date.now();

let rebirths = 0;
const REBIRTH_BASE_COST = 100000;
let rebirthCoins = 0;
let globalMultiplier = 1.0;

let lastFloatingTextTime = 0;

// ─── AUDIO ───
const sounds = {
    bg: new Audio("sounds/bg.ogg"),
    click: new Audio("sounds/click.mp3"),
    buy: new Audio("sounds/buy.mp3"),
    rebirth: new Audio("sounds/rebirth.mp3")
};

sounds.bg.loop = true;
sounds.bg.volume = 0.4;

["click", "buy", "rebirth"].forEach(name => {
    sounds[name].addEventListener("error", () => {
        console.error(`Sound file missing or broken: sounds/${name}.mp3`);
    });
});

let isBgMusicPlaying = false;

function playSound(soundName) {
    if (!sounds[soundName]) return;
    const clone = sounds[soundName].cloneNode();
    clone.volume = 0.6;
    clone.play().catch(() => {});
}

function tryToPlayBgMusic() {
    if (!isBgMusicPlaying) {
        sounds.bg.play()
            .then(() => {
                isBgMusicPlaying = true;
                document.removeEventListener("click", tryToPlayBgMusic, true);
                document.removeEventListener("keydown", tryToPlayBgMusic, true);
            })
            .catch(() => {});
    }
}

document.addEventListener("click", tryToPlayBgMusic, true);
document.addEventListener("keydown", tryToPlayBgMusic, true);

// ─── REBIRTH ───
function getRebirthCost() {
    return REBIRTH_BASE_COST * (rebirths + 1);
}

function getBaseClickMultiplier() {
    return 1 + rebirths;
}

// ─── ACHIEVEMENTS ───
const achievements = [
    { id: "start_game",     name: "It Begins",           desc: "Start the game",                          icon: "🎮", unlocked: false, check: () => true },
    { id: "vic_100",        name: "Baby Victor",         desc: "Reach 100 Coins",                         icon: "🍪", unlocked: false, check: () => cookieCount >= 100 },
    { id: "vic_1000",       name: "Victor Enjoyer",      desc: "Reach 1,000 Coins",                       icon: "⭐", unlocked: false, check: () => cookieCount >= 1000 },
    { id: "vic_10000",      name: "Victor Master",       desc: "Reach 10,000 Coins",                      icon: "🏆", unlocked: false, check: () => cookieCount >= 10000 },
    { id: "vic_100000",     name: "Victor God",          desc: "Reach 100,000 Coins",                     icon: "👑", unlocked: false, check: () => cookieCount >= 100000 },
    { id: "click_666666",   name: "Number of the Beast", desc: "Reach 666,666 total clicks",              icon: "🔥", unlocked: false, check: () => totalClicks >= 666666 },
    { id: "manual_1000",    name: "Dedicated Clicker",   desc: "Click Victor manually 1,000 times",       icon: "👆", unlocked: false, check: () => manualClicks >= 1000 },
    { id: "buy_all_10",     name: "Upgrade Hoarder",     desc: "Buy every upgrade at least 10 times",     icon: "🛒", unlocked: false, check: () => upgrades.every(u => u.count >= 10) },
    { id: "changed_pic",    name: "New Face",            desc: "Change the coin picture",                 icon: "🖼️", unlocked: false, check: () => picChanged >= 1 },
    { id: "changed_pic_25", name: "Identity Crisis",     desc: "Change the picture 25 times",             icon: "🎭", unlocked: false, check: () => picChanged >= 25 },
    { id: "rebirth_first",  name: "Born Again",          desc: "Rebirth for the first time",              icon: "♻️", unlocked: false, check: () => rebirths >= 1 },
    { id: "session_10min",  name: "Committed",           desc: "Stay in the game for 10 minutes",         icon: "⏱️", unlocked: false, check: () => sessionSeconds >= 600 },
    { id: "session_1hour",  name: "No Life",             desc: "Stay in the game for 1 hour",             icon: "🕐", unlocked: false, check: () => sessionSeconds >= 3600 },
    { id: "midnight_click", name: "Midnight Grinder",    desc: "Click Victor at midnight",                icon: "🌙", unlocked: false, check: () => midnightClicked },
    { id: "3am_click",      name: "Demon Hours",         desc: "Click Victor at 3 AM",                    icon: "😈", unlocked: false, check: () => threeAmClicked },
    { id: "secret_code",    name: "You Found It",        desc: "Enter the secret Konami code",            icon: "🔑", unlocked: false, check: () => secretCodeEntered },
    { id: "ogabeek",        name: "Ogabeek",             desc: "Type 'Ogabeek' on your keyboard",         icon: "🤫", unlocked: false, check: () => ogabeekTyped },
    { id: "lottery",        name: "Blessed",             desc: "0.001% chance — you got lucky",           icon: "🍀", unlocked: false, check: () => lotteryWon },
    { id: "first_golden",   name: "Golden Touch",        desc: "Click your first Golden Victor",          icon: "✨", unlocked: false, check: () => goldenVictorClicked >= 1 },
    { id: "found_secret",   name: "Sharp Eyes",          desc: "Find the secret Victor",                  icon: "👀", unlocked: false, check: () => secretVictorFound },
    { id: "bg_click_100",   name: "Background Abuser",   desc: "Click the background 100 times",          icon: "🖱️", unlocked: false, check: () => bgClicks >= 100 },
];

let popupQueue = [];
let popupShowing = false;

function showNextPopup() {
    if (popupQueue.length === 0) { popupShowing = false; return; }
    popupShowing = true;
    const achievement = popupQueue.shift();
    const popup = document.createElement("div");
    popup.classList.add("achievement_popup");
    popup.innerHTML = `
        <div class="achievement_popup_icon">${achievement.icon}</div>
        <div class="achievement_popup_body">
            <span class="achievement_popup_title">🏅 Achievement Unlocked!</span>
            <span class="achievement_popup_name">${achievement.name}</span>
            <span class="achievement_popup_desc">${achievement.desc}</span>
        </div>
    `;
    document.body.appendChild(popup);
    requestAnimationFrame(() => requestAnimationFrame(() => popup.classList.add("show")));
    setTimeout(() => {
        popup.classList.remove("show");
        setTimeout(() => { popup.remove(); showNextPopup(); }, 500);
    }, 3000);
}

function checkAchievements() {
    for (const achievement of achievements) {
        if (!achievement.unlocked && achievement.check()) {
            achievement.unlocked = true;
            popupQueue.push(achievement);
            if (!popupShowing) showNextPopup();
        }
    }
}

function toggleAchievements() {
    const panel = document.getElementById("achievements_panel");
    const isOpening = !panel.classList.contains("open");

    panel.classList.toggle("open");

    if (isOpening) {
        panel.innerHTML = "";
        for (const achievement of achievements) {
            const row = document.createElement("div");
            row.classList.add("achievement_row");
            if (!achievement.unlocked) row.classList.add("locked");
            row.innerHTML = `
                <div class="achievement_row_icon">${achievement.icon}</div>
                <div class="achievement_row_body">
                    <span class="achievement_row_name">${achievement.name}</span>
                    <span class="achievement_row_desc">${achievement.unlocked ? achievement.desc : "???"}</span>
                </div>
            `;
            panel.appendChild(row);
        }

        // Close when clicking anywhere outside
        setTimeout(() => {
            document.addEventListener("click", closeAchievementsOutside);
        }, 0);
    }
}

function closeAchievementsOutside(e) {
    const panel = document.getElementById("achievements_panel");
    const btn = document.getElementById("achievements_button");
    if (!panel.contains(e.target) && e.target !== btn) {
        panel.classList.remove("open");
        document.removeEventListener("click", closeAchievementsOutside);
    }
}

function closeAchievementsOutside(e) {
    const panel = document.getElementById("achievements_panel");
    const btn = document.getElementById("achievements_button");
    if (!panel.contains(e.target) && e.target !== btn) {
        panel.classList.remove("open");
        document.removeEventListener("click", closeAchievementsOutside);
    }
}

// ─── UI ───
function updateUpgradeVisibility() {
    for (const upgrade of upgrades) {
        const el = document.getElementById("upgrade_" + upgrade.name);
        if (!el) continue;
        const threshold = unlockAt[upgrade.name] ?? 0;

        // Once unlocked, always unlocked
        if (cookieCount >= threshold || upgrade.count > 0) {
            permanentlyUnlocked.add(upgrade.name);
        }

        if (permanentlyUnlocked.has(upgrade.name)) {
            el.classList.remove("upgrade_locked");
        } else {
            el.classList.add("upgrade_locked");
        }
    }
}

function updateCoinUploadVisibility() {
    const label = document.querySelector(".coin_upload");
    const hint = document.querySelector(".coin_upload_hint");
    if (!label) return;
    if (cookieCount >= 1000) {
        label.classList.remove("coin_upload_locked");
        if (hint) hint.style.display = "none";
    } else {
        label.classList.add("coin_upload_locked");
        if (hint) hint.style.display = "inline";
    }
}

function updateRebirthUpgradeButton() {
    const btn = document.getElementById("rebirth_upgrade_button");
    if (!btn) return;
    if (rebirths >= 1) {
        btn.classList.remove("nav_btn_locked");
        btn.disabled = false;
    } else {
        btn.classList.add("nav_btn_locked");
        btn.disabled = true;
    }
}

function updateUI() {
    counterText.textContent = cookieCount.toLocaleString() + " Coins";
    let activeCps = Math.ceil(cookiesPerSecond * globalMultiplier);
    let activeCpc = Math.ceil(clickMultiplier * globalMultiplier);
    rateText.textContent = activeCps.toLocaleString() + " Coins per second | " + activeCpc.toLocaleString() + " Coins per click";
    updateRebirthUI();
    updateCoinUploadVisibility();
    updateUpgradeVisibility();
    checkAchievements();
}

function updateRebirthUI() {
    const cost = getRebirthCost();
    const btnFill = document.getElementById("rebirth_btn_fill");
    const btnText = document.getElementById("rebirth_btn_text");
    if (!rebirthButton || !btnFill || !btnText) return;
    let percentage = Math.min((cookieCount / cost) * 100, 100);
    btnFill.style.width = percentage + "%";
    if (cookieCount >= cost) {
        rebirthButton.disabled = false;
        btnText.textContent = "⚡ REBIRTH UP! ⚡";
    } else {
        rebirthButton.disabled = true;
        btnText.textContent = `${cookieCount.toLocaleString()} / ${cost.toLocaleString()}`;
    }
}

function resetUpgradeElements() {
    for (const upgrade of upgrades) {
        upgrade.count = 0;
        upgrade.price = upgrade.originalPrice;
        const el = document.getElementById("upgrade_" + upgrade.name);
        if (!el) continue;
        el.querySelector(".upgrade_counter").textContent = "x0";
        el.querySelector(".upgrade_price").textContent = upgrade.price + "$";
    }
}

permanentlyUnlocked.clear();

function clearUpgradeVisuals() {
    cookieContainer.querySelectorAll(".orbit_hand").forEach(hand => hand.remove());
    const farmsSection = document.getElementById("farms_section");
    if (farmsSection) farmsSection.querySelectorAll(".farm_panel").forEach(p => p.remove());
}

function rebirth() {
    if (cookieCount < getRebirthCost()) return;
    rebirths++;
    rebirthCoins += 1;
    cookieCount = 0;
    cookiesPerSecond = 0;
    clickMultiplier = getBaseClickMultiplier();
    resetUpgradeElements();
    clearUpgradeVisuals();
    playSound("rebirth");
    updateUI();
    const coinsDisplay = document.getElementById("rebirth_coins_display");
    if (coinsDisplay) coinsDisplay.textContent = "Rebirth Coins: " + rebirthCoins;
}

if (rebirthButton) rebirthButton.addEventListener("click", rebirth);

function triggerSpinAnimation() {
    if (!cookieContainer) return;
    cookieContainer.classList.remove("click_spin");
    void cookieContainer.offsetWidth;
    cookieContainer.classList.add("click_spin");
}

function spawnFloatingText(x, y, value) {
    const now = performance.now();
    if (now - lastFloatingTextTime < 20) return;
    lastFloatingTextTime = now;
    const el = document.createElement("div");
    el.className = "floating_click_text";
    el.textContent = "+" + value;
    el.style.setProperty("--random-x", ((Math.random() - 0.5) * 120) + "px");
    el.style.setProperty("--random-y", ((Math.random() * -60) - 60) + "px");
    el.style.left = x + "px";
    el.style.top = y + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

// ─── CLICK HANDLER ───
cookieButton.addEventListener("click", (e) => {
    manualClicks++;
    totalClicks++;
    lastActivityTime = Date.now();
    const hour = new Date().getHours();
    const min = new Date().getMinutes();
    if (hour === 0 && min === 0) midnightClicked = true;
    if (hour === 3) threeAmClicked = true;
    if (!lotteryWon && Math.random() < 0.00001) lotteryWon = true;
    let clickValue = Math.ceil(clickMultiplier * globalMultiplier);
    cookieCount += clickValue;
    spawnFloatingText(e.clientX, e.clientY, clickValue);
    triggerSpinAnimation();
    playSound("click");
    updateUI();
});

document.addEventListener("click", (e) => {
    const ignored = ["cookie_button", "achievements_button", "leaderboard_button", "rebirth_button", "rebirth_upgrade_button", "coin_reset", "afk_yes"];
    const ignoredClasses = ["upgrade", "upgrade_delete", "upgrade_icon", "upgrade_title", "upgrade_description", "upgrade_counter", "upgrade_price", "coin_upload", "skill_node", "golden_victor", "secret_victor", "achievement_popup", "close_skill_tree"];

    const isIgnored =
        ignored.includes(e.target.id) ||
        ignoredClasses.some(cls => e.target.classList.contains(cls)) ||
        e.target.closest(".upgrade") ||
        e.target.closest("nav") ||
        e.target.closest(".skill_tree_panel") ||
        e.target.closest(".achievement_popup") ||
        e.target === cookieButton;

    if (!isIgnored) {
        bgClicks++;
        lastActivityTime = Date.now();
    }
});

// ─── KEYBOARD ───
const SECRET_CODE = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
let secretCodeProgress = 0;
const OGABEEK = "Ogabeek";
let ogabeekProgress = 0;

document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !e.repeat) {
        const tag = document.activeElement ? document.activeElement.tagName : "";
        const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
        const isOtherButton = tag === "BUTTON" && document.activeElement !== cookieButton;
        if (!isTyping && !isOtherButton) {
            e.preventDefault();
            if (document.activeElement === cookieButton) cookieButton.blur();
            const rect = cookieButton.getBoundingClientRect();
            manualClicks++;
            totalClicks++;
            lastActivityTime = Date.now();
            const hour = new Date().getHours();
            if (hour === 0 && new Date().getMinutes() === 0) midnightClicked = true;
            if (hour === 3) threeAmClicked = true;
            if (!lotteryWon && Math.random() < 0.00001) lotteryWon = true;
            let clickValue = Math.ceil(clickMultiplier * globalMultiplier);
            cookieCount += clickValue;
            spawnFloatingText(rect.left + rect.width / 2, rect.top + rect.height / 2, clickValue);
            triggerSpinAnimation();
            playSound("click");
            updateUI();
        }
    }

    if (e.key === SECRET_CODE[secretCodeProgress]) {
        secretCodeProgress++;
        if (secretCodeProgress === SECRET_CODE.length) {
            secretCodeEntered = true;
            secretCodeProgress = 0;
            checkAchievements();
        }
    } else { secretCodeProgress = 0; }

    if (e.key === OGABEEK[ogabeekProgress]) {
        ogabeekProgress++;
        if (ogabeekProgress === OGABEEK.length) {
            ogabeekTyped = true;
            ogabeekProgress = 0;
            checkAchievements();
        }
    } else { ogabeekProgress = 0; }
});

// ─── PASSIVE INCOME ───
setInterval(() => {
    if (cookiesPerSecond > 0) {
        cookieCount += Math.ceil(cookiesPerSecond * globalMultiplier);
        updateUI();
    }
}, 1000);

// ─── SESSION TIMER ───
setInterval(() => { sessionSeconds++; }, 1000);

// ─── AFK ───
["click", "keydown", "mousemove"].forEach(evt => {
    document.addEventListener(evt, () => { lastActivityTime = Date.now(); });
});

function showAfkPrompt() {
    if (document.getElementById("afk_prompt")) return;
    const wasCps = cookiesPerSecond;
    cookiesPerSecond = 0;
    const prompt = document.createElement("div");
    prompt.id = "afk_prompt";
    prompt.innerHTML = `
        <div class="afk_inner">
            <h2>👋 Still there?</h2>
            <p>The game is paused. Are you still playing?</p>
            <button id="afk_yes">Yes, I'm here!</button>
        </div>
    `;
    document.body.appendChild(prompt);
    document.getElementById("afk_yes").addEventListener("click", () => {
        cookiesPerSecond = wasCps;
        lastActivityTime = Date.now();
        prompt.remove();
    });
}

setInterval(() => {
    if (Date.now() - lastActivityTime > 600000) showAfkPrompt();
}, 10000);

// ─── GOLDEN VICTOR ───
function spawnGoldenVictor() {
    if (document.getElementById("golden_victor")) return;
    const gv = document.createElement("img");
    gv.id = "golden_victor";
    gv.src = "res/coin.png";
    gv.classList.add("golden_victor");
    document.body.appendChild(gv);
    const startY = Math.random() * (window.innerHeight - 80);
    gv.style.top = startY + "px";
    gv.style.left = "-80px";
    let pos = -80;
    const interval = setInterval(() => {
        pos += 4;
        gv.style.left = pos + "px";
        if (pos > window.innerWidth + 80) { clearInterval(interval); if (gv.parentNode) gv.remove(); }
    }, 16);
    const autoRemove = setTimeout(() => {
        clearInterval(interval);
        if (gv.parentNode) gv.remove();
    }, 5000);
    gv.addEventListener("click", () => {
        clearInterval(interval);
        clearTimeout(autoRemove);
        goldenVictorClicked++;
        const boost = cookiesPerSecond;
        cookiesPerSecond *= 2;
        setTimeout(() => { cookiesPerSecond = boost; }, 10000);
        spawnFloatingText(pos, startY, "2x CPS for 10s!");
        gv.remove();
        checkAchievements();
        updateUI();
    });
}

setInterval(() => { if (Math.random() < 0.3) spawnGoldenVictor(); }, 60000);

// ─── SECRET VICTOR ───
function spawnSecretVictor() {
    const sv = document.createElement("img");
    sv.src = "res/upgrade_icons/clicker.png";
    sv.classList.add("secret_victor");
    sv.style.position = "fixed";
    sv.style.bottom = "5px";
    sv.style.right = "5px";
    sv.style.width = "20px";
    sv.style.height = "20px";
    sv.style.opacity = "0.15";
    sv.style.cursor = "pointer";
    sv.style.zIndex = "500";
    document.body.appendChild(sv);
    sv.addEventListener("click", () => {
        secretVictorFound = true;
        sv.remove();
        checkAchievements();
    });
}

spawnSecretVictor();

// ─── UPGRADES ───
function create(htmlStr) {
    const temp = document.createElement('div');
    temp.innerHTML = htmlStr;
    return temp.firstElementChild;
}

function addHandAroundCookie() {
    const hands = cookieContainer.querySelectorAll(".orbit_hand");
    const totalHands = hands.length;
    const newTotal = totalHands + 1;
    hands.forEach((hand, i) => { hand.style.setProperty("--angle", ((i * 360) / newTotal) + "deg"); });
    const hand = document.createElement("img");
    const upgradeClicker = upgrades.find(u => u.name === "clicker");
    hand.src = upgradeClicker ? upgradeClicker.iconUrl : "res/upgrade_icons/clicker.png";
    hand.classList.add("orbit_hand");
    hand.style.setProperty("--angle", ((totalHands * 360) / newTotal) + "deg");
    cookieContainer.appendChild(hand);
}

const farmBackgrounds = {
    flower:  "res/field.png",
    kid:     "res/field.png",
    garden:  "res/field.png",
    factory: "res/field.png",
};

function addFarmImage(upgrade) {
    if (upgrade.name === "clicker" || upgrade.name === "gym") return;
    const farmsSection = document.getElementById("farms_section");
    let panel = document.getElementById("farm_panel_" + upgrade.name);

    if (!panel) {
        panel = document.createElement("div");
        panel.classList.add("farm_panel");
        panel.id = "farm_panel_" + upgrade.name;

        // Set custom background per upgrade
        const bg = farmBackgrounds[upgrade.name];
        if (bg) panel.style.backgroundImage = `url("${bg}")`;

        farmsSection.appendChild(panel);
    }

    const img = document.createElement("img");
    img.src = upgrade.iconUrl;
    img.classList.add("farm_img");
    panel.appendChild(img);
}

function deleteUpgrade(upgrade, counterEl, el) {
    if (upgrade.count === 0) return;
    let refund = 0;
    let price = upgrade.price;
    for (let i = 0; i < upgrade.count; i++) {
        price = Math.ceil(price / 1.25);
        refund += price;
    }
    cookieCount += refund;

    if (upgrade.name === "clicker") {
        clickMultiplier -= upgrade.count;
        if (clickMultiplier < getBaseClickMultiplier()) clickMultiplier = getBaseClickMultiplier();
        cookieContainer.querySelectorAll(".orbit_hand").forEach(h => h.remove());
    }
    if (upgrade.name === "flower") { cookiesPerSecond -= upgrade.count; if (cookiesPerSecond < 0) cookiesPerSecond = 0; }
    if (upgrade.name === "kid") {
        // Restore CPS
        cookiesPerSecond -= upgrade.count * 4;
        if (cookiesPerSecond < 0) cookiesPerSecond = 0;
        // Restore the click multiplier that was lost when buying kid
        clickMultiplier += upgrade.count;
        if (clickMultiplier < getBaseClickMultiplier()) clickMultiplier = getBaseClickMultiplier();
    }
    if (upgrade.name === "gym") { clickMultiplier -= upgrade.count * 3; if (clickMultiplier < getBaseClickMultiplier()) clickMultiplier = getBaseClickMultiplier(); }
    if (upgrade.name === "garden") { cookiesPerSecond -= upgrade.count * 10; if (cookiesPerSecond < 0) cookiesPerSecond = 0; }
    if (upgrade.name === "factory") {
        cookiesPerSecond -= upgrade.count * 50;
        clickMultiplier -= upgrade.count * 2;
        if (cookiesPerSecond < 0) cookiesPerSecond = 0;
        if (clickMultiplier < getBaseClickMultiplier()) clickMultiplier = getBaseClickMultiplier();
    }

    const panel = document.getElementById("farm_panel_" + upgrade.name);
    if (panel) panel.remove();
    upgrade.count = 0;
    upgrade.price = upgrade.originalPrice;
    counterEl.textContent = "x0";
    el.querySelector(".upgrade_price").textContent = upgrade.price + "$";
    updateUI();
}

function buyUpgrade(upgrade, counterEl) {
    if (cookieCount < upgrade.price) return;
    cookieCount -= upgrade.price;
    upgrade.count++;
    if (upgrade.name === "clicker") { clickMultiplier++; addHandAroundCookie(); }
    if (upgrade.name === "flower") { cookiesPerSecond++; }
    if (upgrade.name === "kid") { if (clickMultiplier > getBaseClickMultiplier()) clickMultiplier--; cookiesPerSecond += 4; }
    if (upgrade.name === "gym") { clickMultiplier += 3; }
    if (upgrade.name === "garden") { cookiesPerSecond += 10; }
    if (upgrade.name === "factory") { cookiesPerSecond += 50; clickMultiplier += 2; }
    addFarmImage(upgrade);
    upgrade.price = Math.ceil(upgrade.price * 1.25);
    counterEl.textContent = "x" + upgrade.count;
    counterEl.closest(".upgrade").querySelector(".upgrade_price").textContent = upgrade.price + "$";
    playSound("buy");
    updateUI();
}

const upgradesWindow = document.getElementById("upgrades_window");

for (const upgrade of upgrades) {
    const el = create(`
        <div class="upgrade" id="upgrade_${upgrade.name}">
            <div class="upgrade_icon_container">
                <img class="upgrade_icon" src="">
                <a class="upgrade_price">100$</a>
            </div>
            <div class="upgrade_body">
                <a class="upgrade_title">Upgrade Text</a>
                <a class="upgrade_description">This is a really cool upgrade</a>
            </div>
            <a class="upgrade_counter">x0</a>
            <button class="upgrade_delete"><img src="res/upgrade_icons/bin.png" class="bin_image" width="25px" height="25px"></button>
        </div>
    `);

    el.querySelector(".upgrade_title").textContent = upgrade.title;
    el.querySelector(".upgrade_description").textContent = upgrade.description;
    el.querySelector(".upgrade_price").textContent = upgrade.price + "$";
    el.querySelector(".upgrade_counter").textContent = "x" + upgrade.count;
    el.querySelector(".upgrade_icon").setAttribute("src", upgrade.iconUrl);

    const counterEl = el.querySelector(".upgrade_counter");
    el.querySelector(".upgrade_delete").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteUpgrade(upgrade, counterEl, el);
    });

    let holdTimeout = null;
    let holdInterval = null;

    function startHold(e) {
        if (e.target.closest(".upgrade_delete")) return;
        buyUpgrade(upgrade, counterEl);
        holdTimeout = setTimeout(() => {
            holdInterval = setInterval(() => buyUpgrade(upgrade, counterEl), 100);
        }, 400);
    }

    function stopHold() {
        clearTimeout(holdTimeout);
        clearInterval(holdInterval);
        holdTimeout = null;
        holdInterval = null;
    }

    el.addEventListener("mousedown", startHold);
    el.addEventListener("mouseup", stopHold);
    el.addEventListener("mouseleave", stopHold);
    el.addEventListener("touchstart", (e) => { e.preventDefault(); startHold(e); }, { passive: false });
    el.addEventListener("touchend", stopHold);
    el.addEventListener("touchcancel", stopHold);

    upgradesWindow.appendChild(el);
}

// ─── RAIN ───
const canvas = document.getElementById("rain_canvas");
const ctx = canvas.getContext("2d");
const cookieWindow = document.querySelector(".cookie_window");

function resizeCanvas() {
    canvas.width = cookieWindow.clientWidth;
    canvas.height = cookieWindow.clientHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const rainImage = new Image();
rainImage.src = "res/cookie.png";

let drops = Array.from({ length: 40 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    speed: 2 + Math.random() * 3,
    size: 20 + Math.random() * 25,
    opacity: 0.2 + Math.random() * 0.4,
    wobble: Math.random() * Math.PI * 2,
}));

function drawRain() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drops.forEach(drop => {
        ctx.save();
        ctx.globalAlpha = drop.opacity;
        ctx.drawImage(rainImage, drop.x, drop.y, drop.size, drop.size);
        ctx.restore();
        drop.y += drop.speed;
        drop.x += Math.sin(drop.wobble) * 0.5;
        drop.wobble += 0.02;
        if (drop.y > canvas.height) { drop.y = -drop.size; drop.x = Math.random() * canvas.width; }
    });
    requestAnimationFrame(drawRain);
}

rainImage.onload = () => drawRain();
rainImage.onerror = () => {
    function drawFallbackRain() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drops.forEach(drop => {
            ctx.globalAlpha = drop.opacity;
            ctx.fillStyle = "#ff0000";
            ctx.fillRect(drop.x, drop.y, drop.size, drop.size);
            drop.y += drop.speed;
            drop.x += Math.sin(drop.wobble) * 0.5;
            drop.wobble += 0.02;
            if (drop.y > canvas.height) { drop.y = -drop.size; drop.x = Math.random() * canvas.width; }
        });
        requestAnimationFrame(drawFallbackRain);
    }
    drawFallbackRain();
};

// ─── COIN UPLOAD ───
const COIN_FACE_KEY = "siwatko_coin_face";
const coinUploadInput = document.getElementById("coin_upload_input");
const coinResetButton = document.getElementById("coin_reset");

function applyCoinFace(dataUrl) {
    cookieButton.style.backgroundImage = `url("${dataUrl}")`;
    cookieButton.classList.add("custom_face");
    coinResetButton.hidden = false;
    picChanged++;
    checkAchievements();
}

function resetCoinFace() {
    cookieButton.style.backgroundImage = "";
    cookieButton.classList.remove("custom_face");
    coinResetButton.hidden = true;
    localStorage.removeItem(COIN_FACE_KEY);
}

coinUploadInput.addEventListener("change", () => {
    const file = coinUploadInput.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        applyCoinFace(dataUrl);
        rainImage.src = dataUrl;
        try { localStorage.setItem(COIN_FACE_KEY, dataUrl); }
        catch (err) { console.warn("Could not save coin face:", err); }
    };
    reader.readAsDataURL(file);
    coinUploadInput.value = "";
});

coinResetButton.addEventListener("click", resetCoinFace);

const savedCoinFace = localStorage.getItem(COIN_FACE_KEY);
if (savedCoinFace) applyCoinFace(savedCoinFace);

updateUI();

// ─── SKILL TREE ───
const skillNodes = [
    { id: "root", label: "X", x: 550, y: 700, cost: 0, type: "start", unlocked: true, parent: null, desc: "Starting Point" },
    { id: "clicker_silver",  label: "🖱️", x: 400, y: 600, cost: 1, type: "silver",  target: "clicker", desc: "Silver Clicker",  unlocked: false, parent: "root",          newIcon: "res/upgrade_icons/clicker_silver.png" },
    { id: "clicker_gold",    label: "🖱️", x: 400, y: 500, cost: 3, type: "gold",    target: "clicker", desc: "Gold Clicker",    unlocked: false, parent: "clicker_silver", newIcon: "res/upgrade_icons/clicker_gold.png" },
    { id: "clicker_diamond", label: "🖱️", x: 300, y: 450, cost: 5, type: "diamond", target: "clicker", desc: "Diamond Clicker", unlocked: false, parent: "clicker_gold",   newIcon: "res/upgrade_icons/clicker_diamond.png" },
    { id: "flower_silver",   label: "🌸", x: 550, y: 530, cost: 1, type: "silver",  target: "flower",  desc: "Silver Flower",   unlocked: false, parent: "root",          newIcon: "res/upgrade_icons/flower_silver.png" },
    { id: "flower_gold",     label: "🌸", x: 550, y: 410, cost: 2, type: "gold",    target: "flower",  desc: "Gold Flower",     unlocked: false, parent: "flower_silver",  newIcon: "res/upgrade_icons/flower_gold.png" },
    { id: "flower_diamond",  label: "🌸", x: 550, y: 290, cost: 4, type: "diamond", target: "flower",  desc: "Diamond Flower",  unlocked: false, parent: "flower_gold",    newIcon: "res/upgrade_icons/flower_diamond.png" },
    { id: "mult_silver",     label: "🪙", x: 700, y: 600, cost: 1, type: "silver",  target: "global",  multiplier: 1.2, desc: "Silver Boost: 1.2x all income",  unlocked: false, parent: "root" },
    { id: "mult_gold",       label: "🪙", x: 700, y: 500, cost: 3, type: "gold",    target: "global",  multiplier: 1.4, desc: "Gold Boost: 1.4x all income",    unlocked: false, parent: "mult_silver" },
    { id: "mult_diamond",    label: "🪙", x: 800, y: 450, cost: 5, type: "diamond", target: "global",  multiplier: 2.0, desc: "Diamond Boost: 2.0x all income", unlocked: false, parent: "mult_gold" },
];

function toggleupgrades() {
    const panel = document.getElementById("skill_tree_panel");
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) drawSkillTree();
}

function drawSkillTree() {
    const mapEl = document.getElementById("skill_tree_map");
    mapEl.innerHTML = "";
    document.getElementById("rebirth_coins_display").textContent = "Rebirth Coins: " + rebirthCoins;

    skillNodes.forEach(node => {
        const div = document.createElement("div");
        div.className = `skill_node ${node.type}`;
        div.style.left = node.x + "px";
        div.style.top = node.y + "px";

        if (node.newIcon && node.type !== "start") {
            div.style.backgroundImage = `url("${node.newIcon}")`;
            div.textContent = "";
        } else {
            div.textContent = node.label;
        }

        let isLocked = false;
        if (node.parent) {
            const parentNode = skillNodes.find(n => n.id === node.parent);
            if (!parentNode || !parentNode.unlocked) isLocked = true;
        }

        if (isLocked && !node.unlocked) {
            div.classList.add("locked");
            div.setAttribute("data-tooltip", "Locked (Upgrade previous node first)");
        } else if (node.unlocked) {
            div.setAttribute("data-tooltip", `${node.desc} (UNLOCKED)`);
            div.style.boxShadow = "0 0 12px gold";
        } else {
            div.setAttribute("data-tooltip", `${node.desc} - Cost: ${node.cost} RC`);
        }

        div.addEventListener("click", () => {
            if (isLocked || node.unlocked) return;
            if (rebirthCoins >= node.cost) {
                rebirthCoins -= node.cost;
                node.unlocked = true;
                playSound("buy");
                applySkillUpgrade(node);
                drawSkillTree();
            } else {
                alert("Not enough Rebirth Coins!");
            }
        });

        mapEl.appendChild(div);
    });
}

function applySkillUpgrade(node) {
    if (node.target === "global") {
        globalMultiplier = node.multiplier;
    } else {
        const gameUpgrade = upgrades.find(u => u.name === node.target);
        if (gameUpgrade) {
            if (node.newIcon) {
                gameUpgrade.iconUrl = node.newIcon;
                const imgEl = document.querySelector(`#upgrade_${gameUpgrade.name} .upgrade_icon`);
                if (imgEl) imgEl.src = node.newIcon;
                if (gameUpgrade.name === "clicker") {
                    cookieContainer.querySelectorAll(".orbit_hand").forEach(hand => { hand.src = node.newIcon; });
                }
            }
            const titleEl = document.querySelector(`#upgrade_${gameUpgrade.name} .upgrade_title`);
            if (titleEl) titleEl.textContent = node.type.toUpperCase() + " " + gameUpgrade.name.toUpperCase();
        }
    }
    updateUI();
}

const viewport = document.getElementById("skill_tree_viewport");
const mapEl = document.getElementById("skill_tree_map");
let isDown = false;
let startX, startY, originX, originY;

viewport.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("skill_node") && !e.target.classList.contains("locked")) return;
    isDown = true;
    startX = e.clientX;
    startY = e.clientY;
    originX = mapEl.offsetLeft;
    originY = mapEl.offsetTop;
});

viewport.addEventListener("mouseleave", () => isDown = false);
viewport.addEventListener("mouseup", () => isDown = false);
viewport.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    mapEl.style.left = (originX + (e.clientX - startX)) + "px";
    mapEl.style.top = (originY + (e.clientY - startY)) + "px";
});

// ─── TUTORIAL ───
let tutorialStep = 0;
const TUTORIAL_KEY = "siwatko_tutorial_done";

function nextTutorialStep() {
    const current = document.getElementById("tutorial_step_" + tutorialStep);
    if (current) current.classList.add("hidden");
    tutorialStep++;
    const next = document.getElementById("tutorial_step_" + tutorialStep);
    if (next) next.classList.remove("hidden");
}

function closeTutorial() {
    const overlay = document.getElementById("tutorial_overlay");
    if (overlay) {
        overlay.classList.add("tutorial_fade_out");
        setTimeout(() => overlay.remove(), 400);
    }
    localStorage.setItem(TUTORIAL_KEY, "done");
}

// Only show tutorial on first visit
if (!localStorage.getItem(TUTORIAL_KEY)) {
    document.getElementById("tutorial_overlay").style.display = "flex";
} else {
    document.getElementById("tutorial_overlay").remove();
}