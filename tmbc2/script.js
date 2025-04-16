
fetch("subtitles.json")
  .then(res => res.json())
  .then(data => {
    const audio = document.getElementById("audio");
    const container = document.getElementById("karaoke");
    const wordElements = [];

    data.forEach(seg => {
      const block = document.createElement("div");
      block.className = "subtitle-block";

      const jpDiv = document.createElement("div");
      jpDiv.className = "jp-line";

      seg.words.forEach(word => {
        const span = document.createElement("span");
        span.textContent = word.word;
        span.className = "word";
        jpDiv.appendChild(span);
        wordElements.push({ span, start: word.start, end: word.end });
      });

      const zhDiv = document.createElement("div");
      zhDiv.className = "zh-line";
      zhDiv.textContent = seg.zh || "";

      block.appendChild(jpDiv);
      block.appendChild(zhDiv);
      container.appendChild(block);
    });

    setInterval(() => {
      const t = audio.currentTime;
      wordElements.forEach(w => {
        if (t >= w.start && t <= w.end) {
          w.span.classList.add("active");
        } else {
          w.span.classList.remove("active");
        }
      });

      const active = document.querySelector(".word.active");
      if (active) {
        active.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  });
