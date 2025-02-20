document.addEventListener("DOMContentLoaded", function () {
    function applyTheme(theme) {
        document.body.className = theme;
        localStorage.setItem("theme", theme);
    }

    // 读取本地存储的主题（默认 'theme-green'）
    const savedTheme = localStorage.getItem("theme") || "theme-green";
    applyTheme(savedTheme);

    // 等待导航栏加载完成后执行主题切换
    function setupThemeSelector() {
        const themeSelector = document.getElementById("themeSelector");
        if (themeSelector) {
            themeSelector.value = savedTheme;
            themeSelector.addEventListener("change", function (event) {
                applyTheme(event.target.value);
            });
        } else {
            // 如果导航栏未加载，延迟检查
            setTimeout(setupThemeSelector, 100);
        }
    }

    setupThemeSelector();
});
