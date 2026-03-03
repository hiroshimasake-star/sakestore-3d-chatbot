import { Message } from "../messages/messages";
import { getWindowAI } from "window.ai";

export async function getChatResponse(messages: Message[], apiKey: string) {
  throw new Error("Not implemented");
}

export async function getChatResponseStream(
  messages: Message[],
  apiKey: string,
  openRouterKey: string
) {
  console.log("getChatResponseStream (SSE)");

  const stream = new ReadableStream<string>({
    async start(controller) {
      try {
        const res = await fetch("/api/chat/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            temperature: 0.7,
            max_tokens: 200,
            stream: true, // ✅ ストリームON
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("POST /api/chat failed:", res.status, text);
          controller.enqueue("（エラー）/api/chat が失敗しました");
          controller.close();
          return;
        }

        if (!res.body) {
          controller.enqueue("（エラー）レスポンスが空です");
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSEは空行で区切られる
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const ev of events) {
            const lines = ev.split("\n");

            for (const line of lines) {
              if (!line.startsWith("data:")) continue;

              const dataStr = line.replace(/^data:\s*/, "").trim();
              if (!dataStr || dataStr === "[DONE]") continue;

              try {
                const json = JSON.parse(dataStr);
                const delta = json?.choices?.[0]?.delta?.content ?? "";
                if (delta) controller.enqueue(delta); // ✅ stringを流す
              } catch (e) {
                // JSONじゃない行が混ざったら無視
              }
            }
          }
        }

        controller.close();
      } catch (e) {
        console.error("getChatResponseStream error:", e);
        controller.error(e);
      }
    },
  });

  return stream;
}