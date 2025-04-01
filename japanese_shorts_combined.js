 

let answer1 = [];
let answer2 = [];

// ✅ 判断是否为 iOS
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// ✅ 更稳定的洗牌算法
function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ✅ 创建拖拽列表
function createList(id, words) {
    const list = document.getElementById(id);

    if (!list) {
        console.warn(`❌ 找不到拖拽容器 ID：${id}`);
        return;
    }

    if (!Array.isArray(words) || words.length === 0) {
        console.warn(`⚠️ 拖拽词块为空：${id}`);
        return;
    }

    list.innerHTML = '';

    const shuffled = shuffle(words);
    console.log(`🔧 正在初始化拖拽列表 "${id}"，打乱顺序为：`, shuffled);

    shuffled.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        li.classList.add("sortable-item");
        list.appendChild(li);
    });

    try {
        const sortable = Sortable.create(list, {
            animation: 150,
            touchStartThreshold: 5,
            fallbackOnBody: true,
            swapThreshold: 0.65,
            forceFallback: isIOS()
        });

        console.log(`✅ 拖拽初始化成功 (ID: ${id})`, sortable);
    } catch (e) {
        console.error(`❌ 拖拽初始化失败 (ID: ${id})`, e);
    }
}


// ✅ 检查答案
function checkAnswer(listId, answer, resultId) {
    const userList = Array.from(document.querySelectorAll(`#${listId} li`)).map(li => li.textContent);
    const result = document.getElementById(resultId);
    const isCorrect = JSON.stringify(userList) === JSON.stringify(answer);
    result.textContent = isCorrect ? "✅ 正解です！" : "❌ もう一度やってみよう！";
    result.style.color = isCorrect ? "green" : "red";
}

// ✅ 提示信息
function showTip(message) {
    const tip = document.getElementById("page-tip");
    if (!tip) return;
    tip.textContent = message;
    tip.style.display = "block";
    setTimeout(() => {
        tip.style.display = "none";
    }, 2000);
}

// ✅ 页面跳转（带页码）
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
            if (response.ok) window.location.href = nextPage;
            else showTip(offset > 0 ? "⚠️ 次のページが見つかりません" : "⚠️ 前のページが見つかりません");
        })
        .catch(() => showTip("⚠️ ページの読み込み中にエラーが発生しました"));
}

// ✅ 初始化 kuromoji 分词器
kuromoji.builder({ dicPath: "kuromoji/dict" }).build(function (err, tokenizer) {
    if (err) {
        console.error("❌ 形態素解析器の初期化に失敗しました:", err);
        return;
    }

    // 拆分句子
    const match = rawText.match(/「(.+?)」\s*「(.+?)」/);
    if (!match) {
        alert("⚠️ rawText の形式が正しくありません。\n例：「句子１」「句子２」");
        return;
    }

    const sentence1 = match[1];
    const sentence2 = match[2];

    // 设置视频路径
    const videoPath = "video/" + encodeURIComponent(rawText) + ".mp4";
    const videoSource = document.getElementById("video-source");
    videoSource.src = videoPath;
    document.querySelector("video").load();

    // 设置对话文本
    document.getElementById("text1").textContent = `女：「${sentence1}」`;
    document.getElementById("text2").textContent = `男：「${sentence2}」`;

    // 分词
    answer1 = tokenizer.tokenize(sentence1).map(token => token.surface_form);
    answer2 = tokenizer.tokenize(sentence2).map(token => token.surface_form);

    // 初始化拖拽
    createList("list1", answer1);
    createList("list2", answer2);
});
