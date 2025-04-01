// ✅ 更稳定的打乱算法
function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ✅ 判断是否为 iOS 设备（包含 iPhone/iPad）
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
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

    // 📱 针对 iOS 兼容性配置
    Sortable.create(list, {
        animation: 150,
        touchStartThreshold: 5,
        fallbackOnBody: true,
        swapThreshold: 0.65,
        forceFallback: isIOS() // ✅ 仅 iOS 强制 fallback 模式，其它设备正常
    });
}

// ✅ 检查答案是否正确
function checkAnswer(listId, answer, resultId) {
    const userList = Array.from(document.querySelectorAll(`#${listId} li`)).map(li => li.textContent);
    const result = document.getElementById(resultId);
    const isCorrect = JSON.stringify(userList) === JSON.stringify(answer);

    result.textContent = isCorrect ? "✅ 正解です！" : "❌ もう一度やってみよう！";
    result.style.color = isCorrect ? "green" : "red";
}

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

// ✅ 自动生成拖拽列表（由 auto.js 调用）
createList("list1", answer1);
createList("list2", answer2);
