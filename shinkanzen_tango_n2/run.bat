@echo off
setlocal

:: 设置 Python 脚本名称
set PY_SCRIPT=extract_examples.py

:: 创建 Python 脚本
echo # -*- coding: utf-8 -*- > %PY_SCRIPT%
echo import json>> %PY_SCRIPT%
echo with open("N2_vocab.json", "r", encoding="utf-8") as f:>> %PY_SCRIPT%
echo     data = json.load(f)>> %PY_SCRIPT%
echo examples = [entry["example"] for entry in data]>> %PY_SCRIPT%
echo with open("examples.txt", "w", encoding="utf-8") as f:>> %PY_SCRIPT%
echo     f.write("\n".join(examples))>> %PY_SCRIPT%
echo print("examples.txt has been generated.")>> %PY_SCRIPT%

:: 运行 Python 脚本
python %PY_SCRIPT%

pause
