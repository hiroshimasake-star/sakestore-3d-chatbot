import { IconButton } from "./iconButton";
import { Message } from "@/features/messages/messages";
import { ElevenLabsParam } from "@/features/constants/elevenLabsParam";
import { KoeiroParam } from "@/features/constants/koeiroParam";
import { ChatLog } from "./chatLog";
import React, {
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";

type Props = {
  started: boolean;
  openAiKey: string;
  elevenLabsKey: string;
  systemPrompt: string;
  chatLog: Message[];
  elevenLabsParam: ElevenLabsParam;
  koeiroParam: KoeiroParam;
  showChatLog: boolean;
  onShowChatLogChange: (open: boolean) => void;
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
  onChangeOpenRouterKey: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  openRouterKey: string;
};

export const Menu = ({
  started,
  chatLog,
  showChatLog,
  onShowChatLogChange,
  onChangeBackgroundImage,
}: Props) => {
  // ページを開いた時は必ずミュート
  const [isMuted, setIsMuted] = useState(true);

  const { viewer } = useContext(ViewerContext);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedBackground =
      localStorage.getItem("backgroundImage");

    if (savedBackground) {
      onChangeBackgroundImage(savedBackground);
    }
  }, [onChangeBackgroundImage]);

  const handleToggleSound = useCallback(() => {
    const nextMuted = !isMuted;

    viewer.setMuted(nextMuted);
    setIsMuted(nextMuted);
  }, [isMuted, viewer]);

  const handleChangeVrmFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;

      if (!files) {
        return;
      }

      const file = files[0];

      if (!file) {
        return;
      }

      const fileType = file.name.split(".").pop();

      if (fileType === "vrm") {
        void viewer.loadVrm().catch(console.error);
      }

      event.target.value = "";
    },
    [viewer]
  );

  return (
    <>
      {/* 音声切り替えボタン */}
      <button
        type="button"
        onClick={handleToggleSound}
        aria-pressed={!isMuted}
        aria-label={
          isMuted
            ? "音声をオンにする"
            : "音声をオフにする"
        }
        title={
          isMuted
            ? "音声をオンにする"
            : "音声をオフにする"
        }
        style={{
          position: "fixed",
          top: "max(16px, env(safe-area-inset-top))",
          right: "max(16px, env(safe-area-inset-right))",
          zIndex: 30,
          minWidth: "116px",
          height: "44px",
          padding: "0 16px",
          border: "1px solid rgba(255,255,255,.35)",
          borderRadius: "999px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: 700,
          cursor: "pointer",
          background: isMuted
            ? "rgba(7,22,45,.82)"
            : "linear-gradient(90deg, #6937e8, #058ee8)",
          boxShadow: "0 6px 20px rgba(0,0,0,.22)",
          backdropFilter: "blur(8px)",
        }}
      >
        <span aria-hidden="true">
          {isMuted ? "🔇" : "🔊"}
        </span>

        <span>
          {isMuted ? "音声 OFF" : "音声 ON"}
        </span>
      </button>

      {started && (
        <>
          {/* 会話履歴ボタン */}
          <div className="absolute z-10 m-24">
            <div className="grid grid-flow-col gap-[8px]">
              {showChatLog ? (
                <IconButton
                  iconName="24/CommentOutline"
                  label="Conversation Log"
                  isProcessing={false}
                  onClick={() => onShowChatLogChange(false)}
                />
              ) : (
                <IconButton
                  iconName="24/CommentFill"
                  label="Conversation Log"
                  isProcessing={false}
                  disabled={chatLog.length <= 0}
                  onClick={() => onShowChatLogChange(true)}
                />
              )}
            </div>
          </div>

          {showChatLog && <ChatLog messages={chatLog} />}
        </>
      )}

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
