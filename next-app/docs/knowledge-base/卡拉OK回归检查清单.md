---
tags:
  - testing
  - smoke-test
  - karaoke
  - regression
---

# 卡拉OK字幕模式 — 回归检查清单

## A. 本地资源完整性

```bash
# 1. 所有 subtitle-learning JSON 存在
ls src/data/minna/subtitle-learning/lesson-{01..50}-subtitle-learning.json | wc -l
# 预期: 50

# 2. 所有 TTS 目录存在
ls -d public/generated/tts-karaoke/lesson-{01..50} | wc -l
# 预期: 50

# 3. 每课 manifest + combined + silence 存在
for n in $(seq -w 1 50); do
  echo -n "L$n: "
  [ -f "public/generated/tts-karaoke/lesson-$n/manifest.json" ] && echo -n "manifest=OK " || echo -n "manifest=MISSING "
  [ -f "public/generated/tts-karaoke/lesson-$n/combined.mp3" ] && echo -n "combined=OK " || echo -n "combined=MISSING "
  [ -f "public/generated/tts-karaoke/lesson-$n/words/_silence.mp3" ] && echo "silence=OK" || echo "silence=MISSING"
done

# 4. JSON ↔ manifest 数量一致
for n in $(seq -w 1 50); do
  jlen=$(node -e "const d=require('./src/data/minna/subtitle-learning/lesson-$n-subtitle-learning.json');console.log(d.flatMap(l=>l.words||[]).length)")
  mlen=$(node -e "const m=require('./public/generated/tts-karaoke/lesson-$n/manifest.json');console.log(m.segments.length)")
  [ "$jlen" = "$mlen" ] && echo "L$n: OK ($jlen)" || echo "L$n: MISMATCH json=$jlen manifest=$mlen"
done
```

## B. 构建检查

```bash
npx tsc --noEmit              # 预期: 无输出
npm run build                 # 预期: 无 error/warning
git diff --check              # 预期: 无 whitespace errors
```

## C. 词卡质量

```bash
# 抽查（全部通过视为健康）
for n in 1 13 25 26 35 50; do
  p=$(printf '%02d' $n)
  node -e "
    const d=require('./src/data/minna/subtitle-learning/lesson-$p-subtitle-learning.json');
    let k=0, kf=0, r=0, m=0, nt=0, t=0, sc=0, ts=0, wc=0;
    d.forEach(l=>{(l.words||[]).forEach(w=>{
      wc++;
      if(!w.kana)k++;
      if(w.kana===w.surface&&/[\u4e00-\u9fff]/.test(w.surface))kf++;
      if(!w.romaji)r++;
      if(!w.meaningCn)m++;
      if(!w.noteCn)nt++;
      if(!w.type)t++;
      if(l.surface&&w.startChar!=null&&w.endChar!=null&&l.surface.substring(w.startChar,w.endChar)!==w.surface)sc++;
      if(w.wordStartTime==null||w.wordEndTime==null)ts++;
    })});
    const pass = k+kf+r+m+nt+t+sc+ts === 0;
    console.log('L$p: '+(pass?'PASS':'ISSUES')+' words='+wc+' kanaEmpty='+k+' kanjiFallback='+kf+' romajiEmpty='+r+' meaningEmpty='+m+' noteEmpty='+nt+' typeEmpty='+t+' scMismatch='+sc+' tsMissing='+ts);
  "
done
# 预期: 全部 PASS，所有异常 = 0
```

## D. 路由 HTTP 验证

```bash
# 使用 curl 或 node 测试 production
BASE="https://next-app-kohl-one.vercel.app"
for route in \
  /lessons/1/recitation/karaoke \
  /lessons/25/recitation/karaoke \
  /lessons/26/recitation/karaoke \
  /lessons/50/recitation/karaoke \
  /lessons/25/recitation \
  /lessons/50/recitation; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$route")
  echo "$status $route"
done
# 预期: 全部 200（locked 页面也算 200，业务正常）
```

## E. TTS 资源 HTTP 验证

```bash
BASE="https://next-app-kohl-one.vercel.app"
for n in $(seq -w 1 50); do
  for res in manifest.json combined.mp3 words/_silence.mp3; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/generated/tts-karaoke/lesson-$n/$res")
    [ "$status" != "200" ] && echo "FAIL L$n $res: $status"
  done
done
# 预期: 全部 200
```

## F. CD 原音 HTTP 验证

```bash
BASE="https://yaojunxiong.github.io/TypingJapaneseWords"
URLS_FILE="/tmp/karaoke_cd_urls.txt"

# 生成 CD URL 清单
node -e "
  const map = { /* 从 karaoke-subtitle-player.tsx CD_AUDIO_URLS 提取 */ };
  // L1-L25: source-230001, L26-L50: source-240000
  for(let n=1;n<=25;n++){const p=String(n).padStart(2,'0');/* 手动映射 */};
  // 验证抽样
  ['/EveryonesJapanese/original-audio/source-240000/tracks/cd-001.mp3',
   '/EveryonesJapanese/original-audio/source-240000/tracks/cd-073.mp3',
   '/EveryonesJapanese/original-audio/source-230001/tracks/cd-001.mp3',
   '/EveryonesJapanese/original-audio/source-230001/tracks/cd-085.mp3'
  ].forEach(u=>console.log('$BASE'+u));
" > "$URLS_FILE"

while read url; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  [ "$status" != "200" ] && [ "$status" != "206" ] && echo "FAIL $url: $status"
done < "$URLS_FILE"
# 预期: 全部 200/206
```

## G. 代码变更验证

```bash
git diff --name-only
# 预期文件:
#   next-app/scripts/generate-karaoke-tts.py
#   next-app/src/app/lessons/[lessonNo]/recitation/karaoke/page.tsx
#   next-app/src/components/karaoke-subtitle-player.tsx
#   next-app/src/components/recitation-page-client.tsx
#   next-app/src/data/minna/subtitle-learning/lesson-{26..50}-subtitle-learning.json (25 files)
#   next-app/public/generated/tts-karaoke/lesson-{26..50}/ (25 dirs)
#   next-app/docs/knowledge-base/卡拉OK字幕模式.md
#   next-app/docs/knowledge-base/卡拉OK回归检查清单.md
```

## H. 入口显示验证

验证 recitation 页面（`/lessons/{n}/recitation`）显示卡拉OK入口按钮：

| Lesson n | 预期 |
|----------|------|
| 1 ～ 50 | 显示 \"🎤 卡拉OK字幕\" 按钮 |
| > 50 | 不显示（当前无 > 50 的课） |

## I. 功能 Smoke 步骤（人工）

1. 打开 `/lessons/26/recitation/karaoke`
2. 页面加载成功，无白屏/JS 报错
3. 默认 ttsPractice 模式
4. 点击播放 → 逐词高亮同步
5. 切换 original 模式 → 行级高亮，CD 原音播放
6. 点击一个汉字词 → 词卡显示 kana/romaji/释义
7. 拖动进度条 → 同步跳转
8. 重复步骤 1-7 验证 L1、L25、L30、L50

## J. 回归验证

- L1-L25 背诵页（`/lessons/{n}/recitation`）显示卡拉OK入口
- L1-L25 卡拉OK路由（`/lessons/{n}/recitation/karaoke`）200
- L1-L25 TTS manifest/combined 资源 200
- L1-L25 CD 原音 200
- 其他功能（背诵录音、practice、deep-dive）不受影响
