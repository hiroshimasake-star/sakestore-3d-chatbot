import { DragEvent, Ref, useContext } from "react";
import { ViewerContext } from "../features/vrmViewer/viewerContext";

export default function VrmViewer({ canvasRef }: { canvasRef: Ref<HTMLCanvasElement> }) {
  const { viewer } = useContext(ViewerContext);

  function handleDrop(event: DragEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (viewer.isReady && file?.name.toLowerCase().endsWith(".vrm")) {
      void viewer.loadVrm().catch(console.error);
    }
  }

  return (
    <div className="absolute top-0 left-0 w-screen h-[100svh] -z-10">
      <canvas ref={canvasRef} className="h-full w-full"
        onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} />
    </div>
  );
}
