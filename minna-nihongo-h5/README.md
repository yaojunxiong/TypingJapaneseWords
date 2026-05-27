# Japanese Beginner Study Helper

HTML5/PWA template for personal Japanese study.

Features:
- Lesson list
- Japanese text-to-speech playback for each sentence
- Slow and normal playback
- Vocabulary cards
- Grammar notes
- Local progress saving

Edit `data/lessons.json` to add your own notes and example sentences.

Run locally:

```bash
cd minna-nihongo-h5
python3 -m http.server 8000
```

Open `http://localhost:8000/minna-nihongo-h5/` when serving from the repository root, or `http://localhost:8000/` when serving inside this folder.
