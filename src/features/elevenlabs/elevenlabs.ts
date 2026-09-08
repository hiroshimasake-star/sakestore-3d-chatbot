import { ElevenLabsParam } from "../constants/elevenLabsParam";
import { TalkStyle } from "../messages/messages";

/**
 * Vercel側の音声APIを通して音声を生成する。
 * ElevenLabsの秘密のAPIキーはブラウザへ渡さない。
 */
export async function synthesizeVoice(
  message: string,
  speakerX: number,
  speakerY: number,
  style: TalkStyle,
  elevenLabsKey: string,
  elevenLabsParam: ElevenLabsParam
) {
  // 既存コードとの型互換性を保つため引数は残す
  void speakerX;
  void speakerY;
  void style;
  void elevenLabsKey;
  void elevenLabsParam;

  const response = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: message,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`音声生成に失敗しました: ${details}`);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);

  return {
    audio: audioUrl,
  };
}

/**
 * 音声はVercelのVOICE IDで固定するため、
 * ブラウザから音声一覧は取得しない。
 */
export async function getVoices(elevenLabsKey: string) {
  void elevenLabsKey;

  return {
    voices: [],
  };
}
