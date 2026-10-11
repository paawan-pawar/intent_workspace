"""
Meeting API Endpoints
─────────────────────
POST /meetings/process   — Upload audio → transcribe → summarize (full pipeline)
POST /meetings/summarize — Summarize from existing transcript text
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from app.services.meeting_service import process_meeting, summarize_transcript

router = APIRouter(prefix="/meetings", tags=["meetings"])


class SummarizeRequest(BaseModel):
    transcript: str
    title: str = "Meeting"


class MeetingProcessResponse(BaseModel):
    transcript: str
    formatted_transcript: str
    segments: list
    summary: str
    duration: str
    error: str | None = None


@router.post("/process", response_model=MeetingProcessResponse)
async def process_meeting_audio(
    audio: UploadFile = File(..., description="Audio file (webm, mp3, wav, m4a, etc.)"),
    title: str = Form(default="Meeting"),
):
    """
    Full meeting pipeline: upload audio → Whisper transcription → LLM summary.

    Accepts audio files up to 25MB (Groq Whisper limit).
    Supported formats: webm, mp3, wav, m4a, ogg, flac, mp4.
    """
    # Validate file size (25MB limit for Groq Whisper)
    MAX_SIZE = 25 * 1024 * 1024
    contents = await audio.read()

    if len(contents) > MAX_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file too large ({len(contents) / (1024*1024):.1f}MB). Max is 25MB.",
        )

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Audio file is empty.")

    filename = audio.filename or "meeting.webm"
    result = await process_meeting(contents, filename, title)

    return MeetingProcessResponse(**result)


@router.post("/summarize")
async def summarize_meeting_text(req: SummarizeRequest):
    """
    Summarize an existing transcript (no audio upload needed).
    Useful for re-processing or pasting in transcripts from other tools.
    """
    summary = await summarize_transcript(req.transcript, req.title)

    if not summary:
        raise HTTPException(
            status_code=500,
            detail="Summary generation failed. Check Groq API key.",
        )

    return {"summary": summary}
