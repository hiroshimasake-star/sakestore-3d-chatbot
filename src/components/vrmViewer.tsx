import type { Ref } from "react";

export default function VrmViewer({ canvasRef }: { canvasRef: Ref<HTMLCanvasElement> }) {
  return (
    <div className="absolute top-0 left-0 w-screen h-[100svh] -z-10">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
