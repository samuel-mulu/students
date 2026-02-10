"use client";

import { BadgeBack } from "@/components/badge/BadgeBack";
import { BadgeFront } from "@/components/badge/BadgeFront";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { createRoot } from "react-dom/client";
import { BadgeData } from "../api/badge";

/**
 * Preloads an image URL to ensure it's in the browser cache and available for html2canvas
 */
const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve) => {
    if (!url) {
      console.log("[BadgeGenerator] No URL provided for preloading");
      resolve();
      return;
    }
    console.log(`[BadgeGenerator] Preloading image: ${url}`);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      console.log(`[BadgeGenerator] Image loaded successfully: ${url}`);
      resolve();
    };
    img.onerror = (err) => {
      console.error(`[BadgeGenerator] Failed to load image: ${url}`, err);
      resolve(); // Resolve anyway to not block the whole process
    };
    img.src = url;
  });
};

export async function generateBadgePDFClient(
  data: BadgeData,
  side: "front" | "back" | "combined" = "combined",
  minimal: boolean = false
): Promise<void> {
  console.log("[BadgeGenerator] Starting client-side PDF generation", { side, minimal, studentId: data.student.id });

  const container = document.createElement("div");
  container.id = "badge-export-container";
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.zIndex = "-1000";
  document.body.appendChild(container);

  try {
    console.log("[BadgeGenerator] Initializing jsPDF");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [85.6, 53.98],
    });

    // Preload important images
    console.log("[BadgeGenerator] Preloading assets...");
    await Promise.all([
      preloadImage(data.student.profileImageUrl || ""),
      preloadImage(data.school.logoUrl || ""),
    ]);

    const renderSide = async (sideType: "front" | "back", pageIndex: number) => {
      console.log(`[BadgeGenerator] Rendering ${sideType} (Page ${pageIndex + 1})`);

      if (pageIndex > 0) {
        pdf.addPage([85.6, 53.98], "landscape");
      }

      // Create a specific mounting point for this side
      const mountPoint = document.createElement("div");
      mountPoint.style.width = "85.6mm";
      mountPoint.style.height = "53.98mm";
      mountPoint.style.background = "white";
      container.appendChild(mountPoint);

      const root = createRoot(mountPoint);

      const BadgeComponent = sideType === "front"
        ? <BadgeFront data={data} minimal={minimal} />
        : <BadgeBack data={data} />;

      root.render(BadgeComponent);

      // Wait for React to mount and images to hopefully be processed by the browser
      console.log(`[BadgeGenerator] Waiting for ${sideType} component to settle...`);
      await new Promise((resolve) => setTimeout(resolve, 800));

      console.log(`[BadgeGenerator] Capturing ${sideType} with html2canvas`);
      const canvas = await html2canvas(mountPoint, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: true, // Enable html2canvas internal logging for debug
        width: 323.5, // 85.6mm in px at 96 DPI * scale
        height: 204,  // 53.98mm in px at 96 DPI * scale
        onclone: (clonedDoc) => {
          console.log(`[BadgeGenerator] html2canvas cloned the document for ${sideType}`);
        }
      });

      console.log(`[BadgeGenerator] Canvas captured for ${sideType}, conversion to PNG`);
      const imgData = canvas.toDataURL("image/png");

      console.log(`[BadgeGenerator] Adding ${sideType} image to PDF`);
      pdf.addImage(imgData, "PNG", 0, 0, 85.6, 53.98);

      console.log(`[BadgeGenerator] Unmounting ${sideType} component`);
      root.unmount();
      container.removeChild(mountPoint);
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
    console.log(`[BadgeGenerator] Saving PDF as ${filename}`);
    pdf.save(filename);
    console.log("[BadgeGenerator] PDF generation completed successfully");

  } catch (error) {
    console.error("[BadgeGenerator] ERROR during PDF generation:", error);
    throw error;
  } finally {
    if (document.body.contains(container)) {
      console.log("[BadgeGenerator] Cleaning up temporary container");
      document.body.removeChild(container);
    }
  }
}
