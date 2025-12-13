const flipCardBtn = document.getElementById("flip-card");
const flipInner = document.getElementById("flip-inner");
const tapHintEl = document.getElementById("tap-hint");

flipCardBtn.addEventListener("click", () => {
  const flipped = flipInner.classList.toggle("is-flipped");
  tapHintEl.textContent = flipped ? "" : "タップしてカードをめくる";
});
