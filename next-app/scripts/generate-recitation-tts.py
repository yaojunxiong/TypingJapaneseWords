#!/usr/bin/env python3
"""
Generate recitation TTS MP3 files for lessons 3-50 using Edge TTS.

Reads recitation JSON files from src/data/minna/recitation/
Outputs MP3 files to public/generated/tts/lesson-XX/
"""

import asyncio
import json
import os
import sys
import time
from pathlib import Path

import edge_tts

RECITATION_DIR = "src/data/minna/recitation"
OUTPUT_BASE = "public/generated/tts"

# Voice configuration matching lesson-01/02 pattern
VOICE_FEMALE = "ja-JP-NanamiNeural"
VOICE_MALE = "ja-JP-KeitaNeural"

# Speakers that get slower rate (foreigner characters)
SLOW_SPEAKERS = {"miller_male", "santos_male", "miller_santos_male"}

def get_voice_config(speaker_label: str, voice_type: str) -> dict:
    """Get TTS voice configuration for a speaker."""
    if voice_type == "female":
        return {"voice": VOICE_FEMALE, "rate": "+0%", "volume": "+0%", "pitch": "+0Hz"}
    else:
        # male
        if speaker_label in SLOW_SPEAKERS:
            return {"voice": VOICE_MALE, "rate": "-15%", "volume": "+0%", "pitch": "+0Hz"}
        return {"voice": VOICE_MALE, "rate": "+0%", "volume": "+0%", "pitch": "+0Hz"}


async def generate_line_audio(ja_text: str, output_path: str, voice_config: dict) -> float:
    """Generate TTS audio for a single line, return duration in seconds."""
    communicate = edge_tts.Communicate(
        ja_text,
        voice=voice_config["voice"],
        rate=voice_config["rate"],
        volume=voice_config["volume"],
        pitch=voice_config["pitch"],
    )
    await communicate.save(output_path)
    # Estimate duration from file size (rough: ~16KB per second for MP3 @ 128kbps)
    size_bytes = os.path.getsize(output_path)
    duration = size_bytes / (16000)  # rough estimate
    return round(duration, 3)


async def process_lesson(lesson_no: int) -> dict:
    """Process one lesson: generate all TTS files and manifest."""
    lesson_id = f"lesson-{lesson_no:02d}"
    recitation_path = Path(RECITATION_DIR) / f"{lesson_id}.json"

    if not recitation_path.exists():
        return {"lessonNo": lesson_no, "status": "skipped", "reason": "no recitation file"}

    with open(recitation_path, "r", encoding="utf-8") as f:
        lesson_data = json.load(f)

    output_dir = Path(OUTPUT_BASE) / lesson_id
    output_dir.mkdir(parents=True, exist_ok=True)

    lines = lesson_data.get("lines", [])
    if not lines:
        return {"lessonNo": lesson_no, "status": "skipped", "reason": "no lines"}

    manifest = []
    generated = 0
    skipped = 0
    errors = []

    for line in lines:
        line_id = line["lineId"]
        ja_text = line.get("ja", "").strip()
        speaker = line.get("speaker", "")
        speaker_label = line.get("ttsSpeakerLabel", "")
        voice_type = line.get("ttsVoiceType", "male")

        # Skip lines without Japanese text or non-speech lines
        if not ja_text:
            skipped += 1
            continue
        if speaker in ("UNKNOWN", "background", "garbled_data") or not speaker:
            skipped += 1
            continue

        # Clean ja_text: remove kana field entries that are just kana
        # Some lines have kana-only text like "レッシュ" — still generate TTS for them
        # But skip pure punctuation/symbol lines
        if ja_text in ("【音楽】", "【音乐】", "音楽", "…"):
            skipped += 1
            continue

        voice_config = get_voice_config(speaker_label, voice_type)

        # File name based on line ID order
        order = line.get("order", 1)
        filename = f"l{lesson_no}-{order:02d}.mp3"
        output_path = output_dir / filename

        try:
            duration = await generate_line_audio(ja_text, str(output_path), voice_config)

            manifest.append({
                "lineId": line_id,
                "order": order,
                "speaker": speaker,
                "ja": ja_text,
                "zh": line.get("zh", ""),
                "file": filename,
                "voice": f"{speaker_label} / {voice_config['voice']} / rate {voice_config['rate']}",
                "duration": duration,
                "audioType": "tts-practice",
            })
            generated += 1

            if generated % 10 == 0:
                print(f"    ... {generated} files generated for lesson {lesson_no}")

        except Exception as e:
            errors.append({"lineId": line_id, "error": str(e)})
            skipped += 1

    # Write manifest
    manifest_path = output_dir / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    return {
        "lessonNo": lesson_no,
        "status": "done",
        "generated": generated,
        "skipped": skipped,
        "errors": errors,
        "manifest": str(manifest_path),
    }


async def main():
    from_lesson = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    to_lesson = int(sys.argv[2]) if len(sys.argv) > 2 else 50

    print(f"Generating recitation TTS for lessons {from_lesson} to {to_lesson}")
    print(f"{'='*60}")

    start_time = time.time()
    total_generated = 0
    total_skipped = 0
    total_errors = 0

    for no in range(from_lesson, to_lesson + 1):
        print(f"\nLesson {no}:")
        result = await process_lesson(no)

        if result["status"] == "done":
            g = result["generated"]
            s = result["skipped"]
            e = len(result["errors"])
            total_generated += g
            total_skipped += s
            total_errors += e
            print(f"  ✅ {g} generated, {s} skipped, {e} errors")
            if result["errors"]:
                for err in result["errors"]:
                    print(f"  ❌ {err['lineId']}: {err['error']}")
        else:
            print(f"  ⏭️  {result.get('reason', 'unknown')}")

    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"Done! {total_generated} files generated in {elapsed:.1f}s")
    print(f"Skipped: {total_skipped}, Errors: {total_errors}")
    print(f"Output: {OUTPUT_BASE}/lesson-XX/")


if __name__ == "__main__":
    asyncio.run(main())
