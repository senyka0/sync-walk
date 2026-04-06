"use client"

import { useEffect, useRef } from "react"
import { socketManager, type RoomState } from "@/lib/socket"
import { useAppStore } from "@/store"
import { audioManager } from "@/lib/audio-manager"

export function useSocket(roomId: string | null) {
  const connectedRef = useRef(false)

  const setCurrentTime = useAppStore((s) => s.setCurrentTime)
  const setRoomStatus = useAppStore((s) => s.setRoomStatus)
  const addParticipant = useAppStore((s) => s.addParticipant)
  const removeParticipant = useAppStore((s) => s.removeParticipant)

  useEffect(() => {
    if (!roomId || connectedRef.current) return

    if (!socketManager.isConnected) {
      socketManager.connect()
    }
    connectedRef.current = true

    const handleSyncState = (state: RoomState) => {
      const store = useAppStore.getState()
      setCurrentTime(state.current_time_ms)
      useAppStore.setState({
        currentTrackIndex: state.current_track_index,
        isPlaying: state.is_playing,
      })
      setRoomStatus(state.status as "waiting" | "active" | "finished")
      if (!store.isHost) {
        const driftMs = Math.abs(audioManager.getCurrentTimeMs() - state.current_time_ms)
        if (driftMs > 700) {
          audioManager.seekTo(state.current_time_ms)
        }
      }
    }

    const handleSyncPlay = (data: { timestamp_ms: number }) => {
      const store = useAppStore.getState()
      store.setCurrentTime(data.timestamp_ms)
      if (!store.isHost) {
        audioManager.seekTo(data.timestamp_ms)
        useAppStore.setState({ isPlaying: true })
      }
    }

    const handleSyncPause = (data: { timestamp_ms: number }) => {
      const store = useAppStore.getState()
      store.setCurrentTime(data.timestamp_ms)
      if (!store.isHost) {
        audioManager.seekTo(data.timestamp_ms)
        useAppStore.setState({ isPlaying: false })
      }
    }

    const handleSyncSeek = (data: { timestamp_ms: number }) => {
      const store = useAppStore.getState()
      setCurrentTime(data.timestamp_ms)
      if (!store.isHost) {
        audioManager.seekTo(data.timestamp_ms)
      }
    }

    const handleSyncTrackChange = (data: { track_index: number }) => {
      const store = useAppStore.getState()
      if (!store.isHost) {
        useAppStore.setState({
          isPlaying: false,
          currentTrackIndex: data.track_index,
          currentTimeMs: 0,
          totalDurationMs: 0,
        })
      }
    }

    const handleParticipantJoined = (data: { sid: string; name: string }) => {
      addParticipant({
        id: data.sid,
        name: data.name,
        role: "listener",
        isOnline: true,
      })
    }

    const handleParticipantLeft = (data: { sid: string; name: string }) => {
      removeParticipant(data.sid)
    }

    const handleTourStarted = () => {
      setRoomStatus("active")
    }

    const handleHostTransferred = (data: { new_host_sid: string }) => {
      const store = useAppStore.getState()
      useAppStore.setState({
        isHost: socketManager.socketId === data.new_host_sid,
        participants: store.participants.map((p) =>
          p.id === data.new_host_sid
            ? { ...p, role: "host" as const }
            : { ...p, role: "listener" as const }
        ),
      })
    }

    const cast = (fn: Function) => fn as (...args: unknown[]) => void

    socketManager.on("sync_state", cast(handleSyncState))
    socketManager.on("sync_play", cast(handleSyncPlay))
    socketManager.on("sync_pause", cast(handleSyncPause))
    socketManager.on("sync_seek", cast(handleSyncSeek))
    socketManager.on("sync_track_change", cast(handleSyncTrackChange))
    socketManager.on("participant_joined", cast(handleParticipantJoined))
    socketManager.on("participant_left", cast(handleParticipantLeft))
    socketManager.on("tour_started", cast(handleTourStarted))
    socketManager.on("host_transferred", cast(handleHostTransferred))

    return () => {
      socketManager.off("sync_state", cast(handleSyncState))
      socketManager.off("sync_play", cast(handleSyncPlay))
      socketManager.off("sync_pause", cast(handleSyncPause))
      socketManager.off("sync_seek", cast(handleSyncSeek))
      socketManager.off("sync_track_change", cast(handleSyncTrackChange))
      socketManager.off("participant_joined", cast(handleParticipantJoined))
      socketManager.off("participant_left", cast(handleParticipantLeft))
      socketManager.off("tour_started", cast(handleTourStarted))
      socketManager.off("host_transferred", cast(handleHostTransferred))
      connectedRef.current = false
    }
  }, [roomId, setCurrentTime, setRoomStatus, addParticipant, removeParticipant])
}
