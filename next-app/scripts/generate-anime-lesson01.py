#!/usr/bin/env python3
"""
Generate anime-style conversation video for Lesson 1.
Reads scene images from public/images/lesson01/, overlays subtitles & audio.
Output: public/videos/lesson01_anime_v1.mp4
"""

import os
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# ── Config ──────────────────────────────────────────────────────────────
WIDTH, HEIGHT = 1920, 1080
FPS = 24
OUTPUT_PATH = Path(__file__).parent.parent / "public" / "videos" / "lesson01_anime_v1.mp4"
IMAGE_DIR = Path(__file__).parent.parent / "public" / "images" / "lesson01"
ORIGINAL_VIDEO_URL = (
    "https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/"
    "%E5%A4%A7%E5%AE%B6%E3%81%AE%E6%97%A5%E6%9C%AC%E8%AA%9E%E7%AC%AC2%E7%89%88-%E4%BC%9A%E8%A9%B1_P1_%E7%AC%AC1%E8%AA%B2.mp4"
)

# ── Scene mapping ──────────────────────────────────────────────────────
# Each dialogue: (start_sec, end_sec, scene_key, speaker, japanese, chinese, facing)
DIALOGUE = [
    (0.5,  2.0,  "sato_greeting",       "佐藤", "おはようございます。",        "早上好。",         "yamada"),
    (2.1,  3.8,  "yamada_greeting",      "山田", "おはようございます。",        "早上好。",         "sato"),
    (26.5, 28.0, "yamada_introduce",     "山田", "佐藤さん、",                  "佐藤小姐、",       "sato"),
    (28.0, 31.9, "yamada_introduce",     "山田", "こちらはマイク・ミラーさんです。", "这位是迈克·米勒先生。", "sato"),
    (31.9, 33.4, "miller_hajimemashite", "ミラー", "初めまして。",                "初次见面。",       "sato"),
    (33.4, 34.9, "miller_name",          "ミラー", "マイク・ミラーです。",        "我是迈克·米勒。",  "sato"),
    (34.9, 36.6, "miller_america",       "ミラー", "アメリカから来ました。",      "我来自美国。",     "sato"),
    (36.6, 38.3, "miller_yoroshiku",     "ミラー", "どうぞよろしく。",            "请多关照。",       "sato"),
    (38.3, 40.2, "sato_name",            "佐藤", "佐藤けい子です。",            "我是佐藤惠子。",   "miller"),
    (40.2, 41.5, "sato_yoroshiku",       "佐藤", "どうぞよろしく。",            "请多关照。",       "miller"),
]

# Map scene keys to image filenames
SCENE_IMAGES = {
    "title":            "scene_01_title.png",
    "sato_greeting":    "scene_02_sato_greeting.png",
    "yamada_greeting":  "scene_03_yamada_greeting.png",
    "yamada_introduce": "scene_04_yamada_introduce_miller.png",
    "miller_hajimemashite": "scene_05_miller_hajimemashite.png",
    "miller_name":      "scene_06_miller_name.png",
    "miller_america":   "scene_07_miller_america.png",
    "miller_yoroshiku": "scene_08_miller_yoroshiku.png",
    "sato_name":        "scene_09_sato_name.png",
    "sato_yoroshiku":   "scene_10_sato_yoroshiku.png",
}

TOTAL_SEC = 44.0


# ── Font ────────────────────────────────────────────────────────────────
def get_font(size):
    candidates = [
        "/System/Library/Fonts/Supplemental/Hiragino Sans GB.ttc",
        "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


# ── Placeholder image generator ────────────────────────────────────────
def draw_placeholder(scene_key, speaker_label, facing_label, jp_preview=""):
    """Create a labelled placeholder when the real scene image is missing."""
    img = Image.new("RGB", (WIDTH, HEIGHT), (40, 44, 55))
    draw = ImageDraw.Draw(img)

    # Grid pattern
    for x in range(0, WIDTH, 80):
        draw.line([(x, 0), (x, HEIGHT)], fill=(50, 55, 68), width=1)
    for y in range(0, HEIGHT, 80):
        draw.line([(0, y), (WIDTH, y)], fill=(50, 55, 68), width=1)

    # Central card
    draw.rounded_rectangle([400, 320, WIDTH - 400, 720], radius=24, fill=(30, 34, 44, 220))

    # Scene label
    label = scene_key.replace("_", " ").title()
    draw.text((WIDTH // 2, 380), f"[ {label} ]", fill=(255, 255, 255),
              font=get_font(44), anchor="mm")

    if speaker_label:
        draw.text((WIDTH // 2, 450), f"Speaker: {speaker_label}",
                  fill=(100, 200, 255), font=get_font(36), anchor="mm")
    if facing_label:
        draw.text((WIDTH // 2, 510), f"Facing: {facing_label}",
                  fill=(200, 200, 100), font=get_font(32), anchor="mm")
    if jp_preview:
        draw.text((WIDTH // 2, 580), f'"{jp_preview}"',
                  fill=(180, 180, 180), font=get_font(26), anchor="mm")

    draw.text((WIDTH // 2, 660), "图片待替换 → 替换后自动生效",
              fill=(120, 120, 130), font=get_font(24), anchor="mm")

    return img


def get_scene_image(scene_key, speaker="", facing="", jp_prev=""):
    """Load scene image or generate placeholder."""
    filename = SCENE_IMAGES.get(scene_key)
    if not filename:
        return draw_placeholder(scene_key, "", "", "")

    img_path = IMAGE_DIR / filename
    if img_path.exists():
        img = Image.open(img_path).convert("RGB")
        return img.resize((WIDTH, HEIGHT), Image.LANCZOS)
    return draw_placeholder(scene_key, speaker, facing, jp_prev)


# ── Frame generation ───────────────────────────────────────────────────
def make_frame(t, dialogue_idx, speaker, jp_text, zh_text, facing):
    """Generate one frame: scene image only, no subtitle overlay."""
    if dialogue_idx < 0:
        if t < 0.5:
            scene_key = "title"
        elif t < 26.5:
            scene_key = "sato_greeting"
        else:
            scene_key = "yamada_introduce"
    else:
        scene_key = DIALOGUE[dialogue_idx][2]

    return get_scene_image(scene_key, speaker, facing, jp_text)


# ── Main ────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  Lesson 1 Anime Conversation Video Generator")
    print("  Mode: image-driven (no subtitle overlay)")
    print("=" * 60)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    # Step 1: Extract audio
    print("\n[1/5] Extracting audio from original video...")
    audio_path = Path(tempfile.gettempdir()) / "lesson01_audio_fixed.wav"
    if not audio_path.exists():
        subprocess.run([
            "ffmpeg", "-y",
            "-i", ORIGINAL_VIDEO_URL,
            "-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2",
            str(audio_path)
        ], check=True, capture_output=True)
        print(f"  Audio saved: {audio_path}")
    else:
        print(f"  Audio cached: {audio_path}")

    # Step 2: Print scene image status
    print("\n[2/5] Checking scene images...")
    all_exist = True
    for key, filename in SCENE_IMAGES.items():
        fp = IMAGE_DIR / filename
        exists = fp.exists()
        if not exists:
            all_exist = False
        print(f"  {'✓' if exists else '✗'} {filename}")

    if not all_exist:
        print("  ℹ Some images missing — placeholders will be used")

    # Step 3: Generate frames
    print(f"\n[3/5] Generating frames...")
    total_frames = int(TOTAL_SEC * FPS)
    frame_dir = Path(tempfile.gettempdir()) / "lesson01_frames"
    frame_dir.mkdir(exist_ok=True)
    for f in frame_dir.glob("frame_*.png"):
        f.unlink()

    prev_idx = -2
    for frame_i in range(total_frames):
        t = frame_i / FPS

        # Find dialogue segment
        idx = -1
        for di, (start, end, *_) in enumerate(DIALOGUE):
            if start <= t < end:
                idx = di
                break

        if idx != prev_idx:
            if idx >= 0:
                start, end, scene, sp, jp, zh, fa = DIALOGUE[idx]
                print(f"  t={t:5.1f}s → seg {idx+1}: {sp}: {jp[:20]}")
            else:
                print(f"  t={t:5.1f}s → transition ({'title' if t < 0.5 else 'greeting scene'})")

        if idx >= 0:
            start, end, scene, sp, jp, zh, fa = DIALOGUE[idx]
            img = make_frame(t, idx, sp, jp, zh, fa)
        else:
            img = make_frame(t, -1, "", "", "", "")

        img.save(frame_dir / f"frame_{frame_i:05d}.png", "PNG")
        prev_idx = idx

    print(f"  Generated {total_frames} frames")

    # Step 4: Composite video
    print("\n[4/5] Composing video (frames → MP4)...")
    video_no_audio = Path(tempfile.gettempdir()) / "lesson01_temp_nosound.mp4"
    subprocess.run([
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", str(frame_dir / "frame_%05d.png"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-preset", "fast", "-crf", "20",
        "-vf", f"scale={WIDTH}:{HEIGHT}",
        str(video_no_audio)
    ], check=True, capture_output=True)

    # Step 5: Add audio
    print("\n[5/5] Adding audio...")
    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(video_no_audio),
        "-i", str(audio_path),
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        str(OUTPUT_PATH)
    ], check=True, capture_output=True)

    # Verify
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration,size",
         "-of", "default=noprint_wrappers=1:nokey=1", str(OUTPUT_PATH)],
        capture_output=True, text=True
    )
    lines = result.stdout.strip().split("\n")
    if len(lines) >= 2:
        dur = float(lines[0])
        size_kb = int(lines[1]) // 1024
        print(f"\n  Result: {dur:.1f}s, {size_kb}KB → {OUTPUT_PATH}")

    # Cleanup
    for f in frame_dir.glob("frame_*.png"):
        f.unlink()

    print("\n✓ Done!")


if __name__ == "__main__":
    main()
