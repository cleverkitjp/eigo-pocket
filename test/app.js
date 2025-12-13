/* えいごポケット
  - words.json（{version, stages, words}）に正式対応
  - ステージは「和名のみ」（words.json の stages を表示）
  - カードタップで反転（flip-inner に is-flipped）
  - タップ & つぎへ で音声（音声ボタンは無し）
  - 10枚おぼえたらミニテスト権利（権利=1回）
  - ミニテストは権利獲得後に出現（権利が無いと非表示）
  - ミニテストは 1問ずつ（モーダル内で短く「せいかい！」）
  - スタンプゲットはトースト（alert不使用）
  - ミニテスト選択肢は unitType ではなく pos ベース（posGroup に正規化）
*/

(() => {
  const WORDS_URL = "./words.json";

  // ====== LocalStorage keys ======
  const KEY_STAGE    = "eigoPocket:selectedStageId";
  const KEY_TOTAL    = "eigoPocket:totalStamps";
  const KEY_TODAY    = "eigoPocket:todayStamps";
  const KEY_DAY      = "eigoPocket:dayKey";
  const KEY_SEEN     = "eigoPocket:seenIds";          // 今日見たカードID配列（ユニーク）
  const KEY_ELIGIBLE = "eigoPocket:testEligible";     // ミニテスト権利（1回）

  // ====== DOM ======
  const stageStrip      = document.getElementById("stage-strip");
  const currentStageEl  = document.getElementById("current-stage");

  const flipCardBtn     = document.getElementById("flip-card");
  const flipInner       = document.getElementById("flip-inner");

  const frontEnglish    = document.getElementById("front-english");
  const frontKana       = document.getElementById("front-kana");
  const backJapanese    = document.getElementById("back-japanese");

  const progressEl      = document.getElementById("progress");
  const tapHintEl       = document.getElementById("tap-hint");

  const prevBtn         = document.getElementById("prev-btn");
  const nextBtn         = document.getElementById("next-btn");

  const remainingEl     = document.getElementById("remaining-to-test");
  const miniTestArea    = document.getElementById("mini-test-area");
  const miniTestBtn     = document.getElementById("mini-test-btn");

  const todayStampsEl   = document.getElementById("today-stamps");
  const totalStampsEl   = document.getElementById("total-stamps");
  const rankTitleEl     = document.getElementById("rank-title");
  const rankLevelEl     = document.getElementById("rank-level");

  const testOverlay     = document.getElementById("test-overlay");
  const testBody        = document.getElementById("test-body");
  const testClose       = document.getElementById("test-close");

  // ====== State ======
  let dataStages = [];      // words.json stages
  let allWords   = [];      // words.json words
  let stageId    = loadStageId();
  let stageWords = [];
  let index      = 0;

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

  function safeText(x) {
    return (x == null) ? "" : String(x);
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
    const t = safeText(text).trim();
    if (!t) return;
    if (!("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "en-US";
      u.rate = 0.95;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  // ====== Toast（簡易）=====
  let toastTimer = null;
  function showToast(msg) {
    const text = safeText(msg).trim();
    if (!text) return;

    let el = document.getElementById("ep-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "ep-toast";
      el.style.position = "fixed";
      el.style.left = "50%";
      el.style.bottom = "18px";
      el.style.transform = "translateX(-50%)";
      el.style.padding = "10px 14px";
      el.style.borderRadius = "999px";
      el.style.background = "rgba(17,17,17,.92)";
      el.style.color = "#fff";
      el.style.fontWeight = "900";
      el.style.fontSize = "14px";
      el.style.zIndex = "9999";
      el.style.boxShadow = "0 10px 18px rgba(0,0,0,.18)";
      el.style.maxWidth = "92vw";
      el.style.textAlign = "center";
      el.style.opacity = "0";
      el.style.transition = "opacity .18s ease";
      document.body.appendChild(el);
    }

    el.textContent = text;
    requestAnimationFrame(() => { el.style.opacity = "1"; });

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.style.opacity = "0";
    }, 1300);
  }

  // ====== words.json からステージ名 ======
  function getStageName(id) {
    const s = dataStages.find(x => Number(x.id) === Number(id));
    return s ? safeText(s.name) : "-";
  }

  function chooseDefaultStageIfNeeded() {
    // words.json に stages があるなら、その最小idをデフォルトにする（安全）
    if (dataStages.length) {
      const ids = dataStages.map(s => Number(s.id)).filter(n => Number.isFinite(n));
      if (ids.length) {
        const minId = Math.min(...ids);
        if (!Number.isFinite(stageId)) stageId = minId;
        const exists = dataStages.some(s => Number(s.id) === Number(stageId));
        if (!exists) stageId = minId;
      }
    }
  }

  // ====== UI Render ======
  function renderStageButtons() {
    stageStrip.innerHTML = "";

    const stagesToUse = dataStages.length
      ? [...dataStages].sort((a,b) => Number(a.id) - Number(b.id))
      : [{ id: 1, name: "ステージ1" }];

    stagesToUse.forEach(s => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "stage-btn" + (Number(s.id) === Number(stageId) ? " active" : "");
      btn.innerHTML = `<div class="stage-name">${escapeHtml(safeText(s.name))}</div>`;

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
    // flip-inner に is-flipped（CSSの仕様に合わせる）
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
    resetFlipToFront();

    frontEnglish.textContent  = safeText(w.english);
    frontKana.textContent     = safeText(w.kana);
    backJapanese.textContent  = safeText(w.japanese);
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

  // ====== Stage Words ======
  function selectStageWords() {
    stageWords = allWords.filter(w => Number(w.stageId) === Number(stageId));
    stageWords.sort((a,b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    index = 0;
  }

  // ====== 学習カウント（今日の10枚） ======
  function markSeenCurrent() {
    if (!stageWords.length) return;

    const w = stageWords[index];
    if (!w || w.id == null) return;

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

    // 学習としてカウント
    markSeenCurrent();

    // 反転
    flipInner.classList.toggle("is-flipped");

    // 裏面ではヒント消す
    if (flipInner.classList.contains("is-flipped")) {
      tapHintEl.textContent = "";
    } else {
      tapHintEl.textContent = "タップしてカードをめくる";
    }

    // 音声（英語）
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

  // =========================================================
  //  ミニテスト（posベース + 1問ずつ）
  // =========================================================

  // pos を「出題グループ」に正規化
  // 例：
  //   noun/verb/adj/adv → そのまま
  //   phraseGreet/phraseOther → phrase
  //   idiomVerb → verb（※テストとして成立しやすくする）
  //   idiomOther → idiom
  function posGroupOf(item) {
    const pos = safeText(item?.pos).trim();
    const unitType = safeText(item?.unitType).trim();

    // phrase 系
    if (pos.startsWith("phrase") || unitType === "phrase") return "phrase";

    // idiom 系（idiomVerb/idiomAdj など）
    if (pos.startsWith("idiom") || unitType === "idiom") {
      if (/verb/i.test(pos)) return "verb";
      if (/adj/i.test(pos))  return "adj";
      if (/adv/i.test(pos))  return "adv";
      return "idiom";
    }

    // 通常
    if (pos === "noun" || pos === "verb" || pos === "adj" || pos === "adv") return pos;

    // フォールバック（unitTypeがwordならword扱い）
    if (unitType === "word") return "word";

    return "other";
  }

  // 問題の「型」：にほんご → えいご（4択）
  // 選択肢は posGroup が同じものから優先して集める
  function makeOneQuestion(pool, usedIds) {
    const candidates = pool.filter(x => x && x.id != null && safeText(x.english).trim());
    if (!candidates.length) return null;

    // 出題候補（まだ使ってない）
    const available = candidates.filter(x => !usedIds.has(x.id));
    if (!available.length) return null;

    const q = available[Math.floor(Math.random() * available.length)];
    usedIds.add(q.id);

    const group = posGroupOf(q);

    // 同グループからダミー集め
    const sameGroup = candidates.filter(x => x.id !== q.id && posGroupOf(x) === group);

    const options = [safeText(q.english).trim()];
    // 同グループ優先で補完
    while (options.length < 4 && sameGroup.length) {
      const d = sameGroup[Math.floor(Math.random() * sameGroup.length)];
      const t = safeText(d.english).trim();
      if (t && !options.includes(t)) options.push(t);
    }

    // 足りなければ全体から補完（最終手段）
    while (options.length < 4) {
      const d = candidates[Math.floor(Math.random() * candidates.length)];
      const t = safeText(d.english).trim();
      if (t && !options.includes(t)) options.push(t);
    }

    shuffle(options);

    return {
      id: q.id,
      prompt: safeText(q.japanese),
      answer: safeText(q.english).trim(),
      options,
      group
    };
  }

  function shuffle(a) {
    for (let i=a.length-1; i>0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  // セッション状態
  let quizSession = null;

  function openTest() {
    if (!isEligible()) return;
    if (!stageWords.length) return;

    // 権利消費（1回） & 次の10枚へ
    setEligible(false);
    setSeenIds([]);

    quizSession = {
      total: 3,
      idx: 0,
      correct: 0,
      usedIds: new Set(),
      current: null
    };

    testOverlay.classList.remove("hidden");
    renderMiniTestUI();

    nextQuestion();
  }

  function closeTest() {
    testOverlay.classList.add("hidden");
    testBody.innerHTML = "";
    quizSession = null;
  }

  function nextQuestion() {
    if (!quizSession) return;

    if (quizSession.idx >= quizSession.total) {
      finishQuiz();
      return;
    }

    const q = makeOneQuestion(stageWords, quizSession.usedIds);
    if (!q) {
      // 問題が作れない場合は終了（データ不足）
      finishQuiz(true);
      return;
    }

    quizSession.current = q;
    quizSession.idx += 1;

    renderOneQuestion(q, quizSession.idx, quizSession.total);
  }

  function renderOneQuestion(q, n, total) {
    testBody.innerHTML = "";

    const box = document.createElement("div");
    box.className = "qbox";

    const title = document.createElement("div");
    title.className = "qtitle";
    title.textContent = `Q${n}/${total}. 「${q.prompt}」はどれ？`;
    box.appendChild(title);

    // 4択はボタン（テンポ重視）
    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opt";
      btn.textContent = opt;

      btn.addEventListener("click", () => {
        answerQuestion(opt);
      });

      box.appendChild(btn);
    });

    // 短いフィードバック表示欄
    const fb = document.createElement("div");
    fb.id = "quiz-feedback";
    fb.style.marginTop = "10px";
    fb.style.fontWeight = "1000";
    fb.style.color = "#0f3f7d";
    fb.style.minHeight = "1.2em";
    box.appendChild(fb);

    testBody.appendChild(box);
  }

  function answerQuestion(selected) {
    if (!quizSession || !quizSession.current) return;

    const q = quizSession.current;
    const fb = document.getElementById("quiz-feedback");

    // 連打防止：ボタン無効化
    const buttons = testBody.querySelectorAll("button.opt");
    buttons.forEach(b => { b.disabled = true; b.style.opacity = "0.85"; });

    const isCorrect = (safeText(selected).trim() === q.answer);
    if (isCorrect) quizSession.correct += 1;

    if (fb) fb.textContent = isCorrect ? "せいかい！" : "ざんねん…";

    // 少し待って次へ（テンポ）
    setTimeout(() => {
      nextQuestion();
    }, 520);
  }

  function finishQuiz(dataShortage = false) {
    if (!quizSession) return;

    const allCorrect = (!dataShortage && quizSession.correct === quizSession.total);

    // 結果表示を一瞬だけ
    testBody.innerHTML = "";
    const box = document.createElement("div");
    box.className = "qbox";

    const title = document.createElement("div");
    title.className = "qtitle";
    title.textContent = dataShortage
      ? "データが足りなくて、テストを作れなかったよ"
      : `けっか：${quizSession.correct}/${quizSession.total}`;
    box.appendChild(title);

    const msg = document.createElement("div");
    msg.style.fontWeight = "900";
    msg.style.marginTop = "8px";
    msg.textContent = allCorrect ? "ぜんもんせいかい！" : "またチャレンジしよう！";
    box.appendChild(msg);

    testBody.appendChild(box);

    // スタンプ付与（オール正解 & 1日10こまで）
    if (allCorrect) {
      const today = getTodayStamps();
      if (today < 10) {
        setTodayStamps(today + 1);
        setTotalStamps(getTotalStamps() + 1);
        renderStamps();
        showToast("スタンプを1こゲット！");
      } else {
        showToast("きょうは もう10こ いっぱいだよ");
      }
    }

    // 1.0秒後に自動で閉じる（操作不要）
    setTimeout(() => {
      closeTest();
    }, 1000);
  }

  // ====== Init ======
  async function init() {
    ensureDayReset();

    // load words.json
    try {
      const res = await fetch(WORDS_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("words.json load failed");
      const json = await res.json();

      // 正式構造に対応
      dataStages = Array.isArray(json?.stages) ? json.stages : [];
      allWords   = Array.isArray(json?.words)  ? json.words  : [];

      // 念のため words が配列でない旧形式（配列直置き）にも保険対応
      if (!allWords.length && Array.isArray(json)) allWords = json;

      chooseDefaultStageIfNeeded();
    } catch {
      dataStages = [];
      allWords = [];
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
  }

  init();
})();
