// ======================================
//  えいごポケット：210語サンプル + ロジック一体版
// ======================================

// ---------- 単語データ（ステージ30語 × 7 = 210） ----------

const WORDS = [
  // Stage 1: 1-30
  {id: 1,  english: "apple",     kana: "アップル",     japanese: "りんご"},
  {id: 2,  english: "banana",    kana: "バナナ",        japanese: "バナナ"},
  {id: 3,  english: "orange",    kana: "オレンジ",      japanese: "オレンジ"},
  {id: 4,  english: "grape",     kana: "グレープ",      japanese: "ぶどう"},
  {id: 5,  english: "dog",       kana: "ドッグ",        japanese: "いぬ"},
  {id: 6,  english: "cat",       kana: "キャット",      japanese: "ねこ"},
  {id: 7,  english: "bird",      kana: "バード",        japanese: "とり"},
  {id: 8,  english: "fish",      kana: "フィッシュ",    japanese: "さかな"},
  {id: 9,  english: "school",    kana: "スクール",      japanese: "学校"},
  {id:10,  english: "teacher",   kana: "ティーチャー",  japanese: "先生"},
  {id:11,  english: "student",   kana: "スチューデント",japanese: "生徒"},
  {id:12,  english: "desk",      kana: "デスク",        japanese: "つくえ"},
  {id:13,  english: "chair",     kana: "チェア",        japanese: "いす"},
  {id:14,  english: "book",      kana: "ブック",        japanese: "本"},
  {id:15,  english: "pen",       kana: "ペン",          japanese: "ペン"},
  {id:16,  english: "bag",       kana: "バッグ",        japanese: "かばん"},
  {id:17,  english: "car",       kana: "カー",          japanese: "くるま"},
  {id:18,  english: "bus",       kana: "バス",          japanese: "バス"},
  {id:19,  english: "train",     kana: "トレイン",      japanese: "電車"},
  {id:20,  english: "house",     kana: "ハウス",        japanese: "いえ"},
  {id:21,  english: "room",      kana: "ルーム",        japanese: "へや"},
  {id:22,  english: "park",      kana: "パーク",        japanese: "公園"},
  {id:23,  english: "tree",      kana: "ツリー",        japanese: "木"},
  {id:24,  english: "flower",    kana: "フラワー",      japanese: "花"},
  {id:25,  english: "sun",       kana: "サン",          japanese: "太陽"},
  {id:26,  english: "moon",      kana: "ムーン",        japanese: "月"},
  {id:27,  english: "star",      kana: "スター",        japanese: "ほし"},
  {id:28,  english: "water",     kana: "ウォーター",    japanese: "みず"},
  {id:29,  english: "milk",      kana: "ミルク",        japanese: "ぎゅうにゅう"},
  {id:30,  english: "juice",     kana: "ジュース",       japanese: "ジュース"},

  // Stage 2: 31-60
  {id:31, english:"father", kana:"ファザー", japanese:"ちち"},
  {id:32, english:"mother", kana:"マザー", japanese:"はは"},
  {id:33, english:"brother", kana:"ブラザー", japanese:"あに・おとうと"},
  {id:34, english:"sister", kana:"シスター", japanese:"あね・いもうと"},
  {id:35, english:"baby", kana:"ベイビー", japanese:"あかちゃん"},
  {id:36, english:"friend", kana:"フレンド", japanese:"ともだち"},
  {id:37, english:"man", kana:"マン", japanese:"おとこのひと"},
  {id:38, english:"woman", kana:"ウーマン", japanese:"おんなのひと"},
  {id:39, english:"boy", kana:"ボーイ", japanese:"おとこのこ"},
  {id:40, english:"girl", kana:"ガール", japanese:"おんなのこ"},
  {id:41, english:"town", kana:"タウン", japanese:"まち"},
  {id:42, english:"city", kana:"シティ", japanese:"都市"},
  {id:43, english:"country", kana:"カントリー", japanese:"国"},
  {id:44, english:"world", kana:"ワールド", japanese:"世界"},
  {id:45, english:"food", kana:"フード", japanese:"たべもの"},
  {id:46, english:"bread", kana:"ブレッド", japanese:"パン"},
  {id:47, english:"meat", kana:"ミート", japanese:"肉"},
  {id:48, english:"egg", kana:"エッグ", japanese:"たまご"},
  {id:49, english:"rice", kana:"ライス", japanese:"ごはん"},
  {id:50, english:"cake", kana:"ケーキ", japanese:"ケーキ"},
  {id:51, english:"ice cream", kana:"アイスクリーム", japanese:"アイス"},
  {id:52, english:"doghouse", kana:"ドッグハウス", japanese:"犬小屋"},
  {id:53, english:"zoo", kana:"ズー", japanese:"どうぶつえん"},
  {id:54, english:"hospital", kana:"ホスピタル", japanese:"びょういん"},
  {id:55, english:"store", kana:"ストア", japanese:"みせ"},
  {id:56, english:"library", kana:"ライブラリー", japanese:"としょかん"},
  {id:57, english:"key", kana:"キー", japanese:"かぎ"},
  {id:58, english:"door", kana:"ドア", japanese:"ドア"},
  {id:59, english:"window", kana:"ウィンドウ", japanese:"まど"},
  {id:60, english:"paper", kana:"ペーパー", japanese:"かみ"},

  // Stage 3: 61-90
  {id:61, english:"run", kana:"ラン", japanese:"はしる"},
  {id:62, english:"walk", kana:"ウォーク", japanese:"あるく"},
  {id:63, english:"jump", kana:"ジャンプ", japanese:"とぶ"},
  {id:64, english:"swim", kana:"スイム", japanese:"およぐ"},
  {id:65, english:"fly", kana:"フライ", japanese:"とぶ"},
  {id:66, english:"eat", kana:"イート", japanese:"たべる"},
  {id:67, english:"drink", kana:"ドリンク", japanese:"のむ"},
  {id:68, english:"sleep", kana:"スリープ", japanese:"ねる"},
  {id:69, english:"read", kana:"リード", japanese:"よむ"},
  {id:70, english:"write", kana:"ライト", japanese:"かく"},
  {id:71, english:"draw", kana:"ドロー", japanese:"えをかく"},
  {id:72, english:"sing", kana:"シング", japanese:"うたう"},
  {id:73, english:"dance", kana:"ダンス", japanese:"おどる"},
  {id:74, english:"play", kana:"プレイ", japanese:"あそぶ"},
  {id:75, english:"see", kana:"シー", japanese:"みる"},
  {id:76, english:"look", kana:"ルック", japanese:"みる"},
  {id:77, english:"watch", kana:"ウォッチ", japanese:"みる"},
  {id:78, english:"hear", kana:"ヒア", japanese:"きく"},
  {id:79, english:"listen", kana:"リッスン", japanese:"きく"},
  {id:80, english:"open", kana:"オープン", japanese:"あける"},
  {id:81, english:"close", kana:"クローズ", japanese:"しめる"},
  {id:82, english:"study", kana:"スタディ", japanese:"べんきょうする"},
  {id:83, english:"work", kana:"ワーク", japanese:"はたらく"},
  {id:84, english:"live", kana:"リブ", japanese:"くらす"},
  {id:85, english:"move", kana:"ムーブ", japanese:"うごく"},
  {id:86, english:"start", kana:"スタート", japanese:"はじめる"},
  {id:87, english:"stop", kana:"ストップ", japanese:"とめる"},
  {id:88, english:"turn", kana:"ターン", japanese:"まがる"},
  {id:89, english:"like", kana:"ライク", japanese:"すき"},
  {id:90, english:"love", kana:"ラブ", japanese:"あいする"},

  // Stage 4: 91-120
  {id:91, english:"happy", kana:"ハッピー", japanese:"しあわせ"},
  {id:92, english:"sad", kana:"サッド", japanese:"かなしい"},
  {id:93, english:"big", kana:"ビッグ", japanese:"おおきい"},
  {id:94, english:"small", kana:"スモール", japanese:"ちいさい"},
  {id:95, english:"tall", kana:"トール", japanese:"せがたかい"},
  {id:96, english:"short", kana:"ショート", japanese:"みじかい"},
  {id:97, english:"hot", kana:"ホット", japanese:"あつい"},
  {id:98, english:"cold", kana:"コールド", japanese:"さむい"},
  {id:99, english:"warm", kana:"ウォーム", japanese:"あたたかい"},
  {id:100, english:"cool", kana:"クール", japanese:"すずしい"},
  {id:101, english:"red", kana:"レッド", japanese:"あか"},
  {id:102, english:"blue", kana:"ブルー", japanese:"あお"},
  {id:103, english:"green", kana:"グリーン", japanese:"みどり"},
  {id:104, english:"yellow", kana:"イエロー", japanese:"きいろ"},
  {id:105, english:"white", kana:"ホワイト", japanese:"しろ"},
  {id:106, english:"black", kana:"ブラック", japanese:"くろ"},
  {id:107, english:"brown", kana:"ブラウン", japanese:"ちゃいろ"},
  {id:108, english:"pink", kana:"ピンク", japanese:"ピンク"},
  {id:109, english:"fast", kana:"ファスト", japanese:"はやい"},
  {id:110, english:"slow", kana:"スロー", japanese:"おそい"},
  {id:111, english:"new", kana:"ニュー", japanese:"あたらしい"},
  {id:112, english:"old", kana:"オールド", japanese:"ふるい"},
  {id:113, english:"funny", kana:"ファニー", japanese:"おもしろい"},
  {id:114, english:"kind", kana:"カインド", japanese:"やさしい"},
  {id:115, english:"busy", kana:"ビジー", japanese:"いそがしい"},
  {id:116, english:"hungry", kana:"ハングリー", japanese:"おなかすいた"},
  {id:117, english:"tired", kana:"タイアード", japanese:"つかれた"},
  {id:118, english:"sleepy", kana:"スリーピー", japanese:"ねむい"},
  {id:119, english:"favorite", kana:"フェイバリット", japanese:"お気に入り"},
  {id:120, english:"important", kana:"インポータント", japanese:"たいせつ"},

  // Stage 5: 121-150
  {id:121, english:"time", kana:"タイム", japanese:"じかん"},
  {id:122, english:"day", kana:"デイ", japanese:"ひ"},
  {id:123, english:"week", kana:"ウィーク", japanese:"しゅう"},
  {id:124, english:"month", kana:"マンス", japanese:"つき"},
  {id:125, english:"year", kana:"イヤー", japanese:"ねん"},
  {id:126, english:"morning", kana:"モーニング", japanese:"あさ"},
  {id:127, english:"afternoon", kana:"アフタヌーン", japanese:"ごご"},
  {id:128, english:"evening", kana:"イブニング", japanese:"ゆうがた"},
  {id:129, english:"night", kana:"ナイト", japanese:"よる"},
  {id:130, english:"today", kana:"トゥデイ", japanese:"きょう"},
  {id:131, english:"tomorrow", kana:"トゥモロー", japanese:"あした"},
  {id:132, english:"yesterday", kana:"イエスタデイ", japanese:"きのう"},
  {id:133, english:"here", kana:"ヒア", japanese:"ここ"},
  {id:134, english:"there", kana:"ゼア", japanese:"そこ"},
  {id:135, english:"now", kana:"ナウ", japanese:"いま"},
  {id:136, english:"then", kana:"ゼン", japanese:"そのとき"},
  {id:137, english:"very", kana:"ベリー", japanese:"とても"},
  {id:138, english:"sometimes", kana:"サムタイムズ", japanese:"ときどき"},
  {id:139, english:"always", kana:"オールウェイズ", japanese:"いつも"},
  {id:140, english:"never", kana:"ネバー", japanese:"けっして〜ない"},
  {id:141, english:"yes", kana:"イエス", japanese:"はい"},
  {id:142, english:"no", kana:"ノー", japanese:"いいえ"},
  {id:143, english:"hello", kana:"ハロー", japanese:"こんにちは"},
  {id:144, english:"goodbye", kana:"グッバイ", japanese:"さようなら"},
  {id:145, english:"please", kana:"プリーズ", japanese:"おねがいします"},
  {id:146, english:"sorry", kana:"ソーリー", japanese:"ごめんなさい"},
  {id:147, english:"thank you", kana:"サンキュー", japanese:"ありがとう"},
  {id:148, english:"wow", kana:"ワオ", japanese:"わあ！"},
  {id:149, english:"maybe", kana:"メイビー", japanese:"たぶん"},
  {id:150, english:"again", kana:"アゲイン", japanese:"もういちど"},

  // Stage 6: 151-180
  {id:151, english:"in", kana:"イン", japanese:"〜の中に"},
  {id:152, english:"on", kana:"オン", japanese:"〜の上に"},
  {id:153, english:"under", kana:"アンダー", japanese:"〜の下に"},
  {id:154, english:"over", kana:"オーバー", japanese:"〜の上方に"},
  {id:155, english:"near", kana:"ニア", japanese:"ちかくに"},
  {id:156, english:"before", kana:"ビフォー", japanese:"〜の前に"},
  {id:157, english:"after", kana:"アフター", japanese:"〜のあとに"},
  {id:158, english:"up", kana:"アップ", japanese:"うえに"},
  {id:159, english:"down", kana:"ダウン", japanese:"したに"},
  {id:160, english:"with", kana:"ウィズ", japanese:"〜といっしょに"},
  {id:161, english:"about", kana:"アバウト", japanese:"〜について"},
  {id:162, english:"from", kana:"フロム", japanese:"〜から"},
  {id:163, english:"to", kana:"トゥー", japanese:"〜へ"},
  {id:164, english:"at", kana:"アット", japanese:"〜で"},
  {id:165, english:"by", kana:"バイ", japanese:"〜によって"},
  {id:166, english:"because", kana:"ビコーズ", japanese:"なぜなら"},
  {id:167, english:"and", kana:"アンド", japanese:"そして"},
  {id:168, english:"but", kana:"バット", japanese:"しかし"},
  {id:169, english:"or", kana:"オア", japanese:"または"},
  {id:170, english:"if", kana:"イフ", japanese:"もし〜なら"},
  {id:171, english:"when", kana:"ウェン", japanese:"〜のとき"},
  {id:172, english:"who", kana:"フー", japanese:"だれ"},
  {id:173, english:"what", kana:"ワット", japanese:"なに"},
  {id:174, english:"where", kana:"ウェア", japanese:"どこ"},
  {id:175, english:"why", kana:"ワイ", japanese:"なぜ"},
  {id:176, english:"how", kana:"ハウ", japanese:"どうやって"},
  {id:177, english:"which", kana:"ウィッチ", japanese:"どちら"},
  {id:178, english:"home", kana:"ホーム", japanese:"いえ"},
  {id:179, english:"street", kana:"ストリート", japanese:"とおり"},
  {id:180, english:"market", kana:"マーケット", japanese:"市場"},

  // Stage 7: 181-210
  {id:181, english:"face", kana:"フェイス", japanese:"かお"},
  {id:182, english:"head", kana:"ヘッド", japanese:"あたま"},
  {id:183, english:"eye", kana:"アイ", japanese:"め"},
  {id:184, english:"ear", kana:"イヤー", japanese:"みみ"},
  {id:185, english:"nose", kana:"ノーズ", japanese:"はな"},
  {id:186, english:"mouth", kana:"マウス", japanese:"くち"},
  {id:187, english:"hand", kana:"ハンド", japanese:"て"},
  {id:188, english:"foot", kana:"フット", japanese:"あし"},
  {id:189, english:"body", kana:"ボディ", japanese:"からだ"},
  {id:190, english:"arm", kana:"アーム", japanese:"うで"},
  {id:191, english:"leg", kana:"レッグ", japanese:"あし"},
  {id:192, english:"back", kana:"バック", japanese:"せなか"},
  {id:193, english:"front", kana:"フロント", japanese:"まえ"},
  {id:194, english:"rain", kana:"レイン", japanese:"あめ"},
  {id:195, english:"snow", kana:"スノー", japanese:"ゆき"},
  {id:196, english:"cloud", kana:"クラウド", japanese:"くも"},
  {id:197, english:"wind", kana:"ウィンド", japanese:"かぜ"},
  {id:198, english:"sunny", kana:"サニー", japanese:"はれ"},
  {id:199, english:"cloudy", kana:"クラウディ", japanese:"くもり"},
  {id:200, english:"warm", kana:"ウォーム", japanese:"あたたかい"},
  {id:201, english:"cold", kana:"コールド", japanese:"さむい"},
  {id:202, english:"beautiful", kana:"ビューティフル", japanese:"うつくしい"},
  {id:203, english:"strong", kana:"ストロング", japanese:"つよい"},
  {id:204, english:"weak", kana:"ウィーク", japanese:"よわい"},
  {id:205, english:"fun", kana:"ファン", japanese:"たのしい"},
  {id:206, english:"clean", kana:"クリーン", japanese:"きれい"},
  {id:207, english:"dirty", kana:"ダーティ", japanese:"きたない"},
  {id:208, english:"quiet", kana:"クワイエット", japanese:"しずか"},
  {id:209, english:"loud", kana:"ラウド", japanese:"うるさい"},
  {id:210, english:"special", kana:"スペシャル", japanese:"とくべつな"},
];

// ---------- ステージ定義（各30語） ----------

const STAGES = [
  { id: 1, name: "はじまりの森", startId: 1,   endId: 30  },
  { id: 2, name: "ことばの川",   startId: 31,  endId: 60  },
  { id: 3, name: "おんがくの丘", startId: 61,  endId: 90  },
  { id: 4, name: "ひかりの草原", startId: 91,  endId: 120 },
  { id: 5, name: "ふしぎな町",   startId: 121, endId: 150 },
  { id: 6, name: "そらの城",     startId: 151, endId: 180 },
  { id: 7, name: "ほしの王国",   startId: 181, endId: 210 },
];

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
let isAnsweringQuestion = false;
let pendingNextAction = null;

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
const testFeedbackEl = document.getElementById("test-feedback");
const testFeedbackTextEl = document.getElementById("test-feedback-text");
const testFeedbackDetailEl = document.getElementById("test-feedback-detail");
const testQuestionHeader = document.getElementById("test-question-header");
const testQuestionText = document.getElementById("test-question-text");
const testChoicesEl = document.getElementById("test-choices");
const testNextButton = document.getElementById("test-next-button");
const testCancelButton = document.getElementById("test-cancel-button");

const resultOverlay = document.getElementById("result-overlay");
const resultTitleEl = document.getElementById("result-title");
const resultMessageEl = document.getElementById("result-message");
const resultStampGetEl = document.getElementById("result-stamp-get");
const resultStampInfoEl = document.getElementById("result-stamp-info");
const retryTestButton = document.getElementById("retry-test-button");
const closeResultButton = document.getElementById("close-result-button");

const stageButtons = document.querySelectorAll(".stage-button");

// ---------- ローカルストレージ ----------

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

// ---------- ステージ・単語 ----------

function getCurrentStageDef() {
  return STAGES.find((s) => s.id === currentStageId) || STAGES[0];
}

function updateActiveWords() {
  const stage = getCurrentStageDef();
  activeWords = WORDS.filter(
    (w) => w.id >= stage.startId && w.id <= stage.endId
  );

  // フィッシャー–イェーツでランダム並び
  for (let i = activeWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [activeWords[i], activeWords[j]] = [activeWords[j], activeWords[i]];
  }
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
  kanaEl.textContent = w.kana;
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

// ---------- ミニテスト作成 ----------

function createTestForBlock(blockKey) {
  const pool = activeWords;
  if (!pool.length) {
    return { blockKey, questions: [], currentQuestionIndex: 0, correctCount: 0 };
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
    for (let i = 0; i < pool.length; i++) if (i !== idx) wrongPoolIndices.push(i);

    const wrongChoices = [];
    while (wrongChoices.length < 3 && wrongPoolIndices.length > 0) {
      const wpIndex = Math.floor(Math.random() * wrongPoolIndices.length);
      const wp = wrongPoolIndices.splice(wpIndex, 1)[0];
      wrongChoices.push(pool[wp].japanese);
    }

    while (wrongChoices.length < 3 && pool.length > 0) {
      const r = pool[Math.floor(Math.random() * pool.length)];
      if (r.japanese !== word.japanese && !wrongChoices.includes(r.japanese)) {
        wrongChoices.push(r.japanese);
      } else if (pool.length <= 3) {
        wrongChoices.push(r.japanese);
      }
    }

    const choices = [];
    let wi = 0;
    for (let i = 0; i < 4; i++) {
      if (i === correctIndex) choices.push(word.japanese);
      else choices.push(wrongChoices[wi++] ?? "");
    }

    return {
      english: word.english,
      correctJapanese: word.japanese,
      choices,
      correctIndex,
    };
  });

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
  resetTestFeedback();
}

function resetTestFeedback() {
  testFeedbackEl.classList.add("is-hidden");
  testFeedbackTextEl.textContent = "";
  testFeedbackDetailEl.textContent = "";
  testNextButton.classList.add("is-hidden");
  pendingNextAction = null;
}

function renderTestQuestion() {
  const { questions, currentQuestionIndex } = currentTest;
  const q = questions[currentQuestionIndex];

  isAnsweringQuestion = false;
  resetTestFeedback();

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

function showTestFeedback(isCorrect, selectedChoice, correctChoice) {
  testFeedbackTextEl.textContent = isCorrect ? "せいかい！" : "ざんねん…";
  testFeedbackDetailEl.textContent = `あなたのこたえ：${selectedChoice} ／ せいかい：${correctChoice}`;
  testFeedbackEl.classList.remove("is-hidden");
}

function handleChoice(selectedIndex) {
  if (isAnsweringQuestion) return;
  const { questions, currentQuestionIndex } = currentTest;
  const q = questions[currentQuestionIndex];

  const choiceButtons = Array.from(
    testChoicesEl.querySelectorAll(".choice-button")
  );

  isAnsweringQuestion = true;

  const selectedChoice = q.choices[selectedIndex] || "";
  const correctChoice = q.choices[q.correctIndex] || "";
  const isCorrect = selectedIndex === q.correctIndex;

  if (choiceButtons[selectedIndex]) {
    choiceButtons[selectedIndex].classList.add("selected-choice");
  }
  if (choiceButtons[q.correctIndex]) {
    choiceButtons[q.correctIndex].classList.add("correct-choice");
  }
  choiceButtons.forEach((btn, idx) => {
    if (idx !== q.correctIndex && idx !== selectedIndex) {
      btn.classList.add("wrong-choice");
    }
    btn.disabled = true;
  });

  showTestFeedback(isCorrect, selectedChoice, correctChoice);

  if (isCorrect) currentTest.correctCount += 1;

  const goNext = () => {
    isAnsweringQuestion = false;
    resetTestFeedback();

    if (currentQuestionIndex + 1 < questions.length) {
      currentTest.currentQuestionIndex += 1;
      renderTestQuestion();
    } else {
      testOverlay.classList.add("hidden");
      handleTestResult();
    }
  };

  if (isCorrect) {
    setTimeout(goNext, 1400);
  } else {
    pendingNextAction = goNext;
    testNextButton.classList.remove("is-hidden");
  }
}

// ---------- テスト結果 ----------

function handleTestResult() {
  const { correctCount, questions, blockKey } = currentTest;
  const total = questions.length;

  let title;
  let message;
  let stampInfo;

  resultStampGetEl.classList.add("is-hidden");

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
      resultStampGetEl.classList.remove("is-hidden");
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
testNextButton.addEventListener("click", () => {
  if (!pendingNextAction) return;
  const action = pendingNextAction;
  pendingNextAction = null;
  testNextButton.classList.add("is-hidden");
  action();
});
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

function init() {
  loadProgress();
  renderProgress();
  currentStageId = 1;
  resetStageState();
  renderCard();
}

document.addEventListener("DOMContentLoaded", init);
