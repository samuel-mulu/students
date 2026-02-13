"use client";

import { BadgeData } from "@/lib/api/badge";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";

interface BadgeFrontProps {
  data: BadgeData;
  minimal?: boolean;
  photoStyle?: 'square' | 'rounded' | 'circle';
}

export function BadgeFront({ data, minimal = false, photoStyle = 'square' }: BadgeFrontProps) {
  const dob = new Date(data.student.dateOfBirth);
  const formattedDob = format(dob, "MM/dd/yyyy");

  // Format student number as 5-digit string, fallback to UUID
  const displayStudentId = data.student.studentNumber
    ? String(data.student.studentNumber).padStart(5, "0")
    : data.student.id;

  // QR code uses student number or UUID
  const parentsPortalUrl = process.env.NEXT_PUBLIC_PARENTS_PORTAL_URL || "https://parents-portal-x9sp.vercel.app";
  const qrCodeValue = `${parentsPortalUrl}/parents/${data.student.id}/attendance`;

  return (
    <div
      className="badge-front"
      style={{
        width: "85.6mm",
        height: "53.98mm",
        position: "relative",
        fontFamily: "Arial, Helvetica, sans-serif",
        background: "white",
        overflow: "hidden",
      }}
    >
      {/* Background pattern */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(200, 200, 255, 0.1) 2px, rgba(200, 200, 255, 0.1) 4px)",
          zIndex: 0,
        }}
      />

      {/* Semi-transparent circular emblem */}
      <div
        style={{
          position: "absolute",
          right: "5mm",
          top: "50%",
          transform: "translateY(-50%)",
          width: "30mm",
          height: "30mm",
          background:
            "radial-gradient(circle, rgba(0, 0, 255, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Maroon Header */}
        <div
          style={{
            backgroundColor: "#800020",
            height: minimal ? "10mm" : "14mm",
            position: "relative",
            display: "flex",
            alignItems: "center",
            padding: "0 3mm",
            transition: "height 0.3s ease",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "0.5mm",
              borderTop: "1px dashed white",
            }}
          />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: minimal ? "10pt" : "7pt",
                fontWeight: "bold",
                color: "white",
                lineHeight: 1.2,
                textTransform: "uppercase",
                textAlign: minimal ? "center" : "left",
              }}
            >
              {data.student.firstName} {data.student.lastName}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            padding: minimal ? "4mm 3mm" : "2mm 3mm",
            gap: "2mm",
            justifyContent: minimal ? "center" : "initial"
          }}
        >
          <div
            style={{
              flex: minimal ? "none" : 1,
              display: "flex",
              flexDirection: "column",
              gap: minimal ? "4mm" : "1.5mm",
              fontSize: "5pt",
              color: "#333",
              alignItems: minimal ? "center" : "initial",
            }}
          >
            {!minimal && (
              <>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "0.3mm" }}>
                    Class:
                  </div>
                  <div style={{ color: "#666" }}>
                    {data.class?.grade?.name || "N/A"}{data.class?.name ? ` - ${data.class.name}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "0.3mm" }}>
                    Birthdate:
                  </div>
                  <div style={{ color: "#666" }}>{formattedDob}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "0.3mm" }}>
                    Academic Year:
                  </div>
                  <div style={{ color: "#666" }}>
                    {data.academicYear?.name || "N/A"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "0.3mm" }}>
                    Emergency Phone:
                  </div>
                  <div style={{ color: "#666" }}>
                    {data.student.emergencyPhone || "N/A"}
                  </div>
                </div>
              </>
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "0.8mm",
                marginTop: minimal ? "0" : "1mm",
              }}
            >
              <div
                style={{
                  width: minimal ? "25mm" : "12mm",
                  height: minimal ? "25mm" : "12mm",
                  border: "0.4mm solid #e0e0e0",
                  borderRadius: "0.8mm",
                  background: "white",
                  padding: "0.6mm",
                  boxShadow: "0 0.3mm 0.6mm rgba(0, 0, 0, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <QRCodeSVG
                  value={qrCodeValue}
                  size={minimal ? 80 : 40}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>
          </div>

          {!minimal && (
            <div
              style={{
                width: "22mm",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={data.student.profileImageUrl || "/placeholder-student.png"}
                alt="Student Photo"
                style={{
                  width: photoStyle === 'circle' ? "22mm" : "20mm",
                  height: photoStyle === 'circle' ? "22mm" : "25mm",
                  objectFit: "cover",
                  border: "1mm solid white",
                  borderRadius: photoStyle === 'circle' ? "50%" : photoStyle === 'rounded' ? "2mm" : "0",
                  boxShadow: "0 1mm 2mm rgba(0, 0, 0, 0.1)",
                  background: "#f0f0f0",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-family=%22Arial%22 font-size=%2214%22%3ENo Photo%3C/text%3E%3C/svg%3E";
                }}
              />
              <div
                style={{
                  marginTop: "1.5mm",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.2mm",
                }}
              >
                <div style={{ fontSize: "5pt", fontWeight: "bold", color: "#666" }}>Contact:</div>
                <div style={{ fontSize: "5.5pt", fontWeight: "bold", color: "#333" }}>0992023823</div>
                <div style={{ fontSize: "5.5pt", fontWeight: "bold", color: "#333" }}>0914151769</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            height: "6mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 3mm",
            borderTop: "0.5mm solid #e0e0e0",
          }}
        >
        </div>
      </div>
    </div>
  );
}
