"use client";

import { useEffect, useRef, useState } from "react";
import { CertificateSheet } from "./certificate-sheet";
import type { CertificateData } from "@/lib/certificate-schema";

const MM = 3.7795275591; // px per mm at 96dpi

/** Scales the fixed A4 landscape sheet down to whatever width it has. */
export function SheetPreview({
  data,
  onFit,
  maxWidth,
}: {
  data: CertificateData;
  onFit?: (info: { scale: number; overflow: boolean }) => void;
  maxWidth?: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.55);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => {
      const available = Math.min(el.clientWidth - 24, maxWidth ?? Infinity);
      const natural = 297 * MM;
      setPreviewScale(Math.min(1, Math.max(0.25, available / natural)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxWidth]);

  return (
    <div ref={frameRef} className="mtc-preview-frame rounded-md" style={{ padding: 12 }}>
      <div
        style={{
          width: 297 * MM * previewScale,
          height: 210 * MM * previewScale,
          flex: "0 0 auto",
        }}
      >
        <div
          style={{
            width: 297 * MM,
            height: 210 * MM,
            transform: `scale(${previewScale})`,
            transformOrigin: "top left",
            boxShadow: "0 2px 10px rgba(15,23,42,0.18)",
            background: "#fff",
          }}
        >
          <CertificateSheet data={data} onFit={onFit} />
        </div>
      </div>
    </div>
  );
}
