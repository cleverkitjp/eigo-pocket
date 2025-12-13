/* えいごポケット app.js（整合版）
  - words.json を正式に { stages:[], words:[] } として読み込み
  - ステージは和名のみ（JSONのstagesを優先）
  - カード反転は Android Chrome 安定化（div role=button / is-flippedは#flip-innerのみ）
  - タップ & つぎへ で音声
  - 10枚でミニテスト権利（1回）
  - ミニテストは 1問ずつ（3問）、モーダル内で「せいかい！」短表示
  - スタンプ獲得はトースト（1日10こ上限あり）
*/

(() => {
  const WORDS_URL = "./words.json";

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

  const flipCard = document.getElementById("flip-card");   // div role=button
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

  const toastEl = document.getElementById("toast");

  // ====== State ======
  let STAGES = [];     // words.json stages
  let allWords = [];   // words.json words
  let stageId = loadStageId();
  let stageWords = [];
  let index = 0;

  // quiz state
  let quiz = null;  // { items:[{prompt, answer, options, meta}], i, correctCount }

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

  function saveStageId(id) { localStorage.setItem(KEY_STAGE, String(id)); }

  function getTotalStamps() {
    const n = Number(localStorage.getItem(KEY_TOTAL) || "0");
    return Number.isFinite(n) ? n : 0;
  }
  function setTotalStamps(n) { localStorage.setItem(KEY_TOTAL, String(Math.max(0, n))); }

  function getTodayStamps() {
    const n = Number(localStorage.getItem(KEY_TODAY) || "0");
    return Number.isFinite(n) ? n : 0;
  }
  function setTodayStamps(n) { localStorage.setItem(KEY_TODAY, String(Math.max(0, n))); }

  function getSeenIds() {
    try {
      const arr = JSON.parse(localStorage.getItem(KEY_SEEN) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function setSeenIds(arr) { localStorage.setItem(KEY_SEEN, JSON.stringify(arr)); }

  function isEligible() { return localStorage.getItem(KEY_ELIGIBLE) === "1"; }
  function setEligible(v) { localStorage.setItem(KEY_ELIGIBLE, v ? "1" : "0"); }

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

  // ====== 称号×Lv（循環）=====
  const TITLES = ["ひよこ","見習い","がんばりや","たんけん家","はかせ","せんせい","たつじん","めいじん","でんせつ","えいごのたつじん"];
  const STAMPS_PER_LEVEL = 20;

  function calcRank(total) {
    const lv = Math.max(1, Math.floor(total / STAMPS_PER_LEVEL) + 1);
    const title = TITLES[(lv - 1) % TITLES.length];
    return { title, lv };
  }

  // ====== Toast ======
  let toastTimer = null;
  function toast(msg, ms = 1200) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.add("hidden");
      toastEl.textContent = "";
    }, ms);
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

  // ====== Stage / words selection ======
  function getStageName(id) {
    return (STAGES.find(s => Number(s.id) === Number(id)) || { name: "-" }).name || "-";
  }

  function selectStageWords() {
    stageWords = allWords.filter(w => Number(w.stageId) === Number(stageId));
    stageWords.sort((a,b) => (a.id ?? 0) - (b.id ?? 0));
    index = 0;
  }

  // ====== UI render ======
  function renderStageButtons() {
    stageStrip.innerHTML = "";
    STAGES.forEach(s => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "stage-btn" + (Number(s.id) === Number(stageId) ? " active" : "");
      btn.innerHTML = `<div class="stage-name">${escapeHtml(s.name)}</div>`;
      btn.addEventListener("click", () => {
        stageId = Number(s.id);
        saveStageId(stageId);
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

  // ====== Flip control ======
  function setFlipped(flag) {
    flipInner.classList.toggle("is-flipped", !!flag);
    // 裏面ではヒント消す
    tapHintEl.textContent = flag ? "" : "タップしてカードをめくる";
  }

  function resetFlipToFront() {
    setFlipped(false);
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

  // ====== 今日の学習カウント（10枚） ======
  function markSeenCurrent() {
    if (!stageWords.length) return;
    const w = stageWords[index];
    if (!w || w.id == null) return;

    const seen = getSeenIds();
    if (!seen.includes(w.id)) {
      seen.push(w.id);
      setSeenIds(seen);
    }
    if (seen.length >= 10 && !isEligible()) setEligible(true);
  }

  // ====== Flip events ======
  function toggleFlipAndSpeak() {
    if (!stageWords.length) return;

    markSeenCurrent();

    const now = flipInner.classList.contains("is-flipped");
    setFlipped(!now);

    // タップで音声（英語）
    const w = stageWords[index];
    speak(w.english);

    renderMiniTestUI();
  }

  function goNext() {
    if (!stageWords.length) return;

    markSeenCurrent();

    index += 1;
    clampIndex();
    renderCard();

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

  // ====== Mini test (1問ずつ) ======
  function openTest() {
    if (!isEligible()) return;
    if (!stageWords.length) return;

    // 権利消費（1回）＆ 次の10枚へ
    setEligible(false);
    setSeenIds([]);

    quiz = makeQuiz(stageWords, allWords);
    renderQuizStep();

    testOverlay.classList.remove("hidden");
    renderMiniTestUI();
  }

  function closeTest() {
    testOverlay.classList.add("hidden");
    testBody.innerHTML = "";
    quiz = null;
  }

  // posGroup（posの大分類）を作る：noun/verb/adj/adv/other
  function posGroup(pos) {
    const p = String(pos || "").toLowerCase();
    if (p.includes("noun")) return "noun";
    if (p.includes("verb")) return "verb";
    if (p.includes("adj")) return "adj";
    if (p.includes("adv")) return "adv";
    return "other";
  }

  // 選択肢生成ルール（あなたの案に沿う）
  // 1) ステージ内：同unitType & 同posGroup
  // 2) 全データ：同unitType & 同posGroup
  // 3) 全データ：同unitType
  // 4) 全データ：なんでも
  function makeOptions(correctWord, stagePool, allPool, wantCount = 4) {
    const correct = correctWord.english;
    const ut = correctWord.unitType || "word";
    const pg = posGroup(correctWord.pos);

    const pickFrom = (pool, pred) => pool.filter(w => w && w.english && w.english !== correct && pred(w));

    const buckets = [
      pickFrom(stagePool, w => (w.unitType || "word") === ut && posGroup(w.pos) === pg),
      pickFrom(allPool,   w => (w.unitType || "word") === ut && posGroup(w.pos) === pg),
      pickFrom(allPool,   w => (w.unitType || "word") === ut),
      pickFrom(allPool,   _ => true),
    ];

    const opts = [correct];
    for (const b of buckets) {
      shuffle(b);
      for (const w of b) {
        if (opts.length >= wantCount) break;
        if (!opts.includes(w.english)) opts.push(w.english);
      }
      if (opts.length >= wantCount) break;
    }

    // 4択に足りない場合は「重複なしであるだけ」出す（表示はそのまま：不足しても動かす）
    shuffle(opts);
    return opts;
  }

  function makeQuiz(stagePool, allPool) {
    // 3問：にほんご→えいご 4択
    const items = [];
    const used = new Set();

    const pool = [...stagePool];
    shuffle(pool);

    for (const w of pool) {
      if (!w || w.id == null) continue;
      if (used.has(w.id)) continue;
      used.add(w.id);

      const options = makeOptions(w, stagePool, allPool, 4);
      shuffle(options);

      items.push({
        id: w.id,
        prompt: w.japanese || "",
        answer: w.english || "",
        options,
      });

      if (items.length >= 3) break;
    }

    return { items, i: 0, correctCount: 0 };
  }

  function renderQuizStep(msgTop = "") {
    if (!quiz) return;
    const item = quiz.items[quiz.i];
    if (!item) return;

    testBody.innerHTML = "";

    const box = document.createElement("div");
    box.className = "qbox";

    if (msgTop) {
      const m = document.createElement("div");
      m.className = "qtitle";
      m.textContent = msgTop;
      box.appendChild(m);
    }

    const title = document.createElement("div");
    title.className = "qtitle";
    title.textContent = `Q${quiz.i + 1}. 「${item.prompt}」はどれ？`;
    box.appendChild(title);

    item.options.forEach((opt) => {
      const label = document.createElement("label");
      label.className = "opt";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "q";
      input.value = opt;

      label.appendChild(input);
      label.appendChild(document.createTextNode(opt));
      box.appendChild(label);
    });

    testBody.appendChild(box);

    testSubmit.textContent = "こたえる";
  }

  function gradeStep() {
    if (!quiz) return;
    const item = quiz.items[quiz.i];
    if (!item) return;

    const selected = document.querySelector('input[name="q"]:checked');
    if (!selected) {
      toast("えらんでね");
      return;
    }

    const ok = selected.value === item.answer;
    if (ok) quiz.correctCount += 1;

    // 1問ごとに短表示（モーダル内）
    const msg = ok ? "せいかい！" : "ざんねん…";
    renderQuizStep(msg);

    // 少し見せてから次へ/終了
    setTimeout(() => {
      quiz.i += 1;

      if (quiz.i < quiz.items.length) {
        renderQuizStep();
        return;
      }

      // 終了：全問正解ならスタンプ付与（今日10こ上限）
      const allCorrect = (quiz.correctCount === 3 && quiz.items.length === 3);

      if (allCorrect) {
        const today = getTodayStamps();
        if (today < 10) {
          setTodayStamps(today + 1);
          setTotalStamps(getTotalStamps() + 1);
          renderStamps();
          toast("スタンプ+1 かくとく！");
        } else {
          toast("きょうは もう10こ いっぱいだよ");
        }
      } else {
        toast(`${quiz.correctCount}/3 せいかい`);
      }

      closeTest();
    }, 650);
  }

  function shuffle(a) {
    for (let i=a.length-1; i>0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  // ====== Init ======
  async function loadJson() {
    const res = await fetch(WORDS_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("words.json load failed");

    const json = await res.json();

    // 正式構造 {stages, words}
    const stages = Array.isArray(json?.stages) ? json.stages : [];
    const words = Array.isArray(json?.words) ? json.words : (Array.isArray(json) ? json : []);

    STAGES = stages.map(s => ({
      id: Number(s.id),
      name: String(s.name || `ステージ${s.id}`)
    })).filter(s => Number.isFinite(s.id));

    allWords = words.filter(w => w && w.english != null && w.stageId != null);

    // stagesが無い場合の保険（最低限動かす）
    if (!STAGES.length) {
      const ids = Array.from(new Set(allWords.map(w => Number(w.stageId)).filter(n => Number.isFinite(n))))
        .sort((a,b) => a-b);
      STAGES = ids.map(id => ({ id, name: `ステージ${id}` }));
    }

    // 選択中stageが存在しない場合は1番へ
    if (!STAGES.some(s => Number(s.id) === Number(stageId))) {
      stageId = Number(STAGES[0]?.id || 1);
      saveStageId(stageId);
    }
  }

  function bindEvents() {
    // click
    flipCard.addEventListener("click", toggleFlipAndSpeak);

    // keyboard (Enter/Space)
    flipCard.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleFlipAndSpeak();
      }
    });

    nextBtn.addEventListener("click", goNext);
    prevBtn.addEventListener("click", goPrev);

    miniTestBtn.addEventListener("click", openTest);
    testClose.addEventListener("click", closeTest);
    testOverlay.addEventListener("click", (ev) => {
      if (ev.target === testOverlay) closeTest();
    });
    testSubmit.addEventListener("click", gradeStep);
  }

  async function init() {
    ensureDayReset();

    try {
      await loadJson();
    } catch (e) {
      STAGES = [{ id: 1, name: "ステージ1" }];
      allWords = [];
    }

    selectStageWords();
    renderStageButtons();
    renderAll();
    bindEvents();
  }

  init();
})();
