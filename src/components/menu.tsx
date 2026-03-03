import { IconButton } from "./iconButton";
import { Message } from "@/features/messages/messages";
import { ElevenLabsParam } from "@/features/constants/elevenLabsParam";
import { KoeiroParam } from "@/features/constants/koeiroParam";
import { ChatLog } from "./chatLog";
import React, { useContext, useRef, useState, useEffect, useCallback } from "react";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";
import { AssistantText } from "./assistantText";

type Props = {
  openAiKey: string;
  elevenLabsKey: string;
  systemPrompt: string;
  chatLog: Message[];
  elevenLabsParam: ElevenLabsParam;
  koeiroParam: KoeiroParam;
  assistantMessage: string;
  onChangeSystemPrompt: (systemPrompt: string) => void;
  onChangeAiKey: (key: string) => void;
  onChangeElevenLabsKey: (key: string) => void;
  onChangeChatLog: (index: number, text: string) => void;
  onChangeElevenLabsParam: (param: ElevenLabsParam) => void;
  onChangeKoeiromapParam: (param: KoeiroParam) => void;
  handleClickResetChatLog: () => void;
  handleClickResetSystemPrompt: () => void;
  backgroundImage: string;
  onChangeBackgroundImage: (value: string) => void;
  onChatMessage: (message: string) => void;
  onTokensUpdate: (tokens: any) => void;
  onChangeOpenRouterKey: (event: React.ChangeEvent<HTMLInputElement>) => void;
  openRouterKey: string;
};

export const Menu = ({
  chatLog,
  assistantMessage,
  onChangeBackgroundImage,
}: Props) => {
  // ✅ Settings UIは完全に使わない（ボタンもモーダルも出さない）
  // Conversation Log だけ残す（必要なら次で消せる）
  const [showChatLog, setShowChatLog] = useState(false);

  // Viewer / VRM upload 周りも設定UIに紐づいているので残しつつ、UIは出さない
  const { viewer } = useContext(ViewerContext);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedBackground = localStorage.getItem("backgroundImage");
    if (savedBackground) {
      onChangeBackgroundImage(savedBackground);
    }
  }, [onChangeBackgroundImage]);

  // ※VRMアップロードUIはSettings側に無いと使えないが、
  // 既存構造に合わせて input 自体は残しておく（表示はされない）
  const handleChangeVrmFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;
      const file = files[0];
      if (!file) return;

      const file_type = file.name.split(".").pop();
      if (file_type === "vrm") {
        const blob = new Blob([file], { type: "application/octet-stream" });
        const url = window.URL.createObjectURL(blob);
        viewer.loadVrm(url);
      }
      event.target.value = "";
    },
    [viewer]
  );

  return (
    <>
      {/* 左上メニュー：Settingsボタンは削除。Conversation Logのみ残す */}
      <div className="absolute z-10 m-24">
        <div className="grid grid-flow-col gap-[8px]">
          {showChatLog ? (
            <IconButton
              iconName="24/CommentOutline"
              label="Conversation Log"
              isProcessing={false}
              onClick={() => setShowChatLog(false)}
            />
          ) : (
            <IconButton
              iconName="24/CommentFill"
              label="Conversation Log"
              isProcessing={false}
              disabled={chatLog.length <= 0}
              onClick={() => setShowChatLog(true)}
            />
          )}
        </div>
      </div>

      {showChatLog && <ChatLog messages={chatLog} />}

      {!showChatLog && assistantMessage && <AssistantText message={assistantMessage} />}

      {/* UIには出ないが、既存構造を壊さないため残す */}
      <input
        type="file"
        className="hidden"
        accept=".vrm"
        ref={fileInputRef}
        onChange={handleChangeVrmFile}
      />
    </>
  );
};