# -*- coding: utf-8 -*- 
import json
with open("N2_vocab.json", "r", encoding="utf-8") as f:
    data = json.load(f)
examples = [entry["example"] for entry in data]
with open("examples.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(examples))
print("examples.txt has been generated.")
