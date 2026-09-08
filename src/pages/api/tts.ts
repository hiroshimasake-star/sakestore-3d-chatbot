import type { NextApiRequest, NextApiResponse } from "next";

type ErrorResponse = {
  error: string;
};

export const config = {
  api: {
    responseLimit: "10mb",
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Buffer | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "POSTリクエストのみ利用できます。",
    });
  }

  const { text } = req.body as {
    text?: string;
  };

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({
      error: "読み上げる文章がありません。",
    });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    console.error("ElevenLabsの環境変数が設定されていません。");

    return res.status(500).json({
      error: "音声機能の設定が完了していません。",
    });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
        voiceId
      )}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          accept: "audio/mpeg",
          "content-type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: "eleven_multilingual_v2",
          apply_language_text_normalization: true,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const details = await response.text();
      console.error("ElevenLabs API error:", response.status, details);

      return res.status(response.status).json({
        error: "音声の生成に失敗しました。",
      });
    }

    const audio = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(audio);
  } catch (error) {
    console.error("TTS error:", error);

    return res.status(500).json({
      error: "音声処理中にエラーが発生しました。",
    });
  }
}
