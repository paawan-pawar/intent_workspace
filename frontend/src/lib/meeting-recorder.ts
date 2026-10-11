/**
 * MeetingRecorder — Browser-based audio capture using MediaRecorder API.
 *
 * Captures microphone audio in webm/opus format for server-side
 * transcription via Groq Whisper.
 *
 * Usage:
 *   const recorder = new MeetingRecorder()
 *   await recorder.start()        // prompts for mic permission
 *   const blob = await recorder.stop()   // returns audio Blob
 */

export class MeetingRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private stream: MediaStream | null = null
  private startTime: number = 0
  private _elapsedTimer: ReturnType<typeof setInterval> | null = null
  private _onElapsedChange: ((seconds: number) => void) | null = null

  /** Start recording from the user's microphone. */
  async start(onElapsedChange?: (seconds: number) => void): Promise<void> {
    // Request microphone access
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,  // Whisper works well with 16kHz
      },
    })

    // Determine best supported MIME type
    const mimeType = this.getSupportedMimeType()

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType,
      audioBitsPerSecond: 64000,
    })

    this.chunks = []
    this.startTime = Date.now()

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data)
      }
    }

    // Collect data every second for smoother stop
    this.mediaRecorder.start(1000)

    // Track elapsed time
    this._onElapsedChange = onElapsedChange || null
    if (this._onElapsedChange) {
      this._elapsedTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000)
        this._onElapsedChange?.(elapsed)
      }, 1000)
    }
  }

  /** Stop recording and return the audio as a Blob. */
  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('Not currently recording'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm'
        const blob = new Blob(this.chunks, { type: mimeType })
        this.cleanup()
        resolve(blob)
      }

      this.mediaRecorder.onerror = (e) => {
        this.cleanup()
        reject(e)
      }

      this.mediaRecorder.stop()
    })
  }

  /** Whether the recorder is currently active. */
  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }

  /** Elapsed recording time in seconds. */
  get elapsed(): number {
    if (!this.startTime) return 0
    return Math.floor((Date.now() - this.startTime) / 1000)
  }

  /** Clean up all resources. */
  private cleanup(): void {
    if (this._elapsedTimer) {
      clearInterval(this._elapsedTimer)
      this._elapsedTimer = null
    }
    this._onElapsedChange = null

    // Release mic
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }
  }

  /** Find best supported audio MIME type for MediaRecorder. */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ]
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    return '' // Let browser pick default
  }
}

/**
 * Format seconds into MM:SS display string.
 */
export function formatElapsedTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
