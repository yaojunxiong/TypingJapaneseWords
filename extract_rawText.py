import os
import re
import json

output_file = "output.json"
pattern = re.compile(r'const\s+rawText\s*=\s*["\'](.*?)["\']\s*;')

results = []

for filename in os.listdir('.'):
    if filename.lower().endswith('.html'):
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
            match = pattern.search(content)
            if match:
                raw_text = match.group(1).strip()
                results.append({
                    "file": filename,
                    "rawText": raw_text
                })

# 写入 JSON 文件
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"✅ 已导出 JSON 文件：{output_file}")
