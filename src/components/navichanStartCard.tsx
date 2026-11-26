import { useState } from "react";
import { StartScreen } from "@/lib/navichanStartScreen";
import styles from "@/styles/navichanStart.module.css";

type Props = {
  settings: StartScreen;
  preview?: "phone" | "desktop";
};

export function BeginnerMark() {
  return <span className={styles.beginnerMark} role="img" aria-label="初心者マーク" />;
}

export function NavichanStartCard({ settings, preview }: Props) {
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const desktopImage = settings.desktopImage && !failedImages.includes(settings.desktopImage)
    ? settings.desktopImage : "";
  const commonImage = failedImages.includes(settings.image) ? "" : settings.image;
  const image = preview === "desktop" ? desktopImage || commonImage : commonImage;
  const responsiveDesktopImage = preview ? "" : desktopImage;

  function renderImage(source: string, className?: string) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- User-uploaded image data is already size-limited.
      <img className={className} src={source} alt=""
        onError={() => setFailedImages((images) => [...images, source])} />
    );
  }

  return (
    <span className={styles.card} data-preview={preview}>
      {image ? renderImage(image, responsiveDesktopImage ? styles.commonArtwork : undefined) : (
        <span className={responsiveDesktopImage ? styles.commonStandard : styles.standard}>
          <span className={styles.title}>お酒選びを<br className={styles.phoneBreak} />お手伝いします</span>
          <span className={styles.guide}><BeginnerMark />新人スタッフ ナビちゃんがご案内します</span>
          <span className={styles.cta}>{settings.label}<span aria-hidden="true">›</span></span>
          <span className={styles.hint}>文字入力・音声どちらでも相談できます</span>
        </span>
      )}
      {responsiveDesktopImage && renderImage(responsiveDesktopImage, styles.desktopArtwork)}
    </span>
  );
}
