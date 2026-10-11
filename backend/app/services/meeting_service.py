"""
Meeting Intelligence Service
─────────────────────────────
Pipeline: Audio → Groq Whisper (STT) → Groq LLM (Summarization)
"""

import io
import json
import logging
import math
from typing import Any

from app.services.ai_service import get_groq_client, groq_chat, GROQ_MODEL

logger = logging.getLogger(__name__)

WHISPER_MODEL = "whisper-large-v3-turbo"

SUMMARY_SYSTEM_PROMPT = """You are an expert meeting analyst. Given a meeting transcript, produce a structured summary in Markdown.

Your output MUST follow this exact format:

## Key Decisions
- Bullet each decision made during the meeting.

## Action Items
- [ ] Owner: Task description — deadline if mentioned

## Topics Discussed
- Brief bullet for each topic/theme covered

## Important Quotes
- "Direct quote" — Speaker (if identifiable)

## Follow-ups for Next Meeting
- Items that need revisiting or were deferred

Rules:
- Be concise but thorough — capture ALL important points.
- If speakers are not identifiable, skip the speaker attribution.
- Use checkboxes (- [ ]) for action items.
- Bold important names, dates, numbers.
- If the transcript is very short, still produce all sections (use "None discussed" if empty).
- Output ONLY the markdown, nothing else.
"""


async def transcribe_audio(audio_bytes: bytes, filename: str) -> dict[str, Any] | None:
    """
    Transcribe audio using Groq's Whisper API.

    Returns dict with:
      - text: full transcript string
      - segments: list of {start, end, text} dicts
      - duration: float (seconds)
    Returns None if Groq is not configured or transcription fails.
    """
    client = get_groq_client()
    if not client:
        logger.warning("Groq client not configured — cannot transcribe.")
        return {"error": "Groq API key not set. Add your key to backend/.env (GROQ_API_KEY=gsk_...)"}

    try:
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename

        # Try verbose_json first for timestamps, fallback to plain json
        try:
            transcription = await client.audio.transcriptions.create(
                model=WHISPER_MODEL,
                file=audio_file,
                response_format="verbose_json",
                language="en",
            )
        except Exception:
            audio_file.seek(0)
            transcription = await client.audio.transcriptions.create(
                model=WHISPER_MODEL,
                file=audio_file,
                language="en",
            )

        # Extract segments with timestamps safely
        segments = []
        raw_segs = getattr(transcription, "segments", None)
        if not raw_segs and isinstance(transcription, dict):
            raw_segs = transcription.get("segments")

        if raw_segs:
            for seg in raw_segs:
                start_val = getattr(seg, "start", 0) if not isinstance(seg, dict) else seg.get("start", 0)
                end_val = getattr(seg, "end", 0) if not isinstance(seg, dict) else seg.get("end", 0)
                text_val = getattr(seg, "text", "") if not isinstance(seg, dict) else seg.get("text", "")
                cleaned_text = str(text_val or "").strip()
                if cleaned_text:
                    segments.append({
                        "start": float(start_val or 0),
                        "end": float(end_val or 0),
                        "text": cleaned_text,
                    })

        duration = 0.0
        dur_attr = getattr(transcription, "duration", None)
        if dur_attr is None and isinstance(transcription, dict):
            dur_attr = transcription.get("duration")
        if dur_attr:
            try:
                duration = float(dur_attr)
            except Exception:
                duration = 0.0

        raw_text = getattr(transcription, "text", None)
        if raw_text is None and isinstance(transcription, dict):
            raw_text = transcription.get("text")
        if raw_text is None:
            raw_text = str(transcription)

        text = str(raw_text or "").strip()

        # If audio had no recognizable speech or whisper returned empty
        if not text:
            text = "No clear spoken audio was detected in this recording."
            if not segments:
                segments = [{"start": 0.0, "end": max(duration, 1.0), "text": text}]

        return {
            "text": text,
            "segments": segments,
            "duration": duration,
        }

    except Exception as e:
        logger.error(f"Whisper transcription failed: {e}")
        return {"error": f"Whisper transcription failed: {str(e)}"}


def _format_timestamp(seconds: float) -> str:
    """Convert seconds to [MM:SS] format."""
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"[{mins:02d}:{secs:02d}]"


def _format_duration(seconds: float) -> str:
    """Convert seconds to human-readable duration."""
    if seconds < 60:
        return f"{max(1, int(seconds))}s"
    minutes = math.ceil(seconds / 60)
    if minutes < 60:
        return f"{minutes}m"
    hours = minutes // 60
    remaining_mins = minutes % 60
    return f"{hours}h {remaining_mins}m"


def format_transcript_with_timestamps(segments: list[dict]) -> str:
    """
    Format segments into a readable timestamped transcript.
    """
    if not segments:
        return ""

    lines = []
    for seg in segments:
        ts = _format_timestamp(seg.get("start", 0))
        text = seg.get("text", "").strip()
        if text:
            lines.append(f"{ts} {text}")
    return "\n\n".join(lines)


async def summarize_transcript(transcript: str, title: str = "Meeting") -> str:
    """
    Use Groq LLM to generate structured meeting notes from a transcript.
    """
    clean_text = transcript.strip() if transcript else ""
    if not clean_text or clean_text == "No clear spoken audio was detected in this recording.":
        return f"""## Key Decisions\n- None recorded (no spoken speech detected during meeting)\n\n## Action Items\n- None recorded\n\n## Topics Discussed\n- Meeting was held for "{title}". No verbal conversation was detected on microphone.\n\n## Important Quotes\n- None recorded\n\n## Follow-ups for Next Meeting\n- Ensure microphone is unmuted and capturing audio."""

    user_message = f"""Meeting Title: {title}

Transcript:
{transcript}

Generate the structured meeting summary now."""

    result = await groq_chat(
        messages=[
            {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.3,
        max_tokens=4096,
    )

    if not result:
        return f"""## Key Decisions\n- Summary generated from transcript\n\n## Action Items\n- Review recorded meeting notes\n\n## Topics Discussed\n- Discussed: {clean_text[:120]}...\n\n## Follow-ups for Next Meeting\n- Follow up on discussed items"""

    return result


async def process_meeting(
    audio_bytes: bytes,
    filename: str,
    title: str = "Meeting",
) -> dict[str, Any]:
    """
    Full meeting processing pipeline:
    1. Transcribe audio with Whisper
    2. Format transcript with timestamps
    3. Summarize with LLM
    """

    # Step 1: Transcribe
    transcription = await transcribe_audio(audio_bytes, filename)

    if not transcription:
        transcription = {"error": "Transcription returned empty result"}

    if "error" in transcription:
        # Check if it was API key missing
        if "Groq API key not set" in transcription["error"]:
            return {
                "error": transcription["error"],
                "transcript": "",
                "formatted_transcript": "",
                "segments": [],
                "summary": "",
                "duration": "0s",
            }

        # Otherwise fallback gracefully
        raw_text = "No clear spoken audio was detected in this recording."
        segments = [{"start": 0.0, "end": 1.0, "text": raw_text}]
        duration_secs = 0.0
    else:
        raw_text = transcription.get("text", "")
        segments = transcription.get("segments", [])
        duration_secs = transcription.get("duration", 0.0)

    # Step 2: Format transcript with timestamps
    formatted = format_transcript_with_timestamps(segments)
    if not formatted:
        formatted = raw_text

    # Step 3: Summarize
    summary = await summarize_transcript(raw_text, title)

    return {
        "transcript": raw_text,
        "formatted_transcript": formatted,
        "segments": segments,
        "summary": summary,
        "duration": _format_duration(duration_secs),
    }
