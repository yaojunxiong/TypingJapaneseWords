#!/usr/bin/env python3
"""
Generate karaoke TTS practice audio for a given lesson.

Reads <lesson>-subtitle-learning.json, generates TTS for each word
using edge-tts with appropriate speaker voice, concatenates with 50ms
gaps, writes manifest.json, and injects wordStartTime/wordEndTime
back into the subtitle JSON based on actual audio durations.

Usage:
    python generate-karaoke-tts.py <lesson_no>
    python generate-karaoke-tts.py 2
"""

import asyncio
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import edge_tts

GAP_SECONDS = 0.050

VOICE_FEMALE = "ja-JP-NanamiNeural"
VOICE_MALE = "ja-JP-KeitaNeural"

SPEAKER_VOICES_LESSON_01 = {
    "佐藤": {"voice": VOICE_FEMALE, "rate": "+0%"},
    "山田": {"voice": VOICE_MALE, "rate": "+0%"},
    "ミラー": {"voice": VOICE_MALE, "rate": "-10%"},
}

SPEAKER_VOICES_LESSON_02 = {
    "山田一郎": {"voice": VOICE_MALE, "rate": "+0%"},
    "サントス": {"voice": VOICE_MALE, "rate": "-10%"},
}

SPEAKER_VOICES_LESSON_03 = {
    "店員A": {"voice": VOICE_FEMALE, "rate": "+0%"},
    "マリア": {"voice": VOICE_FEMALE, "rate": "+0%"},
    "店員B": {"voice": VOICE_FEMALE, "rate": "+0%"},
}

SPEAKER_VOICES_LESSON_04 = {
    "ミラー": {"voice": VOICE_MALE, "rate": "-10%"},
    "佐藤": {"voice": VOICE_FEMALE, "rate": "+0%"},
    "店の人": {"voice": VOICE_FEMALE, "rate": "+0%"},
}

SPEAKER_VOICES_LESSON_05 = {
    "サントス": {"voice": VOICE_MALE, "rate": "-10%"},
    "女の人": {"voice": VOICE_FEMALE, "rate": "+0%"},
    "駅員": {"voice": VOICE_MALE, "rate": "+0%"},
    "男の人": {"voice": VOICE_MALE, "rate": "+0%"},
}

SPEAKER_VOICES_LESSON_06 = {
    "佐藤": {"voice": VOICE_FEMALE, "rate": "+0%"},
    "ミラー": {"voice": VOICE_MALE, "rate": "-10%"},
}

SPEAKER_VOICES_LESSON_07 = {
    "山田一郎": {"voice": VOICE_MALE, "rate": "+0%"},
    "ジョゼ・サントス": {"voice": VOICE_MALE, "rate": "-10%"},
    "山田友子": {"voice": VOICE_FEMALE, "rate": "+0%"},
    "マリア・サントス": {"voice": VOICE_FEMALE, "rate": "+0%"},
}

SPEAKER_VOICES_LESSON_08 = {
    "山田一郎": {"voice": VOICE_MALE, "rate": "+0%"},
    "マリア・サントス": {"voice": VOICE_FEMALE, "rate": "+0%"},
    "ジョゼ・サントス": {"voice": VOICE_MALE, "rate": "-10%"},
    "山田友子": {"voice": VOICE_FEMALE, "rate": "+0%"},
}

SPEAKER_VOICES_LESSON_09 = {
    "木村": {"voice": VOICE_FEMALE, "rate": "+0%"},
    "ミラー": {"voice": VOICE_MALE, "rate": "-10%"},
}

SPEAKER_VOICES_LESSON_10 = {
    "ミラー": {"voice": VOICE_MALE, "rate": "-10%"},
    "女の人": {"voice": VOICE_FEMALE, "rate": "+0%"},
    "店員": {"voice": VOICE_FEMALE, "rate": "+0%"},
}

SPEAKER_VOICES_LESSON_11 = {
    "管理人": {"voice": VOICE_MALE, "rate": "+0%"},
    "ワン": {"voice": VOICE_MALE, "rate": "-10%"},
    "郵便局員": {"voice": VOICE_MALE, "rate": "+0%"},
}

SPEAKER_VOICES_LESSON_12 = {
    "ミラー": {"voice": VOICE_MALE, "rate": "-10%"},
    "管理人": {"voice": VOICE_MALE, "rate": "+0%"},
}

SPEAKER_VOICES_LESSON_13 = {
    "山田": {"voice": VOICE_MALE, "rate": "+0%"},
    "ミラー": {"voice": VOICE_MALE, "rate": "-10%"},
    "店の人": {"voice": VOICE_FEMALE, "rate": "+0%"},
}

SPEAKER_VOICES_LESSON_14 = {
    "カリナ": {"voice": VOICE_FEMALE, "rate": "+0%"},
    "運転手": {"voice": VOICE_MALE, "rate": "+0%"},
}

SPEAKER_VOICES_LESSON_15 = {
    "木村": {"voice": VOICE_FEMALE, "rate": "+0%"},
    "ミラー": {"voice": VOICE_MALE, "rate": "-10%"},
}

SPEAKER_VOICES = {
    1: SPEAKER_VOICES_LESSON_01,
    2: SPEAKER_VOICES_LESSON_02,
    3: SPEAKER_VOICES_LESSON_03,
    4: SPEAKER_VOICES_LESSON_04,
    5: SPEAKER_VOICES_LESSON_05,
    6: SPEAKER_VOICES_LESSON_06,
    7: SPEAKER_VOICES_LESSON_07,
    8: SPEAKER_VOICES_LESSON_08,
    9: SPEAKER_VOICES_LESSON_09,
    10: SPEAKER_VOICES_LESSON_10,
    11: SPEAKER_VOICES_LESSON_11,
    12: SPEAKER_VOICES_LESSON_12,
    13: SPEAKER_VOICES_LESSON_13,
    14: SPEAKER_VOICES_LESSON_14,
    15: SPEAKER_VOICES_LESSON_15,
}


def get_voice_for_speaker(lesson_no: int, speaker_jp: str) -> dict:
    voices = SPEAKER_VOICES.get(lesson_no, {})
    return voices.get(speaker_jp, {"voice": VOICE_FEMALE, "rate": "+0%"})


def get_audio_duration(filepath: str) -> float:
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", filepath],
            capture_output=True, text=True, timeout=10,
        )
        return float(result.stdout.strip())
    except (subprocess.TimeoutExpired, ValueError, FileNotFoundError, OSError):
        size = os.path.getsize(filepath)
        return round(size / 16000, 3)


def create_silence_mp3(duration_sec: float, output_path: str):
    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "lavfi", "-i",
            f"anullsrc=r=44100:cl=mono",
            "-t", f"{duration_sec:.3f}",
            "-c:a", "libmp3lame", "-b:a", "128k",
            output_path,
        ],
        capture_output=True, check=True,
    )


def concat_with_ffmpeg(file_list: list[str], output_path: str):
    """Concatenate audio files using filter_complex concat."""
    n = len(file_list)
    filter_inputs = "".join(f"[{i}:a]" for i in range(n))
    filter_str = f"{filter_inputs}concat=n={n}:v=0:a=1[aout]"

    cmd = ["ffmpeg", "-y"]
    for fp in file_list:
        cmd.extend(["-i", fp])
    cmd.extend([
        "-filter_complex", filter_str,
        "-map", "[aout]",
        "-c:a", "libmp3lame", "-b:a", "128k",
        "-ar", "44100", "-ac", "1",
        output_path,
    ])
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ffmpeg error (stderr): {result.stderr[:500]}")
        result.check_returncode()


async def generate_word_audio(text: str, output_path: str, voice_cfg: dict) -> float:
    communicate = edge_tts.Communicate(
        text,
        voice=voice_cfg["voice"],
        rate=voice_cfg["rate"],
    )
    await communicate.save(output_path)
    duration = get_audio_duration(output_path)
    return round(max(duration, 0.050), 3)


async def main():
    if len(sys.argv) < 2:
        print("Usage: python generate-karaoke-tts.py <lesson_no>")
        sys.exit(1)

    lesson_no = int(sys.argv[1])
    padded = str(lesson_no).zfill(2)

    SUBTITLE_PATH = f"src/data/minna/subtitle-learning/lesson-{padded}-subtitle-learning.json"
    OUTPUT_BASE = Path(f"public/generated/tts-karaoke/lesson-{padded}")
    WORDS_DIR = OUTPUT_BASE / "words"

    with open(SUBTITLE_PATH, "r", encoding="utf-8") as f:
        subtitle_data = json.load(f)

    WORDS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_BASE.mkdir(parents=True, exist_ok=True)

    # Generate silence gap file
    silence_path = str(WORDS_DIR / "_silence.mp3")
    create_silence_mp3(GAP_SECONDS, silence_path)

    manifest_segments = []
    all_audio_files = []
    word_timestamps = {}
    cumulative = 0.0

    total_words = sum(len(line["words"]) for line in subtitle_data)
    word_index = 0

    for line_idx, line in enumerate(subtitle_data):
        speaker = line["speaker"]
        voice_cfg = get_voice_for_speaker(lesson_no, speaker)

        for word_idx, word in enumerate(line["words"]):
            word_id = word["id"]
            text = word["surface"]
            word_index += 1

            print(f"[{word_index}/{total_words}] {word_id}: {text} ({speaker})...")

            output_path = str(WORDS_DIR / f"{word_id}.mp3")

            if not text.strip():
                duration = 0.050
                create_silence_mp3(duration, output_path)
            else:
                try:
                    duration = await generate_word_audio(text, output_path, voice_cfg)
                except Exception as e:
                    print(f"  WARN: TTS failed ({e}), using placeholder")
                    duration = round(max(len(text) * 0.080, 0.100), 3)
                    create_silence_mp3(duration, output_path)

            word_start = round(cumulative, 3)
            word_end = round(cumulative + duration, 3)
            word_timestamps[word_id] = {
                "wordStartTime": word_start,
                "wordEndTime": word_end,
            }

            manifest_segments.append({
                "wordId": word_id,
                "surface": text,
                "file": f"{word_id}.mp3",
                "duration": duration,
                "speaker": speaker,
                "voice": f"{voice_cfg['voice']} / rate {voice_cfg['rate']}",
                "startTime": word_start,
                "endTime": word_end,
            })

            all_audio_files.append(output_path)
            cumulative += duration

            # Gap after each word except the very last
            is_last = (line_idx == len(subtitle_data) - 1 and
                       word_idx == len(line["words"]) - 1)
            if not is_last:
                all_audio_files.append(silence_path)
                cumulative += GAP_SECONDS

            print(f"    -> {duration:.3f}s, cumulative: {cumulative:.3f}s")

    # Concatenate
    combined_path = str(OUTPUT_BASE / "combined.mp3")
    print(f"\nConcatenating {len(all_audio_files)} segments...")
    concat_with_ffmpeg(all_audio_files, combined_path)
    actual_duration = get_audio_duration(combined_path)
    print(f"Combined: {actual_duration:.3f}s (expected {cumulative:.3f}s)")

    # Write manifest
    manifest = {
        "lessonId": lesson_no,
        "audioUrl": f"/generated/tts-karaoke/lesson-{padded}/combined.mp3",
        "gapBetweenWords": GAP_SECONDS,
        "totalDuration": round(cumulative, 3),
        "segments": manifest_segments,
    }
    manifest_path = OUTPUT_BASE / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"Manifest: {manifest_path}")

    # Inject timestamps into subtitle JSON
    for line in subtitle_data:
        for word in line["words"]:
            ts = word_timestamps.get(word["id"])
            if ts:
                word["wordStartTime"] = ts["wordStartTime"]
                word["wordEndTime"] = ts["wordEndTime"]

    with open(SUBTITLE_PATH, "w", encoding="utf-8") as f:
        json.dump(subtitle_data, f, ensure_ascii=False, indent=2)
    print(f"Timestamps written to {SUBTITLE_PATH}")

    # Print timeline
    print(f"\n{'=' * 60}")
    print(f"TIMELINE ({cumulative:.3f}s total)")
    print(f"{'=' * 60}")
    for line in subtitle_data:
        print(f"\n{line['lineId']} | {line['speakerCn']}: {line['sentenceJp'][:50]}")
        for w in line["words"]:
            print(f"  {w['id']:22s} | {w['surface']:14s} | "
                  f"{str(w.get('wordStartTime','?')):>7s} - {str(w.get('wordEndTime','?')):>7s}")

    print(f"\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
