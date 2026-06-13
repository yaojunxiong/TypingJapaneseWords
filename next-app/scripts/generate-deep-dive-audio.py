#!/usr/bin/env python3
"""
Generate Chinese teacher narration MP3 for deep-dive lessons using Edge TTS.

Usage:
    python scripts/generate-deep-dive-audio.py --from 1 --to 3

Output:
    public/audio/deep-dive/lesson-XX-zh.mp3
    public/audio/deep-dive/lesson-XX-zh.txt
"""

import argparse
import asyncio
import json
import os
import sys

import edge_tts

LESSONS_DIR = "src/data/minna/lessons"
OUTPUT_DIR = "public/audio/deep-dive"
VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-10%"
VOLUME = "+0%"
PITCH = "+0Hz"


def load_lesson(lesson_no: int) -> dict:
    path = os.path.join(LESSONS_DIR, f"lesson-{lesson_no:02d}.json")
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Lesson file not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    deep_dive = data.get("deepDive")
    if not deep_dive:
        raise ValueError(f"No deepDive field in lesson-{lesson_no:02d}.json")
    return deep_dive


def pick_sentences(text: str, max_count: int = 2) -> str:
    """Take first N sentences from text."""
    if not text:
        return ""
    import re
    sents = re.split(r'(?<=[。！？])', text)
    sents = [s.strip() for s in sents if s.strip()]
    return "".join(sents[:max_count])


def describe_characters_natural(characters: list) -> str:
    """Turn character list into a natural spoken sentence."""
    if not characters:
        return ""
    parts = []
    for c in characters:
        name = c.get("name", "").strip()
        role = c.get("role", "").strip()
        rel = c.get("relationship", "").strip()
        if name and role:
            parts.append(f"{name}是{role}")
        elif name:
            parts.append(name)
    if not parts:
        return ""
    if len(parts) == 1:
        return "说话的人有" + parts[0] + "。"
    if len(parts) == 2:
        return f"说话的有两个人，{parts[0]}，{parts[1]}。"
    joined = "，".join(parts[:-1]) + "，还有" + parts[-1]
    return f"这一课里有好几个人物：{joined}。"


def pick_flow_titles(flow: list) -> str:
    """Extract flow step titles into a natural describing sentence."""
    if not flow:
        return ""
    titles = [step.get("title", "").strip() for step in flow if step.get("title")]
    if not titles:
        return ""
    return "，".join(titles)


def compose_script(dd: dict, lesson_no: int) -> str:
    scene = dd.get("sceneSummary", "").strip()
    story = dd.get("storyExplanation", "").strip()
    characters = dd.get("characters", [])
    flow = dd.get("conversationFlow", [])

    lines = []

    # ── Paragraph 1: Opening encouragement ──
    if lesson_no <= 3:
        lines.append(
            f"太好了，我们来到第{lesson_no}课。"
            f"别着急，这一课的内容非常贴近生活，你只要先听懂场景，再跟着读几遍，就一定能慢慢背下来。"
        )
    else:
        lines.append(
            f"今天我们继续学习第{lesson_no}课。"
            f"你已经坚持到这里了，非常棒。先放松听一遍中文讲解，让脑子先理解这段会话在讲什么。"
        )
    lines.append("")

    # ── Paragraph 2: Scene visualization ──
    scene_snippet = pick_sentences(scene, 1) or f"第{lesson_no}课的会话场景"
    lines.append(
        f"你可以想象一下这个画面：{scene_snippet}"
        f"整段话不长，但每一句都有它的用意。"
    )
    lines.append("")

    # ── Paragraph 3: Character introduction (natural) ──
    char_line = describe_characters_natural(characters)
    if char_line:
        lines.append(char_line)
        lines.append("")

    # ── Paragraph 4: Story and key points ──
    story_snippet = pick_sentences(story, 2)
    if story_snippet:
        # Remove the first sentence if it's just "这是...第X课..." — redundant with our opener
        lines.append(story_snippet)
        lines.append("")

    # ── Paragraph 5: Memorization approach ──
    flow_titles = pick_flow_titles(flow)
    if flow_titles:
        lines.append(
            f"背这一课时，不用一句一句硬来。你只要记住这条主线：{flow_titles}。"
            f"抓住这个顺序，整个对话的逻辑就清楚了。"
        )
        lines.append("")

    # ── Paragraph 6: Final encouragement ──
    lines.append(
        "听完这一遍，你已经知道这段会话在演什么了。"
        "接下来回到会话页，先跟读两遍，再试着遮住中文说一遍。"
        "不要追求一次完美，今天能开口，就是进步。"
    )
    lines.append("")

    return "\n".join(lines)


async def generate_audio(script: str, lesson_no: int) -> str:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    mp3_path = os.path.join(OUTPUT_DIR, f"lesson-{lesson_no:02d}-zh.mp3")

    communicate = edge_tts.Communicate(
        script,
        voice=VOICE,
        rate=RATE,
        volume=VOLUME,
        pitch=PITCH,
    )
    await communicate.save(mp3_path)
    return mp3_path


def main():
    parser = argparse.ArgumentParser(
        description="Generate deep-dive Chinese audio using Edge TTS"
    )
    parser.add_argument("--from", dest="from_", type=int, required=True, help="Start lesson no")
    parser.add_argument("--to", dest="to", type=int, required=True, help="End lesson no")
    args = parser.parse_args()

    for no in range(args.from_, args.to + 1):
        print(f"\n{'='*60}")
        print(f"  Lesson {no:02d}")
        print(f"{'='*60}")

        try:
            dd = load_lesson(no)
        except (FileNotFoundError, ValueError) as e:
            print(f"  ❌ {e}")
            continue

        script = compose_script(dd, no)
        txt_path = os.path.join(OUTPUT_DIR, f"lesson-{no:02d}-zh.txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(script)

        char_count = len(script)
        print(f"  讲解稿字数: {char_count}")
        print(f"  文本输出: {txt_path}")

        try:
            mp3_path = asyncio.run(generate_audio(script, no))
            mp3_size = os.path.getsize(mp3_path)
            print(f"  MP3 输出: {mp3_path}")
            print(f"  文件大小: {mp3_size / 1024:.1f} KB")
            print(f"  使用语音: {VOICE}")
            print(f"  语速: {RATE}  音量: {VOLUME}  音调: {PITCH}")
            print(f"  ✅ 生成成功")
        except Exception as e:
            print(f"  ❌ 生成失败: {e}")
            sys.exit(1)

    print(f"\n{'='*60}")
    print("  All done!")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
