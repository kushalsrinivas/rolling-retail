import { type ComponentType, useEffect, useState } from "react";

export default function Chat3DPanel() {
  const [RodinViewer, setRodinViewer] = useState<ComponentType | null>(null);

  useEffect(() => {
    import("../rodin/RodinViewer").then((mod) => {
      setRodinViewer(() => mod.default);
    });
  }, []);

  if (!RodinViewer) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-black">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-500" />
          <div
            className="absolute inset-1 animate-spin rounded-full border border-purple-400/10 border-t-purple-400/40"
            style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
          />
        </div>
        <p className="text-xs text-zinc-600">Loading 3D studio…</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <RodinViewer />
    </div>
  );
}
