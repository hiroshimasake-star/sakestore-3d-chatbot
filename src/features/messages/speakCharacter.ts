import { wait } from "@/utils/wait";
import { synthesizeVoice } from "../elevenlabs/elevenlabs";
import { Viewer } from "../vrmViewer/viewer";
import { Screenplay, Talk } from "./messages";
import { ElevenLabsParam } from "../constants/elevenLabsParam";

const createSpeakCharacter = () => {
  let lastTime = 0;

  let previousFetchPromise: Promise<ArrayBuffer | null> =
    Promise.resolve(null);

  let previousSpeakPromise: Promise<unknown> =
    Promise.resolve();

  return (
    screenplay: Screenplay,
    elevenLabsKey: string,
    elevenLabsParam: ElevenLabsParam,
    viewer: Viewer,
    onStart?: () => void,
    onComplete?: () => void
  ) => {
    const fetchPromise = previousFetchPromise.then(
      async () => {
        const now = Date.now();

        if (now - lastTime < 1000) {
          await wait(1000 - (now - lastTime));
        }

        try {
          const audioBuffer = await fetchAudio(
            screenplay.talk,
            elevenLabsKey,
            elevenLabsParam
          );

          lastTime = Date.now();

          return audioBuffer;
        } catch (error) {
          console.error("音声生成に失敗しました:", error);

          return null;
        }
      }
    );

    previousFetchPromise = fetchPromise;

    const waitingSpeakPromise = previousSpeakPromise;

    const currentSpeakPromise = Promise.all([
      fetchPromise,
      waitingSpeakPromise,
    ]).then(([audioBuffer]) => {
      onStart?.();

      return viewer.model?.speak(
        audioBuffer,
        screenplay
      );
    });

    previousSpeakPromise = currentSpeakPromise;

    void currentSpeakPromise.finally(() => {
      onComplete?.();
    });

    return currentSpeakPromise;
  };
};

export const speakCharacter = createSpeakCharacter();

export const fetchAudio = async (
  talk: Talk,
  elevenLabsKey: string,
  elevenLabsParam: ElevenLabsParam
): Promise<ArrayBuffer> => {
  const ttsVoice = await synthesizeVoice(
    talk.message,
    talk.speakerX,
    talk.speakerY,
    talk.style,
    elevenLabsKey,
    elevenLabsParam
  );

  const audioUrl = ttsVoice.audio;

  if (!audioUrl) {
    throw new Error("音声データが取得できませんでした。");
  }

  try {
    const response = await fetch(audioUrl);

    if (!response.ok) {
      throw new Error("音声データの読み込みに失敗しました。");
    }

    return await response.arrayBuffer();
  } finally {
    URL.revokeObjectURL(audioUrl);
  }
};
