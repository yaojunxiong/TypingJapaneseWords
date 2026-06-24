#!/usr/bin/env python3
"""
Build conversation-image-lines standard data layer from multiple sources.

Design:
- The standard layer represents the TEXT (jaText) as it appears in the
  conversation image, and the SPEAKER NAME as known from character analysis.
- Primary jaText source: speaker draft OCR (directly from image)
- Primary speaker source: recitation JSON (manually corrected)
- Secondary speaker source: lesson JSON conversation items
- Tertiary speaker: speaker draft (raw pipeline inference)

Output: src/data/minna/conversation-image-lines/lesson-XX.json (status: draft)
"""

import json
import os
import re

BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TMP_DIR = os.path.join(BASE_DIR, '..', 'tmp')
LESSONS_DIR = os.path.join(BASE_DIR, 'src', 'data', 'minna', 'lessons')
RECITATION_DIR = os.path.join(BASE_DIR, 'src', 'data', 'minna', 'recitation')
TITLES_PATH = os.path.join(BASE_DIR, 'src', 'data', 'minna', 'conversation-titles.json')
OUT_DIR = os.path.join(BASE_DIR, 'src', 'data', 'minna', 'conversation-image-lines')

os.makedirs(OUT_DIR, exist_ok=True)

NOISE_PATTERNS = [
    re.compile(r'^【?音楽】?$'),
    re.compile(r'^[0-9０-９]+$'),
    re.compile(r'^[んン]$'),
    re.compile(r'^[\(\（]?音楽[\)\）]?$'),
]

with open(TITLES_PATH, encoding='utf-8') as f:
    TITLES = json.load(f)


def is_noise(ja_text):
    text = ja_text.strip()
    if not text:
        return True
    for pat in NOISE_PATTERNS:
        if pat.match(text):
            return True
    return False


def load_lesson_json(lesson_no):
    path = os.path.join(LESSONS_DIR, f'lesson-{lesson_no:02d}.json')
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def load_recitation_json(lesson_no):
    path = os.path.join(RECITATION_DIR, f'lesson-{lesson_no:02d}.json')
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def load_speaker_draft(lesson_no):
    path = os.path.join(TMP_DIR, f'lesson-{lesson_no:02d}-speaker-draft.json')
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def get_conv_items(lesson_data):
    if not lesson_data:
        return {}
    for s in lesson_data.get('sections', []):
        if s.get('type') == 'conversation':
            return {item['id']: item for item in s.get('items', [])}
    return {}


def build_from_speaker_draft(lesson_no, draft, lesson_data, recitation_data):
    conv_items = get_conv_items(lesson_data)

    # Build recitation lookup by lineId and by ja text (fallback)
    recitation_by_id = {}
    recitation_by_ja = {}
    if recitation_data:
        for line in recitation_data.get('lines', []):
            recitation_by_id[line['lineId']] = line
            ja_clean = line.get('ja', '').strip()
            if ja_clean:
                recitation_by_ja[ja_clean] = line

    lines = []
    for dl in draft.get('lines', []):
        line_id = dl.get('id', '')
        raw_speaker = dl.get('speaker', 'UNKNOWN')
        draft_ja = dl.get('jp', '').strip()

        # Skip background
        if raw_speaker == 'background':
            continue

        # Skip noise
        if is_noise(draft_ja):
            continue

        # ---- jaText ----
        # Priority: recitation (corrected) > lesson JSON > draft OCR
        # Draft OCR is primary source from the image; recitation has manual corrections.
        rec_line = recitation_by_id.get(line_id)
        lesson_item = conv_items.get(line_id)

        ja_text = draft_ja
        needs_correction = (
            raw_speaker == 'garbled_data' or
            not draft_ja or
            _is_garbled(draft_ja)
        )
        if needs_correction:
            if rec_line and rec_line.get('ja'):
                ja_text = rec_line['ja'].strip()
            elif lesson_item and lesson_item.get('jp'):
                ja_text = lesson_item['jp'].strip()

        # ---- speakerName: best available source ----
        # Priority: recitation > lesson JSON > draft (non-UNKNOWN)
        speaker_name = ''

        if rec_line and rec_line.get('speaker'):
            speaker_name = rec_line['speaker']

        if not speaker_name and lesson_item and lesson_item.get('speaker'):
            speaker_name = lesson_item['speaker']

        # 3rd: draft (only if non-UNKNOWN, non-garbled)
        if not speaker_name and raw_speaker not in ('UNKNOWN', 'garbled_data'):
            speaker_name = raw_speaker

        # ---- confidence + review flag ----
        confidence = 'medium'
        if speaker_name and raw_speaker not in ('UNKNOWN', 'garbled_data'):
            confidence = 'high'
        elif raw_speaker == 'garbled_data':
            confidence = 'low'

        notes_parts = []
        if raw_speaker == 'garbled_data':
            notes_parts.append('OCR garbled')
        if not speaker_name:
            notes_parts.append('speaker uncertain')
        if dl.get('garbledData'):
            notes_parts.append('flagged as garbled data')
        # Note if draft speaker differs from corrected speaker
        if rec_line and raw_speaker not in ('UNKNOWN', 'garbled_data', 'background') and rec_line.get('speaker') and raw_speaker != rec_line['speaker']:
            notes_parts.append(f'draft speaker "{raw_speaker}" → corrected "{rec_line["speaker"]}"')
        notes = '; '.join(notes_parts)

        requires_manual_review = (
            not speaker_name or
            raw_speaker == 'garbled_data' or
            confidence == 'low'
        )

        lines.append({
            'lineNo': 0,
            'speakerName': speaker_name,
            'jaText': ja_text,
            'confidence': confidence,
            'requiresManualReview': requires_manual_review,
            'notes': notes
        })

    return lines


def _is_garbled(text):
    """Heuristic check for common OCR artifacts in jaText."""
    artifacts = [
        'ガッサービス', 'ガッス', '日が消えて', '見に来てくれ',
        'なのか', 'かかりに連絡',
    ]
    for a in artifacts:
        if a in text:
            return True
    return False


def build_from_lesson_json(lesson_no, lesson_data, recitation_data):
    conv_items = get_conv_items(lesson_data)
    recitation_lines_map = {}
    if recitation_data:
        for line in recitation_data.get('lines', []):
            recitation_lines_map[line['lineId']] = line

    lines = []
    for item_id in sorted(conv_items.keys(), key=lambda x: int(re.search(r'(\d+)$', x).group(1))):
        item = conv_items[item_id]
        ja_text = item.get('jp', '')
        if not ja_text:
            continue

        speaker_name = ''
        # Recitation first
        rec_line = recitation_lines_map.get(item_id)
        if rec_line and rec_line.get('speaker'):
            speaker_name = rec_line['speaker']
        # Lesson JSON fallback
        if not speaker_name:
            speaker_name = item.get('speaker', '')

        requires_review = not speaker_name
        notes = ''
        if not speaker_name:
            notes = 'speaker needs manual fill'

        lines.append({
            'lineNo': 0,
            'speakerName': speaker_name,
            'jaText': ja_text,
            'confidence': 'medium' if speaker_name else 'low',
            'requiresManualReview': requires_review,
            'notes': notes
        })

    return lines


def build_lesson(lesson_no):
    lesson_data = load_lesson_json(lesson_no)
    if not lesson_data:
        print(f"  SKIP: lesson-{lesson_no:02d}.json not found")
        return

    recitation_data = load_recitation_json(lesson_no)
    draft = load_speaker_draft(lesson_no)

    title_entry = TITLES.get(str(lesson_no), {})
    conversation_title = title_entry.get('conversationTitle', '')

    if draft:
        lines = build_from_speaker_draft(lesson_no, draft, lesson_data, recitation_data)
    else:
        lines = build_from_lesson_json(lesson_no, lesson_data, recitation_data)

    for i, line in enumerate(lines):
        line['lineNo'] = i + 1

    manual_review_count = sum(1 for l in lines if l['requiresManualReview'])

    output = {
        'lessonNo': lesson_no,
        'conversationTitle': conversation_title,
        'source': 'conversation_image',
        'status': 'draft',
        'lines': lines,
    }

    out_path = os.path.join(OUT_DIR, f'lesson-{lesson_no:02d}.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"  -> {out_path} ({len(lines)} lines, {manual_review_count} need review)")


def main():
    target_lessons = [1, 2, 3, 15, 23, 26, 27, 28, 46, 50]
    print("Building conversation-image-lines for target lessons...")
    print(f"Output: {OUT_DIR}")
    print()

    for lesson_no in target_lessons:
        print(f"Lesson {lesson_no:02d}:")
        build_lesson(lesson_no)

    print()
    print("=== Summary ===")
    print(f"{'Lesson':>6} {'Title':<35} {'Lines':>6} {'Review':>6}  Speakers")
    print("-" * 90)
    for lesson_no in target_lessons:
        path = os.path.join(OUT_DIR, f'lesson-{lesson_no:02d}.json')
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
        lines = data.get('lines', [])
        speakers = ', '.join(sorted(set(l['speakerName'] for l in lines if l['speakerName'])))
        review = sum(1 for l in lines if l['requiresManualReview'])
        print(f"{lesson_no:>6} {data['conversationTitle']:<35} {len(lines):>6} {review:>6}  {speakers}")


if __name__ == '__main__':
    main()
