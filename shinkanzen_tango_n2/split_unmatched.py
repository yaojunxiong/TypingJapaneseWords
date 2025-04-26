# -*- coding: utf-8 -*- 
import json 
with open("unmatched_words_filled.json", "r", encoding="utf-8") as f: 
    data = json.load(f) 
matched = {} 
unmatched = {} 
for k, v in data.items(): 
    if v["meaning"] not in ["\u5f85\u8865\u5145", "\u672a\u77e5"]: 
        matched[k] = v 
    else: 
        unmatched[k] = v 
with open("matched_words.json", "w", encoding="utf-8") as f: 
    json.dump(matched, f, ensure_ascii=False, indent=2) 
with open("unmatched_remaining.json", "w", encoding="utf-8") as f: 
    json.dump(unmatched, f, ensure_ascii=False, indent=2) 
print("Files generated: matched_words.json and unmatched_remaining.json") 
