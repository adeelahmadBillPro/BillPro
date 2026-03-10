"use client";

import { useState, useEffect } from "react";

interface QRCodeProps {
  value: string;
  size?: number;
}

export default function QRCode({ value, size = 128 }: QRCodeProps) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    if (!value) return;
    import("qrcode").then((QRCodeLib) => {
      QRCodeLib.toDataURL(value, { width: size, margin: 2 }).then(setSrc);
    });
  }, [value, size]);

  if (!src) return <div style={{ width: size, height: size }} className="bg-gray-100 rounded animate-pulse" />;

  return <img src={src} alt="QR Code" width={size} height={size} className="rounded" />;
}
