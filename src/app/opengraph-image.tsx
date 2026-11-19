import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/brand";

export const alt = "QueueWindow. One call. Every screen. Live queue display showing ticket A-05 at Reception.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{
      display: "flex", flexDirection: "column", width: "100%", height: "100%",
      padding: "58px 72px", background: "#1b2231", color: "#f7f5ef",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 700 }}>
        <BrandMark size={54} colors={{ background: "#1b2231", window: "#f2c230", people: "#f7f5ef" }} />
        QueueWindow
      </div>
      <div style={{ display: "flex", flex: 1, gap: 44, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 495 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 72, fontWeight: 700, lineHeight: 1.04 }}>
            <span>One call.</span>
            <span>Every screen.</span>
          </div>
          <span style={{ fontSize: 25, marginTop: 24, color: "#ced1d7" }}>
            Digital queues and live token displays
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 490, border: "2px solid #69707c", borderRadius: 10 }}>
          <div style={{ display: "flex", padding: "20px 26px", fontSize: 21, letterSpacing: 3, fontWeight: 700 }}>
            NOW SERVING
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 25, padding: "22px 26px", background: "#f2c230", color: "#1b2231" }}>
            <span style={{ fontSize: 23, fontWeight: 700 }}>Reception</span>
            <span style={{ marginLeft: "auto", fontSize: 72, fontWeight: 700, lineHeight: 1 }}>A-05</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "22px 26px", fontSize: 23 }}>
            <span>Up next</span>
            <span>A-06 · A-07</span>
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
