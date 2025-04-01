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


 