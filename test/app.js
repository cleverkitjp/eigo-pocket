/* えいごポケット
  - words.json を読み込み（{version, stages, words} 形式に正式対応）
  - ステージは「和名のみ」（json.stagesから生成）
  - カードタップで反転（flip-inner に is-flipped）
  - タップ & つぎへ で音声（音声ボタンは無し）
  - 10枚おぼえたらミニテスト権利（権利=1回）
  - ミニテストは権利獲得後に出現（権利が無いと非表示）
  - ミニテストは「1問ずつ」出題（回答→次へ→最後に結果）
  - 共有footerは index.html 側で読み込み
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
  const testSubmit = document.getElementById("test-submit"); // 「つぎへ」「おわり」に流用

  // ====== State ======
  let stages = [];     // json.stages
  let allWords = [];   // json.words
  let stageId = loadStageId();
  let stageWords = [];
  let index = 0;

  // ミニテスト状態（1問ずつ）
  let currentQuiz = null;       // { qs: [...] }
  let quizIndex = 0;            // いま何問目
  let quizCorrectCount = 0;     // 正解数
  let quizAnswered = false;     // その問題を答えたか
  let quizSelectedValue = null; // 選んだ値

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
    const s = stages.find(x => Number(x.id) === Number(id));
    return s ? s.name : "-";
  }

  function ensureValidStageId() {
    // json読込後に「存在しないstageId」になってたら 先頭に寄せる
    if (!stages.length) {
      stageId = 1;
      saveStageId(stageId);
      return;
    }
    const ok = stages.some(s => Number(s.id) === Number(stageId));
    if (!ok) {
      stageId = Number(stages[0].id);
      saveStageId(stageId);
    }
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

  // ====== Stage Words ======
  function selectStageWords() {
    stageWords = allWords.filter(w => Number(w.stageId) === Number(stageId));
    stageWords.sort((a,b) => (a.id ?? 0) - (b.id ?? 0));
    index = 0;
  }

  // ====== UI Render ======
  function renderStageButtons() {
    stageStrip.innerHTML = "";
    stages.forEach(s => {
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
    // flip-inner に is-flipped を付ける方式（CSSと一致）
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

    if (seen.length >= 10 && !isEligible()) {
      setEligible(true);
    }
  }

  // ====== Flip ======
  function toggleFlipAndSpeak() {
    if (!stageWords.length) return;

    markSeenCurrent();

    // ★ここが正：flip-inner に is-flipped
    flipInner.classList.toggle("is-flipped");

    // 裏面ではヒント消す（仕様）
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

  // ====== Mini Test（1問ずつ） ======
  function openTest() {
    if (!isEligible()) return;
    if (!stageWords.length) return;

    // 権利消費（1回）＆次の10枚へ
    setEligible(false);
    setSeenIds([]);

    currentQuiz = makeQuiz(stageWords);
    quizIndex = 0;
    quizCorrectCount = 0;
    quizAnswered = false;
    quizSelectedValue = null;

    renderQuizOne();
    testOverlay.classList.remove("hidden");
    renderMiniTestUI();
  }

  function closeTest() {
    testOverlay.classList.add("hidden");
    testBody.innerHTML = "";
    currentQuiz = null;
    quizIndex = 0;
    quizCorrectCount = 0;
    quizAnswered = false;
    quizSelectedValue = null;
    testSubmit.textContent = "つぎへ";
  }

  // グルーピングは pos 優先（なければ unitType）
  function groupKey(w) {
    return (w && w.pos) ? String(w.pos) : String(w?.unitType || "word");
  }

  function makeQuiz(pool) {
    // 3問、各問は「にほんご→えいご」4択
    const qs = [];
    const usedIds = new Set();

    for (let i = 0; i < 3; i++) {
      const q = pickRandom(pool, usedIds);
      if (!q) break;
      usedIds.add(q.id);

      const key = groupKey(q);
      const candidates = pool.filter(x => x && x.id !== q.id && groupKey(x) === key);

      const options = [q.english];

      // 同グループから選択肢を優先して作る
      while (options.length < 4 && candidates.length > 0) {
        const d = candidates[Math.floor(Math.random() * candidates.length)];
        if (d && d.english && !options.includes(d.english)) options.push(d.english);
      }

      // 足りない場合は全体から補完
      while (options.length < 4) {
        const d = pool[Math.floor(Math.random() * pool.length)];
        if (d && d.english && !options.includes(d.english)) options.push(d.english);
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

  function renderQuizOne() {
    testBody.innerHTML = "";

    if (!currentQuiz || !currentQuiz.qs || currentQuiz.qs.length < 3) {
      const p = document.createElement("div");
      p.className = "qbox";
      p.textContent = "ミニテストのデータが足りません。";
      testBody.appendChild(p);
      testSubmit.textContent = "とじる";
      quizAnswered = true;
      return;
    }

    const q = currentQuiz.qs[quizIndex];

    const box = document.createElement("div");
    box.className = "qbox";

    const title = document.createElement("div");
    title.className = "qtitle";
    title.textContent = `Q${quizIndex + 1}/3. 「${q.prompt}」はどれ？`;
    box.appendChild(title);

    q.options.forEach(opt => {
      const label = document.createElement("label");
      label.className = "opt";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "q0";
      input.value = opt;
      input.disabled = false;

      input.addEventListener("change", () => {
        // まだ答えてない時だけ選べる
        if (quizAnswered) return;
        quizSelectedValue = opt;
      });

      label.appendChild(input);
      label.appendChild(document.createTextNode(opt));
      box.appendChild(label);
    });

    testBody.appendChild(box);

    // ボタン文言
    testSubmit.textContent = (quizIndex === 2) ? "おわり" : "つぎへ";

    // この問題は未回答状態で開始
    quizAnswered = false;
    quizSelectedValue = null;
  }

  function handleQuizNext() {
    // 「とじる」モード
    if (testSubmit.textContent === "とじる") {
      closeTest();
      return;
    }

    if (!currentQuiz) return;

    // まだ答えてないなら、まず採点してロック
    if (!quizAnswered) {
      const q = currentQuiz.qs[quizIndex];

      if (!quizSelectedValue) {
        alert("えらんでから つぎへ をおしてね");
        return;
      }

      const isCorrect = (quizSelectedValue === q.answer);
      if (isCorrect) quizCorrectCount += 1;

      // 選択肢をロック（1問1答）
      const radios = testBody.querySelectorAll('input[type="radio"][name="q0"]');
      radios.forEach(r => (r.disabled = true));

      // ちょいフィードバック（短く）
      alert(isCorrect ? "せいかい！" : `ざんねん！ こたえは「${q.answer}」だよ`);

      quizAnswered = true;
      return; // 同じボタンをもう一回押すと次へ進む
    }

    // すでに答えた → 次の問題 or 結果
    if (quizIndex < 2) {
      quizIndex += 1;
      renderQuizOne();
      return;
    }

    // 3問終わり → 結果処理
    const allCorrect = (quizCorrectCount === 3);

    if (allCorrect) {
      const today = getTodayStamps();
      if (today < 10) {
        setTodayStamps(today + 1);
        setTotalStamps(getTotalStamps() + 1);
        alert("ぜんもんせいかい！スタンプを1こゲット！");
      } else {
        alert("ぜんもんせいかい！でも きょうは もう10こ いっぱいだよ");
      }
    } else {
      alert(`けっか：${quizCorrectCount}/3 せいかい`);
    }

    renderStamps();
    closeTest();
  }

  // ====== Load JSON（正式対応） ======
  function normalizeLoadedData(json) {
    // words.json は {version, stages, words} 想定
    // 念のため「旧形式（配列）」も吸収
    if (Array.isArray(json)) {
      return { stages: [], words: json };
    }
    const s = Array.isArray(json?.stages) ? json.stages : [];
    const w = Array.isArray(json?.words) ? json.words : [];
    return { stages: s, words: w };
  }

  // ====== Init ======
  async function init() {
    ensureDayReset();

    try {
      const res = await fetch(WORDS_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("words.json load failed");
      const raw = await res.json();
      const data = normalizeLoadedData(raw);

      stages = data.stages.map(s => ({
        id: Number(s.id),
        name: String(s.name ?? "-"),
        description: s.description ?? ""
      })).filter(s => Number.isFinite(s.id));

      // stagesが空ならフォールバック（最小）
      if (!stages.length) {
        stages = [{ id: 1, name: "ステージ1" }];
      }

      allWords = Array.isArray(data.words) ? data.words : [];
      if (!Array.isArray(allWords)) allWords = [];
    } catch {
      stages = [{ id: 1, name: "ステージ1" }];
      allWords = [];
    }

    ensureValidStageId();
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

    // 「答え合わせ」ボタンを「つぎへ/おわり」に流用
    testSubmit.addEventListener("click", handleQuizNext);
  }

  init();
})();
