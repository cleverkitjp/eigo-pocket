/* えいごポケット
  - words.json（{version, stages, words}）に正式対応
  - ステージは words.json の stages を使用（和名のみ）
  - カードタップで反転（flip-inner に is-flipped を付与）
  - タップ & つぎへ で音声（音声ボタンは無し）
  - 10枚おぼえたらミニテスト権利（権利=1回）
  - ミニテストは権利獲得後に出現（権利が無いと非表示）
  - ミニテストは 1問ずつ出題（モーダル内）
  - 選択肢は：
    1) 同ステージ & 同unitType & 同posGroup
    2) 全データ(allWords)から 同unitType & 同posGroup
    3) 全データ(allWords)から 同unitType
    4) 全データ(allWords)から なんでも
    5) それでも足りなければ 3択に落とす
*/

(() => {
  const WORDS_URL = "./words.json";

  // ====== LocalStorage keys ======
  const KEY_STAGE = "eigoPocket:selectedStageId";
  const KEY_TOTAL = "eigoPocket:totalStamps";
  const KEY_TODAY = "eigoPocket:todayStamps";
  const KEY_DAY = "eigoPocket:dayKey";
  const KEY_SEEN = "eigoPocket:seenIds";
  const KEY_ELIGIBLE = "eigoPocket:testEligible";

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
  const testSubmit = document.getElementById("test-submit"); // 互換のため残す（未使用）

  // ====== State ======
  let DATA_VERSION = "";
  let STAGES = [];
  let allWords = [];

  let stageId = loadStageId();
  let stageWords = [];
  let index = 0;

  // choice indexes (allWords)
  let idxUnitPos = new Map();  // key: unitType|posGroup -> words[]
  let idxUnitOnly = new Map(); // key: unitType -> words[]

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
    return (STAGES.find(s => Number(s.id) === Number(id)) || { name: "-" }).name || "-";
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

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  function uniqByEnglish(items) {
    const seen = new Set();
    const out = [];
    for (const w of items) {
      if (!w) continue;
      const en = String(w.english || "").trim();
      if (!en) continue;
      if (seen.has(en)) continue;
      seen.add(en);
      out.push(w);
    }
    return out;
  }

  // ====== posGroup ======
  function posGroupOf(w) {
    const pos = String((w && w.pos) || "").trim();
    if (pos.startsWith("phrase")) return "phrase";
    if (pos.startsWith("idiom")) return "idiom";

    const nounLike = new Set(["noun", "pron", "det", "num"]);
    if (nounLike.has(pos)) return "noun";
    if (pos === "verb") return "verb";
    if (pos === "adj") return "adj";
    if (pos === "adv") return "adv";
    return "other";
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

  // ====== Toast ======
  const toastEl = document.createElement("div");
  toastEl.setAttribute("aria-live", "polite");
  toastEl.style.position = "fixed";
  toastEl.style.left = "50%";
  toastEl.style.bottom = "18px";
  toastEl.style.transform = "translateX(-50%)";
  toastEl.style.background = "rgba(0,0,0,.78)";
  toastEl.style.color = "#fff";
  toastEl.style.padding = "10px 12px";
  toastEl.style.borderRadius = "14px";
  toastEl.style.fontWeight = "900";
  toastEl.style.fontSize = "14px";
  toastEl.style.boxShadow = "0 10px 24px rgba(0,0,0,.22)";
  toastEl.style.opacity = "0";
  toastEl.style.pointerEvents = "none";
  toastEl.style.transition = "opacity .18s ease";
  toastEl.style.zIndex = "9999";
  document.body.appendChild(toastEl);

  let toastTimer = null;
  function toast(msg, ms = 1400) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.style.opacity = "1";
    toastTimer = setTimeout(() => {
      toastEl.style.opacity = "0";
    }, ms);
  }

  // ====== Stage + Words ======
  function selectStageWords() {
    stageWords = allWords.filter(w => Number(w.stageId) === Number(stageId));
    stageWords = stageWords.filter(w => w && w.id != null && String(w.english || "").trim());
    stageWords.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    index = 0;
  }

  function ensureStageIdValid() {
    const exists = STAGES.some(s => Number(s.id) === Number(stageId));
    if (!exists) stageId = Number(STAGES[0]?.id || 1);
    saveStageId(stageId);
  }

  // ====== Choice Indexes ======
  function buildChoiceIndexes(words) {
    idxUnitPos = new Map();
    idxUnitOnly = new Map();

    for (const w of words) {
      if (!w || w.id == null) continue;
      const en = String(w.english || "").trim();
      if (!en) continue;

      const unit = String(w.unitType || "word");
      const pg = posGroupOf(w);

      const k1 = `${unit}|${pg}`;
      if (!idxUnitPos.has(k1)) idxUnitPos.set(k1, []);
      idxUnitPos.get(k1).push(w);

      if (!idxUnitOnly.has(unit)) idxUnitOnly.set(unit, []);
      idxUnitOnly.get(unit).push(w);
    }

    for (const [k, arr] of idxUnitPos.entries()) idxUnitPos.set(k, uniqByEnglish(arr));
    for (const [k, arr] of idxUnitOnly.entries()) idxUnitOnly.set(k, uniqByEnglish(arr));
  }

  function buildOptions(q, stagePool) {
    const answer = String(q.english || "").trim();
    const unit = String(q.unitType || "word");
    const pg = posGroupOf(q);

    const options = [answer];

    const addFrom = (arr) => {
      if (!Array.isArray(arr) || options.length >= 4) return;
      const shuffled = arr.slice();
      shuffle(shuffled);
      for (const w of shuffled) {
        if (options.length >= 4) break;
        if (!w || w.id == null) continue;
        if (w.id === q.id) continue;
        const t = String(w.english || "").trim();
        if (!t) continue;
        if (!options.includes(t)) options.push(t);
      }
    };

    // 1) 同ステージ & 同unitType & 同posGroup
    addFrom(stagePool.filter(x =>
      x && x.id != null &&
      String(x.english || "").trim() &&
      String(x.unitType || "word") === unit &&
      posGroupOf(x) === pg &&
      x.id !== q.id
    ));

    // 2) 全データから 同unitType & 同posGroup
    if (options.length < 4) addFrom(idxUnitPos.get(`${unit}|${pg}`) || []);

    // 3) 全データから 同unitType
    if (options.length < 4) addFrom(idxUnitOnly.get(unit) || []);

    // 4) 全データから なんでも
    if (options.length < 4) addFrom(allWords);

    // 5) それでも足りなければ 3択に落とす
    if (options.length < 3) return null;

    shuffle(options);
    return options;
  }

  // ====== UI Render ======
  function renderStageButtons() {
    stageStrip.innerHTML = "";
    STAGES.forEach(s => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "stage-btn" + (Number(s.id) === Number(stageId) ? " active" : "");
      btn.innerHTML = `<div class="stage-name">${escapeHtml(s.name || "")}</div>`;
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

    // flip-inner に is-flipped
    flipInner.classList.toggle("is-flipped");

    if (flipInner.classList.contains("is-flipped")) {
      tapHintEl.textContent = "";
    } else {
      tapHintEl.textContent = "タップしてカードをめくる";
    }

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

  // ====== Mini Test (1問ずつ) ======
  const QUIZ_LEN = 3;
  let quiz = null; // { qs, idx, correct, locked, finalStampMsg }

  function openTest() {
    if (!isEligible()) return;
    if (!stageWords.length) return;

    setEligible(false);
    setSeenIds([]);

    quiz = makeQuiz(stageWords);
    renderQuizView();

    testOverlay.classList.remove("hidden");
    renderMiniTestUI();
  }

  function closeTest() {
    testOverlay.classList.add("hidden");
    testBody.innerHTML = "";
    quiz = null;
  }

  function makeQuiz(stagePool) {
    const qs = [];
    const usedIds = new Set();

    let guard = 0;
    while (qs.length < QUIZ_LEN && guard < 80) {
      guard++;

      const q = pickRandom(stagePool, usedIds);
      if (!q) break;
      usedIds.add(q.id);

      const options = buildOptions(q, stagePool);
      if (!options) continue;

      qs.push({
        id: q.id,
        prompt: String(q.japanese || ""),
        answer: String(q.english || "").trim(),
        options,
      });
    }

    return { qs, idx: 0, correct: 0, locked: false, finalStampMsg: "" };
  }

  function pickRandom(arr, usedIds) {
    const cand = arr.filter(x => x && x.id != null && !usedIds.has(x.id) && String(x.english || "").trim());
    if (!cand.length) return null;
    return cand[Math.floor(Math.random() * cand.length)];
  }

  function renderQuizView() {
    if (!quiz) return;

    if (testSubmit) testSubmit.style.display = "none";
    testBody.innerHTML = "";

    if (!quiz.qs.length) {
      const p = document.createElement("div");
      p.className = "qbox";
      p.innerHTML = `<div class="qtitle">ごめんね… このステージは問題を作れなかったよ</div>
                     <div style="font-weight:800;color:#555;line-height:1.6">ステージの単語数が少ないか、データの内容が原因かも。</div>`;
      testBody.appendChild(p);
      return;
    }

    if (quiz.idx >= quiz.qs.length) {
      const done = document.createElement("div");
      done.className = "qbox";

      const allCorrect = (quiz.correct === QUIZ_LEN && quiz.qs.length === QUIZ_LEN);

      const title = document.createElement("div");
      title.className = "qtitle";
      title.textContent = `おわり！ ${quiz.correct}/${QUIZ_LEN} せいかい`;
      done.appendChild(title);

      const msg = document.createElement("div");
      msg.style.fontWeight = "900";
      msg.style.color = "#333";
      msg.style.lineHeight = "1.6";

      if (allCorrect) {
        const today = getTodayStamps();
        if (today < 10) {
          setTodayStamps(today + 1);
          setTotalStamps(getTotalStamps() + 1);
          renderStamps();
          msg.textContent = "ぜんもんせいかい！ スタンプを 1こ ゲット！";
          toast("スタンプを 1こ ゲット！");
        } else {
          msg.textContent = "ぜんもんせいかい！でも きょうは もう10こ いっぱいだよ";
          toast("きょうは もう10こ いっぱいだよ");
        }
      } else {
        msg.textContent = "つぎは ぜんもんせいかい を ねらおう！";
      }
      done.appendChild(msg);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mini-test-btn";
      btn.textContent = "おわる";
      btn.style.marginTop = "12px";
      btn.addEventListener("click", closeTest);
      done.appendChild(btn);

      testBody.appendChild(done);
      return;
    }

    const q = quiz.qs[quiz.idx];

    const box = document.createElement("div");
    box.className = "qbox";

    const head = document.createElement("div");
    head.className = "qtitle";
    head.textContent = `Q${quiz.idx + 1}/${QUIZ_LEN}. 「${q.prompt}」はどれ？`;
    box.appendChild(head);

    const feedback = document.createElement("div");
    feedback.style.margin = "8px 0 6px";
    feedback.style.fontWeight = "1000";
    feedback.style.height = "22px";
    feedback.style.color = "#0f3f7d";
    feedback.textContent = "";
    box.appendChild(feedback);

    q.options.forEach((opt) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "opt";
      b.textContent = opt;
      b.addEventListener("click", () => onChoose(opt, feedback));
      box.appendChild(b);
    });

    testBody.appendChild(box);
  }

  function onChoose(chosen, feedbackEl) {
    if (!quiz || quiz.locked) return;
    quiz.locked = true;

    const q = quiz.qs[quiz.idx];
    const ok = (String(chosen) === String(q.answer));

    if (ok) {
      quiz.correct += 1;
      feedbackEl.textContent = "せいかい！";
      feedbackEl.style.color = "#0f3f7d";
    } else {
      feedbackEl.textContent = "ちがうよ";
      feedbackEl.style.color = "#7a2a2a";
    }

    setTimeout(() => {
      quiz.idx += 1;
      quiz.locked = false;
      renderQuizView();
    }, 900);
  }

 // ====== Init ======
  async function init() {
    ensureDayReset();

    try {
      const res = await fetch(WORDS_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("words.json load failed");

      const data = await res.json();

      // words.json 正式構造へ対応
      DATA_VERSION = String(data?.version || "");
      STAGES = Array.isArray(data?.stages) ? data.stages : [];
      allWords = Array.isArray(data?.words) ? data.words : [];

      // stagesが無い場合の保険（最低限動かす）
      if (!STAGES.length) {
        // words側から stageId を拾って簡易生成
        const ids = Array.from(
          new Set(allWords.map(w => Number(w.stageId)).filter(n => Number.isFinite(n)))
        ).sort((a, b) => a - b);

        STAGES = ids.map(id => ({ id, name: `ステージ${id}` }));
      }

      if (!Array.isArray(allWords)) allWords = [];

    } catch (e) {
      STAGES = [{ id: 1, name: "ステージ1" }];
      allWords = [];
    }

    // stageIdの整合性
    ensureStageIdValid();

    // choice indexes
    buildChoiceIndexes(allWords);

    // stage words
    selectStageWords();

    // render
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

    // 旧「答え合わせ」ボタンは使わない
    if (testSubmit) testSubmit.addEventListener("click", () => {});
  }

  init();
})();
