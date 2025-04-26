# -*- coding: utf-8 -*- 
import json 
with open("dictionary.json", "r", encoding="utf-8") as f: dict1 = json.load(f) 
with open("dictionary_updated.json", "r", encoding="utf-8") as f: dict2 = json.load(f) 
merged = dict1.copy(); merged.update(dict2) 
with open("dictionary.json", "w", encoding="utf-8") as f: json.dump(merged, f, ensure_ascii=False, indent=2) 
print("Dictionaries merged successfully.") 
