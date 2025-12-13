(() => {
  const flipBtn = document.getElementById("flip-card");
  const flipInner = document.getElementById("flip-inner");
  const hint = document.getElementById("tap-hint");

  flipBtn.addEventListener("click", () => {
    const flipped = flipInner.classList.toggle("is-flipped");
    hint.textContent = flipped ? "" : "タップしてカードをめくる";
  });
})();
