let answer1 = [];
let answer2 = [];

// 初始化 kuromoji 分词器
kuromoji.builder({ dicPath: "kuromoji/dict" }).build(function (err, tokenizer) {
    if (err) {
        console.error("❌ 形態素解析器の初期化に失敗しました:", err);
        return;
    }

    // 提取 rawText 中的句子
    const match = rawText.match(/「(.+?)」\s*「(.+?)」/);
    if (!match) {
        alert("⚠️ rawText の形式が正しくありません。\n例：「句子１」「句子２」");
        return;
    }

    const sentence1 = match[1];
    const sentence2 = match[2];

    // 设置视频路径（编码防止路径错误）
    const videoPath = "video/" + encodeURIComponent(rawText) + ".mp4";
    const videoSource = document.getElementById("video-source");
    videoSource.src = videoPath;
    document.querySelector("video").load();

    // 设置页面对话文本
    document.getElementById("text1").textContent = `女：「${sentence1}」`;
    document.getElementById("text2").textContent = `男：「${sentence2}」`;

    // 分词生成词块数组
    answer1 = tokenizer.tokenize(sentence1).map(token => token.surface_form);
    answer2 = tokenizer.tokenize(sentence2).map(token => token.surface_form);

    // 创建拖拽练习列表（调用外部函数）
    createList("list1", answer1);
    createList("list2", answer2);
});
