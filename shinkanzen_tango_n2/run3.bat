@echo off
setlocal

set PY_SCRIPT=merge_dictionaries.py

:: 删除旧脚本
if exist %PY_SCRIPT% del %PY_SCRIPT%

:: 创建 Python 脚本（不写入空行）
echo # -*- coding: utf-8 -*- > %PY_SCRIPT%
echo import json >> %PY_SCRIPT%
echo with open("dictionary.json", "r", encoding="utf-8") as f: dict1 = json.load(f) >> %PY_SCRIPT%
echo with open("dictionary_updated.json", "r", encoding="utf-8") as f: dict2 = json.load(f) >> %PY_SCRIPT%
echo merged = dict1.copy(); merged.update(dict2) >> %PY_SCRIPT%
echo with open("dictionary.json", "w", encoding="utf-8") as f: json.dump(merged, f, ensure_ascii=False, indent=2) >> %PY_SCRIPT%
echo print("Dictionaries merged successfully.") >> %PY_SCRIPT%

python %PY_SCRIPT%

pause
