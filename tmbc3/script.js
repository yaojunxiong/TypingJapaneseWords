
const audio = document.getElementById("audio");
const wordSpans = Array.from(document.querySelectorAll(".word"));
setInterval(() => {
  const t = audio.currentTime;
  wordSpans.forEach(span => {
    const start = parseFloat(span.dataset.start);
    const end = parseFloat(span.dataset.end);
    if (t >= start && t <= end) {
      span.classList.add("active");
    } else {
      span.classList.remove("active");
    }
  });
  const firstActive = document.querySelector(".word.active");
  if (firstActive) {
    firstActive.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}, 100);
