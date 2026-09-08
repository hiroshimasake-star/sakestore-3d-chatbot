import { LipSyncAnalyzeResult } from "./lipSyncAnalyzeResult";

const TIME_DOMAIN_DATA_LENGTH = 2048;

export class LipSync {
  public readonly audio: AudioContext;
  public readonly analyser: AnalyserNode;
  public readonly timeDomainData: Float32Array;

  private readonly gainNode: GainNode;
  private muted = true;

  public constructor(audio: AudioContext) {
    this.audio = audio;

    this.analyser = audio.createAnalyser();
    this.timeDomainData = new Float32Array(TIME_DOMAIN_DATA_LENGTH);

    // 音量を制御するためのノード
    this.gainNode = audio.createGain();

    // 初期状態は必ずミュート
    this.gainNode.gain.value = 0;

    // 音声解析後に音量を調整してスピーカーへ送る
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(audio.destination);
  }

  public setMuted(muted: boolean) {
    this.muted = muted;

    this.gainNode.gain.setValueAtTime(
      muted ? 0 : 1,
      this.audio.currentTime
    );

    // お客様が音声ONを選んだ場合に音声再生を許可
    if (!muted && this.audio.state === "suspended") {
      void this.audio.resume();
    }
  }

  public getMuted() {
    return this.muted;
  }

  public update(): LipSyncAnalyzeResult {
    this.analyser.getFloatTimeDomainData(this.timeDomainData);

    let volume = 0.0;

    for (let i = 0; i < TIME_DOMAIN_DATA_LENGTH; i++) {
      volume = Math.max(
        volume,
        Math.abs(this.timeDomainData[i])
      );
    }

    volume = 1 / (1 + Math.exp(-45 * volume + 5));

    if (volume < 0.1) {
      volume = 0;
    }

    return {
      volume,
    };
  }

  public async playFromArrayBuffer(
    buffer: ArrayBuffer,
    onEnded?: () => void
  ) {
    if (this.audio.state === "suspended") {
      await this.audio.resume();
    }

    const audioBuffer = await this.audio.decodeAudioData(buffer);

    const bufferSource = this.audio.createBufferSource();
    bufferSource.buffer = audioBuffer;

    // 音声を解析機能へ接続
    // スピーカーへの音量はgainNodeで制御する
    bufferSource.connect(this.analyser);

    if (onEnded) {
      bufferSource.addEventListener("ended", onEnded);
    }

    bufferSource.start();
  }

  public async playFromURL(
    url: string,
    onEnded?: () => void
  ) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    await this.playFromArrayBuffer(buffer, onEnded);
  }
}
