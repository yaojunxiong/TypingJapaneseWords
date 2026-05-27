@echo off
setlocal

set PY_SCRIPT=find_unmatched_json.py

if exist %PY_SCRIPT% del %PY_SCRIPT%

:: 创建 Python 脚本（合并成单行，避免写入空行）
echo # -*- coding: utf-8 -*- > %PY_SCRIPT%
echo import json; vocab_cards=json.load(open("vocab_cards.json",encoding="utf-8")); unmatched={}; [unmatched.setdefault(w["jp"],{"reading":w["reading"],"meaning":""}) for ws in vocab_cards.values() for w in ws if w["meaning"]==""]; json.dump(unmatched,open("unmatched_words.json","w",encoding="utf-8"),ensure_ascii=False,indent=2); print("unmatched_words.json has been generated.") >> %PY_SCRIPT%

python %PY_SCRIPT%

pause
