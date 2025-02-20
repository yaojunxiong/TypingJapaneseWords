document.addEventListener("DOMContentLoaded", function () {
    function initLanguage() {
        const langSelector = document.getElementById("langSelector");

        if (!langSelector) {
            setTimeout(initLanguage, 100); // 语言菜单未加载，稍后重试
            return;
        }

        // 语言数据
        const translations = {
            "zh": {
                "title": "日语打字练习",
                "heading": "日语打字练习 - 选择你的风格",
                "description": "通过打字练习提升日语输入速度，随时切换你喜欢的主题风格！",
                "chooseScene": "选择场景开始打字练习",
                "restaurant": "餐厅用语",
                "restaurantDesc": "学习点餐、结账等常用日语",
                "shopping": "购物用语",
                "shoppingDesc": "掌握询价、付款、退换货用语",
                "travel": "旅游交通",
                "travelDesc": "轻松应对问路、乘车、订票等情景",
                "practiceTitle": "日语打字练习",
                "sentenceTitle": "例句列表",
                "changeWordBtn": "切换单词",
                "speakBtn": "语音读出单词",
                "sentenceBtn": "根据单词造句",
                "wordColumn": "单词",
                "readingColumn": "读音",
                "meaningColumn": "意思",
                "exampleSentenceColumn": "例句",
                "translationColumn": "翻译",
                "footerText": "© 2025 日语打字练习 | 深圳有成软件开发有限公司",
                "contact": "联系我们：",
                "navTitle": "日语打字练习",
                "navHome": "首页",
                "navWords": "日语单词",
                "navKeywords": "热门关键字",
                "navAbout": "关于"
            },
            "ja": {
                "title": "日本語タイピング練習",
                "heading": "日本語タイピング練習 - お好みのスタイルを選択",
                "description": "タイピング練習を通じて日本語入力のスピードを向上させ、お好きなテーマを切り替えられます！",
                "chooseScene": "シーンを選択してタイピング練習を開始",
                "restaurant": "レストラン用語",
                "restaurantDesc": "注文、会計などの基本フレーズを学ぶ",
                "shopping": "ショッピング用語",
                "shoppingDesc": "値段を尋ねる、支払い、返品などの用語を習得",
                "travel": "旅行と交通",
                "travelDesc": "道を聞く、電車に乗る、チケットを買うなど",
                "practiceTitle": "日本語タイピング練習",
                "sentenceTitle": "例文一覧",
                "changeWordBtn": "単語を切り替える",
                "speakBtn": "単語を音声で読む",
                "sentenceBtn": "単語を使って例文を作る",
                "wordColumn": "単語",
                "readingColumn": "読み方",
                "meaningColumn": "意味",
                "exampleSentenceColumn": "例文",
                "translationColumn": "翻訳",
                "footerText": "© 2025 日本語タイピング練習 | 深圳有成ソフトウェア開発有限公司",
                "contact": "お問い合わせ：",
                "navTitle": "日本語タイピング練習",
                "navHome": "ホーム",
                "navWords": "日本語の単語",
                "navKeywords": "人気のキーワード",
                "navAbout": "概要"
            },
            "en": {
                "title": "Japanese Typing Practice",
                "heading": "Japanese Typing Practice - Choose Your Style",
                "description": "Improve your Japanese typing speed through practice and switch themes anytime!",
                "chooseScene": "Select a scene to start typing practice",
                "restaurant": "Restaurant Phrases",
                "restaurantDesc": "Learn common Japanese phrases for ordering and paying",
                "shopping": "Shopping Phrases",
                "shoppingDesc": "Master price inquiries, payment, and returns",
                "travel": "Travel & Transportation",
                "travelDesc": "Easily ask for directions, ride a train, and book tickets",
                "practiceTitle": "Japanese Typing Practice",
                "sentenceTitle": "Example Sentences",
                "changeWordBtn": "Change Word",
                "speakBtn": "Speak Word",
                "sentenceBtn": "Make Sentence",
                "wordColumn": "Word",
                "readingColumn": "Reading",
                "meaningColumn": "Meaning",
                "exampleSentenceColumn": "Example Sentence",
                "translationColumn": "Translation",
                "footerText": "© 2025 Japanese Typing Practice | Shenzhen Youcheng Software Development Co., Ltd.",
                "contact": "Contact us:",
                "navTitle": "Japanese Typing Practice",
                "navHome": "Home",
                "navWords": "Japanese Words",
                "navKeywords": "Hot Keywords",
                "navAbout": "About"
            }
        };

        function updateLanguage(lang) {
            document.title = translations[lang]["title"];

            // 遍历所有可翻译的文本
            Object.keys(translations[lang]).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = translations[lang][id];
            });

            // **更新表格列名**
            const tableHeaders = {
                "wordColumn": "wordColumn",
                "readingColumn": "readingColumn",
                "meaningColumn": "meaningColumn",
                "exampleSentenceColumn": "exampleSentenceColumn",
                "translationColumn": "translationColumn"
            };

            Object.keys(tableHeaders).forEach(headerId => {
                const headerEl = document.getElementById(headerId);
                if (headerEl) {
                    headerEl.textContent = translations[lang][tableHeaders[headerId]];
                }
            });

            // **强制更新 Bootstrap Table**
            const sentenceTable = document.getElementById("sentenceTable");
            if (sentenceTable) {
                sentenceTable.setAttribute("data-locale", lang === "zh" ? "zh-CN" : lang);

                // **销毁并重新初始化表格**
                $('#sentenceTable').bootstrapTable('destroy').bootstrapTable({
                    locale: lang === "zh" ? "zh-CN" : lang,
                    pagination: true,
                    search: true,
                    pageSize: 5
                });
            }

            localStorage.setItem("language", lang);
        }
         


        const savedLang = localStorage.getItem("language") || "zh";
        langSelector.value = savedLang;
        updateLanguage(savedLang);

        langSelector.addEventListener("change", function (event) {
            updateLanguage(event.target.value);
        });
    }

    initLanguage();
});
