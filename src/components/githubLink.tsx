type Props = {
  openAiKey: string;
  elevenLabsKey: string;
  onChangeAiKey: (openAiKey: string) => void;
  onChangeElevenLabsKey: (elevenLabsKey: string) => void;
};

/**
 * Introduction(初回ポップアップ)を完全に無効化
 * - 画面には何も表示しない
 * - 受け取るPropsは型互換のため残すが、参照しない（unused回避のため _ で受ける）
 */
export const Introduction = (_props: Props) => {
  return null;
};