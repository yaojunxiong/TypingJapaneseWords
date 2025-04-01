function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

function createList(id, words) {
    const list = document.getElementById(id);
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



// ✅ 显示提示框
function showTip(message) {
    const tip = document.getElementById("page-tip");
    tip.textContent = message;
    tip.style.display = "block";
    setTimeout(() => {
        tip.style.display = "none";
    }, 2000);
}

// ✅ 跳转上一页 / 下一页
function goToPage(offset) {
    const current = window.location.pathname.split("/").pop();
    const match = current.match(/(.*_)(\d+)(\.html)/);

    if (!match) {
        showTip("⚠️ ページ名の形式が正しくありません！");
        return;
    }

    const [_, prefix, numStr, suffix] = match;
    const nextNumber = parseInt(numStr, 10) + offset;

    if (nextNumber < 0) {
        showTip("⚠️ これ以上前のページはありません");
        return;
    }

    const nextPage = `${prefix}${nextNumber.toString().padStart(3, '0')}${suffix}`;

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
}