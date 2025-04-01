// ✅ 更稳定的打乱算法
function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ✅ 创建拖拽区域
function createList(id, words) {
    const list = document.getElementById(id);
    list.innerHTML = '';

    const shuffled = shuffle(words);
    shuffled.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        list.appendChild(li);
    });

    Sortable.create(list, {
        animation: 150,
        touchStartThreshold: 5, // 🧠 手机拖拽延迟启动
        fallbackOnBody: true,   // ✅ iOS/安卓兼容
        swapThreshold: 0.65
    });
}

// ✅ 检查答案是否匹配
function checkAnswer(listId, answer, resultId) {
    const userList = Array.from(document.querySelectorAll(`#${listId} li`)).map(li => li.textContent);
    const result = document.getElementById(resultId);
    const isCorrect = JSON.stringify(userList) === JSON.stringify(answer);

    result.textContent = isCorrect ? "✅ 正解です！" : "❌ もう一度やってみよう！";
    result.style.color = isCorrect ? "green" : "red";
}

// ✅ 页面底部提示框
function showTip(message) {
    const tip = document.getElementById("page-tip");
    tip.textContent = message;
    tip.style.display = "block";
    setTimeout(() => {
        tip.style.display = "none";
    }, 2000);
}

// ✅ 页面跳转（带检查文件是否存在）
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

// ✅ 页面加载时由 auto.js 调用这两句
createList("list1", answer1);
createList("list2", answer2);
