const flipCard = document.getElementById("flip-card");
const frontEnglish = document.getElementById("front-english");
const frontKana = document.getElementById("front-kana");
const backJapanese = document.getElementById("back-japanese");
const progressEl = document.getElementById("progress");
const tapHintEl = document.getElementById("tap-hint");

let isBack = false;
let index = 0;

// 仮データ（既存JSON接続可）
const words = [
  { english:"look at __", kana:"ルック アット", japanese:"〜を見る" },
  { english:"listen to __", kana:"リスン トゥ", japanese:"〜を聞く" }
];

function render(){
  const w = words[index];
  frontEnglish.textContent = w.english;
  frontKana.textContent = w.kana;
  backJapanese.textContent = w.japanese;
  progressEl.textContent = `${index+1}/${words.length}`;
  setBack(false);
}

function setBack(flag){
  isBack = flag;
  flipCard.classList.toggle("is-back", isBack);
  tapHintEl.textContent = isBack ? "" : "タップしてカードをめくる";
}

flipCard.addEventListener("click",()=>{
  setBack(!isBack);
});

document.getElementById("next-btn").onclick=()=>{
  index=(index+1)%words.length;
  render();
};
document.getElementById("prev-btn").onclick=()=>{
  index=(index-1+words.length)%words.length;
  render();
};

render();
