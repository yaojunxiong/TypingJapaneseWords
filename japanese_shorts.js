function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

function createList(id, words) {
    const list = document.getElementById(id);
    list.innerHTML = ''; // 清空原来的内容
    shuffle([...words]).forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        list.appendChild(li);
    });
    Sortable.create(list, { animation: 150 });
}

function checkAnswer(listId, answer, resultId) {
    const list = Array.from(document.querySelectorAll(`#${listId} li`)).map(li => li.textContent);
    const result = document.getElementById(resultId);
    if (JSON.stringify(list) === JSON.stringify(answer)) {
        result.textContent = "✅ 正解です！";
        result.style.color = "green";
    } else {
        result.textContent = "❌ もう一度やってみよう！";
        result.style.color = "red";
    }
}

createList("list1", answer1);
createList("list2", answer2);

function showTip(message) {
    const tip = document.getElementById("page-tip");
    tip.textContent = message;
    tip.style.display = "block";
    setTimeout(() => {
        tip.style.display = "none";
    }, 2000);
}

function goToPage(offset) {
    const current = window.location.pathname.split("/").pop();
    const match = current.match(/(.*_)(\d+)(\.html)/);

    if (match) {
        const prefix = match[1];
        const number = parseInt(match[2], 10);
        const suffix = match[3];
        const nextNumber = number + offset;

        if (nextNumber < 0) {
            showTip("⚠️ これ以上前のページはありません");
            return;
        }

        const nextPage = prefix + nextNumber.toString().padStart(3, '0') + suffix;

        fetch(nextPage, { method: 'HEAD' })
            .then(response => {
                if (response.ok) {
                    window.location.href = nextPage;
                } else {
                    showTip(offset > 0 ? "⚠️ 次のページが見つかりません" : "⚠️ 前のページが見つかりません");
                }
            })
            .catch(() => {
                showTip("⚠️ ページの読み込み中にエラーが発生しました");
            });
    } else {
        showTip("⚠️ ページ名の形式が正しくありません！");
    }
}

// 手机滑动手势支持
let touchStartX = 0;
let touchEndX = 0;

function handleGesture() {
    const dx = touchEndX - touchStartX;
    if (Math.abs(dx) > 50) {
        if (dx > 0) goToPage(-1); // 右滑
        else goToPage(1);        // 左滑
    }
}

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleGesture();
});
 