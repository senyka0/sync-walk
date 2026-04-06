import { io, Socket } from "socket.io-client"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8000"

export interface RoomState {
  room_id: string
  status: string
  current_track_index: number
  current_time_ms: number
  is_playing: boolean
  host_id: string
}

type EventCallback = (...args: unknown[]) => void

class SocketManager {
  private socket: Socket | null = null
  private listeners: Map<string, Set<EventCallback>> = new Map()
  private pendingRoomJoin: { roomId: string; userName: string } | null = null

  connect(token?: string) {
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect()
      }
      return
    }

    this.socket = io(WS_URL, {
      auth: token ? { token } : undefined,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    this.socket.on("connect", () => {
      console.log("[Socket] Connected:", this.socket?.id)
      if (this.pendingRoomJoin) {
        this.emit("join_room", {
          room_id: this.pendingRoomJoin.roomId,
          user_name: this.pendingRoomJoin.userName,
        })
      }
    })

    this.socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason)
    })

    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => {
        this.socket?.on(event, cb)
      })
    })
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    this.socket?.on(event, callback)
  }

  off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback)
    this.socket?.off(event, callback)
  }

  emit(event: string, data?: unknown) {
    this.socket?.emit(event, data)
  }

  joinRoom(roomId: string, userName: string) {
    this.pendingRoomJoin = { roomId, userName }
    if (this.socket?.connected) {
      this.emit("join_room", { room_id: roomId, user_name: userName })
    }
  }

  leaveRoom(roomId: string) {
    if (this.pendingRoomJoin?.roomId === roomId) {
      this.pendingRoomJoin = null
    }
    this.emit("leave_room", { room_id: roomId })
  }

  cmdPlay(roomId: string, timestampMs: number) {
    this.emit("cmd_play", { room_id: roomId, timestamp_ms: timestampMs })
  }

  cmdPause(roomId: string, timestampMs: number) {
    this.emit("cmd_pause", { room_id: roomId, timestamp_ms: timestampMs })
  }

  cmdSeek(roomId: string, timestampMs: number) {
    this.emit("cmd_seek", { room_id: roomId, timestamp_ms: timestampMs })
  }

  cmdNextTrack(roomId: string, trackIndex: number) {
    this.emit("cmd_next_track", { room_id: roomId, track_index: trackIndex })
  }

  requestSync(roomId: string) {
    this.emit("request_sync", { room_id: roomId })
  }

  startTour(roomId: string) {
    this.emit("start_tour", { room_id: roomId })
  }

  hostBusy(roomId: string, reason: string) {
    this.emit("host_busy", { room_id: roomId, reason })
  }

  transferHost(roomId: string, newHostSid: string) {
    this.emit("transfer_host", { room_id: roomId, new_host_sid: newHostSid })
  }

  get isConnected() {
    return this.socket?.connected ?? false
  }

  get socketId() {
    return this.socket?.id ?? null
  }
}

export const socketManager = new SocketManager()
