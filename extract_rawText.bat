@echo off
setlocal enabledelayedexpansion

:: 输出文件
set "output=output.txt"
echo 文件名,rawText值 > %output%

:: 遍历所有 HTML 文件
for %%f in (*.html) do (
    set "filename=%%f"
    set "rawText="

    :: 读取 HTML 文件内容并查找 rawText
    for /f "usebackq tokens=*" %%l in ("%%f") do (
        set "line=%%l"
        echo !line! | findstr "const rawText" >nul
        if !errorlevel! == 0 (
            rem 提取等号后面的内容
            for /f "tokens=2 delims==" %%a in ("!line!") do (
                set "raw=%%a"
                set "raw=!raw:~0,-1!"  :: 去除结尾的分号
                set "raw=!raw:"=!"     :: 去除引号
                set "rawText=!raw!"
            )
        )
    )

    if defined rawText (
        echo !filename!,!rawText! >> %output%
    )
)

echo 完成，结果已导出到 %output%
pause
