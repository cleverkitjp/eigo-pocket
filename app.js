// ===============================
//  ステージ定義（7つ）
// ===============================

const STAGES = [
  { id: 1, name: "はじまりの森", startId: 1, endId: 80 },
  { id: 2, name: "ことばの川",   startId: 81, endId: 160 },
  { id: 3, name: "おんがくの丘", startId: 161, endId: 240 },
  { id: 4, name: "ひかりの草原", startId: 241, endId: 320 },
  { id: 5, name: "ふしぎな町",   startId: 321, endId: 400 },
  { id: 6, name: "そらの城",     startId: 401, endId: 480 },
  { id: 7, name: "ほしの王国",   startId: 481, endId: 560 }
];

// ===============================
//  進捗・スタンプ管理
// ===============================

let currentStageId = 1;
let activeWords = [];

let currentIndex = 0;
let totalViewedCount = 0;
let cardsNeededForTest = 10;
let testAvailableBlockKey = null;
let isCooldown = false;

// ミニテスト状態
let isInTest = false;
let currentTest = null;

// ローカルストレージ関連
const STORAGE_KEY = "eigo-pocket-progress";
const MAX_STAMPS_PER_DAY = 3;

let progress = {
  date: "",
  todayStamps: 0,
  totalStamps: 0,
  clearedBlocks: []
};

// ===============================
//  DOM
// ===============================

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

// ===============================
//  ローカルストレージ
// ===============================

function getTodayString() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

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
    const cleared = Array.isArray(data.clearedBlocks) ? data.clearedBlocks : [];
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
  } catch (e) {
    progress.date = getTodayString();
    progress.todayStamps = 0;
    progress.totalStamps = 0;
    progress.clearedBlocks = [];
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// ===============================
//  ランク表示
// ===============================

function getRankLabel(totalStamps) {
  if (totalStamps >= 500) return "（でんせつの名人）";
  if (totalStamps >= 300) return "（ちょう名人）";
  if (totalStamps >= 200) return "（スーパー名人）";
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

// ===============================
//  ステージ・単語
// ===============================

function getCurrentStageDef() {
  return STAGES.find((s) => s.id === currentStageId) || STAGES[0];
}

// セット内ランダム用：現在のステージの単語を抽出＆シャッフル
function updateActiveWords() {
  const stage = getCurrentStageDef();

  if (!Array.isArray(window.WORDS)) {
    activeWords = [];
    return;
  }

  activeWords = WORDS.filter(
    (w) => w.id >= stage.startId && w.id <= stage.endId
  );

  for (let i = activeWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [activeWords[i], activeWords[j]] = [activeWords[j], activeWords[i]];
  }
}

// ステージ状態をリセットしてランダムな位置からスタート
function resetStageState() {
  updateActiveWords();
  if (activeWords.length === 0) {
    currentIndex = 0;
  } else {
    currentIndex = Math.floor(Math.random() * activeWords.length);
  }
  totalViewedCount = 0;
  cardsNeededForTest = 10;
  testAvailableBlockKey = null;
  isCooldown = false;
}

// ステージ切り替え
function setActiveStage(stageId) {
  if (stageId === currentStageId) return;
  currentStageId = stageId;

  stageButtons.forEach((btn) => {
    const id = Number(btn.dataset.stage);
    if (id === currentStageId) {
      btn.classList.add("is-active");
    } else {
      btn.classList.remove("is-active");
    }
  });

  resetStageState();
  renderCard();
}

// ===============================
//  カード表示
// ===============================

function renderCard() {
  if (!activeWords || activeWords.length === 0) {
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

  const word = activeWords[currentIndex];

  englishEl.textContent = word.english;
  kanaEl.textContent = word.kana;
  japaneseEl.textContent = word.japanese;

  cardCounterEl.textContent = `${currentIndex + 1} / ${activeWords.length}`;

  prevButton.disabled = currentIndex === 0;
  nextButton.disabled =
    currentIndex >= activeWords.length - 1 || isCooldown;

  updateTestInfo();
}

// ===============================
//  テスト情報
// ===============================

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

// ===============================
//  音声
// ===============================

function speakCurrentWord() {
  if (!activeWords || activeWords.length === 0) return;
  const word = activeWords[currentIndex];
  if (!word) return;
  if (!("speechSynthesis" in window)) return;

  const utter = new SpeechSynthesisUtterance(word.english);
  utter.lang = "en-US";
  utter.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// ===============================
//  カード移動
// ===============================

function startNextCooldown() {
  isCooldown = true;
  nextButton.disabled = true;
  setTimeout(() => {
    isCooldown = false;
    if (currentIndex < activeWords.length - 1) {
      nextButton.disabled = false;
    }
  }, 1200);
}

function goPrev() {
  if (currentIndex <= 0) return;
  currentIndex -= 1;
  renderCard();
  // 必要ならここで speakCurrentWord() を呼ぶ
}

function goNext() {
  if (!activeWords || activeWords.length === 0) return;
  if (currentIndex >= activeWords.length - 1) return;
  if (isCooldown) return;

  currentIndex += 1;
  totalViewedCount += 1;

  const remainder = totalViewedCount % 10;
  if (remainder === 0) {
    const blockIndex = Math.floor((totalViewedCount - 1) / 10);
    const blockKey = `${currentStageId}-${blockIndex}`;
    testAvailableBlockKey = blockKey;
    cardsNeededForTest = 10;
  } else {
    testAvailableBlockKey = null;
    cardsNeededForTest = 10 - remainder;
  }

  renderCard();
  startNextCooldown();
  speakCurrentWord(); // 「つぎ→」で自動発音
}

// ===============================
//  ミニテスト作成
// ===============================

function createTestForBlock(blockKey) {
  const pool = activeWords;
  if (!pool || pool.length === 0) {
    return {
      blockKey,
      questions: [],
      currentQuestionIndex: 0,
      correctCount: 0
    };
  }

  const indices = [];
  while (indices.length < 3 && indices.length < pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    if (!indices.includes(idx)) indices.push(idx);
  }

  const questions = indices.map((idx) => {
    const word = pool[idx];

    const correctIndex = Math.floor(Math.random() * 4);

    const wrongPoolIndices = [];
    for (let i = 0; i < pool.length; i++) {
      if (i !== idx) wrongPoolIndices.push(i);
    }

    const wrongChoices = [];
    while (wrongChoices.length < 3 && wrongPoolIndices.length > 0) {
      const wpIndex = Math.floor(Math.random() * wrongPoolIndices.length);
      const wp = wrongPoolIndices.splice(wpIndex, 1)[0];
      wrongChoices.push(pool[wp].japanese);
    }

    while (wrongChoices.length < 3 && pool.length > 0) {
      const r = pool[Math.floor(Math.random() * pool.length)];
      if (
        r.japanese !== word.japanese &&
        !wrongChoices.includes(r.japanese)
      ) {
        wrongChoices.push(r.japanese);
      } else if (pool.length <= 3) {
        wrongChoices.push(r.japanese);
      }
    }

    const choices = [];
    let wi = 0;
    for (let i = 0; i < 4; i++) {
      if (i === correctIndex) {
        choices.push(word.japanese);
      } else {
        choices.push(wrongChoices[wi++] ?? "");
      }
    }

    return {
      english: word.english,
      correctJapanese: word.japanese,
      choices,
      correctIndex
    };
  });

  return {
    blockKey,
    questions,
    currentQuestionIndex: 0,
    correctCount: 0
  };
}

// ===============================
//  ミニテスト画面
// ===============================

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
  const { questions, currentQuestionIndex } = currentTest;
  const q = questions[currentQuestionIndex];

  testQuestionHeader.textContent =
    `Q${currentQuestionIndex + 1} / ${questions.length}`;
  testQuestionText.textContent =
    `"${q.english}" の いみは どれ？`;

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

  if (selectedIndex === q.correctIndex) {
    currentTest.correctCount += 1;
  }

  if (currentQuestionIndex + 1 < questions.length) {
    currentTest.currentQuestionIndex += 1;
    renderTestQuestion();
  } else {
    testOverlay.classList.add("hidden");
    handleTestResult();
  }
}

// ===============================
//  テスト結果
// ===============================

function handleTestResult() {
  const { correctCount, questions, blockKey } = currentTest;
  const total = questions.length;

  let title = "テストけっか";
  let message = "";
  let stampInfo = "";

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
    } else if (progress.todayStamps >= MAX_STAMPS_PER_DAY) {
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

// ===============================
//  イベント
// ===============================

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

// ===============================
//  初期化
// ===============================

function init() {
  loadProgress();
  renderProgress();

  currentStageId = 1;
  resetStageState();
  renderCard();
}

document.addEventListener("DOMContentLoaded", init);
