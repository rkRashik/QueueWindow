import QRCode from "qrcode";

export function QrCode({ value, label }: { value: string; label: string }) {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const margin = 4;
  const width = modules.size + margin * 2;
  const paths: string[] = [];

  for (let row = 0; row < modules.size; row++) {
    let start = -1;
    for (let col = 0; col <= modules.size; col++) {
      if (col < modules.size && modules.get(row, col)) {
        if (start === -1) start = col;
      } else if (start !== -1) {
        paths.push(
          `M${start + margin} ${row + margin}h${col - start}v1H${start + margin}z`,
        );
        start = -1;
      }
    }
  }

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${width}`}
      shapeRendering="crispEdges"
      className="block size-full bg-white"
    >
      <rect width={width} height={width} fill="white" />
      <path d={paths.join("")} fill="black" />
    </svg>
  );
}
