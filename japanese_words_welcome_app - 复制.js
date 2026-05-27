document.addEventListener("DOMContentLoaded", function () {
    const languages = {
        jp: {
            welcome: "いらっしゃいませ！",
            looking_for: "何かお探しですか？",
            browsing: "すみません、ちょっと見ているだけです。",
            enjoy: "はい、ごゆっくりどうぞ！",
            tshirt: "はい、新しいTシャツを探しています。",
            designs: "こちらに色々なデザインがありますよ！",
            hello: "こんにちは！",
            restart: "もう一度練習する"
        },
        en: {
            welcome: "Welcome!",
            looking_for: "Are you looking for something?",
            browsing: "Sorry, I'm just browsing.",
            enjoy: "Okay, please take your time!",
            tshirt: "Yes, I'm looking for a new T-shirt.",
            designs: "Here are various designs!",
            hello: "Hello!",
            restart: "Practice again"
        },
        zh: {
            welcome: "欢迎光临！",
            looking_for: "您在找什么吗？",
            browsing: "不好意思，我只是看看。",
            enjoy: "好的，请慢慢看！",
            tshirt: "是的，我在找新的T恤。",
            designs: "这里有各种各样的设计！",
            hello: "你好！",
            restart: "再练习一次"
        }
    };

    let currentLang = "jp";

    function setLanguage(lang) {
        currentLang = lang;
        renderDialogue(true);
    }

    const scenarios = {
        shopping: {
            background: "https://source.unsplash.com/featured/?clothing-store",
            dialogues: [
                {
                    character: "👩 店员",
                    textKey: "welcome",
                    gender: "female",
                    background: "https://source.unsplash.com/featured/?shopping-mall",
                    options: [
                        { textKey: "hello", gender: "male", next: 1 },
                        { textKey: "browsing", gender: "male", next: 2 }
                    ]
                },
                {
                    character: "👩 店员",
                    textKey: "looking_for",
                    gender: "female",
                    background: "https://source.unsplash.com/featured/?clothes-shop",
                    options: [
                        { textKey: "tshirt", gender: "male", next: 3 },
                        { textKey: "browsing", gender: "male", next: 2 }
                    ]
                },
                {
                    character: "👩 店员",
                    textKey: "enjoy",
                    gender: "female",
                    background: "https://source.unsplash.com/featured/?fashion",
                    options: []
                },
                {
                    character: "👩 店员",
                    textKey: "designs",
                    gender: "female",
                    background: "https://source.unsplash.com/featured/?apparel",
                    options: []
                }
            ]
        }
    };

    let step = 0;
    const scene = "shopping";
    const scenario = scenarios[scene];

    function getVoice(gender) {
        const voices = speechSynthesis.getVoices();
        return voices.find(voice =>
            voice.lang.startsWith(currentLang === "jp" ? "ja" : currentLang === "en" ? "en" : "zh")
        ) || voices[0];
    }

    function speakText(text, gender, callback) {
        const voice = getVoice(gender);
        if (!voice) {
            console.warn("No suitable voice found for language:", currentLang, " gender:", gender);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLang === "jp" ? "ja-JP" : currentLang === "en" ? "en-US" : "zh-CN";
        utterance.voice = voice;
        utterance.onend = callback;
        speechSynthesis.speak(utterance);
    }

    function renderDialogue(playAudio = false) {
        const app = document.getElementById("app");
        if (!app) {
            console.error("Element with ID 'app' not found in the document.");
            return;
        }

        const dialogue = scenario.dialogues[step];
        document.body.style.backgroundImage = `url(${dialogue.background})`;
        document.body.style.backgroundSize = "cover";

        const textToSpeak = languages[currentLang][dialogue.textKey];
        if (playAudio) {
            speakText(textToSpeak, "female", null);
        }

        app.innerHTML = `\
            <div class="dialogue-box">
                <p><strong>${dialogue.character}</strong></p>
                <p>${textToSpeak}</p>
                <div class="options">
                    ${dialogue.options.map(option => `\
                        <button onclick="handleChoice(${option.next}, '${option.textKey}', '${option.gender}')">
                            ${languages[currentLang][option.textKey]}
                        </button>`).join("")}
                </div>
            </div>
            <div class="language-switcher">
                <button onclick="setLanguage('jp')">日本語</button>
                <button onclick="setLanguage('en')">English</button>
                <button onclick="setLanguage('zh')">中文</button>
            </div>
        `;
    }

    window.handleChoice = function (nextStep, textKey, gender) {
        speakText(languages[currentLang][textKey], gender, function () {
            step = nextStep;
            renderDialogue(true);
        });
    };

    window.setLanguage = setLanguage;

    speechSynthesis.onvoiceschanged = function () {
        renderDialogue(true);
    };

    if (speechSynthesis.getVoices().length > 0) {
        renderDialogue(true);
    } else {
        speechSynthesis.onvoiceschanged();
    }
});
