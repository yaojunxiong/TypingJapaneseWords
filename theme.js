document.addEventListener("DOMContentLoaded", function () {
    function applyTheme(theme) {
        document.body.className = theme;
        localStorage.setItem("theme", theme);
    }

    // ��ȡ���ش洢�����⣨Ĭ�� 'theme-green'��
    const savedTheme = localStorage.getItem("theme") || "theme-green";
    applyTheme(savedTheme);

    // �ȴ�������������ɺ�ִ�������л�
    function setupThemeSelector() {
        const themeSelector = document.getElementById("themeSelector");
        if (themeSelector) {
            themeSelector.value = savedTheme;
            themeSelector.addEventListener("change", function (event) {
                applyTheme(event.target.value);
            });
        } else {
            // ���������δ���أ��ӳټ��
            setTimeout(setupThemeSelector, 100);
        }
    }

    setupThemeSelector();
});
