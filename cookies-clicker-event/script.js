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
const rebirthText = document.getElementById("rebirth_text");

let cookieCount = 0;
let cookiesPerSecond = 0;
let clickMultiplier = 1;
let totalClicks = 0;

let rebirths = 0;
const REBIRTH_BASE_COST = 100000;

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
    { id: "vic_10000",  name: "Victor Master",  desc: "Reach 10,000 Coins",  icon: "🏆", unlocked: false, check: () => cookieCount >= 10000 },
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
    counterText.textContent = cookieCount + " Coins";
    rateText.textContent = cookiesPerSecond + " Coins per second | " + clickMultiplier + " Coins per click";
    updateRebirthUI();
    checkAchievements();
}

updateUI();

function updateRebirthUI() {
    if (!rebirthButton || !rebirthText) return;

    const cost = getRebirthCost();
    rebirthButton.disabled = cookieCount < cost;
    rebirthText.textContent = "Rebirths: " + rebirths + " | Cost: " + cost + " Coins | Bonus: +" + rebirths + " per click";
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
    cookieCount = 0;
    cookiesPerSecond = 0;
    clickMultiplier = getBaseClickMultiplier();

    resetUpgradeElements();
    clearUpgradeVisuals();
    updateUI();
}

if (rebirthButton) {
    rebirthButton.addEventListener("click", rebirth);
}

// --- Floating +N text ---
function spawnFloatingText(x, y, value) {
    const el = document.createElement("div");
    el.textContent = "+" + value;
    el.style.cssText = [
        "position:fixed",
        "left:" + x + "px",
        "top:" + y + "px",
        "pointer-events:none",
        "font-size:22px",
        "font-weight:700",
        "color:#f4c20d",
        "text-shadow:0 1px 4px rgba(0,0,0,0.5)",
        "transform:translateX(-50%)",
        "transition:top 0.8s ease-out,opacity 0.8s ease-out",
        "z-index:9999",
        "user-select:none",
    ].join(";");
    document.body.appendChild(el);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.style.top = (y - 70) + "px";
            el.style.opacity = "0";
        });
    });
    setTimeout(() => el.remove(), 900);
}

cookieButton.addEventListener("click", (e) => {
    totalClicks++;
    cookieCount += clickMultiplier;
    spawnFloatingText(e.clientX, e.clientY, clickMultiplier);
    updateUI();
});

// --- Mezerník pro klikání (jen jeden stisk, ne držení) ---
document.addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    if (e.repeat) return;

    const tag = document.activeElement ? document.activeElement.tagName : "";
    const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    const isOtherButton = tag === "BUTTON" && document.activeElement !== cookieButton;
    if (isTyping || isOtherButton) return;

    e.preventDefault();
    if (document.activeElement === cookieButton) cookieButton.blur();

    const rect = cookieButton.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    totalClicks++;
    cookieCount += clickMultiplier;
    spawnFloatingText(cx, cy, clickMultiplier);
    updateUI();
});

setInterval(() => {
    if (cookiesPerSecond > 0) {
        cookieCount += cookiesPerSecond;
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
    hand.src = "res/upgrade_icons/clicker.png";
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

    if (upgrade.name === "flower") {
        cookiesPerSecond -= upgrade.count;
        if (cookiesPerSecond < 0) cookiesPerSecond = 0;
    }

    if (upgrade.name === "kid") {
        cookiesPerSecond -= upgrade.count * 4;
        if (cookiesPerSecond < 0) cookiesPerSecond = 0;
    }

    if (upgrade.name === "gym") {
        clickMultiplier -= upgrade.count * 3;
        if (clickMultiplier < getBaseClickMultiplier()) clickMultiplier = getBaseClickMultiplier();
    }

    if (upgrade.name === "garden") {
        cookiesPerSecond -= upgrade.count * 10;
        if (cookiesPerSecond < 0) cookiesPerSecond = 0;
    }

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

    if (upgrade.name === "clicker") {
        clickMultiplier++;
        addHandAroundCookie();
    }

    if (upgrade.name === "flower") {
        cookiesPerSecond++;
    }

    if (upgrade.name === "kid") {
        if (clickMultiplier > getBaseClickMultiplier()) clickMultiplier--;
        cookiesPerSecond += 4;
    }

    if (upgrade.name === "gym") {
        clickMultiplier += 3;
    }

    if (upgrade.name === "garden") {
        cookiesPerSecond += 10;
    }

    if (upgrade.name === "factory") {
        cookiesPerSecond += 50;
        clickMultiplier += 2;
    }

    addFarmImage(upgrade);

    upgrade.price = Math.ceil(upgrade.price * 1.25);
    counterEl.textContent = "x" + upgrade.count;
    counterEl.closest(".upgrade").querySelector(".upgrade_price").textContent = upgrade.price + "$";

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

    // Hold-to-buy: první nákup okamžitě, po 400ms začne opakovat každých 100ms
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

rainImage.onload = () => {
    console.log("Rain image loaded! Starting animation...");
    drawRain();
};

rainImage.onerror = () => {
    alert("⚠️ ERROR: Cannot find 'res/cookie.png'!\n\nCheck that the file exists, is named correctly, and is a .png file.");

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
