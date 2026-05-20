const japaneseVoiceLang = 'ja-JP';

function speakJapanese(text) {
    if (!('speechSynthesis' in window)) {
        alert('当前浏览器不支持语音朗读。请使用 Chrome、Edge 或 Safari 最新版本。');
        return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = japaneseVoiceLang;
    utterance.rate = 0.82;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

document.addEventListener('click', event => {
    const speakTarget = event.target.closest('[data-speak]');
    if (speakTarget) {
        speakJapanese(speakTarget.dataset.speak);
    }
});

const subjects = ['わたし', 'ミラーさん', 'たなかさん', 'あなた'];
const nouns = ['がくせい', 'せんせい', 'かいしゃいん', 'にほんじん'];
const patternSentence = document.getElementById('patternSentence');
const newSentenceBtn = document.getElementById('newSentenceBtn');
const speakSentenceBtn = document.getElementById('speakSentenceBtn');

function createPatternSentence() {
    if (!patternSentence) return;
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    patternSentence.textContent = `${subject}は ${noun}です。`;
}

if (newSentenceBtn) {
    newSentenceBtn.addEventListener('click', createPatternSentence);
}

if (speakSentenceBtn) {
    speakSentenceBtn.addEventListener('click', () => speakJapanese(patternSentence.textContent));
}

const quizItems = [
    {
        question: '“我是学生。” 用日语怎么说？',
        options: ['わたしは がくせいです。', 'あなたは せんせいです。', 'わたしは にほんじんです。'],
        answer: 0
    },
    {
        question: '“N1 は N2 です” 表示什么？',
        options: ['N1 不是 N2', 'N1 是 N2', 'N1 去 N2'],
        answer: 1
    },
    {
        question: '“はい、そうです。” 的意思是？',
        options: ['是的，是这样。', '不是。', '谢谢。'],
        answer: 0
    },
    {
        question: '“せんせい” 的中文意思是？',
        options: ['学生', '老师', '公司职员'],
        answer: 1
    },
    {
        question: '下面哪个是疑问句？',
        options: ['わたしは がくせいです。', 'あなたは がくせいですか。', 'ミラーさんは せんせいです。'],
        answer: 1
    }
];

const quizBox = document.getElementById('quizBox');
const checkQuizBtn = document.getElementById('checkQuizBtn');
const quizResult = document.getElementById('quizResult');

function renderQuiz() {
    if (!quizBox) return;
    quizBox.innerHTML = quizItems.map((item, index) => `
        <div class="quiz-item">
            <p><strong>${index + 1}. ${item.question}</strong></p>
            ${item.options.map((option, optionIndex) => `
                <label class="quiz-option">
                    <input type="radio" name="quiz-${index}" value="${optionIndex}">
                    <span>${option}</span>
                </label>
            `).join('')}
        </div>
    `).join('');
}

if (checkQuizBtn) {
    checkQuizBtn.addEventListener('click', () => {
        let score = 0;
        quizItems.forEach((item, index) => {
            const selected = document.querySelector(`input[name="quiz-${index}"]:checked`);
            if (selected && Number(selected.value) === item.answer) score += 1;
        });
        quizResult.textContent = `本次得分：${score}/${quizItems.length}。${score === quizItems.length ? '太棒了，可以进入下一课准备！' : '建议再听读例句并重做错题。'}`;
        localStorage.setItem('lesson01QuizScore', String(score));
    });
}

const markDoneBtn = document.getElementById('markDoneBtn');
if (markDoneBtn) {
    const done = localStorage.getItem('lesson01Done') === 'true';
    markDoneBtn.textContent = done ? '本课已完成' : '标记本课已学';
    markDoneBtn.addEventListener('click', () => {
        localStorage.setItem('lesson01Done', 'true');
        markDoneBtn.textContent = '本课已完成';
        markDoneBtn.classList.remove('btn-outline-primary');
        markDoneBtn.classList.add('btn-success');
    });
}

const roleplayCheckBtn = document.getElementById('roleplayCheckBtn');
const roleplayInput = document.getElementById('roleplayInput');
const roleplayFeedback = document.getElementById('roleplayFeedback');

if (roleplayCheckBtn) {
    roleplayCheckBtn.addEventListener('click', () => {
        const answer = roleplayInput.value.trim();
        if (!answer) {
            roleplayFeedback.textContent = '先写一句日语自我介绍吧。';
            return;
        }
        const hasWatashi = answer.includes('わたし') || answer.includes('私');
        const hasDesu = answer.includes('です');
        if (hasWatashi && hasDesu) {
            roleplayFeedback.textContent = '很好！句子结构完整。可以再加一句：どうぞよろしく おねがいします。';
        } else if (hasDesu) {
            roleplayFeedback.textContent = '不错，已经用了「です」。建议加入「わたしは...」让自我介绍更完整。';
        } else {
            roleplayFeedback.textContent = '建议使用本课句型：わたしは 〇〇です。';
        }
    });
}

renderQuiz();
