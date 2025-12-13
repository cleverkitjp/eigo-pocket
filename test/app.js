/* えいごポケット
  - words.json を読み込み（version/stages/words 構造に対応）
  - ステージは「和名のみ」
  - カードタップで反転（くるっ）
  - タップ & つぎへ で音声（音声ボタンは無し）
  - 10枚おぼえたらミニテスト権利（権利=1回）
  - ミニテストは権利獲得後に出現（権利が無いと非表示）
  - 共有footerは index.html 側で読み込み
*/

(() => {
  const WORDS_URL = "./words.json";

  // ====== ステージ（JSON優先、無ければ保険で生成） ======
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

  // ====== UI Render ======
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

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


 // ====== Flip ======
function setFlipped(flag) {
  // ✅ 回転は #flip-inner のみ（鏡文字/二重回転を防ぐ）
  flipInner.classList.toggle("is-flipped", !!flag);

  // 念のため：昔の実装で flip-card に付いたまま残る事故を消す
  flipCardBtn.classList.remove("is-flipped");
}

function resetFlipToFront() {
  setFlipped(false);
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
    stageWords.sort((a,b) => (a.id ?? 0) - (b.id ?? 0));
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

 function toggleFlipAndSpeak() {
    if (!stageWords.length) return;

    markSeenCurrent();

    // CSS側の当たり判定が「#flip-card」でも「#flip-inner」でも動くように両方切り替え
    const flipped = flipCardBtn.classList.contains("is-flipped") || flipInner.classList.contains("is-flipped");
    setFlipped(!flipped);

    // 裏面ではヒント消す
    if (!flipped) {
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
  // 1問ずつ出題：currentQuiz.index を進める
  let currentQuiz = null;

  function openTest() {
    if (!isEligible()) return;
    if (!stageWords.length) return;

    // 権利消費（1回）
    setEligible(false);
    setSeenIds([]); // 次の10枚カウントを始める

    currentQuiz = makeQuiz(stageWords);
    renderQuizOne(currentQuiz);

    testOverlay.classList.remove("hidden");
    renderMiniTestUI();
  }

  function closeTest() {
    testOverlay.classList.add("hidden");
    testBody.innerHTML = "";
    currentQuiz = null;
  }

  function posGroupOf(w) {
    const p = (w?.pos || "").toLowerCase();
    if (!p) return "other";
    if (p.includes("noun")) return "noun";
    if (p.includes("verb")) return "verb";
    if (p.includes("adj")) return "adj";
    if (p.includes("adv")) return "adv";
    if (p.includes("prep")) return "prep";
    return "other";
  }

  function makeQuiz(stagePool) {
    // 3問、各問は「にほんご→えいご」を4択（候補ルール強化）
    const qs = [];
    const usedIds = new Set();

    // 出題はステージ内から
    for (let i=0; i<3; i++) {
      const q = pickRandom(stagePool, usedIds);
      if (!q) break;
      usedIds.add(q.id);

      const unit = (q.unitType || "word");
      const pg = posGroupOf(q);

      // 候補生成：優先順に足していく（ステージ内→全体）
      let cand = [];

      // 1) ステージ内 同unitType 同posGroup
      cand = cand.concat(stagePool.filter(x => x && x.id !== q.id && (x.unitType || "word") === unit && posGroupOf(x) === pg));

      // 2) 不足時：全体 同unitType 同posGroup
      if (cand.length < 3) {
        cand = cand.concat(allWords.filter(x => x && x.id !== q.id && (x.unitType || "word") === unit && posGroupOf(x) === pg));
      }

      // 3) それでも不足：全体 同unitType
      if (cand.length < 3) {
        cand = cand.concat(allWords.filter(x => x && x.id !== q.id && (x.unitType || "word") === unit));
      }

      // 4) それでも不足：全体
      if (cand.length < 3) {
        cand = cand.concat(allWords.filter(x => x && x.id !== q.id));
      }

      // 重複排除（englishキーで）
      const uniq = [];
      const seenE = new Set();
      for (const x of cand) {
        const e = x?.english;
        if (!e || seenE.has(e)) continue;
        seenE.add(e);
        uniq.push(x);
      }

      const options = [q.english];
      while (options.length < 4 && uniq.length > 0) {
        const d = uniq[Math.floor(Math.random() * uniq.length)];
        if (d && d.english && !options.includes(d.english)) options.push(d.english);
      }

      // 4択に足りない場合は、そのままでもUIは崩さない（表示側は options を使う）
      shuffle(options);

      qs.push({
        id: q.id,
        prompt: q.japanese,
        answer: q.english,
        options
      });
    }

    return { qs, index: 0, correct: 0 };
  }

  function pickRandom(arr, usedIds) {
    const cand = arr.filter(x => x && x.id != null && !usedIds.has(x.id));
    if (!cand.length) return null;
    return cand[Math.floor(Math.random()*cand.length)];
  }

  function shuffle(a) {
    for (let i=a.length-1; i>0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  function renderQuizOne(quiz) {
    testBody.innerHTML = "";
    const idx = quiz.index;
    const q = quiz.qs[idx];
    if (!q) return;

    const box = document.createElement("div");
    box.className = "qbox";

    const title = document.createElement("div");
    title.className = "qtitle";
    title.textContent = `Q${idx+1}. 「${q.prompt}」はどれ？`;
    box.appendChild(title);

    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opt";
      btn.textContent = opt;

      btn.addEventListener("click", () => {
        // 判定
        const ok = (opt === q.answer);
        if (ok) quiz.correct += 1;

        // 短い表示（モーダル内）
        showInlineResult(ok ? "せいかい！" : "ざんねん！");

        // 次へ
        setTimeout(() => {
          quiz.index += 1;
          if (quiz.index >= quiz.qs.length) {
            finishQuiz(quiz);
          } else {
            renderQuizOne(quiz);
          }
        }, 520); // テンポ用
      });

      box.appendChild(btn);
    });

    testBody.appendChild(box);
  }

  function showInlineResult(text) {
    const badge = document.createElement("div");
    badge.className = "quiz-inline-result";
    badge.textContent = text;
    testBody.appendChild(badge);
  }

  function finishQuiz(quiz) {
    const allCorrect = (quiz.correct === 3 && quiz.qs.length === 3);

    if (allCorrect) {
      const today = getTodayStamps();
      if (today < 10) {
        setTodayStamps(today + 1);
        setTotalStamps(getTotalStamps() + 1);
        renderStamps();
        toast("スタンプ+1  ゲット！");
      } else {
        toast("きょうは もう10こ いっぱいだよ");
      }
    } else {
      toast(`${quiz.correct}/3 せいかい`);
    }

    closeTest();
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 220);
    }, 1200);
  }

  // ====== Data Load (words.json 構造に対応) ======
  function normalizeWordsJson(json) {
    // json が配列なら旧形式（words配列）として扱う
    if (Array.isArray(json)) {
      return { stages: null, words: json };
    }
    // v1形式: {version, stages, words}
    const stages = Array.isArray(json?.stages) ? json.stages : null;
    const words = Array.isArray(json?.words) ? json.words : [];
    return { stages, words };
  }

  // ====== Init ======
  async function init() {
    ensureDayReset();

    try {
      const res = await fetch(WORDS_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("words.json load failed");
      const raw = await res.json();

      const norm = normalizeWordsJson(raw);
      allWords = Array.isArray(norm.words) ? norm.words : [];

      // stagesがあれば優先的に反映（和名のみ）
      if (Array.isArray(norm.stages) && norm.stages.length) {
        STAGES = norm.stages.map(s => ({ id: Number(s.id), name: String(s.name || `ステージ${s.id}`) }));
      }

      // stagesが無い場合の保険（最低限動かす）
      if (!STAGES.length) {
        const ids = Array.from(new Set(allWords.map(w => Number(w.stageId)).filter(n => Number.isFinite(n))))
          .sort((a,b) => a-b);
        STAGES = ids.map(id => ({ id, name: `ステージ${id}` }));
      }

    } catch (e) {
      allWords = [];
    }

    // stageId が存在しない時は 1 に戻す
    if (!STAGES.some(s => Number(s.id) === Number(stageId))) {
      stageId = Number(STAGES[0]?.id || 1);
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

    // 互換：submitボタンがあっても落ちないように（今は使わない）
    if (testSubmit) {
      testSubmit.addEventListener("click", () => {});
    }
  }

  init();
})();

