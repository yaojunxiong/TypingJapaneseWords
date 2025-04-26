# -*- coding: utf-8 -*- 
import json 
from janome.tokenizer import Tokenizer 
# 空行 
with open("dictionary.json", "r", encoding="utf-8") as f: 
    dictionary = json.load(f) 
with open("examples.txt", "r", encoding="utf-8") as f: 
    sentences = [line.strip() for line in f if line.strip()] 
# 空行 
t = Tokenizer() 
vocab_cards = {} 
for sentence in sentences: 
    words = [] 
    for token in t.tokenize(sentence): 
        jp = token.surface 
        if jp in dictionary: 
            entry = dictionary[jp] 
        else: 
            entry = {"reading": token.reading if token.reading != "*" else jp, "meaning": ""} 
        words.append({"jp": jp, "reading": entry["reading"], "meaning": entry["meaning"]}) 
    vocab_cards[sentence] = words 
# 空行 
with open("vocab_cards.json", "w", encoding="utf-8") as f: 
    json.dump(vocab_cards, f, ensure_ascii=False, indent=2) 
print("vocab_cards.json has been generated.") 
