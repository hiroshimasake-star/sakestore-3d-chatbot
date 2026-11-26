import { useState } from "react";
import { BeginnerMark } from "@/components/navichanStartCard";
import { NameBadge } from "@/lib/navichanStartScreen";
import styles from "@/styles/navichanBadge.module.css";

export function NavichanNameBadge({ badge, preview }: {
  badge: NameBadge;
  preview?: "phone" | "desktop";
}) {
  const [failedImage, setFailedImage] = useState("");
  if (badge.mode === "hidden") return null;

  const showImage = badge.mode === "image" && badge.image && failedImage !== badge.image;
  return (
    <div className={styles.badge} data-preview={preview}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- User-uploaded image data is size-limited.
        <img src={badge.image} alt={badge.label || "スタッフの名札"}
          onError={() => setFailedImage(badge.image)} />
      ) : (
        <div className={styles.standard}>
          <span className={styles.role}><BeginnerMark />新人スタッフ</span>
          <strong>ナビちゃん</strong>
          <span className={styles.guide}>お酒選びをご案内します</span>
        </div>
      )}
    </div>
  );
}
