"use client";

import { BadgeBack } from "@/components/badge/BadgeBack";
import { BadgeFront } from "@/components/badge/BadgeFront";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { createRoot } from "react-dom/client";
import { BadgeData } from "../api/badge";

export async function generateBadgePDFClient(
  data: BadgeData,
  side: "front" | "back" | "combined" = "combined",
  minimal: boolean = false
): Promise<void> {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  document.body.appendChild(container);

  try {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [85.6, 53.98],
    });

    const renderSide = async (sideType: "front" | "back", pageIndex: number) => {
      if (pageIndex > 0) {
        pdf.addPage([85.6, 53.98], "landscape");
      }

      const root = createRoot(container);

      // Wrap in a div with fixed dimensions to ensure correct capture
      const Wrapper = () => (
        <div style={{ width: "85.6mm", height: "53.98mm", background: "white" }}>
          {sideType === "front" ? (
            <BadgeFront data={data} minimal={minimal} />
          ) : (
            <BadgeBack data={data} />
          )}
        </div>
      );

      root.render(<Wrapper />);

      // Wait for rendering and images to load
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(container.firstChild as HTMLElement, {
        scale: 3, // Higher scale for better quality (300 DPI approx)
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, 85.6, 53.98);

      // Cleanup for next side
      root.unmount();
    };

    if (side === "combined") {
      await renderSide("front", 0);
      await renderSide("back", 1);
    } else if (side === "front") {
      await renderSide("front", 0);
    } else {
      await renderSide("back", 0);
    }

    const filename = `badge-${data.student.id}-${side}.pdf`;
    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
