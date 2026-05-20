"use client";

import { useEffect } from "react";

const WIDGET_HASH = process.env.NEXT_PUBLIC_BINOTEL_CHAT_WIDGET_HASH ?? "";
const SCRIPT_ID = "binotel-chat-widget";

export function BinotelChatWidget() {
  useEffect(() => {
    if (!WIDGET_HASH || document.getElementById(SCRIPT_ID)) {
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "text/javascript";
    script.async = true;
    script.src = `https://widgets.binotel.com/chat/widgets/${encodeURIComponent(
      WIDGET_HASH,
    )}.js`;

    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}
