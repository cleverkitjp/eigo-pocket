/* えいごポケット
  - words.json を読み込み（配列形式 / {stages, words} 形式の両対応）
  - ステージは「和名のみ」（words.json に stages があればそれを優先）
  - カードタップで反転（くるっ）※ flip-inner に is-flipped を付ける
  - タップ & つぎへ で音声（音声ボタンは無し）
  - 10枚おぼえたらミニテスト権利（権利=1回）
  - ミニテストは権利獲得後に出現（権利が無いと非表示）
  - 共有footerは index.html 側で読み込み
*/

(() => {
  "use strict";

  const WORDS_URL = "./words.json";

  // ====== ステージ和名（words.json で stages が来たら上書きする） ======
  let STAGES = [
    { id: 1, name: "はじまりの森" },
    { id: 2, name: "ことばの川" },
    { id: 3, name: "おんがくの丘" },
    { id: 4, name: "ひかりの草原" },
    { id: 5, name: "まなびの洞くつ" },
    { id: 6, name: "しぜんの谷" },
    { id: 7, name: "まちの広場" },
    { id: 8, name: "じかんの森" },
    { id: 9, name: "いろの庭" },
    { id: 10, name: "たつじんへの道" },
  ];

  // ====== LocalStorage keys ======
  const KEY_STAGE = "eigoPocket:selectedStageId";
  const KEY_TOTAL = "eigoPocket:totalStamps";
  const KEY_TODAY = "eigoPocket:todayStamps";
  const KEY_DAY = "eigoPocket:dayKey";
  const KEY_SEEN = "eigoPocket:seenIds";          // 今日見たカードID配列
  const KEY_ELIGIBLE = "eigoPocket:testEligible"; // ミニテスト権利（1回）

  // ====== DOM ======
  const stageStrip = document.getElementById("stage-strip");
  const currentStageEl = document.getElementById("current-stage");

  const flipCardBtn = document.getElementById("flip-card");
  const flipInner = document.getElementById("flip-inner");

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

  // DOMが足りない場合は落とす（静かに）
  const required = [
    stageStrip, currentStageEl,
    flipCardBtn, flipInner,
    frontEnglish, frontKana, backJapanese,
    progressEl, tapHintEl,
    prevBtn, nextBtn,
    remainingEl, miniTestArea, miniTestBtn,
    todayStampsEl, totalStampsEl, rankTitleEl, rankLevelEl,
    testOverlay, testBody, testClose, testSubmit
  ];
  if (required.some(x => !x)) return;

  // ====== State ======
  let allWords = [];
  let stageId = loadStageId();
  let stageWords = [];
  let index = 0;

  // ====== Helpers ======
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
    return (STAGES.find(s => Number(s.id) === Number(id)) || { name: "-" }).name;
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

  function clampIndex() {
    if (stageWords.length <= 0) { index = 0; return; }
    if (index < 0) index = stageWords.length - 1;
    if (index >= stageWords.length) index = 0;
  }

  function starRow(count, max) {
    const c = Math.max(0, Math.min(max, count));
    return "★".repeat(c) + "☆".repeat(max - c);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ====== 称号×Lv（簡易版）=====
  // 20個でLvアップ、称号は循環（エンドレス感）
  const TITLES = ["ひよこ", "見習い", "がんばりや", "たんけん家", "はかせ", "せんせい", "たつじん", "めいじん", "でんせつ", "えいごのたつじん"];
  const STAMPS_PER_LEVEL = 20;

  function calcRank(total) {
    const lv = Math.max(1, Math.floor(total / STAMPS_PER_LEVEL) + 1);
    const title = TITLES[(lv - 1) % TITLES.length];
    return { title, lv };
  }

  // ====== Speech ======
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

  // ====== UI Render ======
  function renderStageButtons() {
    stageStrip.innerHTML = "";

    // STAGES が空なら、words の stageId から自動生成（最低限）
    if (!Array.isArray(STAGES) || STAGES.length === 0) {
      const ids = [...new Set(allWords.map(w => Number(w.stageId)).filter(n => Number.isFinite(n)))].sort((a,b) => a-b);
      STAGES = ids.map(id => ({ id, name: `ステージ${id}` }));
    }

    STAGES.forEach(s => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "stage-btn" + (Number(s.id) === Number(stageId) ? " active" : "");
      btn.innerHTML = `<div class="stage-name">${escapeHtml(s.name)}</div>`;
      btn.addEventListener("click", () => {
        stageId = Number(s.id);
        saveStageId(stageId);
        index = 0;
        selectStageWords();
        renderStageButtons();
        renderAll();
      });
      stageStrip.appendChild(btn);
    });
  }

  function renderCurrentStage() {
    currentStageEl.textContent = `ステージ｜${getStageName(stageId)}`;
  }

  function resetFlipToFront() {
    // CSSは .flip-inner.is-flipped を回転させるので、flipInner に付ける
    flipInner.classList.remove("is-flipped");
    tapHintEl.textContent = "タップしてカードをめくる";
  }

  function renderCard() {
    if (!stageWords.length) {
      progressEl.textContent = "0/0";
      frontEnglish.textContent = "データなし";
      frontKana.textContent = "";
      backJapanese.textContent = "";
      resetFlipToFront();
      return;
    }

    clampIndex();
    const w = stageWords[index];

    progressEl.textContent = `${index + 1}/${stageWords.length}`;

    // 描画前に表へ戻す（重なり事故防止）
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
    // 10枚見たら権利（1回）→獲得後にボタン出現
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

  // ====== Stage Words ======
  function selectStageWords() {
    stageWords = allWords.filter(w => Number(w.stageId) === Number(stageId));
    stageWords.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    index = 0;
  }

  // ====== 学習カウント（今日の10枚） ======
  function markSeenCurrent() {
    if (!stageWords.length) return;

    const w = stageWords[index];
    if (w == null || w.id == null) return;

    const seen = getSeenIds();
    if (!seen.includes(w.id)) {
      seen.push(w.id);
      setSeenIds(seen);
    }

    // 10枚に達したら「権利獲得（1回）」へ
    if (seen.length >= 10 && !isEligible()) {
      setEligible(true);
    }
  }

  // ====== Flip ======
  function toggleFlipAndSpeak() {
    if (!stageWords.length) return;

    // タップ = 学習としてカウント
    markSeenCurrent();

    // 反転（CSSに合わせて flipInner に is-flipped）
    flipInner.classList.toggle("is-flipped");

    // 裏面ではヒント消す
    if (flipInner.classList.contains("is-flipped")) {
      tapHintEl.textContent = "";
    } else {
      tapHintEl.textContent = "タップしてカードをめくる";
    }

    // タップで音声（英語）
    const w = stageWords[index];
    speak(w.english);

    renderMiniTestUI();
  }

  // ====== Next/Prev ======
  function goNext() {
    if (!stageWords.length) return;

    // 次へ = 学習としてカウント
    markSeenCurrent();

    index += 1;
    clampIndex();
    renderCard();

    // 次へで音声（新しい英語）
    const w = stageWords[index];
    speak(w.english);

    renderMiniTestUI();
  }

  function goPrev() {
    if (!stageWords.length) return;
    index -= 1;
    clampIndex();
    renderCard();
  }

  // ====== Mini Test ======
  // 権利獲得後に出現 → 開いたら権利消費＆「今日見た10枚」をリセット（次の周回へ）
  let currentQuiz = null;

  function openTest() {
    if (!isEligible()) return;
    if (!stageWords.length) return;

    // 権利消費（1回）
    setEligible(false);
    setSeenIds([]); // 次の10枚カウントを始める

    // 問題生成
    currentQuiz = makeQuiz(stageWords);

    renderQuiz(currentQuiz);
    testOverlay.classList.remove("hidden");
    renderMiniTestUI();
  }

  function closeTest() {
    testOverlay.classList.add("hidden");
    testBody.innerHTML = "";
    currentQuiz = null;
  }

  function makeQuiz(pool) {
    // 3問、各問は「にほんご→えいご」を4択
    const qs = [];
    const usedIds = new Set();

    for (let i = 0; i < 3; i++) {
      const q = pickRandom(pool, usedIds);
      if (!q) break;
      usedIds.add(q.id);

      // unitTypeごとに選択肢をそろえる（word/phrase/idiom など）
      const group = (q.unitType || "word");
      const candidates = pool.filter(x => (x.unitType || "word") === group && x.id !== q.id);

      const options = [q.english];

      while (options.length < 4 && candidates.length > 0) {
        const d = candidates[Math.floor(Math.random() * candidates.length)];
        if (d?.english && !options.includes(d.english)) options.push(d.english);
      }

      // 足りない場合は全体から補完
      while (options.length < 4) {
        const d = pool[Math.floor(Math.random() * pool.length)];
        if (d?.english && !options.includes(d.english)) options.push(d.english);
      }

      shuffle(options);

      qs.push({
        id: q.id,
        prompt: q.japanese,
        answer: q.english,
        options
      });
    }

    return { qs };
  }

  function pickRandom(arr, usedIds) {
    const cand = arr.filter(x => x && x.id != null && !usedIds.has(x.id));
    if (!cand.length) return null;
    return cand[Math.floor(Math.random() * cand.length)];
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  function renderQuiz(quiz) {
    testBody.innerHTML = "";
    quiz.qs.forEach((q, idx) => {
      const box = document.createElement("div");
      box.className = "qbox";

      const title = document.createElement("div");
      title.className = "qtitle";
      title.textContent = `Q${idx + 1}. 「${q.prompt}」はどれ？`;
      box.appendChild(title);

      q.options.forEach((opt) => {
        const label = document.createElement("label");
        label.className = "opt";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = `q${idx}`;
        input.value = opt;

        label.appendChild(input);
        label.appendChild(document.createTextNode(opt));
        box.appendChild(label);
      });

      testBody.appendChild(box);
    });
  }

  function gradeQuiz() {
    if (!currentQuiz) return;

    let correct = 0;
    currentQuiz.qs.forEach((q, idx) => {
      const selected = document.querySelector(`input[name="q${idx}"]:checked`);
      if (selected && selected.value === q.answer) correct += 1;
    });

    const allCorrect = (correct === currentQuiz.qs.length && currentQuiz.qs.length === 3);

    if (allCorrect) {
      // ぜんもんせいかいでスタンプ（ただし今日10こまで）
      const today = getTodayStamps();
      if (today < 10) {
        setTodayStamps(today + 1);
        setTotalStamps(getTotalStamps() + 1);
        alert("ぜんもんせいかい！スタンプを1こゲット！");
      } else {
        alert("ぜんもんせいかい！でも きょうは もう10こ いっぱいだよ");
      }
    } else {
      alert(`ざんねん！ ${correct}/3 せいかい`);
    }

    renderStamps();
    closeTest();
  }

  // ====== words.json 読み込み（両対応） ======
  async function loadWordsJson() {
    const res = await fetch(WORDS_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("words.json load failed");
    const data = await res.json();

    // ✅ 1) 配列形式: [ {...}, {...} ]
    if (Array.isArray(data)) {
      return { stages: null, words: data };
    }

    // ✅ 2) オブジェクト形式: { version, stages:[...], words:[...] }
    if (data && Array.isArray(data.words)) {
      return { stages: Array.isArray(data.stages) ? data.stages : null, words: data.words };
    }

    return { stages: null, words: [] };
  }

  // ====== Init ======
  async function init() {
    ensureDayReset();

    try {
      const pack = await loadWordsJson();

      allWords = Array.isArray(pack.words) ? pack.words : [];

      // words.json の stages があれば優先（和名のみ）
      if (Array.isArray(pack.stages) && pack.stages.length) {
        STAGES = pack.stages
          .map(s => ({ id: Number(s.id), name: String(s.name || "-") }))
          .filter(s => Number.isFinite(s.id));
      }

    } catch {
      allWords = [];
    }

    // stageId が stages に存在しないなら、先頭に合わせる
    const stageIds = STAGES.map(s => Number(s.id)).filter(n => Number.isFinite(n));
    if (stageIds.length && !stageIds.includes(Number(stageId))) {
      stageId = stageIds[0];
      saveStageId(stageId);
    }

    selectStageWords();
    renderStageButtons();
    renderAll();

    // Events
    flipCardBtn.addEventListener("click", toggleFlipAndSpeak);
    nextBtn.addEventListener("click", goNext);
    prevBtn.addEventListener("click", goPrev);

    miniTestBtn.addEventListener("click", openTest);
    testClose.addEventListener("click", closeTest);
    testOverlay.addEventListener("click", (ev) => {
      if (ev.target === testOverlay) closeTest();
    });
    testSubmit.addEventListener("click", gradeQuiz);
  }

  init();
})();
```0
