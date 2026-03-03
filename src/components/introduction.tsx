import { useCallback } from "react";
import { Link } from "./link";

type Props = {
  openAiKey: string;
  elevenLabsKey: string;
  onChangeAiKey: (openAiKey: string) => void;
  onChangeElevenLabsKey: (elevenLabsKey: string) => void;
};

/**
 * Introduction（初回ポップアップ）
 * - サケストア用途では初期設定UIを表示しないため、常に非表示にする。
 * - openAiKey / elevenLabsKey の入力UIも出さない（本番は環境変数や別UIで管理）。
 */
export const Introduction = ({
  openAiKey,
  elevenLabsKey,
  onChangeAiKey,
  onChangeElevenLabsKey,
}: Props) => {
  // 万一どこかで呼ばれても、画面には何も出さない
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _noop = useCallback(() => {}, []);

  return null;
};