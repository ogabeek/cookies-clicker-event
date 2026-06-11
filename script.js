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

// Inicializace upgradů - cesty k obrázkům jsou nastaveny modulárně
const upgrades = [
    new Upgrade("clicker", "Clicker", "Multiplies cookies per click", "res/upgrade_icons/clicker.png", 15, 0),
    new Upgrade("flower", "VictorFlower", "Nice flower does cool stuff", "res/upgrade_icons/flower.png", 45, 0),
    new Upgrade("kid", "VictorKid", "Clicks 4x automatically but weakens your click by 1", "res/upgrade_icons/kid-victor.png", 85, 0),
    new Upgrade("gym", "VictorGym", "Trains your click for +3 Victors per click", "res/upgrade_icons/clicker.png", 100, 0),
    new Upgrade("garden", "VictorGarden", "Grows +10 Victors automatically every second", "res/upgrade_icons/flower.png", 175, 0),
    new Upgrade("factory", "VictorFactory", "Produces +50 Victors per second and +2 Victors per click", "res/upgrade_icons/kid-victor.png", 225, 0),
];

upgrades.forEach(u => u.originalPrice = u.price);

const cookieButton = document.getElementById("cookie_button");
const counterText = document.getElementById("counter_text");
const rateText = document.querySelector(".rate_text");
const cookieContainer = document.querySelector(".cookie_container");
const rebirthButton = document.getElementById("rebirth_button");

let cookieCount = 0;
let cookiesPerSecond = 0;
let clickMultiplier = 1;
let totalClicks = 0;

let rebirths = 0;
const REBIRTH_BASE_COST = 100000;

let rebirthCoins = 0;
let globalMultiplier = 1.0;

// Ochrana autoclickeru - zaznamenání času posledního vytvořeného textu
let lastFloatingTextTime = 0; 

// --- AUDIO SYSTÉM (Modulární správa zvuků) ---
const sounds = {
    bg: new Audio("sounds/bg.mp3"),
    click: new Audio("sounds/click.mp3"),
    buy: new Audio("sounds/buy.mp3"),
    rebirth: new Audio("sounds/rebirth.mp3")
};

sounds.bindBg = false;
sounds.bg.loop = true;
sounds.bg.volume = 0.4;

function playSound(soundName) {
    if (sounds[soundName]) {
        sounds[soundName].currentTime = 0;
        sounds[soundName].play().catch(() => {});
    }
}

function handleFirstInteractionHudba() {
    if (!sounds.bindBg) {
        sounds.bg.play().catch(() => {});
        sounds.bindBg = true;
    }
}

function getRebirthCost() {
    return REBIRTH_BASE_COST * (rebirths + 1);
}

function getBaseClickMultiplier() {
    return 1 + rebirths;
}

// Achievements
const achievements = [
    { id: "vic_100",    name: "Baby Victor",    desc: "Reach 100 Coins",     icon: "🍪", unlocked: false, check: () => cookieCount >= 100 },
    { id: "vic_1000",   name: "Victor Enjoyer", desc: "Reach 1,000 Coins",   icon: "⭐", unlocked: false, check: () => cookieCount >= 1000 },
    { id: "vic_10000",  name: "Victor Master",  desc: "Reach 1,000 Coins",  icon: "🏆", unlocked: false, check: () => cookieCount >= 10000 },
    { id: "vic_100000", name: "Victor God",     desc: "Reach 100,000 Coins", icon: "👑", unlocked: false, check: () => cookieCount >= 100000 },
    { id: "click_666666", name: "Number of the beast", desc: "Reach 666,666 Coins", icon: "🔥", unlocked: false, check: () => totalClicks >= 666666 },
];

let popupQueue = [];
let popupShowing = false;

function showNextPopup() {
    if (popupQueue.length === 0) {
        popupShowing = false;
        return;
    }

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

    requestAnimationFrame(() => {
        requestAnimationFrame(() => popup.classList.add("show"));
    });

    setTimeout(() => {
        popup.classList.remove("show");
        setTimeout(() => {
            popup.remove();
            showNextPopup();
        }, 500);
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
    panel.classList.toggle("open");

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
}

function updateUI() {
    counterText.textContent = cookieCount.toLocaleString() + " Coins";
    
    let activeCps = Math.ceil(cookiesPerSecond * globalMultiplier);
    let activeCpc = Math.ceil(clickMultiplier * globalMultiplier);
    
    rateText.textContent = activeCps.toLocaleString() + " Coins per second | " + activeCpc.toLocaleString() + " Coins per click";
    updateRebirthUI();
    checkAchievements();
}

// Logika plnění progress baru uvnitř samotného Rebirth tlačítka
function updateRebirthUI() {
    const cost = getRebirthCost();
    const btnFill = document.getElementById("rebirth_btn_fill");
    const btnText = document.getElementById("rebirth_btn_text");

    if (!rebirthButton || !btnFill || !btnText) return;

    let percentage = (cookieCount / cost) * 100;
    if (percentage > 100) percentage = 100;

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

function clearUpgradeVisuals() {
    cookieContainer.querySelectorAll(".orbit_hand").forEach(hand => hand.remove());

    const farmsSection = document.getElementById("farms_section");
    if (farmsSection) {
        const panels = farmsSection.querySelectorAll(".farm_panel");
        panels.forEach(p => p.remove());
    }
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

if (rebirthButton) {
    rebirthButton.addEventListener("click", rebirth);
}

function triggerSpinAnimation() {
    if (!cookieContainer) return;
    cookieContainer.classList.remove("click_spin");
    void cookieContainer.offsetWidth; 
    cookieContainer.classList.add("click_spin");
}

// --- Plynulý Floating +N text optimalizovaný pro autoclicker ---
function spawnFloatingText(x, y, value) {
    const now = performance.now();
    if (now - lastFloatingTextTime < 20) return;
    lastFloatingTextTime = now;

    const el = document.createElement("div");
    el.className = "floating_click_text";
    el.textContent = "+" + value;
    
    const randomX = (Math.random() - 0.5) * 120; 
    const randomY = (Math.random() * -60) - 60;  

    el.style.setProperty("--random-x", randomX + "px");
    el.style.setProperty("--random-y", randomY + "px");
    el.style.left = x + "px";
    el.style.top = y + "px";
    
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

cookieButton.addEventListener("click", (e) => {
    handleFirstInteractionHudba();
    totalClicks++;
    let clickValue = Math.ceil(clickMultiplier * globalMultiplier);
    cookieCount += clickValue;
    spawnFloatingText(e.clientX, e.clientY, clickValue);
    triggerSpinAnimation(); 
    playSound("click"); 
    updateUI();
});

document.addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    if (e.repeat) return;

    const tag = document.activeElement ? document.activeElement.tagName : "";
    const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    const isOtherButton = tag === "BUTTON" && document.activeElement !== cookieButton;
    if (isTyping || isOtherButton) return;

    e.preventDefault();
    if (document.activeElement === cookieButton) cookieButton.blur();

    handleFirstInteractionHudba();
    const rect = cookieButton.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    totalClicks++;
    
    let clickValue = Math.ceil(clickMultiplier * globalMultiplier);
    cookieCount += clickValue;
    spawnFloatingText(cx, cy, clickValue);
    triggerSpinAnimation(); 
    playSound("click");
    updateUI();
});

setInterval(() => {
    if (cookiesPerSecond > 0) {
        cookieCount += Math.ceil(cookiesPerSecond * globalMultiplier);
        updateUI();
    }
}, 1000);

function create(htmlStr) {
    const temp = document.createElement('div');
    temp.innerHTML = htmlStr;
    return temp.firstElementChild;
}

function addHandAroundCookie() {
    const hands = cookieContainer.querySelectorAll(".orbit_hand");
    const totalHands = hands.length;
    const newTotal = totalHands + 1;

    hands.forEach((hand, i) => {
        const newAngle = (i * 360) / newTotal;
        hand.style.setProperty("--angle", newAngle + "deg");
    });

    const hand = document.createElement("img");
    const upgradeClicker = upgrades.find(u => u.name === "clicker");
    hand.src = upgradeClicker ? upgradeClicker.iconUrl : "res/upgrade_icons/clicker.png";
    hand.classList.add("orbit_hand");
    hand.style.setProperty("--angle", ((totalHands * 360) / newTotal) + "deg");
    cookieContainer.appendChild(hand);
}

function addFarmImage(upgrade) {
    if (upgrade.name === "clicker" || upgrade.name === "gym") return;

    const farmsSection = document.getElementById("farms_section");
    let panel = document.getElementById("farm_panel_" + upgrade.name);

    if (!panel) {
        panel = document.createElement("div");
        panel.classList.add("farm_panel");
        panel.id = "farm_panel_" + upgrade.name;
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
    if (upgrade.name === "kid") { cookiesPerSecond -= upgrade.count * 4; if (cookiesPerSecond < 0) cookiesPerSecond = 0; }
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

// --- Rain effect ---
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

        if (drop.y > canvas.height) {
            drop.y = -drop.size;
            drop.x = Math.random() * canvas.width;
        }
    });

    requestAnimationFrame(drawRain);
}

rainImage.onload = () => { drawRain(); };

rainImage.onerror = () => {
    ctx.fillStyle = "#ff0000";
    function drawFallbackRain() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drops.forEach(drop => {
            ctx.globalAlpha = drop.opacity;
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

// --- Custom coin face logic ---
const COIN_FACE_KEY    = "siwatko_coin_face";
const COIN_FACE_SIZE   = 512;
const COIN_FACE_RADIUS = 0.34;
const COIN_FACE_OPAQUE = 0.90;
const coinUploadInput  = document.getElementById("coin_upload_input");
const coinResetButton  = document.getElementById("coin_reset");

const coinFrame = new Image();
coinFrame.src = "res/coin.png";

function applyCoinFace(dataUrl) {
    cookieButton.style.backgroundImage = `url("${dataUrl}")`;
    cookieButton.classList.add("custom_face");
    coinResetButton.hidden = false;
}

function resetCoinFace() {
    cookieButton.style.backgroundImage = "";
    cookieButton.classList.remove("custom_face");
    coinResetButton.hidden = true;
    localStorage.removeItem(COIN_FACE_KEY);
}

function buildCoinFace(image) {
    const S = COIN_FACE_SIZE;
    const cx = S / 2, cy = S / 2;
    const r = S * COIN_FACE_RADIUS;
    const box = r * 2;

    const side = Math.min(image.width, image.height);
    const sx = (image.width - side) / 2;
    const sy = (image.height - side) / 2;

    const face = document.createElement("canvas");
    face.width = face.height = S;
    const f = face.getContext("2d");

    f.drawImage(image, sx, sy, side, side, cx - r, cy - r, box, box);
    f.globalCompositeOperation = "soft-light";
    f.globalAlpha = 0.35;
    f.fillStyle = "#f4c20d";
    f.fillRect(cx - r, cy - r, box, box);

    f.globalCompositeOperation = "source-over";
    f.globalAlpha = 1;
    const wash = f.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
    wash.addColorStop(0,    "rgba(244,194,13,0.04)");
    wash.addColorStop(0.55, "rgba(244,194,13,0.34)");
    wash.addColorStop(0.85, "rgba(247,198,30,0.72)");
    wash.addColorStop(1,    "rgba(250,202,20,0.95)");
    f.fillStyle = wash;
    f.fillRect(cx - r, cy - r, box, box);

    f.globalCompositeOperation = "destination-in";
    const mask = f.createRadialGradient(cx, cy, r * COIN_FACE_OPAQUE, cx, cy, r);
    mask.addColorStop(0, "rgba(0,0,0,1)");
    mask.addColorStop(1, "rgba(0,0,0,0)");
    f.fillStyle = mask;
    f.fillRect(0, 0, S, S);

    const out = document.createElement("canvas");
    out.width = out.height = S;
    const o = out.getContext("2d");
    o.drawImage(coinFrame, 0, 0, S, S);
    o.drawImage(face, 0, 0);

    return out.toDataURL("image/webp", 0.92);
}

coinUploadInput.addEventListener("change", () => {
    const file = coinUploadInput.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
        const finish = () => {
            const dataUrl = buildCoinFace(image);
            URL.revokeObjectURL(objectUrl);
            applyCoinFace(dataUrl);
            try {
                localStorage.setItem(COIN_FACE_KEY, dataUrl);
            } catch (e) {
                console.warn("Could not save coin face (storage full?):", e);
            }
        };
        if (coinFrame.complete && coinFrame.naturalWidth) finish();
        else coinFrame.addEventListener("load", finish, { once: true });
    };
    image.onerror = () => URL.revokeObjectURL(objectUrl);
    image.src = objectUrl;

    coinUploadInput.value = "";
});

coinResetButton.addEventListener("click", resetCoinFace);

const savedCoinFace = localStorage.getItem(COIN_FACE_KEY);
if (savedCoinFace) applyCoinFace(savedCoinFace);

updateUI();


// ─── REBIRTH SKILL TREE LOGIC ───

const skillNodes = [
    { id: "root", label: "X", x: 550, y: 700, cost: 0, type: "start", unlocked: true, parent: null, desc: "Starting Point" },
    
    // Levá větev - Clicker Upgrady
    { id: "clicker_silver", label: "🖱️", x: 400, y: 600, cost: 1, type: "silver", target: "clicker", desc: "Silver Clicker: Unlocks Silver Rank Upgrade", unlocked: false, parent: "root", newIcon: "res/upgrade_icons/clicker_silver.png" },
    { id: "clicker_gold", label: "🖱️", x: 400, y: 500, cost: 3, type: "gold", target: "clicker", desc: "Gold Clicker: Unlocks Gold Rank Upgrade", unlocked: false, parent: "clicker_silver", newIcon: "res/upgrade_icons/clicker_gold.png" },
    { id: "clicker_diamond", label: "🖱️", x: 300, y: 450, cost: 5, type: "diamond", target: "clicker", desc: "Diamond Clicker: Unlocks Diamond Rank Upgrade", unlocked: false, parent: "clicker_gold", newIcon: "res/upgrade_icons/clicker_diamond.png" },

    // Prostřední větev - Flower Upgrady
    { id: "flower_silver", label: "🌸", x: 550, y: 530, cost: 1, type: "silver", target: "flower", desc: "Silver Flower: Unlocks Silver Rank Flower", unlocked: false, parent: "root", newIcon: "res/upgrade_icons/flower_silver.png" },
    { id: "flower_gold", label: "🌸", x: 550, y: 410, cost: 2, type: "gold", target: "flower", desc: "Gold Flower: Unlocks Gold Rank Flower", unlocked: false, parent: "flower_silver", newIcon: "res/upgrade_icons/flower_gold.png" },
    { id: "flower_diamond", label: "🌸", x: 550, y: 290, cost: 4, type: "diamond", target: "flower", desc: "Diamond Flower: Unlocks Diamond Rank Flower", unlocked: false, parent: "flower_gold", newIcon: "res/upgrade_icons/flower_diamond.png" },
    
    // Pravá větev - Globální multiplikátor (*1.2, *1.4, *2.0)
    { id: "mult_silver", label: "🪙", x: 700, y: 600, cost: 1, type: "silver", target: "global", multiplier: 1.2, desc: "Silver Boost: Multiplies all incomes by 1.2x", unlocked: false, parent: "root" },
    { id: "mult_gold", label: "🪙", x: 700, y: 500, cost: 3, type: "gold", target: "global", multiplier: 1.4, desc: "Gold Boost: Multiplies all incomes by 1.4x", unlocked: false, parent: "mult_silver" },
    { id: "mult_diamond", label: "🪙", x: 800, y: 450, cost: 5, type: "diamond", target: "global", multiplier: 2.0, desc: "Diamond Boost: Multiplies all incomes by 2.0x", unlocked: false, parent: "mult_gold" }
];

function toggleupgrades() {
    const panel = document.getElementById("skill_tree_panel");
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) {
        drawSkillTree();
    }
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

// FIX: Aktualizuje ranky, obrázky a obíhající ruce bez rozbíjení ID v DOMu
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
                    cookieContainer.querySelectorAll(".orbit_hand").forEach(hand => {
                        hand.src = node.newIcon;
                    });
                }
            }
            
            const hrdTitle = node.type.toUpperCase() + " " + gameUpgrade.name.toUpperCase();
            const titleEl = document.querySelector(`#upgrade_${gameUpgrade.name} .upgrade_title`);
            if (titleEl) titleEl.textContent = hrdTitle;
        }
    }
    updateUI();
}

// Draggable mapa uvnitř viewportu pro Skill Tree
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
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    mapEl.style.left = (originX + deltaX) + "px";
    mapEl.style.top = (originY + deltaY) + "px";
});