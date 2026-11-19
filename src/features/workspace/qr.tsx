"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function Qr({ value, label }: { value: string; label: string }) {
  const [image, setImage] = useState("");
  useEffect(() => {
    let alive = true;
    void import("qrcode")
      .then(({ default: qr }) => qr.toDataURL(value, { width: 256, margin: 4 }))
      .then((url) => {
        if (alive) setImage(url);
      })
      .catch(() => {
        if (alive) setImage("");
      });
    return () => {
      alive = false;
    };
  }, [value]);
  return image ? (
    <Image unoptimized src={image} alt={label} width={180} height={180} />
  ) : null;
}
