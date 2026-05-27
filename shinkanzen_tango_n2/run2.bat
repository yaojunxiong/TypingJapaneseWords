@echo off
setlocal

set PY_SCRIPT=generate_vocab_cards.py

:: 删除旧文件
if exist %PY_SCRIPT% del %PY_SCRIPT%

:: 创建 Python 脚本
echo # -*- coding: utf-8 -*- > %PY_SCRIPT%
echo import json >> %PY_SCRIPT%
echo from janome.tokenizer import Tokenizer >> %PY_SCRIPT%
echo # 空行 >> %PY_SCRIPT%
echo with open("dictionary.json", "r", encoding="utf-8") as f: >> %PY_SCRIPT%
echo     dictionary = json.load(f) >> %PY_SCRIPT%
echo with open("examples.txt", "r", encoding="utf-8") as f: >> %PY_SCRIPT%
echo     sentences = [line.strip() for line in f if line.strip()] >> %PY_SCRIPT%
echo # 空行 >> %PY_SCRIPT%
echo t = Tokenizer() >> %PY_SCRIPT%
echo vocab_cards = {} >> %PY_SCRIPT%
echo for sentence in sentences: >> %PY_SCRIPT%
echo     words = [] >> %PY_SCRIPT%
echo     for token in t.tokenize(sentence): >> %PY_SCRIPT%
echo         jp = token.surface >> %PY_SCRIPT%
echo         if jp in dictionary: >> %PY_SCRIPT%
echo             entry = dictionary[jp] >> %PY_SCRIPT%
echo         else: >> %PY_SCRIPT%
echo             entry = {"reading": token.reading if token.reading != "*" else jp, "meaning": ""} >> %PY_SCRIPT%
echo         words.append({"jp": jp, "reading": entry["reading"], "meaning": entry["meaning"]}) >> %PY_SCRIPT%
echo     vocab_cards[sentence] = words >> %PY_SCRIPT%
echo # 空行 >> %PY_SCRIPT%
echo with open("vocab_cards.json", "w", encoding="utf-8") as f: >> %PY_SCRIPT%
echo     json.dump(vocab_cards, f, ensure_ascii=False, indent=2) >> %PY_SCRIPT%
echo print("vocab_cards.json has been generated.") >> %PY_SCRIPT%

python %PY_SCRIPT%

pause
