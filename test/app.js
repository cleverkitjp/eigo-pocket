/* =========
   えいごポケット：UI優先（ロジックは最小）
   - words.json を読み込み
   - ステージ横スクロール（数字＋和名）
   - カードをタップでくるっと裏返す（表：えいご+はつおん / 裏：にほんご）
   - まえへ/つぎへ
   - スタンプ表示（仮ロジック：localStorage）
   ========= */

const STAGES = [
  { id: 1, name: "ことばの森" },
  { id: 2, name: "ことばの川" },
  { id: 3, name: "おんがくの丘" },
  { id: 4, name: "ひかりの草原" },
  { id: 5, name: "ともだちの町" },
  { id: 6, name: "いろの谷" },
  { id: 7, name: "じかんの森" },
  { id: 8, name: "まいにちの道" },
  { id: 9, name: "いろいろカラー" },
  { id: 10, name: "ことばの塔" },
];

// --- 称号（ざっくり。後で確定データに差し替えOK）
const TITLES = [
  "ひよこ",
  "みならい",
  "いっちょまえ",
  "たつじん",
  "めいじん",
  "せんせい",
  "マスター",
  "レジェンド",
  "えいごのたつじん",
];

// DOM
const stageStrip = document.getElementById("stageStrip");
const stageHead = document.getElementById("stageHead");

const flipWrap = document.getElementById("flipWrap");
const flip = document.getElementById("flip");
const englishText = document.getElementById("englishText");
const kanaText = document.getElementById("kanaText");
const japaneseText = document.getElementById("japaneseText");
const progressText = document.getElementById("progressText");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const speakBtn = document.getElementById("speakBtn");

const miniHint = document.getElementById("miniHint");
const todayStars = document.getElementById("todayStars");
const totalStampsEl = document.getElementById("totalStamps");
const rankText = document.getElementById("rankText");
const miniTestBtn = document.getElementById("miniTestBtn");

// state
let words = [];
let currentStageId = 1;
let stageItems = [];
let index = 0;

// ========= storage helpers =========
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}

// seen cards (for mini-test countdown)
function seenStoreKey(stageId) {
  return `eigoPocket.seen.${todayKey()}.stage${stageId}`;
}
function getSeenSet(stageId) {
  const arr = loadJSON(seenStoreKey(stageId), []);
  return new Set(arr);
}
function saveSeenSet(stageId, set) {
  saveJSON(seenStoreKey(stageId), Array.from(set));
}

// stamps
const TOTAL_STAMPS_KEY = "eigoPocket.totalStamps";
function getTotalStamps() {
  return Number(localStorage.getItem(TOTAL_STAMPS_KEY) || "0");
}
function setTotalStamps(n) {
  localStorage.setItem(TOTAL_STAMPS_KEY, String(n));
}
function dailyStampsKey() {
  return `eigoPocket.dailyStamps.${todayKey()}`;
}
function getDailyStamps() {
  return Number(localStorage.getItem(dailyStampsKey()) || "0");
}
function setDailyStamps(n) {
  localStorage.setItem(dailyStampsKey(), String(n));
}

// ========= UI: stage strip =========
function renderStageStrip() {
  stageStrip.innerHTML = "";
  for (const s of STAGES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "stage-btn" + (s.id === currentStageId ? " active" : "");
    btn.dataset.stageId = String(s.id);
    btn.innerHTML = `
      <div class="n">${s.id}</div>
      <div class="name">${s.name}</div>
    `;
    btn.addEventListener("click", () => {
      if (currentStageId === s.id) return;
      currentStageId = s.id;
      index = 0;
      flip.classList.remove("is-flipped");
      applyStage();
      renderStageStrip();
    });
    stageStrip.appendChild(btn);
  }
}

// ========= data =========
async function loadWords() {
  const res = await fetch("words.json", { cache: "no-store" });
  if (!res.ok) throw new Error("words.json が読み込めません");
  const data = await res.json();
  // 期待：配列
  if (!Array.isArray(data)) throw new Error("words.json の形式が不正です（配列ではない）");
  words = data;
}

// ========= stage apply =========
function applyStage() {
  stageItems = words.filter(w => Number(w.stageId) === Number(currentStageId));
  if (index >= stageItems.length) index = 0;

  const stageName = (STAGES.find(s => s.id === currentStageId)?.name) || "";
  stageHead.textContent = `ステージ${currentStageId}｜${stageName}`;

  renderCard();
  updateMiniHint();
  updateStampUI();
}

// ========= card render =========
function renderCard() {
  const total = stageItems.length;

  if (total === 0) {
    englishText.textContent = "データなし";
    kanaText.textContent = "";
    japaneseText.textContent = "";
    progressText.textContent = "0/0";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    speakBtn.disabled = true;
    return;
  }

  const item = stageItems[index];

  // 表（えいご + はつおん（kana））
  englishText.textContent = item.english || "";
  kanaText.textContent = item.kana ? item.kana : "";

  // 裏（にほんご）
  japaneseText.textContent = item.japanese || "";

  progressText.textContent = `${index + 1}/${total}`;

  prevBtn.disabled = (index === 0);
  nextBtn.disabled = (index === total - 1);

  // 次へ/前へで「見た」扱い（ミニテストカウント用）
  markSeen(item);
}

// seen mark
function markSeen(item) {
  if (!item || item.id == null) return;
  const set = getSeenSet(currentStageId);
  const key = String(item.id);
  if (!set.has(key)) {
    set.add(key);
    saveSeenSet(currentStageId, set);
  }
}

// ========= flip logic =========
function toggleFlip() {
  flip.classList.toggle("is-flipped");
}

// カード本体タップでめくる（ボタン以外）
flipWrap.addEventListener("click", (e) => {
  // 発音ボタン押下はカードめくりにしない
  if (e.target && (e.target.closest && e.target.closest("#speakBtn"))) return;
  toggleFlip();
});
flipWrap.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    toggleFlip();
  }
});

// ========= nav =========
prevBtn.addEventListener("click", () => {
  if (index <= 0) return;
  index -= 1;
  flip.classList.remove("is-flipped");
  renderCard();
  updateMiniHint();
});

nextBtn.addEventListener("click", () => {
  if (index >= stageItems.length - 1) return;
  index += 1;
  flip.classList.remove("is-flipped");
  renderCard();
  updateMiniHint();
});

// ========= speech =========
function speak(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // 英語は en-US が無難（端末により差）
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {
    // noop
  }
}
speakBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const t = (stageItems[index]?.english || "").trim();
  if (t) speak(t);
});

// ========= mini hint =========
// 仮仕様：1ステージにつき「10まい見たら」ミニテスト（見た＝その日のseen）
function updateMiniHint() {
  const set = getSeenSet(currentStageId);
  const seen = set.size;
  const mod = seen % 10;
  const remain = (mod === 0) ? 0 : (10 - mod);
  miniHint.textContent = `あと${remain}まいおぼえたらミニテストだよ`;
}

// ========= stamps UI (仮) =========
function calcRank(totalStamps) {
  // Lv：20個で1Lv（1スタート）
  const lv = Math.floor(totalStamps / 20) + 1;
  // 称号：Lv3ごとに1段（上限は最後で固定）
  const tIndex = Math.min(Math.floor((lv - 1) / 3), TITLES.length - 1);
  const title = TITLES[tIndex];
  return { title, lv };
}

function updateStampUI() {
  const daily = getDailyStamps();
  const total = getTotalStamps();

  // 今日の★（10こまで）
  const filled = Math.max(0, Math.min(10, daily));
  const stars = "★".repeat(filled) + "✩".repeat(10 - filled);
  todayStars.textContent = stars;

  // 累計
  totalStampsEl.textContent = String(total);

  const { title, lv } = calcRank(total);
  rankText.textContent = `${title} Lv.${lv}`;
}

// ミニテストはまだロジック未実装：押したら仮でスタンプ付与（デザイン確認用）
miniTestBtn.addEventListener("click", () => {
  // 仮：毎回「全問正解」扱いで1個付与、ただし1日10こまで
  const daily = getDailyStamps();
  if (daily >= 10) {
    alert("きょうのスタンプは 10こ までだよ！");
    return;
  }
  setDailyStamps(daily + 1);
  setTotalStamps(getTotalStamps() + 1);
  updateStampUI();
});

// ========= init =========
(async function init() {
  renderStageStrip();
  try {
    await loadWords();
  } catch (e) {
    console.error(e);
    englishText.textContent = "words.json を読み込めませんでした";
    kanaText.textContent = "";
    japaneseText.textContent = "";
    progressText.textContent = "0/0";
    return;
  }
  applyStage();
})();
