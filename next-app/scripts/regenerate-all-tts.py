#!/usr/bin/env python3
"""
Regenerate ALL recitation TTS (Lesson 1-50) using voice-map.json binding.

Key changes vs old generate-recitation-tts.py:
- Uses voice-map.json abstract voiceId → real engine voice binding
- TTS text = recitation line `ja` field (not ttsText/kana)
- No reuse of old mp3 files
- Updates recitation json ttsAudioUrl
- One line = one mp3, manifest text = recitation japanese
"""

import asyncio
import json
import os
import shutil
import sys
import time
from pathlib import Path

import edge_tts

PROJECT_ROOT = Path(__file__).resolve().parent.parent
VOICE_MAP_PATH = PROJECT_ROOT / "src/data/minna/voice-map.json"
RECITATION_DIR = PROJECT_ROOT / "src/data/minna/recitation"
OUTPUT_BASE = PROJECT_ROOT / "public/generated/tts"

MALE_VOICE = "ja-JP-KeitaNeural"
FEMALE_VOICE = "ja-JP-NanamiNeural"

ABSTRACT_TO_REAL = {
    # male main
    "male_main_01": {"voice": MALE_VOICE, "rate": "-10%", "pitch": "+0Hz"},
    "male_main_02": {"voice": MALE_VOICE, "rate": "-20%", "pitch": "+0Hz"},
    # male recurring
    "male_recurring_01": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_recurring_02": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_recurring_03": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_recurring_04": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_recurring_05": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_recurring_06": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_recurring_07": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_recurring_08": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_recurring_09": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_recurring_10": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    # male staff
    "male_staff_01": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_staff_02": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_staff_03": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_staff_04": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_staff_05": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_staff_06": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_staff_07": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_staff_08": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_staff_09": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_staff_10": {"voice": MALE_VOICE, "rate": "+10%", "pitch": "+0Hz"},
    # male temp
    "male_temp_01": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "male_temp_02": {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    # male young (future use)
    "male_young_01": {"voice": MALE_VOICE, "rate": "+5%", "pitch": "+10Hz"},
    # female main
    "female_main_01": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "female_main_02": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    # female recurring
    "female_recurring_01": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "female_recurring_02": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "female_recurring_03": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "female_recurring_04": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "female_recurring_05": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "female_recurring_06": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "female_recurring_07": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    # female staff
    "female_staff_01": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "female_staff_02": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "female_staff_03": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "female_staff_04": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "female_staff_05": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "female_staff_06": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    # female young (future use)
    "female_young_01": {"voice": FEMALE_VOICE, "rate": "+5%", "pitch": "+10Hz"},
    # female senior
    "female_senior_01": {"voice": FEMALE_VOICE, "rate": "-10%", "pitch": "-10Hz"},
    # female temp
    "female_temp_01": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "female_temp_02": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    # neutral staff
    "neutral_staff_01": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "neutral_staff_02": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "neutral_staff_03": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "neutral_staff_04": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "neutral_staff_05": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "neutral_staff_06": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "neutral_staff_07": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    # neutral temp
    "neutral_temp_01": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    "neutral_temp_02": {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"},
    # group
    "group_neutral_01": {"voice": FEMALE_VOICE, "rate": "-5%", "pitch": "+0Hz"},
}


def load_voice_map():
    with open(VOICE_MAP_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def speaker_to_voice_id(voice_map, speaker_name):
    raw = voice_map.get("rawSpeakers", {})
    entry = raw.get(speaker_name)
    if entry:
        return entry.get("voiceId")
    aliases = voice_map.get("speakerAliases", {})
    if speaker_name in aliases:
        normalized = aliases[speaker_name]
        for raw_name, raw_entry in raw.items():
            if raw_entry.get("normalizedSpeaker") == normalized:
                return raw_entry.get("voiceId")
    norm = voice_map.get("normalizedSpeakers", {})
    entry = norm.get(speaker_name)
    if entry:
        return entry.get("voiceId")
    return None


def get_normalized_speaker(voice_map, speaker_name):
    raw = voice_map.get("rawSpeakers", {})
    entry = raw.get(speaker_name)
    if entry:
        return entry.get("normalizedSpeaker", speaker_name)
    aliases = voice_map.get("speakerAliases", {})
    return aliases.get(speaker_name, speaker_name)


def get_voice_config(voice_id):
    if voice_id in ABSTRACT_TO_REAL:
        return ABSTRACT_TO_REAL[voice_id]
    gender_prefix = voice_id.split("_")[0] if "_" in voice_id else "neutral"
    if gender_prefix in ("male",):
        return {"voice": MALE_VOICE, "rate": "+0%", "pitch": "+0Hz"}
    elif gender_prefix in ("female",):
        return {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"}
    else:
        return {"voice": FEMALE_VOICE, "rate": "+0%", "pitch": "+0Hz"}


async def generate_line_audio(ja_text, output_path, voice_config):
    communicate = edge_tts.Communicate(
        ja_text,
        voice=voice_config["voice"],
        rate=voice_config["rate"],
        volume="+0%",
        pitch=voice_config["pitch"],
    )
    await communicate.save(str(output_path))
    size_bytes = os.path.getsize(output_path)
    duration = size_bytes / 16000
    return round(duration, 3)


SKIP_TEXTS = {"【音楽】", "【音乐】", "音楽", "…"}


def get_line_voice_id(voice_map, line):
    speaker = line.get("speaker", "")
    if not speaker or speaker in ("UNKNOWN", "background", "garbled_data"):
        return None
    voice_id = speaker_to_voice_id(voice_map, speaker)
    if voice_id:
        return voice_id
    voice_type = line.get("ttsVoiceType", "male")
    if voice_type == "female":
        return "female_recurring_01"
    return "male_recurring_01"


async def process_lesson(lesson_no, voice_map, force=False):
    lesson_id = f"lesson-{lesson_no:02d}"
    recitation_path = RECITATION_DIR / f"{lesson_id}.json"
    if not recitation_path.exists():
        return {"lessonNo": lesson_no, "status": "skipped", "reason": "no recitation file"}

    with open(recitation_path, "r", encoding="utf-8") as f:
        lesson_data = json.load(f)

    output_dir = OUTPUT_BASE / lesson_id
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

        if not ja_text:
            skipped += 1
            continue
        if speaker in ("UNKNOWN", "background", "garbled_data") or not speaker:
            skipped += 1
            continue
        if ja_text in SKIP_TEXTS:
            skipped += 1
            continue

        voice_id = get_line_voice_id(voice_map, line)
        if not voice_id:
            skipped += 1
            continue

        voice_config = get_voice_config(voice_id)
        normalized_speaker = get_normalized_speaker(voice_map, speaker)

        order = line.get("order", 1)
        filename = f"l{lesson_no}-{order:02d}.mp3"
        output_path = output_dir / filename

        try:
            duration = await generate_line_audio(ja_text, output_path, voice_config)

            manifest.append({
                "lineId": line_id,
                "order": order,
                "speaker": speaker,
                "normalizedSpeaker": normalized_speaker,
                "voiceId": voice_id,
                "ja": ja_text,
                "zh": line.get("zh", ""),
                "file": filename,
                "voice": f"{voice_id} / {voice_config['voice']} / rate {voice_config['rate']}",
                "duration": duration,
                "audioType": "tts-practice",
            })

            line["ttsAudioUrl"] = f"/generated/tts/{lesson_id}/{filename}"

            generated += 1
            if generated % 10 == 0:
                print(f"    ... {generated} files generated for lesson {lesson_no}")

        except Exception as e:
            errors.append({"lineId": line_id, "error": str(e)})
            skipped += 1

    with open(recitation_path, "w", encoding="utf-8") as f:
        json.dump(lesson_data, f, ensure_ascii=False, indent=2)

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
    from_lesson = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    to_lesson = int(sys.argv[2]) if len(sys.argv) > 2 else 50

    print(f"Regenerating ALL recitation TTS for lessons {from_lesson} to {to_lesson}")
    print(f"TTS text source: recitation line `ja` field (NOT ttsText/kana)")
    print(f"Voice binding: voice-map.json abstract voiceId -> edge-tts real voice")
    print(f"{'='*70}")

    voice_map = load_voice_map()
    print(f"Voice map loaded: {voice_map['summary']['rawSpeakerCount']} raw speakers, {voice_map['summary']['normalizedSpeakerCount']} normalized")

    start_time = time.time()
    total_generated = 0
    total_skipped = 0
    total_errors = 0
    results = []

    for no in range(from_lesson, to_lesson + 1):
        lesson_id = f"lesson-{no:02d}"
        print(f"\nLesson {no} (output: {OUTPUT_BASE / lesson_id}):")

        old_dir = OUTPUT_BASE / lesson_id
        if old_dir.exists():
            for f in old_dir.iterdir():
                if f.suffix == ".mp3":
                    f.unlink()
            print(f"  Cleared {old_dir} (old mp3 deleted)")

        result = await process_lesson(no, voice_map)

        if result["status"] == "done":
            g = result["generated"]
            s = result["skipped"]
            e = len(result["errors"])
            total_generated += g
            total_skipped += s
            total_errors += e
            results.append(result)
            print(f"  ✅ {g} generated, {s} skipped, {e} errors")
            if result["errors"]:
                for err in result["errors"]:
                    print(f"  ❌ {err['lineId']}: {err['error']}")
        else:
            print(f"  ⏭️  {result.get('reason', 'unknown')}")

    elapsed = time.time() - start_time
    print(f"\n{'='*70}")
    print(f"Done! {total_generated} files generated in {elapsed:.1f}s")
    print(f"Skipped: {total_skipped}, Errors: {total_errors}")
    print(f"Output: {OUTPUT_BASE}/lesson-XX/")

    print(f"\n{'='*70}")
    print("LESSON SUMMARY:")
    print(f"{'Lesson':>7} | {'Generated':>10} | {'Skipped':>8} | {'Errors':>7}")
    print("-" * 45)
    for r in sorted(results, key=lambda x: x["lessonNo"]):
        print(f"  L{r['lessonNo']:02d}  | {r['generated']:>10} | {r['skipped']:>8} | {len(r['errors']):>7}")


if __name__ == "__main__":
    asyncio.run(main())
