@echo off
setlocal

set PY_SCRIPT=split_unmatched.py

if exist %PY_SCRIPT% del %PY_SCRIPT%

:: 生成 Python 脚本
echo # -*- coding: utf-8 -*- > %PY_SCRIPT%
echo import json >> %PY_SCRIPT%
echo with open("unmatched_words_filled.json", "r", encoding="utf-8") as f: >> %PY_SCRIPT%
echo     data = json.load(f) >> %PY_SCRIPT%
echo matched = {} >> %PY_SCRIPT%
echo unmatched = {} >> %PY_SCRIPT%
echo for k, v in data.items(): >> %PY_SCRIPT%
echo     if v["meaning"] not in ["\u5f85\u8865\u5145", "\u672a\u77e5"]: >> %PY_SCRIPT%
echo         matched[k] = v >> %PY_SCRIPT%
echo     else: >> %PY_SCRIPT%
echo         unmatched[k] = v >> %PY_SCRIPT%
echo with open("matched_words.json", "w", encoding="utf-8") as f: >> %PY_SCRIPT%
echo     json.dump(matched, f, ensure_ascii=False, indent=2) >> %PY_SCRIPT%
echo with open("unmatched_remaining.json", "w", encoding="utf-8") as f: >> %PY_SCRIPT%
echo     json.dump(unmatched, f, ensure_ascii=False, indent=2) >> %PY_SCRIPT%
echo print("Files generated: matched_words.json and unmatched_remaining.json") >> %PY_SCRIPT%

python %PY_SCRIPT%

pause
