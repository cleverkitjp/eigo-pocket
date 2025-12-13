/* えいごポケット
  - words.json（{version, stages, words}）を読み込み
  - ステージは words.json の stages を使用（和名のみ）
  - カードタップで反転（くるっ）→ flipInner に is-flipped を付与
  - タップ & つぎへ で音声（音声ボタンは無し）
  - 10枚おぼえたらミニテスト権利（権利=1回）
  - ミニテストは権利獲得後に出現（権利が無いと非表示）
  - ミニテストは「1問ずつ」出題（モーダル内に短く「せいかい！」）
  - スタンプゲットはトースト（alertは使わない）
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
  const testSubmit = document.getElementById("test-submit"); // 既存HTMLにあるが、今回は使わない（互換のため残す）

  // ====== State ======
  let dataStages = [];      // words.json の stages
  let allWords = [];        // words.json の words
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
    const s = dataStages.find(x => Number(x.id) === Number(id));
    return s?.name ?? "-";
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

  // ====== Toast（CSSなくても最低限見える。あれば style.css に合わせて後で調整可）=====
  function toast(msg, ms = 1400) {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "18px";
    el.style.transform = "translateX(-50%)";
    el.style.background = "rgba(0,0,0,.78)";
    el.style.color = "#fff";
    el.style.padding = "10px 14px";
    el.style.borderRadius = "999px";
    el.style.fontWeight = "900";
    el.style.fontSize = "14px";
    el.style.zIndex = "9999";
    el.style.maxWidth = "92vw";
    el.style.textAlign = "center";
    el.style.boxShadow = "0 10px 24px rgba(0,0,0,.18)";
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity .25s ease";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 250);
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

  // ====== Stage/Words ======
  function normalizeLoadedJson(json) {
    // 想定：{ version, stages:[...], words:[...] }
    // 旧形式：[ {...}, {...} ] でも落ちないように受ける
    if (Array.isArray(json)) {
      return { stages: [], words: json };
    }
    const stages = Array.isArray(json?.stages) ? json.stages : [];
    const words = Array.isArray(json?.words) ? json.words : [];
    return { stages, words };
  }

  function ensureValidStageId() {
    if (!dataStages.length) return;
    const exists = dataStages.some(s => Number(s.id) === Number(stageId));
    if (!exists) stageId = Number(dataStages[0].id);
    saveStageId(stageId);
  }

  function selectStageWords() {
    stageWords = allWords.filter(w => Number(w.stageId) === Number(stageId));
    stageWords.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    index = 0;
  }

  // ====== UI Render ======
  function renderStageButtons() {
    stageStrip.innerHTML = "";

    const list = dataStages.length
      ? [...dataStages].sort((a, b) => Number(a.id) - Number(b.id))
      : [{ id: 1, name: "ステージ1" }];

    list.forEach(s => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "stage-btn" + (Number(s.id) === Number(stageId) ? " active" : "");
      btn.innerHTML = `<div class="stage-name">${escapeHtml(s.name ?? `ステージ${s.id}`)}</div>`;
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

  function renderCard() {
    if (!stageWords.length) {
      progressEl.textContent = "0/0";
      frontEnglish.textContent = "データなし";
      frontKana.textContent = "";
      backJapanese.textContent = "";
      flipInner.classList.remove("is-flipped");
      tapHintEl.textContent = "タップしてカードをめくる";
      return;
    }

    clampIndex();
    const w = stageWords[index];

    progressEl.textContent = `${index + 1}/${stageWords.length}`;

    // 表へ戻す（重なり事故防止）
    flipInner.classList.remove("is-flipped");
    tapHintEl.textContent = "タップしてカードをめくる";

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

    // CSSは .flip-inner.is-flipped を見て回転する
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

  // ====== Mini Test（1問ずつ） ======
  let currentQuiz = null;   // {qs:[...], idx, allCorrect, answered}
  let answeringLocked = false;

  function openTest() {
    if (!isEligible()) return;
    if (!stageWords.length) return;

    // 権利消費（1回）＆ 次の10枚カウント開始
    setEligible(false);
    setSeenIds([]);

    currentQuiz = makeQuiz(stageWords);
    currentQuiz.idx = 0;
    currentQuiz.allCorrect = true;
    currentQuiz.answered = 0;

    renderOneQuestion();
    testOverlay.classList.remove("hidden");
    renderMiniTestUI();
  }

  function closeTest() {
    testOverlay.classList.add("hidden");
    testBody.innerHTML = "";
    currentQuiz = null;
    answeringLocked = false;
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  function pickRandom(arr, usedIds) {
    const cand = arr.filter(x => x && x.id != null && !usedIds.has(x.id) && x.english);
    if (!cand.length) return null;
    return cand[Math.floor(Math.random() * cand.length)];
  }

  function makeQuiz(pool) {
    // 3問、各問「にほんご→えいご」
    const safePool = pool.filter(x => x && x.id != null && x.english);
    const qs = [];
    const usedIds = new Set();
    if (!safePool.length) return { qs };

    for (let i = 0; i < 3; i++) {
      const q = pickRandom(safePool, usedIds);
      if (!q) break;
      usedIds.add(q.id);

      const group = (q.unitType || "word");
      const sameGroup = safePool.filter(x => (x.unitType || "word") === group && x.id !== q.id);

      // 無限ループ禁止：Setで最大4つまで集める
      const set = new Set();
      set.add(q.english);

      shuffle(sameGroup);
      for (const d of sameGroup) {
        if (set.size >= 4) break;
        if (d.english) set.add(d.english);
      }

      if (set.size < 4) {
        const others = safePool.filter(x => x.id !== q.id);
        shuffle(others);
        for (const d of others) {
          if (set.size >= 4) break;
          if (d.english) set.add(d.english);
        }
      }

      const options = Array.from(set);
      shuffle(options);

      qs.push({
        id: q.id,
        prompt: q.japanese || "",
        answer: q.english,
        options
      });
    }

    return { qs };
  }

  function renderOneQuestion() {
    if (!currentQuiz) return;
    const qs = currentQuiz.qs || [];

    // 0問のとき
    if (!qs.length) {
      testBody.innerHTML = `
        <div class="qbox">
          <div class="qtitle">データが足りないよ</div>
          <div style="color:#555;font-weight:700;">このステージのカードが少ないみたい。</div>
        </div>
        <div style="display:flex;gap:10px;margin-top:10px;">
          <button type="button" class="test-submit" id="test-end-btn">おわり</button>
        </div>
      `;
      const endBtn = document.getElementById("test-end-btn");
      endBtn?.addEventListener("click", closeTest);
      return;
    }

    // 終了
    if (currentQuiz.idx >= qs.length) {
      finishQuiz();
      return;
    }

    const q = qs[currentQuiz.idx];
    answeringLocked = false;

    // 既存HTMLに test-submit があるが、今回は使わないので非表示にしておく（残っててもOK）
    if (testSubmit) testSubmit.style.display = "none";

    testBody.innerHTML = `
      <div class="qbox">
        <div class="qtitle">Q${currentQuiz.idx + 1}. 「${escapeHtml(q.prompt)}」はどれ？</div>
        <div id="quiz-feedback" style="min-height:18px;margin:6px 0 4px;font-weight:1000;"></div>
        <div id="quiz-options"></div>
      </div>
      <div style="display:flex;gap:10px;">
        <button type="button" class="test-submit" id="test-end-btn">おわり</button>
      </div>
    `;

    const optWrap = document.getElementById("quiz-options");
    const fb = document.getElementById("quiz-feedback");
    const endBtn = document.getElementById("test-end-btn");

    endBtn?.addEventListener("click", closeTest);

    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opt";
      btn.textContent = opt;
      btn.addEventListener("click", () => answerQuestion(opt, fb));
      optWrap.appendChild(btn);
    });
  }

  function answerQuestion(selected, feedbackEl) {
    if (!currentQuiz) return;
    if (answeringLocked) return;
    answeringLocked = true;

    const q = currentQuiz.qs[currentQuiz.idx];
    const ok = (selected === q.answer);

    if (!ok) currentQuiz.allCorrect = false;

    // モーダル内：短く
    if (feedbackEl) {
      feedbackEl.textContent = ok ? "せいかい！" : "ざんねん…";
      feedbackEl.style.color = ok ? "#0f7a2b" : "#b00020";
    }

    // 次の問題へ（テンポ優先）
    setTimeout(() => {
      currentQuiz.idx += 1;
      renderOneQuestion();
    }, 550);
  }

  function finishQuiz() {
    // 全問正解ならスタンプ（今日10こまで）
    if (!currentQuiz) return;

    const allCorrect = (currentQuiz.allCorrect === true && (currentQuiz.qs?.length || 0) === 3);

    if (allCorrect) {
      const today = getTodayStamps();
      if (today < 10) {
        setTodayStamps(today + 1);
        setTotalStamps(getTotalStamps() + 1);
        renderStamps();
        toast("スタンプゲット！");
      } else {
        toast("せいかい！でも きょうは 10こ いっぱいだよ");
      }
    } else {
      toast("ミニテストおわり！");
    }

    // 終了表示（モーダル内で完結）
    testBody.innerHTML = `
      <div class="qbox">
        <div class="qtitle">ミニテスト おわり</div>
        <div style="margin-top:8px;font-weight:900;color:#333;">
          ${allCorrect ? "ぜんもんせいかい！" : "つぎも がんばろう！"}
        </div>
      </div>
      <div style="display:flex;gap:10px;">
        <button type="button" class="test-submit" id="test-end-btn">おわり</button>
      </div>
    `;
    const endBtn = document.getElementById("test-end-btn");
    endBtn?.addEventListener("click", closeTest);

    // 状態クリア
    currentQuiz = null;
  }

  // ====== Init ======
  async function init() {
    ensureDayReset();

    // 重要：要素が取れてないと何も動かないので、ここで早期チェック
    if (!flipCardBtn || !flipInner) {
      // 画面が崩れている時の保険
      console.warn("flip elements not found");
    }

    try {
      const res = await fetch(WORDS_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("words.json load failed");
      const json = await res.json();
      const normalized = normalizeLoadedJson(json);

      dataStages = Array.isArray(normalized.stages) ? normalized.stages : [];
      allWords = Array.isArray(normalized.words) ? normalized.words : [];
    } catch (e) {
      dataStages = [];
      allWords = [];
    }

    // stages が無い場合は words から推定（stageIdの最大まで）
    if (!dataStages.length) {
      const ids = Array.from(new Set(allWords.map(w => Number(w.stageId)).filter(n => Number.isFinite(n))))
        .sort((a, b) => a - b);
      dataStages = ids.map(id => ({ id, name: `ステージ${id}` }));
    }

    ensureValidStageId();
    selectStageWords();

    renderStageButtons();
    renderAll();

    // Events
    flipCardBtn?.addEventListener("click", toggleFlipAndSpeak);
    nextBtn?.addEventListener("click", goNext);
    prevBtn?.addEventListener("click", goPrev);

    miniTestBtn?.addEventListener("click", openTest);
    testClose?.addEventListener("click", closeTest);
    testOverlay?.addEventListener("click", (ev) => {
      if (ev.target === testOverlay) closeTest();
    });

    // 互換：古い「答え合わせ」ボタンが残ってても何もしない
    if (testSubmit) {
      testSubmit.addEventListener("click", () => {});
    }
  }

  init();
})();
