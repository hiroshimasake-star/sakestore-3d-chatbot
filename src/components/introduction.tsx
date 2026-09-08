import type { FC } from "react";

type Props = {
  openAiKey: string;
  elevenLabsKey: string;
  onChangeAiKey: (openAiKey: string) => void;
  onChangeElevenLabsKey: (elevenLabsKey: string) => void;
};

/**
 * 初回設定ポップアップは表示しない。
 * APIキーはVercelの環境変数で管理する。
 */
export const Introduction: FC<Props> = () => {
  return null;
};
