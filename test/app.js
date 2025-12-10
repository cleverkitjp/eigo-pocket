// ======================================
//  えいごポケット：words.json対応版
//  - 外部データ(words.json)読み込み
//  - posベース4択ミニテスト
//  - Stage2以降：下位ステージからの復習出題(約30%)
// ======================================

// ---------- 外部データ ----------

let ALL_ITEMS = [];          // words.json の全レコード
let ITEMS_BY_STAGE = new Map(); // stageId -> items[]
let MAX_STAGE_ID = 1;

// ---------- 進捗・スタンプ管理 ----------

let currentStageId = 1;
let activeWords = [];
let currentIndex = 0;
let totalViewedCount = 0;
let cardsNeededForTest = 10;
let testAvailableBlockKey = null;
let isCooldown = false;

let isInTest = false;
let currentTest = null;

const STORAGE_KEY = "eigo-pocket-progress";
const MAX_STAMPS_PER_DAY = 3;

let progress = {
  date: "",
  todayStamps: 0,
  totalStamps: 0,
  clearedBlocks: [],
};

// ---------- DOM 取得 ----------

const englishEl = document.getElementById("word-english");
const kanaEl = document.getElementById("word-kana");
const japaneseEl = document.getElementById("word-japanese");

const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const speakButton = document.getElementById("speak-button");

const cardCounterEl = document.getElementById("card-counter");
const cardsToTestEl = document.getElementById("cards-to-test");
const testInfoEl = document.getElementById("test-info");
const testButton = document.getElementById("test-button");

const todayStampsEl = document.getElementById("today-stamps");
const totalStampsEl = document.getElementById("total-stamps");
const rankLabelEl = document.getElementById("rank-label");

const testOverlay = document.getElementById("test-overlay");
const testQuestionHeader = document.getElementById("test-question-header");
const testQuestionText = document.getElementById("test-question-text");
const testChoicesEl = document.getElementById("test-choices");
const testCancelButton = document.getElementById("test-cancel-button");

const resultOverlay = document.getElementById("result-overlay");
const resultTitleEl = document.getElementById("result-title");
const resultMessageEl = document.getElementById("result-message");
const resultStampInfoEl = document.getElementById("result-stamp-info");
const retryTestButton = document.getElementById("retry-test-button");
const closeResultButton = document.getElementById("close-result-button");

const stageButtons = document.querySelectorAll(".stage-button");

// ---------- ユーティリティ ----------

function getTodayString() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ---------- ローカルストレージ ----------

function loadProgress() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    progress.date = getTodayString();
    progress.todayStamps = 0;
    progress.totalStamps = 0;
    progress.clearedBlocks = [];
    return;
  }
  try {
    const data = JSON.parse(raw);
    const today = getTodayString();
    const cleared = Array.isArray(data.clearedBlocks)
      ? data.clearedBlocks
      : [];
    progress.clearedBlocks = cleared.map((x) => String(x));
    if (data.date !== today) {
      progress.date = today;
      progress.todayStamps = 0;
      progress.totalStamps = data.totalStamps || 0;
    } else {
      progress.date = today;
      progress.todayStamps = data.todayStamps || 0;
      progress.totalStamps = data.totalStamps || 0;
    }
  } catch {
    progress.date = getTodayString();
    progress.todayStamps = 0;
    progress.totalStamps = 0;
    progress.clearedBlocks = [];
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// ---------- ランク表示 ----------

function getRankLabel(totalStamps) {
  if (totalStamps >= 100) return "（名人）";
  if (totalStamps >= 50) return "（ちいさな名人）";
  if (totalStamps >= 30) return "（がんばり屋）";
  if (totalStamps >= 10) return "（れんしゅう中）";
  return "（ビギナー）";
}

function renderProgress() {
  const stars =
    "★".repeat(progress.todayStamps) +
    "☆".repeat(MAX_STAMPS_PER_DAY - progress.todayStamps);
  todayStampsEl.textContent = stars;
  totalStampsEl.textContent = `${progress.totalStamps}こ`;
  rankLabelEl.textContent = getRankLabel(progress.totalStamps);
}

// ---------- ステージ・インデックス ----------

function buildStageIndex() {
  ITEMS_BY_STAGE.clear();
  let maxStage = 1;
  for (const item of ALL_ITEMS) {
    const sid = Number(item.stageId || 0) || 0;
    if (!ITEMS_BY_STAGE.has(sid)) ITEMS_BY_STAGE.set(sid, []);
    ITEMS_BY_STAGE.get(sid).push(item);
    if (sid > maxStage) maxStage = sid;
  }
  MAX_STAGE_ID = maxStage;
  // 各ステージごとにシャッフルしておく（初期）
  for (const items of ITEMS_BY_STAGE.values()) {
    shuffle(items);
  }
}

function updateActiveWords() {
  const pool = ITEMS_BY_STAGE.get(currentStageId) || [];
  activeWords = pool.slice();
  shuffle(activeWords);
}

function resetStageState() {
  updateActiveWords();
  currentIndex = 0;
  totalViewedCount = 0;
  cardsNeededForTest = 10;
  testAvailableBlockKey = null;
  isCooldown = false;
}

function setActiveStage(stageId) {
  if (stageId === currentStageId) return;
  currentStageId = stageId;

  stageButtons.forEach((btn) => {
    const id = Number(btn.dataset.stage);
    if (id === currentStageId) btn.classList.add("is-active");
    else btn.classList.remove("is-active");
  });

  resetStageState();
  renderCard();
}

// ---------- カード表示 ----------

function renderCard() {
  if (!activeWords.length) {
    englishEl.textContent = "-";
    kanaEl.textContent = "";
    japaneseEl.textContent = "";
    cardCounterEl.textContent = "0 / 0";
    prevButton.disabled = true;
    nextButton.disabled = true;
    updateTestInfo();
    return;
  }

  if (currentIndex < 0) currentIndex = 0;
  if (currentIndex >= activeWords.length) currentIndex = activeWords.length - 1;

  const w = activeWords[currentIndex];
  englishEl.textContent = w.english;
  kanaEl.textContent = w.kana || "";
  japaneseEl.textContent = w.japanese;
  cardCounterEl.textContent = `${currentIndex + 1} / ${activeWords.length}`;

  prevButton.disabled = currentIndex === 0;
  nextButton.disabled =
    currentIndex >= activeWords.length - 1 || isCooldown;

  updateTestInfo();
}

// ---------- テスト情報 ----------

function updateTestInfo() {
  if (testAvailableBlockKey !== null) {
    testInfoEl.textContent = "この10まいの ミニテストが できます";
    testButton.disabled = false;
  } else {
    testButton.disabled = true;
    cardsToTestEl.textContent = String(cardsNeededForTest);
    testInfoEl.textContent =
      `あと ${cardsNeededForTest} まい みると、ミニテストが ひらけます`;
  }
}

// ---------- 音声 ----------

function speakCurrentWord() {
  if (!activeWords.length) return;
  if (!("speechSynthesis" in window)) return;
  const w = activeWords[currentIndex];
  const u = new SpeechSynthesisUtterance(w.english);
  u.lang = "en-US";
  u.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// ---------- カード移動 ----------

function startNextCooldown() {
  isCooldown = true;
  nextButton.disabled = true;
  setTimeout(() => {
    isCooldown = false;
    if (currentIndex < activeWords.length - 1) nextButton.disabled = false;
  }, 1200);
}

function goPrev() {
  if (currentIndex <= 0) return;
  currentIndex -= 1;
  renderCard();
}

function goNext() {
  if (!activeWords.length) return;
  if (currentIndex >= activeWords.length - 1) return;
  if (isCooldown) return;

  currentIndex += 1;
  totalViewedCount += 1;

  const remainder = totalViewedCount % 10;
  if (remainder === 0) {
    const blockIndex = Math.floor((totalViewedCount - 1) / 10);
    testAvailableBlockKey = `${currentStageId}-${blockIndex}`;
    cardsNeededForTest = 10;
  } else {
    testAvailableBlockKey = null;
    cardsNeededForTest = 10 - remainder;
  }

  renderCard();
  startNextCooldown();
  speakCurrentWord();
}

// ---------- ミニテスト用ヘルパ ----------

// 同じ pos の候補を優先しつつ、4択を作る
function buildChoicesForQuestion(answerItem) {
  const answerJa = answerItem.japanese;
  const pos = answerItem.pos;

  const samePosCandidates = ALL_ITEMS.filter(
    (it) => it.pos === pos && it.id !== answerItem.id
  );

  shuffle(samePosCandidates);

  const distractors = [];
  for (const it of samePosCandidates) {
    if (
      it.japanese !== answerJa &&
      !distractors.includes(it.japanese) &&
      distractors.length < 3
    ) {
      distractors.push(it.japanese);
    }
    if (distractors.length >= 3) break;
  }

  // 足りない場合は全体から埋める
  if (distractors.length < 3) {
    const backup = ALL_ITEMS.filter((it) => it.id !== answerItem.id);
    shuffle(backup);
    for (const it of backup) {
      if (
        it.japanese !== answerJa &&
        !distractors.includes(it.japanese) &&
        distractors.length < 3
      ) {
        distractors.push(it.japanese);
      }
      if (distractors.length >= 3) break;
    }
  }

  while (distractors.length < 3) {
    distractors.push("（えらべない）");
  }

  const correctIndex = Math.floor(Math.random() * 4);
  const choices = [];
  let di = 0;
  for (let i = 0; i < 4; i++) {
    if (i === correctIndex) choices.push(answerJa);
    else choices.push(distractors[di++] ?? "");
  }

  return { choices, correctIndex };
}

// ---------- ミニテスト作成 ----------

function createTestForBlock(blockKey) {
  const currentStageItems = ITEMS_BY_STAGE.get(currentStageId) || [];
  const lowerStageItems = [];

  ITEMS_BY_STAGE.forEach((items, sid) => {
    if (sid < currentStageId) {
      lowerStageItems.push(...items);
    }
  });

  const QUESTIONS_PER_TEST = 3;
  const questions = [];
  const usedIds = new Set();

  for (let qIndex = 0; qIndex < QUESTIONS_PER_TEST; qIndex++) {
    let candidatePool;

    if (!currentStageItems.length && !lowerStageItems.length) {
      candidatePool = ALL_ITEMS;
    } else if (currentStageId <= 1 || !lowerStageItems.length) {
      // Stage1 または下位ステージがない場合 → 現ステージのみ
      candidatePool = currentStageItems.length ? currentStageItems : ALL_ITEMS;
    } else {
      // Stage2以降：30%の確率で下位ステージ復習
      const useReview = Math.random() < 0.3;
      if (useReview && lowerStageItems.length) {
        candidatePool = lowerStageItems;
      } else if (currentStageItems.length) {
        candidatePool = currentStageItems;
      } else {
        candidatePool = ALL_ITEMS;
      }
    }

    if (!candidatePool.length) break;

    // まだ使っていない問題を選ぶ
    let answerItem = null;
    const shuffled = candidatePool.slice();
    shuffle(shuffled);
    for (const it of shuffled) {
      if (!usedIds.has(it.id)) {
        answerItem = it;
        break;
      }
    }
    if (!answerItem) {
      // 全て使ってしまった場合、重複を許容
      answerItem = shuffled[0];
    }

    usedIds.add(answerItem.id);

    const { choices, correctIndex } = buildChoicesForQuestion(answerItem);

    questions.push({
      english: answerItem.english,
      correctJapanese: answerItem.japanese,
      choices,
      correctIndex,
    });
  }

  return { blockKey, questions, currentQuestionIndex: 0, correctCount: 0 };
}

// ---------- ミニテスト画面 ----------

function openTest() {
  if (testAvailableBlockKey === null) return;
  isInTest = true;
  currentTest = createTestForBlock(testAvailableBlockKey);
  renderTestQuestion();
  testOverlay.classList.remove("hidden");
}

function closeTestOverlay() {
  isInTest = false;
  currentTest = null;
  testOverlay.classList.add("hidden");
}

function renderTestQuestion() {
  if (!currentTest) return;
  const { questions, currentQuestionIndex } = currentTest;
  const q = questions[currentQuestionIndex];

  testQuestionHeader.textContent =
    `Q${currentQuestionIndex + 1} / ${questions.length}`;
  testQuestionText.textContent = `"${q.english}" の いみは どれ？`;

  testChoicesEl.innerHTML = "";
  q.choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-button";
    btn.textContent = choice || "（まだ いみ が ない よ）";
    btn.addEventListener("click", () => handleChoice(index));
    testChoicesEl.appendChild(btn);
  });
}

function handleChoice(selectedIndex) {
  const { questions, currentQuestionIndex } = currentTest;
  const q = questions[currentQuestionIndex];

  if (selectedIndex === q.correctIndex) currentTest.correctCount += 1;

  if (currentQuestionIndex + 1 < questions.length) {
    currentTest.currentQuestionIndex += 1;
    renderTestQuestion();
  } else {
    testOverlay.classList.add("hidden");
    handleTestResult();
  }
}

// ---------- テスト結果 ----------

function handleTestResult() {
  const { correctCount, questions, blockKey } = currentTest;
  const total = questions.length;

  let title;
  let message;
  let stampInfo;

  const alreadyCleared = progress.clearedBlocks.includes(String(blockKey));
  const canGetStamp =
    correctCount === total &&
    !alreadyCleared &&
    progress.todayStamps < MAX_STAMPS_PER_DAY;

  if (correctCount === total) {
    if (canGetStamp) {
      const beforeStars = progress.todayStamps;
      progress.todayStamps += 1;
      progress.totalStamps += 1;
      progress.clearedBlocks.push(String(blockKey));
      saveProgress();
      renderProgress();

      title = "すごい！ ぜんぶ せいかい！";
      message = `${total}問 中 ${correctCount}問 せいかい！`;

      const beforeStr =
        "★".repeat(beforeStars) +
        "☆".repeat(MAX_STAMPS_PER_DAY - beforeStars);
      const afterStr =
        "★".repeat(progress.todayStamps) +
        "☆".repeat(MAX_STAMPS_PER_DAY - progress.todayStamps);
      stampInfo = `スタンプ：${beforeStr} → ${afterStr}`;
    } else if (alreadyCleared) {
      title = "ぜんぶ せいかい！";
      message = `${total}問 中 ${correctCount}問 せいかい！`;
      stampInfo =
        "この10まいぶんの スタンプは もう もらっているよ。つぎは べつの 10まいで チャレンジしよう！";
    } else {
      title = "ぜんぶ せいかい！";
      message = `${total}問 中 ${correctCount}問 せいかい！`;
      stampInfo =
        "きょうの スタンプは もう 3こ いっぱいだよ。 また あした チャレンジしよう！";
    }
  } else {
    title = "おしい！";
    message =
      `${total}問 中 ${correctCount}問 せいかい。 ` +
      `あと ${total - correctCount}問で スタンプだったよ。`;
    stampInfo =
      "もういちど カードを みてから チャレンジしてみよう。";
  }

  resultTitleEl.textContent = title;
  resultMessageEl.textContent = message;
  resultStampInfoEl.textContent = stampInfo;
  resultOverlay.classList.remove("hidden");
}

// ---------- イベント登録 ----------

prevButton.addEventListener("click", goPrev);
nextButton.addEventListener("click", goNext);
speakButton.addEventListener("click", speakCurrentWord);

testButton.addEventListener("click", openTest);
testCancelButton.addEventListener("click", closeTestOverlay);

retryTestButton.addEventListener("click", () => {
  if (!currentTest) return;
  const blockKey = currentTest.blockKey;
  currentTest = createTestForBlock(blockKey);
  renderTestQuestion();
  resultOverlay.classList.add("hidden");
  testOverlay.classList.remove("hidden");
});

closeResultButton.addEventListener("click", () => {
  resultOverlay.classList.add("hidden");
  isInTest = false;
});

stageButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const stageId = Number(btn.dataset.stage);
    setActiveStage(stageId);
  });
});

// ---------- 初期化 ----------

async function init() {
  loadProgress();
  renderProgress();

  try {
    const res = await fetch("words.json");
    if (!res.ok) {
      throw new Error("failed to load words.json");
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      ALL_ITEMS = data;
    } else {
      ALL_ITEMS = [];
      console.error("words.json は配列ではありません");
    }
  } catch (e) {
    console.error("words.json の読み込みに失敗しました", e);
    ALL_ITEMS = [];
  }

  buildStageIndex();

  // デフォルトは Stage 1
  currentStageId = 1;
  // HTML側のボタンに is-active を合わせる
  stageButtons.forEach((btn) => {
    const sid = Number(btn.dataset.stage);
    if (sid === currentStageId) btn.classList.add("is-active");
    else btn.classList.remove("is-active");
  });

  resetStageState();
  renderCard();
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});
