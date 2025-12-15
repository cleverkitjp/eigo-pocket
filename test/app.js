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
  const STAGES = [
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
  const KEY_SEEN = "eigoPocket:seenIds";
  const KEY_ELIGIBLE = "eigoPocket:testEligible";
  const KEY_AVAILABLE_BLOCK = "eigoPocket:availableBlockKey";

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

  const toastEl = document.getElementById("toast");

  const RESULT_AUTO_ADVANCE_MS = 1400;

  // State
  let WORDS = [];
  let stageId = loadStageId();
  let activeWords = [];
  let index = 0;

  let currentTest = null;
  let selectedChoice = null;
  let answerRevealed = false;
  let resultTimer = null;
  let optionNodes = [];
  let resultBannerEl = null;
  let answerSummaryEl = null;
  let yourAnswerEl = null;
  let correctAnswerEl = null;

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
      localStorage.setItem(KEY_SEEN, JSON.stringify([]));
      localStorage.setItem(KEY_ELIGIBLE, "0");
      localStorage.removeItem(KEY_AVAILABLE_BLOCK);
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

  function getSeenIds() {
    try {
      const arr = JSON.parse(localStorage.getItem(KEY_SEEN) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  function setSeenIds(arr) {
    localStorage.setItem(KEY_SEEN, JSON.stringify(arr));
  }

  function isEligible() {
    return localStorage.getItem(KEY_ELIGIBLE) === "1";
  }
  function setEligible(v) {
    localStorage.setItem(KEY_ELIGIBLE, v ? "1" : "0");
  }

  function getAvailableBlockKey() {
    return localStorage.getItem(KEY_AVAILABLE_BLOCK);
  }
  function setAvailableBlockKey(v) {
    if (v == null) localStorage.removeItem(KEY_AVAILABLE_BLOCK);
    else localStorage.setItem(KEY_AVAILABLE_BLOCK, String(v));
  }

  function clampIndex() {
    if (activeWords.length <= 0) { index = 0; return; }
    if (index < 0) index = activeWords.length - 1;
    if (index >= activeWords.length) index = 0;
  }

  function starRow(count, max) {
    const c = Math.max(0, Math.min(max, count));
    return "★".repeat(c) + "☆".repeat(max - c);
  }

  const TITLES = ["ひよこ", "見習い", "がんばりや", "たんけん家", "はかせ", "せんせい", "たつじん", "めいじん", "でんせつ", "えいごのたつじん"];
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
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1400);
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
        index = 0;
        selectActiveWords();
        renderStageButtons();
        renderAll();
      });
      stageStrip.appendChild(btn);
    });
  }

  function renderCurrentStage() {
    currentStageEl.textContent = `ステージ｜${getStageName(stageId)}`;
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
  }

  function renderStamps() {
    const today = getTodayStamps();
    todayStampsEl.textContent = starRow(today, 10);

    const total = getTotalStamps();
    totalStampsEl.textContent = String(total);

    const r = calcRank(total);
    rankTitleEl.textContent = r.title;
    rankLevelEl.textContent = `Lv.${r.lv}`;
  }

  function renderMiniTestUI() {
    const seen = getSeenIds();
    const seenCount = Math.min(10, seen.length);
    const remaining = Math.max(0, 10 - seenCount);

    if (isEligible()) {
      remainingEl.textContent = "ミニテストできるよ！";
      miniTestArea.classList.remove("hidden");
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
  }

  // Data selection
  function selectActiveWords() {
    const stage = STAGES.find(s => s.id === stageId);
    if (!stage) { activeWords = []; return; }
    activeWords = WORDS
      .filter(w => w && Number(w.id) >= stage.startId && Number(w.id) <= stage.endId)
      .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  }

  // 学習カウント（今日の10枚）
  function markSeenCurrent() {
    if (!activeWords.length) return;

    const w = activeWords[index];
    if (w == null || w.id == null) return;

    const seen = getSeenIds();
    if (!seen.includes(w.id)) {
      seen.push(w.id);
      setSeenIds(seen);
    }

    if (seen.length >= 10 && !isEligible()) {
      // ブロックキー（30語区切り）を保存してミニテスト対象にする
      const stage = STAGES.find(s => s.id === stageId);
      if (stage) {
        const blockKey = Math.floor((Number(w.id) - stage.startId) / 30);
        setAvailableBlockKey(String(blockKey)); // ★修正：ここが壊れていた
      }
      setEligible(true);
    }
  }

  // Flip action
  function toggleFlipAndSpeak() {
    if (!activeWords.length) return;

    markSeenCurrent();

    setFlipped(!isFlipped);

    tapHintEl.textContent = isFlipped ? "" : "タップしてカードをめくる";

    const w = activeWords[index];
    speak(w.english);

    renderMiniTestUI();
  }

  // Next/Prev
  function goNext() {
    if (!activeWords.length) return;

    markSeenCurrent();

    index += 1;
    clampIndex();
    renderCard();

    const w = activeWords[index];
    speak(w.english);

    renderMiniTestUI();
  }

  function goPrev() {
    if (!activeWords.length) return;
    index -= 1;
    clampIndex();
    renderCard();
  }

 // ===============================
  // Mini Test（フリーズしない choices 生成）
  // ===============================
  function openTest() {
    if (!isEligible()) return;

    const blockKey = getAvailableBlockKey();
    if (blockKey == null) return;

    currentTest = createTestForBlock(blockKey);
    if (!currentTest) return;

    setEligible(false);
    setSeenIds([]);

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
    if (resultTimer) { clearTimeout(resultTimer); resultTimer = null; }
  }

  function createTestForBlock(blockKey) {
    const stage = STAGES.find(s => s.id === stageId);
    if (!stage) return null;

    const stagePool = WORDS.filter(w => w.id >= stage.startId && w.id <= stage.endId);

    const blockIndex = Math.max(0, Number(blockKey) || 0);
    const start = stage.startId + blockIndex * 30;
    const end = Math.min(stage.endId, start + 29);

    const blockPool = WORDS.filter(w => w.id >= start && w.id <= end);

    const questionCount = Math.min(3, blockPool.length);
    const picked = pickUniqueRandom(blockPool, w => w.id, questionCount);

    const questions = picked.map(word => {
      const correct = (word.japanese || "").trim();
      const choices = buildChoicesSafe({
        correct,
        stagePool,
        allPool: WORDS,
        maxChoices: 4,
      });
      return {
        id: word.id,
        english: word.english,
        answer: correct,
        choices,
      };
    });

    return {
      blockKey,
      questions,
      currentQuestionIndex: 0,
      correctCount: 0,
    };
  }

  function pickUniqueRandom(arr, keyFn, n) {
    const a = Array.isArray(arr) ? arr.slice() : [];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    const seen = new Set();
    const out = [];
    for (const item of a) {
      const k = keyFn(item);
      if (k == null || seen.has(k)) continue;
      seen.add(k);
      out.push(item);
      if (out.length >= n) break;
    }
    return out;
  }

  function buildChoicesSafe({ correct, stagePool, allPool, maxChoices }) {
    const choices = [];
    const used = new Set();

    function pushChoice(text) {
      const t = String(text || "").trim();
      if (!t) return false;
      if (used.has(t)) return false;
      used.add(t);
      choices.push(t);
      return true;
    }

    // 正解
    pushChoice(correct);

    // ステージ内 → 全体 の順に足す（無限ループしない）
    addFromPool(stagePool);
    if (choices.length < maxChoices) addFromPool(allPool);

    // どうしても足りない場合の保険
    while (choices.length < maxChoices) {
      pushChoice("（まだないよ）");
    }

    shuffleArray(choices);
    return choices;

    function addFromPool(pool) {
      if (!Array.isArray(pool) || pool.length === 0) return;

      const cand = [];
      const local = new Set();
      for (const w of pool) {
        const jp = String(w?.japanese || "").trim();
        if (!jp) continue;
        if (jp === correct) continue;
        if (local.has(jp)) continue;
        local.add(jp);
        cand.push(jp);
      }

      for (let i = cand.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cand[i], cand[j]] = [cand[j], cand[i]];
      }

      for (const jp of cand) {
        if (choices.length >= maxChoices) break;
        pushChoice(jp);
      }
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

    if (testSubmit) {
      const last = (currentTest.currentQuestionIndex === currentTest.questions.length - 1);
      testSubmit.textContent = last ? "おわり" : "つぎへ";
      testSubmit.disabled = isCorrect;
    }

    if (isCorrect) {
      resultTimer = setTimeout(() => {
        testSubmit.disabled = false;
        goToNextQuestion();
      }, RESULT_AUTO_ADVANCE_MS);
    }
  }

  function goToNextQuestion() {
    if (!currentTest) return;
    if (!answerRevealed) return;

    if (resultTimer) { clearTimeout(resultTimer); resultTimer = null; }

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
      const today = getTodayStamps();
      if (today < MAX_STAMPS_PER_DAY) {
        setTodayStamps(today + 1);
        setTotalStamps(getTotalStamps() + 1);
        toast("スタンプをGet！");
      } else {
        toast("きょうは もう10こ いっぱいだよ");
      }
    } else {
      toast(`${currentTest.correctCount}/3 せいかい`);
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
    if (resultTimer) { clearTimeout(resultTimer); resultTimer = null; }
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

    flipCardBtn?.addEventListener("click", toggleFlipAndSpeak);
    nextBtn?.addEventListener("click", goNext);
    prevBtn?.addEventListener("click", goPrev);

    miniTestBtn?.addEventListener("click", openTest);
    testClose?.addEventListener("click", closeTest);
    testOverlay?.addEventListener("click", (ev) => {
      if (ev.target === testOverlay) closeTest();
    });
    testSubmit?.addEventListener("click", submitOrNext);
  }

  init();
})();
