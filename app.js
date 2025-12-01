// ===============================
//  進捗・スタンプ管理
// ===============================

let currentIndex = 0;          // 現在のカードインデックス（WORDS配列の添字）
let totalViewedCount = 0;      // 「つぎ」ボタンで進んだ枚数の累計
let cardsNeededForTest = 10;   // 次のミニテストまでに必要な枚数
let testAvailableBlockIndex = null; // いまミニテスト可能なブロック（10枚ごと）のID
let isCooldown = false;        // 「つぎ」ボタンのクールダウン中かどうか

// ミニテスト状態
let isInTest = false;
let currentTest = null; // { blockIndex, questions, currentQuestionIndex, correctCount }

// ローカルストレージ関連
const STORAGE_KEY = "eigo-pocket-progress";
const MAX_STAMPS_PER_DAY = 3;

// ローカルに保存する進捗構造
let progress = {
  date: "",          // "YYYY-MM-DD"
  todayStamps: 0,    // 今日のスタンプ数（0〜3）
  totalStamps: 0,    // 通算スタンプ数
  clearedBlocks: []  // スタンプ取得済みブロックID（数値配列）
};

// ===============================
//  DOM 取得
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

// ===============================
//  ローカルストレージ読み書き
// ===============================

function getTodayString() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
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
    if (data.date !== today) {
      // 日付が変わったら「今日のスタンプ」だけリセット
      progress.date = today;
      progress.todayStamps = 0;
      progress.totalStamps = data.totalStamps || 0;
      progress.clearedBlocks = Array.isArray(data.clearedBlocks)
        ? data.clearedBlocks
        : [];
    } else {
      progress = {
        date: today,
        todayStamps: data.todayStamps || 0,
        totalStamps: data.totalStamps || 0,
        clearedBlocks: Array.isArray(data.clearedBlocks)
          ? data.clearedBlocks
          : []
      };
    }
  } catch (e) {
    // 何かおかしければ初期化
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
//  称号（ランク）表示
// ===============================

function getRankLabel(totalStamps) {
  if (totalStamps >= 500) return "（でんせつの名人）";
  if (totalStamps >= 300) return "（ちょう名人）";
  if (totalStamps >= 200) return "（スーパー名人）";
  if (totalStamps >= 100) return "（名人）";
  if (totalStamps >= 50)  return "（ちいさな名人）";
  if (totalStamps >= 30)  return "（がんばり屋）";
  if (totalStamps >= 10)  return "（れんしゅう中）";
  return "（ビギナー）";
}

function renderProgress() {
  // 今日のスタンプ表示（★☆☆）
  const stars =
    "★".repeat(progress.todayStamps) +
    "☆".repeat(MAX_STAMPS_PER_DAY - progress.todayStamps);
  todayStampsEl.textContent = stars;

  // 通算スタンプ表示
  totalStampsEl.textContent = `${progress.totalStamps}こ`;
  rankLabelEl.textContent = getRankLabel(progress.totalStamps);
}

// ===============================
//  カード表示
// ===============================

function renderCard() {
  const word = WORDS[currentIndex];
  if (!word) return;

  englishEl.textContent = word.english;
  kanaEl.textContent = word.kana;
  japaneseEl.textContent = word.japanese;

  cardCounterEl.textContent = `${currentIndex + 1} / ${WORDS.length}`;

  // ボタン制御
  prevButton.disabled = currentIndex === 0;
  nextButton.disabled =
    currentIndex >= WORDS.length - 1 || isCooldown;

  updateTestInfo();
}

// 「つぎ」ボタンのクールダウン（1.2秒）
function startNextCooldown() {
  isCooldown = true;
  nextButton.disabled = true;
  setTimeout(() => {
    isCooldown = false;
    if (currentIndex < WORDS.length - 1) {
      nextButton.disabled = false;
    }
  }, 1200);
}

// ミニテスト表示のための情報更新
function updateTestInfo() {
  if (testAvailableBlockIndex !== null) {
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
//  音声再生
// ===============================

function speakCurrentWord() {
  const word = WORDS[currentIndex];
  if (!word) return;
  const utter = new SpeechSynthesisUtterance(word.english);
  utter.lang = "en-US";
  utter.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// ===============================
//  カード移動
// ===============================

function goPrev() {
  if (currentIndex <= 0) return;
  currentIndex -= 1;
  renderCard();
}

function goNext() {
  if (currentIndex >= WORDS.length - 1) return;
  if (isCooldown) return;

  currentIndex += 1;
  totalViewedCount += 1;

  // 10枚ごとにミニテストのチャンス
  const remainder = totalViewedCount % 10;
  if (remainder === 0) {
    // いま見ている位置からブロックIDを計算
    const blockIndex = Math.floor((totalViewedCount - 1) / 10);
    testAvailableBlockIndex = blockIndex;
    cardsNeededForTest = 10;
  } else {
    testAvailableBlockIndex = null;
    cardsNeededForTest = 10 - remainder;
  }

  renderCard();
  startNextCooldown();
}

// ===============================
//  ミニテスト作成
// ===============================

function createTestForBlock(blockIndex) {
  // 現状は「全体から3問ランダム」で十分
  // 将来「ブロックごと」や「セットごと」にしたいときはここを拡張
  const pool = WORDS;

  // ランダムに3語選ぶ
  const indices = [];
  while (indices.length < 3 && indices.length < pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    if (!indices.includes(idx)) indices.push(idx);
  }

  const questions = indices.map(idx => {
    const word = pool[idx];

    // 正解位置
    const correctIndex = Math.floor(Math.random() * 4);

    // 誤選択肢候補
    const wrongPoolIndices = [];
    for (let i = 0; i < pool.length; i++) {
      if (i !== idx) wrongPoolIndices.push(i);
    }

    const wrongChoices = [];
    while (wrongChoices.length < 3 && wrongPoolIndices.length > 0) {
      const wp = wrongPoolIndices.splice(
        Math.floor(Math.random() * wrongPoolIndices.length),
        1
      )[0];
      wrongChoices.push(pool[wp].japanese);
    }

    // 不足分は全体から補充
    while (wrongChoices.length < 3) {
      const r = pool[Math.floor(Math.random() * pool.length)];
      if (
        r.japanese !== word.japanese &&
        !wrongChoices.includes(r.japanese)
      ) {
        wrongChoices.push(r.japanese);
      }
    }

    const choices = [];
    let wi = 0;
    for (let i = 0; i < 4; i++) {
      if (i === correctIndex) {
        choices.push(word.japanese);
      } else {
        choices.push(wrongChoices[wi++]);
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
    blockIndex,
    questions,
    currentQuestionIndex: 0,
    correctCount: 0
  };
}

// ===============================
//  ミニテスト画面
// ===============================

function openTest() {
  if (testAvailableBlockIndex === null) return;
  isInTest = true;
  currentTest = createTestForBlock(testAvailableBlockIndex);
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
    btn.textContent = choice;
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
    // テスト終了
    testOverlay.classList.add("hidden");
    handleTestResult();
  }
}

// ===============================
//  テスト結果処理
// ===============================

function handleTestResult() {
  const { correctCount, questions, blockIndex } = currentTest;
  const total = questions.length;

  let title = "テストけっか";
  let message = "";
  let stampInfo = "";

  const alreadyCleared = progress.clearedBlocks.includes(blockIndex);
  const canGetStamp =
    correctCount === total &&
    !alreadyCleared &&
    progress.todayStamps < MAX_STAMPS_PER_DAY;

  if (correctCount === total) {
    if (canGetStamp) {
      const beforeStars = progress.todayStamps;

      progress.todayStamps += 1;
      progress.totalStamps += 1;
      progress.clearedBlocks.push(blockIndex);
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
//  イベント設定
// ===============================

prevButton.addEventListener("click", () => {
  goPrev();
});

nextButton.addEventListener("click", () => {
  goNext();
});

speakButton.addEventListener("click", () => {
  speakCurrentWord();
});

testButton.addEventListener("click", () => {
  openTest();
});

testCancelButton.addEventListener("click", () => {
  closeTestOverlay();
});

retryTestButton.addEventListener("click", () => {
  if (!currentTest) return;
  // 同じブロックで再テスト（問題は再ランダム）
  const blockIndex = currentTest.blockIndex;
  currentTest = createTestForBlock(blockIndex);
  renderTestQuestion();
  resultOverlay.classList.add("hidden");
  testOverlay.classList.remove("hidden");
});

closeResultButton.addEventListener("click", () => {
  resultOverlay.classList.add("hidden");
  isInTest = false;
});

// ===============================
//  初期化
// ===============================

function init() {
  loadProgress();
  renderProgress();
  currentIndex = 0;
  totalViewedCount = 0;
  testAvailableBlockIndex = null;
  cardsNeededForTest = 10;
  renderCard();
}

document.addEventListener("DOMContentLoaded", init);
