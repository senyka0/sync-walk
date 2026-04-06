type AudioCallback = (timeMs: number) => void
type AudioEndCallback = () => void

class AudioManager {
  private audio: HTMLAudioElement | null = null
  private onTimeUpdate: AudioCallback | null = null
  private onEnded: AudioEndCallback | null = null
  private animFrameId: number | null = null

  load(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.dispose()
      this.audio = new Audio()
      this.audio.preload = "auto"

      this.audio.addEventListener("canplaythrough", () => resolve(), { once: true })
      this.audio.addEventListener("error", () => reject(new Error("Failed to load audio")), {
        once: true,
      })

      this.audio.addEventListener("ended", () => {
        this.onEnded?.()
      })

      this.audio.src = url
      this.audio.load()
    })
  }

  play(): Promise<void> {
    if (!this.audio) {
      return Promise.resolve()
    }
    return this.audio
      .play()
      .then(() => {
        this.startTimeTracking()
      })
      .catch((error) => {
        this.stopTimeTracking()
        throw error
      })
  }

  pause() {
    this.audio?.pause()
    this.stopTimeTracking()
  }

  seekTo(ms: number) {
    if (this.audio) {
      this.audio.currentTime = ms / 1000
    }
  }

  setMuted(muted: boolean) {
    if (this.audio) {
      this.audio.muted = muted
    }
  }

  setVolume(volume: number) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume / 100))
    }
  }

  getCurrentTimeMs(): number {
    return (this.audio?.currentTime ?? 0) * 1000
  }

  getDurationMs(): number {
    return (this.audio?.duration ?? 0) * 1000
  }

  get isPlaying(): boolean {
    return this.audio ? !this.audio.paused : false
  }

  setOnTimeUpdate(callback: AudioCallback | null) {
    this.onTimeUpdate = callback
  }

  setOnEnded(callback: AudioEndCallback | null) {
    this.onEnded = callback
  }

  private startTimeTracking() {
    this.stopTimeTracking()
    const tick = () => {
      if (this.audio && !this.audio.paused) {
        this.onTimeUpdate?.(this.audio.currentTime * 1000)
      }
      this.animFrameId = requestAnimationFrame(tick)
    }
    this.animFrameId = requestAnimationFrame(tick)
  }

  private stopTimeTracking() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
  }

  dispose() {
    this.stopTimeTracking()
    if (this.audio) {
      this.audio.pause()
      this.audio.src = ""
      this.audio = null
    }
  }
}

export const audioManager = new AudioManager()
