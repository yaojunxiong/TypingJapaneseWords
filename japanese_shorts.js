// ✅ 更稳定的洗牌算法（Fisher-Yates）
function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ✅ 检测是否为 iOS 设备（强制 fallback 拖拽模式）
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// ✅ 创建拖拽区域（支持手机端 & iOS）
function createList(id, words) {
    const list = document.getElementById(id);
    list.innerHTML = '';

    const shuffled = shuffle(words);
    shuffled.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        li.classList.add("sortable-item"); // 可用于样式美化
        list.appendChild(li);
    });

    Sortable.create(list, {
        animation: 150,
        touchStartThreshold: 5,
        fallbackOnBody: true,
        swapThreshold: 0.65,
        forceFallback: isIOS() // ✅ iOS 特别处理
    });
}

// ✅ 检查答案
function checkAnswer(listId, answer, resultId) {
    const userList = Array.from(document.querySelectorAll(`#${listId} li`)).map(li => li.textContent);
    const result = document.getElementById(resultId);
    const isCorrect = JSON.stringify(userList) === JSON.stringify(answer);

    result.textContent = isCorrect ? "✅ 正解です！" : "❌ もう一度やってみよう！";
    result.style.color = isCorrect ? "green" : "red";
}

// ✅ 显示底部提示消息（带动画效果）
function showTip(message) {
    const tip = document.getElementById("page-tip");
    if (!tip) return;
    tip.textContent = message;
    tip.style.display = "block";
    setTimeout(() => {
        tip.style.display = "none";
    }, 2000);
}

// ✅ 上下页跳转（带页码自动补零）
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

// ✅ 初始化拖拽区域（外部传入 answer1 / answer2）
createList("list1", answer1);
createList("list2", answer2);
