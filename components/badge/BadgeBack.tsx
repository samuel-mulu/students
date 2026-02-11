"use client";

import { BadgeData } from "@/lib/api/badge";
import { getOptimizedCloudinaryUrl } from '@/lib/utils/cloudinary';

interface BadgeBackProps {
  data: BadgeData;
}

export function BadgeBack({ data }: BadgeBackProps) {
  return (
    <div
      className="badge-back"
      style={{
        width: "85.6mm",
        height: "53.98mm",
        fontFamily: "Arial, Helvetica, sans-serif",
        background: "white",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Grey Top Band */}
      <div
        style={{ backgroundColor: "#808080", height: "12mm", width: "100%" }}
      />

      {/* Center Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "2mm",
          padding: "5mm",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2mm",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {data.school.logoUrl && (
              <img
                src={getOptimizedCloudinaryUrl(data.school.logoUrl, { width: 200 }) || '/logo.jpg'}
                alt="School Logo"
                style={{
                  width: "16mm",
                  height: "16mm",
                  objectFit: "contain",
                }}
              />
            )}
          </div>
          <div
            style={{
              fontSize: "10pt",
              fontWeight: "bold",
              color: "#333",
              textTransform: "uppercase",
              letterSpacing: "0.5mm",
            }}
          >
            DIGITAL KG
          </div>
        </div>
      </div>

      {/* Bottom Contact */}
      <div
        style={{
          height: "10mm",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 3mm",
          borderTop: "0.5mm solid #e0e0e0",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span
            style={{ fontSize: "6pt", color: "#666", marginBottom: "0.5mm" }}
          >
            Contact Numbers:
          </span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.3mm",
            }}
          >
            <span
              style={{ fontSize: "6pt", fontWeight: "bold", color: "#333" }}
            >
              0992023823
            </span>
            <span
              style={{ fontSize: "6pt", fontWeight: "bold", color: "#333" }}
            >
              0914151769
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
