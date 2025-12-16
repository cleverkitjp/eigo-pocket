/* えいごポケット
  - words.json を読み込み
  - ステージは「和名のみ」
  - カードタップで反転（くるっ）
  - タップ & つぎへ で音声（音声ボタンは無し）
  - 10枚おぼえたらミニテスト権利（権利=1回）
  - ミニテストは権利獲得後に出現（権利が無いと非表示）
  - 共有footerは index.html 側で読み込み
*/

(() => {
  const WORDS_URL = "./words.json";
  const MAX_STAMPS_PER_DAY = 10;

  // この版は startId/endId のステージ定義（あなたの「動いていた版」に合わせる）
  let STAGES = [
    { id: 1, name: "ことばの入り口", startId: 1, endId: 40 },
    { id: 2, name: "ひらめきの小道", startId: 41, endId: 80 },
    { id: 3, name: "アルファベットの丘", startId: 81, endId: 120 },
    { id: 4, name: "ことばの森", startId: 121, endId: 160 },
    { id: 5, name: "フレーズの橋", startId: 161, endId: 200 },
    { id: 6, name: "イメージのどうくつ", startId: 201, endId: 240 },
    { id: 7, name: "表現の滝", startId: 241, endId: 280 },
    { id: 8, name: "ことばの塔", startId: 281, endId: 320 },
    { id: 9, name: "英文の迷宮", startId: 321, endId: 360 },
    { id: 10, name: "ことばの神殿", startId: 361, endId: 400 },
  ];

  // LocalStorage keys
  const KEY_STAGE = "eigoPocket:selectedStageId";
  const KEY_TOTAL = "eigoPocket:totalStamps";
  const KEY_TODAY = "eigoPocket:todayStamps";
  const KEY_DAY = "eigoPocket:dayKey";
  const KEY_STAGE_STATE = "eigoPocket:stageState";

  // DOM
  const stageStrip = document.getElementById("stage-strip");
  const currentStageEl = document.getElementById("current-stage");

  const flipCardBtn = document.getElementById("flip-card");
  const flipInner = document.getElementById("flip-inner");
  // カード以外に同名クラスが出ても確実に対象を取れるようにスコープを限定する
  const frontFace = document.querySelector("#flip-card .flip-front");
  const backFace = document.querySelector("#flip-card .flip-back");

  const frontEnglish = document.getElementById("front-english");
  const frontKana = document.getElementById("front-kana");
  const backJapanese = document.getElementById("back-japanese");

  const progressEl = document.getElementById("progress");
  const tapHintEl = document.getElementById("tap-hint");

  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  const remainingEl = document.getElementById("remaining-to-test");
  const miniTestArea = document.getElementById("mini-test-area");
  const miniTestBtn = document.getElementById("mini-test-btn");

  const todayStampsEl = document.getElementById("today-stamps");
  const totalStampsEl = document.getElementById("total-stamps");
  const rankTitleEl = document.getElementById("rank-title");
  const rankLevelEl = document.getElementById("rank-level");

  const testOverlay = document.getElementById("test-overlay");
  const testBody = document.getElementById("test-body");
  const testClose = document.getElementById("test-close");
  const testSubmit = document.getElementById("test-submit");
  const testTitleEl = document.querySelector(".test-title");

  const bonusOverlay = document.getElementById("bonus-overlay");
  const bonusYesBtn = document.getElementById("bonus-yes");
  const bonusNoBtn = document.getElementById("bonus-no");

  const toastEl = document.getElementById("toast");
  const toastTextEl = document.getElementById("toast-text");
  const toastCloseBtn = document.getElementById("toast-close");

  // Data helpers
  function getStageWords(id) {
    const sid = Number(id);
    if (!Number.isFinite(sid)) return [];

    let pool = WORDS.filter(w => Number(w?.stageId) === sid);

    // Fallback: ID 範囲指定があれば利用する
    if (!pool.length) {
      const stage = STAGES.find(s => s.id === sid);
      if (stage && stage.startId != null && stage.endId != null) {
        pool = WORDS.filter(w => Number(w.id) >= stage.startId && Number(w.id) <= stage.endId);
      }
    }

    return pool.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  }

  // State
  let WORDS = [];
  let stageId = loadStageId();
  let activeWords = [];
  let index = 0;

  let currentTest = null;
  let selectedChoice = null;
  let answerRevealed = false;
  let optionNodes = [];
  let speakAnswerBtn = null;
  let resultBannerEl = null;
  let answerSummaryEl = null;
  let yourAnswerEl = null;
  let correctAnswerEl = null;
  let nextCooldownTimer = null;
  let nextCoolingDown = false;

  let recentQueue = [];
  let miniTestEligible = false;
  let prevMiniEligible = false;
  let stageStateMap = loadStageStateMap();
  let bonusPromptVisible = false;
  let resumeToastShown = false;

  // Helpers
  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function ensureDayReset() {
    const tk = todayKey();
    const saved = localStorage.getItem(KEY_DAY);
    if (saved !== tk) {
      localStorage.setItem(KEY_DAY, tk);
      localStorage.setItem(KEY_TODAY, "0");
    }
  }

  function loadStageId() {
    const raw = localStorage.getItem(KEY_STAGE);
    const n = raw ? Number(raw) : 1;
    return Number.isFinite(n) ? n : 1;
  }

  function saveStageId(id) {
    localStorage.setItem(KEY_STAGE, String(id));
  }

  function loadStageStateMap() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY_STAGE_STATE) || "{}");
      return (raw && typeof raw === "object") ? raw : {};
    } catch {
      return {};
    }
  }

  function saveStageStateMap(map) {
    localStorage.setItem(KEY_STAGE_STATE, JSON.stringify(map || {}));
  }

  function getStageState(id) {
    const key = String(id);
    const state = stageStateMap[key] || {};
    return {
      index: Number.isFinite(state.index) ? state.index : 0,
      cycleVisited: Array.isArray(state.cycleVisited) ? state.cycleVisited : [],
      bonusReady: !!state.bonusReady,
      cycleNotified: state.cycleNotified !== false,
    };
  }

  function setStageState(id, patch) {
    const key = String(id);
    const current = getStageState(id);
    const next = { ...current, ...patch };
    stageStateMap = { ...stageStateMap, [key]: next };
    saveStageStateMap(stageStateMap);
  }

  function getStageName(id) {
    return (STAGES.find(s => s.id === id) || { name: "-" }).name;
  }

  function getTotalStamps() {
    const n = Number(localStorage.getItem(KEY_TOTAL) || "0");
    return Number.isFinite(n) ? n : 0;
  }
  function setTotalStamps(n) {
    localStorage.setItem(KEY_TOTAL, String(Math.max(0, n)));
  }

  function getTodayStamps() {
    const n = Number(localStorage.getItem(KEY_TODAY) || "0");
    return Number.isFinite(n) ? n : 0;
  }
  function setTodayStamps(n) {
    localStorage.setItem(KEY_TODAY, String(Math.max(0, n)));
  }

  function resetMiniTestProgress() {
    recentQueue = [];
    miniTestEligible = false;
    prevMiniEligible = false;
  }

  function recordCycleVisit() {
    if (!activeWords.length) return;
    const w = activeWords[index];
    if (!w || w.id == null) return;

    const st = getStageState(stageId);
    const visited = new Set(st.cycleVisited || []);
    visited.add(w.id);

    const completed = (visited.size >= activeWords.length);
    const nextVisited = completed ? [] : Array.from(visited);
    const nextBonus = st.bonusReady || completed;
    const nextCycleNotified = completed ? false : st.cycleNotified;

    setStageState(stageId, { cycleVisited: nextVisited, bonusReady: nextBonus, cycleNotified: nextCycleNotified });

    if (nextBonus) {
      tryShowBonusPrompt();
    }
  }

  function tryShowBonusPrompt() {
    const st = getStageState(stageId);
    if (!st.bonusReady) return;
    if (!bonusOverlay || bonusPromptVisible) return;
    if (testOverlay && !testOverlay.classList.contains("hidden")) return;

    bonusOverlay.classList.remove("hidden");
    bonusPromptVisible = true;
  }

  function hideBonusPrompt() {
    if (bonusOverlay) {
      bonusOverlay.classList.add("hidden");
    }
    bonusPromptVisible = false;
  }

  function handleBonusDecision(accept) {
    hideBonusPrompt();
    if (accept) {
      startBonusTest();
    } else {
      setStageState(stageId, { bonusReady: false });
    }
  }

  function startBonusTest() {
    const stagePool = getStageWords(stageId);
    const test = createTestFromPool(stagePool, "bonus");
    if (!test) {
      setStageState(stageId, { bonusReady: false });
      return;
    }

    setStageState(stageId, { bonusReady: false });
    currentTest = test;
    selectedChoice = null;
    testOverlay.classList.remove("hidden");
    renderTestQuestion();
  }

  function clampIndex() {
    if (activeWords.length <= 0) { index = 0; return; }
    if (index < 0) index = activeWords.length - 1;
    if (index >= activeWords.length) index = 0;
  }

  function saveCurrentIndex() {
    setStageState(stageId, { index });
  }

  function starRow(count, max, { filled = "★", empty = "☆" } = {}) {
    const c = Math.max(0, Math.min(max, count));
    return filled.repeat(c) + empty.repeat(max - c);
  }

  const TITLES = ["はじめの一歩", "見習い", "がんばりや", "たんけん家", "チャレンジャー", "エキスパート", "たつじん", "めいじん", "マスター", "レジェンド"];
  const STAMPS_PER_LEVEL = 20;

  function calcRank(total) {
    const lv = Math.max(1, Math.floor(total / STAMPS_PER_LEVEL) + 1);
    const title = TITLES[(lv - 1) % TITLES.length];
    return { title, lv };
  }

  function speak(text) {
    if (!text) return;
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.95;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  let toastTimer = null;
  function hideToast() {
    if (!toastEl) return;
    toastEl.classList.remove("show");
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
  }

  function toast(msg, { autoHide = true, duration = 1400 } = {}) {
    if (!toastEl || !toastTextEl) return;
    toastTextEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    if (autoHide) {
      toastTimer = setTimeout(() => {
        toastEl.classList.remove("show");
        toastTimer = null;
      }, duration);
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // UI
  function renderStageButtons() {
    stageStrip.innerHTML = "";
    STAGES.forEach(s => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "stage-btn" + (s.id === stageId ? " active" : "");
      btn.innerHTML = `<div class="stage-name">${escapeHtml(s.name)}</div>`;
      btn.addEventListener("click", () => {
        stageId = s.id;
        saveStageId(stageId);
        selectActiveWords();
        renderStageButtons();
        renderAll();
      });
      stageStrip.appendChild(btn);
    });
  }

  function renderCurrentStage() {
    currentStageEl.textContent = `ステージ${stageId}｜${getStageName(stageId)}`;
  }

  // Flip（#flip-card / #flip-inner どちらのCSSにも対応）
  let isFlipped = false;

  function setFlipped(flag) {
    isFlipped = !!flag;
    flipCardBtn.classList.toggle("is-flipped", isFlipped);
    flipInner.classList.toggle("is-flipped", isFlipped);

    // Android Chrome での backface レンダリング抜け対策
    frontFace?.classList.toggle("face-visible", !isFlipped);
    backFace?.classList.toggle("face-visible", isFlipped);
  }

  function resetFlipToFront() {
    setFlipped(false);
    tapHintEl.textContent = "タップしてカードをめくる";
  }

  function renderCard() {
    if (!activeWords.length) {
      progressEl.textContent = "0/0";
      frontEnglish.textContent = "データなし";
      frontKana.textContent = "";
      backJapanese.textContent = "";
      resetFlipToFront();
      return;
    }

    clampIndex();
    const w = activeWords[index];

    progressEl.textContent = `${index + 1}/${activeWords.length}`;

    resetFlipToFront();

    frontEnglish.textContent = w.english || "";
    frontKana.textContent = w.kana || "";
    backJapanese.textContent = w.japanese || "";

    showCycleStartMessageIfNeeded();
    markSeenCurrent();
    recordCycleVisit();
  }

  function renderStamps() {
    const today = getTodayStamps();
    todayStampsEl.textContent = starRow(today, 10, { filled: "⭐️" });

    const total = getTotalStamps();
    totalStampsEl.textContent = String(total);

    const r = calcRank(total);
    rankTitleEl.textContent = r.title;
    rankLevelEl.textContent = `Lv.${r.lv}`;
  }

  function showCycleStartMessageIfNeeded() {
    if (!activeWords.length) return;
    const st = getStageState(stageId);
    if (st.cycleNotified) return;
    if (index !== 0) return;

    toast("なんどでも、ちょうせんだ！");
    setStageState(stageId, { cycleNotified: true });
  }

  function showLevelUpMessages(prevTotal, updatedTotal) {
    const before = calcRank(prevTotal);
    const after = calcRank(updatedTotal);
    if (after.lv <= before.lv) return false;

    toast("レベルアップ！");
    if (after.title !== before.title) {
      setTimeout(() => toast(`${after.title}に レベルアップ！`), 1100);
    }
    return true;
  }

  function showResumeMessageIfResuming() {
    if (resumeToastShown) return;
    const rawState = localStorage.getItem(KEY_STAGE_STATE);
    if (!rawState) return;

    const st = getStageState(stageId);
    if (!activeWords.length) return;
    if (!Number.isFinite(st.index) || st.index <= 0) return;

    toast("つづきから、はじめるよ");
    resumeToastShown = true;
  }

  function scrollToMiniTest() {
    if (!miniTestArea) return;
    miniTestArea.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderMiniTestUI() {
    const seenCount = Math.min(10, recentQueue.length);
    const remaining = Math.max(0, 10 - seenCount);

    const eligible = miniTestEligible;
    const justUnlocked = eligible && !prevMiniEligible;
    prevMiniEligible = eligible;

    if (eligible) {
      remainingEl.textContent = "ミニテストできるよ！";
      miniTestArea.classList.remove("hidden");
      if (justUnlocked) scrollToMiniTest();
    } else {
      remainingEl.textContent = `あと${remaining}まいおぼえたらミニテストだよ`;
      miniTestArea.classList.add("hidden");
    }
  }

  function renderAll() {
    renderCurrentStage();
    renderCard();
    renderStamps();
    renderMiniTestUI();
    tryShowBonusPrompt();
  }

  // Data selection
  function selectActiveWords() {
    activeWords = getStageWords(stageId);
    const st = getStageState(stageId);
    index = st.index || 0;
    clampIndex();
    resetMiniTestProgress();
    bonusPromptVisible = false;
  }

  // 学習カウント（今日の10枚）
  function markSeenCurrent() {
    if (!activeWords.length) return;

    const w = activeWords[index];
    if (w == null || w.id == null) return;

    recentQueue.push(w);
    if (recentQueue.length > 10) {
      recentQueue.shift();
    }

    if (recentQueue.length >= 10) {
      miniTestEligible = true;
    }
  }

  // Flip action
  function toggleFlipAndSpeak() {
    if (!activeWords.length) return;

    setFlipped(!isFlipped);

    tapHintEl.textContent = isFlipped ? "" : "タップしてカードをめくる";

    const w = activeWords[index];
    speak(w.english);

    renderMiniTestUI();
  }

  // Next/Prev
  function startNextCooldown() {
    if (!nextBtn) return;
    nextCoolingDown = true;
    nextBtn.disabled = true;
    nextBtn.classList.add("is-cooling");
    if (nextCooldownTimer) clearTimeout(nextCooldownTimer);
    nextCooldownTimer = setTimeout(() => {
      nextCoolingDown = false;
      nextBtn.disabled = false;
      nextBtn.classList.remove("is-cooling");
    }, 1300);
  }

  function goNext() {
    if (nextCoolingDown) return;
    if (!activeWords.length) return;

    startNextCooldown();

    index += 1;
    clampIndex();
    saveCurrentIndex();
    renderCard();

    const w = activeWords[index];
    speak(w.english);

    renderMiniTestUI();
  }

  function goPrev() {
    if (!activeWords.length) return;
    index -= 1;
    clampIndex();
    saveCurrentIndex();
    renderCard();

    const w = activeWords[index];
    speak(w.english);
  }

 // ===============================
  // Mini Test（フリーズしない choices 生成）
  // ===============================
  function openTest() {
    if (!miniTestEligible) return;

    const pool = recentQueue.slice(-10);
    currentTest = createTestFromPool(pool, "mini");
    if (!currentTest) return;

    resetMiniTestProgress();

    selectedChoice = null;
    testOverlay.classList.remove("hidden");
    renderMiniTestUI();
    renderTestQuestion();
  }

  function closeTest() {
    testOverlay.classList.add("hidden");
    testBody.innerHTML = "";
    currentTest = null;
    selectedChoice = null;
    answerRevealed = false;
    optionNodes = [];
    resultBannerEl = null;
    answerSummaryEl = null;
    yourAnswerEl = null;
    correctAnswerEl = null;
    speakAnswerBtn = null;
  }

  function createTestFromPool(pool, kind) {
    const stagePool = getStageWords(stageId);
    if (!stagePool.length) return null;

    const questionWords = pickQuestionWords({
      primaryPool: pool,
      stagePool,
      allPool: WORDS,
      count: 3,
    });

    if (questionWords.length < 3) return null;

    const questions = questionWords.map((word, idx) => {
      const correct = (word.japanese || "").trim();
      const choices = buildTieredChoices({
        correctWord: word,
        stagePool,
        allPool: WORDS,
        maxChoices: 4,
      });
      return {
        id: word.id,
        english: word.english,
        answer: correct,
        choices,
        type: idx === 2 ? "en-jp" : "en-jp",
      };
    });

    return {
      kind,
      questions,
      currentQuestionIndex: 0,
      correctCount: 0,
    };
  }

  function pickQuestionWords({ primaryPool, stagePool, allPool, count }) {
    const selected = [];
    const seen = new Set();

    const tiers = [primaryPool, stagePool, allPool];
    tiers.forEach(pool => addRandomFromPool(pool));

    return selected.slice(0, count);

    function addRandomFromPool(pool) {
      if (!Array.isArray(pool) || selected.length >= count) return;
      const candidates = pool.filter(w => w && w.id != null && !seen.has(w.id));
      shuffleArray(candidates);
      for (const w of candidates) {
        if (selected.length >= count) break;
        selected.push(w);
        seen.add(w.id);
      }
    }
  }

  function buildTieredChoices({ correctWord, stagePool, allPool, maxChoices }) {
    const choices = [];
    const used = new Set();
    const correct = (correctWord?.japanese || "").trim();
    const unitType = correctWord?.unitType;
    const posGroup = correctWord?.posGroup || correctWord?.pos;

    function push(text) {
      const t = String(text || "").trim();
      if (!t || used.has(t)) return;
      used.add(t);
      choices.push(t);
    }

    push(correct);

    const tiers = [
      (w) => w.stageId === stageId && w.unitType === unitType && matchPosGroup(w, posGroup),
      (w) => w.unitType === unitType && matchPosGroup(w, posGroup),
      (w) => w.unitType === unitType,
      () => true,
    ];

    tiers.forEach(filterFn => {
      if (choices.length >= maxChoices) return;
      addFromPool(stagePool, filterFn);
      if (choices.length < maxChoices) addFromPool(allPool, filterFn);
    });

    shuffleArray(choices);
    return choices.slice(0, maxChoices);

    function addFromPool(pool, predicate) {
      if (!Array.isArray(pool)) return;
      const candidates = [];
      const local = new Set();
      pool.forEach(w => {
        if (!predicate(w)) return;
        const jp = String(w?.japanese || "").trim();
        if (!jp || jp === correct || local.has(jp)) return;
        local.add(jp);
        candidates.push(jp);
      });

      shuffleArray(candidates);
      for (const jp of candidates) {
        if (choices.length >= maxChoices) break;
        push(jp);
      }
    }

    function matchPosGroup(word, target) {
      const pg = word?.posGroup || word?.pos;
      return target ? pg === target : true;
    }
  }

  function shuffleArray(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  function renderTestQuestion() {
    if (!currentTest) return;

    resetResultIndicators();

    if (testTitleEl) {
      const label = currentTest.kind === "bonus" ? "おまけのミニテスト" : "ミニテスト";
      testTitleEl.textContent = `${label}（3問）`;
    }

    const q = currentTest.questions[currentTest.currentQuestionIndex];
    if (!q) return;

    testBody.innerHTML = "";

    resultBannerEl = document.createElement("div");
    resultBannerEl.className = "test-result hidden";
    testBody.appendChild(resultBannerEl);

    const box = document.createElement("div");
    box.className = "qbox";

    const title = document.createElement("div");
    title.className = "qtitle";
    title.textContent = `Q${currentTest.currentQuestionIndex + 1}. 「${q.english}」のいみは？`;
    box.appendChild(title);

    q.choices.forEach((opt) => {
      const label = document.createElement("label");
      label.className = "opt";
      label.dataset.choice = opt;

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "test-choice";
      input.value = opt;
      input.addEventListener("change", () => { selectedChoice = opt; });

      label.appendChild(input);
      label.appendChild(document.createTextNode(opt));
      box.appendChild(label);

      optionNodes.push({ label, input, choice: opt });
    });

    const summary = document.createElement("div");
    summary.className = "answer-summary hidden";

    const yourRow = document.createElement("div");
    yourRow.className = "summary-row";
    const yourLabel = document.createElement("span");
    yourLabel.className = "summary-label";
    yourLabel.textContent = "あなた：";
    yourAnswerEl = document.createElement("span");
    yourAnswerEl.className = "answer-pill";
    yourRow.appendChild(yourLabel);
    yourRow.appendChild(yourAnswerEl);

    const correctRow = document.createElement("div");
    correctRow.className = "summary-row";
    const correctLabel = document.createElement("span");
    correctLabel.className = "summary-label";
    correctLabel.textContent = "せいかい：";
    correctAnswerEl = document.createElement("span");
    correctAnswerEl.className = "answer-pill answer-pill-correct";
    correctRow.appendChild(correctLabel);
    correctRow.appendChild(correctAnswerEl);

    summary.appendChild(yourRow);
    summary.appendChild(correctRow);
    answerSummaryEl = summary;
    box.appendChild(summary);

    const speakRow = document.createElement("div");
    speakRow.className = "summary-row speak-row hidden";
    speakAnswerBtn = document.createElement("button");
    speakAnswerBtn.type = "button";
    speakAnswerBtn.className = "speak-btn";
    speakAnswerBtn.textContent = "はつおん";
    speakAnswerBtn.addEventListener("click", () => speak(q.english));
    speakRow.appendChild(speakAnswerBtn);
    box.appendChild(speakRow);

    testBody.appendChild(box);

    if (testSubmit) {
      testSubmit.textContent = "こたえ合わせ";
      testSubmit.disabled = false;
    }
  }

  function submitOrNext() {
    if (!currentTest) return;

    const q = currentTest.questions[currentTest.currentQuestionIndex];
    if (!q) return;

    if (answerRevealed) {
      goToNextQuestion();
      return;
    }

    if (!selectedChoice) {
      toast("えらんでね");
      return;
    }

    const isCorrect = (selectedChoice === q.answer);
    answerRevealed = true;

    // モーダル内短表示
    testBody.classList.add("flash");
    setTimeout(() => testBody.classList.remove("flash"), 180);

    if (isCorrect) currentTest.correctCount += 1;

    revealAnswer(q, isCorrect);
  }

  function revealAnswer(q, isCorrect) {
    if (resultBannerEl) {
      resultBannerEl.textContent = isCorrect ? "せいかい！" : "ざんねん…";
      resultBannerEl.classList.toggle("correct", isCorrect);
      resultBannerEl.classList.toggle("incorrect", !isCorrect);
      resultBannerEl.classList.remove("hidden");
    }

    optionNodes.forEach(({ label, input, choice }) => {
      input.disabled = true;
      const isAnswer = choice === q.answer;
      const isSelected = choice === selectedChoice;
      label.classList.toggle("is-correct", isAnswer);
      label.classList.toggle("is-selected", isSelected);
      label.classList.toggle("is-incorrect", isSelected && !isAnswer);
    });

    if (answerSummaryEl && yourAnswerEl && correctAnswerEl) {
      yourAnswerEl.textContent = selectedChoice;
      correctAnswerEl.textContent = q.answer;
      answerSummaryEl.classList.remove("hidden");
    }

    const speakRow = testBody.querySelector(".speak-row");
    if (speakRow && speakAnswerBtn) {
      speakRow.classList.remove("hidden");
      speakAnswerBtn.disabled = false;
    }

    if (testSubmit) {
      const last = (currentTest.currentQuestionIndex === currentTest.questions.length - 1);
      testSubmit.textContent = last ? "おわり" : "つぎへ";
      testSubmit.disabled = false;
    }
  }

  function goToNextQuestion() {
    if (!currentTest) return;
    if (!answerRevealed) return;

    currentTest.currentQuestionIndex += 1;
    selectedChoice = null;

    if (currentTest.currentQuestionIndex >= currentTest.questions.length) {
      finishTest();
    } else {
      renderTestQuestion();
    }
  }

  function finishTest() {
    if (!currentTest) return;

    const allCorrect = (currentTest.correctCount === currentTest.questions.length && currentTest.questions.length === 3);

    if (allCorrect) {
      const prevTotal = getTotalStamps();
      const today = getTodayStamps();
      if (today < MAX_STAMPS_PER_DAY) {
        setTodayStamps(today + 1);
        const updatedTotal = prevTotal + 1;
        setTotalStamps(updatedTotal);
        const leveledUp = showLevelUpMessages(prevTotal, updatedTotal);
        if (!leveledUp) {
          toast("スタンプをGet！", { duration: 2000 });
        }
      } else {
        toast("きょうは もう10こ いっぱいだよ", { autoHide: false });
      }
    } else {
      toast(`${currentTest.correctCount}/3 せいかい`, { autoHide: false });
    }

    renderStamps();
    closeTest();
  }

  function resetResultIndicators() {
    answerRevealed = false;
    optionNodes = [];
    resultBannerEl = null;
    answerSummaryEl = null;
    yourAnswerEl = null;
    correctAnswerEl = null;

    tryShowBonusPrompt();
  }

  // Load JSON
  async function loadWords() {
    try {
      const res = await fetch(WORDS_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("words.json load failed");
      const data = await res.json();

      // {words:[...]} or [...] 両対応
      if (Array.isArray(data)) WORDS = data;
      else if (data && Array.isArray(data.words)) WORDS = data.words;
      else WORDS = [];

      if (data && Array.isArray(data.stages)) {
        const parsedStages = data.stages
          .map(s => ({
            id: Number(s.id),
            name: s.name || `ステージ${s.id}`,
            startId: s.startId,
            endId: s.endId,
          }))
          .filter(s => Number.isFinite(s.id));
        if (parsedStages.length) {
          parsedStages.sort((a, b) => a.id - b.id);
          STAGES = parsedStages;
        }
      }
    } catch {
      WORDS = [];
    }
  }

  // Init
  async function init() {
    ensureDayReset();

    await loadWords();
    selectActiveWords();
    renderStageButtons();
    renderAll();
    showResumeMessageIfResuming();

    flipCardBtn?.addEventListener("click", toggleFlipAndSpeak);
    nextBtn?.addEventListener("click", goNext);
    prevBtn?.addEventListener("click", goPrev);

    miniTestBtn?.addEventListener("click", openTest);
    testClose?.addEventListener("click", closeTest);
    testOverlay?.addEventListener("click", (ev) => {
      if (ev.target === testOverlay) closeTest();
    });
    testSubmit?.addEventListener("click", submitOrNext);
    toastCloseBtn?.addEventListener("click", hideToast);
    bonusYesBtn?.addEventListener("click", () => handleBonusDecision(true));
    bonusNoBtn?.addEventListener("click", () => handleBonusDecision(false));
  }

  init();
})();
