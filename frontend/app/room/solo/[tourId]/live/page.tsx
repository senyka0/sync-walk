import { RoomLiveContent } from "@/components/room-live-content"

export default function SoloLivePage() {
  return (
    <main>
      <RoomLiveContent isSolo={true} />
    </main>
  )
}
