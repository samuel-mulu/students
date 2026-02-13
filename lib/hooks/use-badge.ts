import { badgeApi } from '@/lib/api/badge';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useBadgePreview(studentId: string) {
  return useQuery({
    queryKey: ['badge', 'preview', studentId],
    queryFn: async () => {
      const data = await badgeApi.getPreview(studentId);
      return { data };
    },
    enabled: !!studentId,
  });
}

const downloadBadgeForWord = (data: any, side: 'front' | 'back' | 'combined', minimal: boolean, photoStyle: 'square' | 'rounded' | 'circle' = 'square') => {
  const parentsPortalUrl = process.env.NEXT_PUBLIC_PARENTS_PORTAL_URL || "https://parents-portal-x9sp.vercel.app";
  const qrCodeUrl = `${parentsPortalUrl}/parents/${data.student.id}/attendance`;
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCodeUrl)}`;
  const logoImg = '';
  const studentInfo = !minimal ? `<div><strong>Class:</strong> ${data.class?.grade?.name || 'N/A'}${data.class?.name ? ` - ${data.class.name}` : ''}</div><div><strong>Birthdate:</strong> ${new Date(data.student.dateOfBirth).toLocaleDateString()}</div><div><strong>Year:</strong> ${data.academicYear?.name || 'N/A'}</div><div><strong>Emergency:</strong> ${data.student.emergencyPhone || 'N/A'}</div>` : '';
  const borderRadius = photoStyle === 'circle' ? '50%' : photoStyle === 'rounded' ? '2mm' : '0';
  const photoWidth = photoStyle === 'circle' ? '22mm' : '22mm';
  const photoHeight = photoStyle === 'circle' ? '22mm' : '26mm';
  const studentPhoto = !minimal && data.student.profileImageUrl ? `<div style="width: 22mm; display: flex; flex-direction: column; align-items: center; justify-content: center;"><img src="${data.student.profileImageUrl}" style="width: ${photoWidth}; height: ${photoHeight}; object-fit: cover; border: 0.5mm solid #800020; border-radius: ${borderRadius};" /><div style="margin-top: 1.5mm; display: flex; flex-direction: column; align-items: center; gap: 0.2mm;"><div style="font-size: 6pt; font-weight: bold; color: #666;">Contact:</div><div style="font-size: 6.5pt; font-weight: bold; color: #333;">0992023823</div><div style="font-size: 6.5pt; font-weight: bold; color: #333;">0914151769</div></div></div>` : '';
  const badgeHtml = `<div style="width: 85.6mm; height: 65mm; border: 2px solid #ccc; display: inline-block; margin: 5mm; page-break-inside: avoid; font-family: Arial, sans-serif; position: relative; overflow: hidden; background: white;"><div style="width: 100%; height: 100%; display: flex; flex-direction: column;"><div style="background-color: #800020; height: ${minimal ? '14mm' : '20mm'}; display: flex; align-items: center; padding: 0 4mm; gap: 2mm; color: white;"><div style="font-weight: 900; font-size: 14pt; color: white; text-transform: uppercase; flex: 1; text-shadow: 1px 1px 0px rgba(0,0,0,0.2);">${data.student.firstName} ${data.student.lastName}</div></div><div style="flex: 1; display: flex; padding: 2mm 4mm; gap: 3mm; align-items: center;"><div style="flex: 1; font-size: 9pt; color: #000; display: flex; flex-direction: column; gap: 1.5mm;">${studentInfo}<div style="margin-top: 1mm;"><img src="${qrDataUrl}" alt="QR Code" style="width: ${minimal ? '35mm' : '22mm'}; height: auto;" /></div></div>${studentPhoto}</div></div></div>`;
  const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ID Badge - ${data.student.firstName} ${data.student.lastName}</title><style>@page { size: A4; margin: 10mm; } body { font-family: Arial, sans-serif; margin: 0; padding: 20px; } .instructions { background-color: #f0f9ff; border: 2px solid #0284c7; border-radius: 8px; padding: 15px; margin-bottom: 20px; font-size: 11pt; } .instructions h2 { margin-top: 0; color: #0284c7; font-size: 13pt; } .instructions ul { margin: 10px 0; padding-left: 20px; } .instructions li { margin: 5px 0; }</style></head><body><div class="instructions"><h2>📝 Instructions for Microsoft Word</h2><ul><li><strong>To add more students:</strong> Select the badge below, copy it (Ctrl+C), and paste it (Ctrl+V) multiple times</li><li><strong>To arrange badges:</strong> Drag and position badges on the page as needed</li><li><strong>Recommended:</strong> Fit 6-8 badges per A4 page (2 columns × 3-4 rows)</li><li><strong>Before printing:</strong> Go to File → Print → Print Preview to check the layout</li></ul></div>${badgeHtml}</body></html>`;
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `badge-${data.student.firstName}-${data.student.lastName}-editable.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};


const printBadge = (data: any, side: 'front' | 'back' | 'combined', minimal: boolean, photoStyle: 'square' | 'rounded' | 'circle' = 'square') => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const parentsPortalUrl = process.env.NEXT_PUBLIC_PARENTS_PORTAL_URL || "https://parents-portal-x9sp.vercel.app";
  const qrCodeUrl = `${parentsPortalUrl}/parents/${data.student.id}/attendance`;
  
  // Use a simple QR code API for the print version to keep it easy
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCodeUrl)}`;

  const frontHtml = `
    <div class="badge-container">
      <div class="header" style="background-color: #800020; height: ${minimal ? '12mm' : '18mm'};">
        <div class="student-name">${data.student.firstName} ${data.student.lastName}</div>
        ${!minimal ? `<img src="${data.school.logoUrl || '/logo.jpg'}" class="school-logo" />` : ''}
      </div>
      <div class="content">
        <div class="info">
          ${!minimal ? `
            <div class="field"><strong>Class:</strong> ${data.class?.grade?.name || 'N/A'}${data.class?.name ? ` - ${data.class.name}` : ''}</div>
            <div class="field"><strong>Birthdate:</strong> ${new Date(data.student.dateOfBirth).toLocaleDateString()}</div>
            <div class="field"><strong>Academic Year:</strong> ${data.academicYear?.name || 'N/A'}</div>
            <div class="field"><strong>Emergency:</strong> ${data.student.emergencyPhone || 'N/A'}</div>
          ` : ''}
          <div class="qr-container">
            <img src="${qrDataUrl}" alt="QR" style="width: ${minimal ? '25mm' : '12mm'};" />
          </div>
        </div>
        ${!minimal ? `
    <div class="photo-container">
      <img src="${data.student.profileImageUrl || '/placeholder-student.png'}" class="student-photo" />
      <div class="contacts-front">
        <div class="contact-label-front">Contact:</div>
        <div class="phone-front">0992023823</div>
        <div class="phone-front">0914151769</div>
      </div>
    </div>
  ` : ''}
</div>
<div class="footer">DIGITAL KG</div>
    </div>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>ID Badge - ${data.student.firstName}</title>
        <style>
          @page { size: 85.6mm 65mm; margin: 0; }
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          .badge-container {
            width: 85.6mm; height: 65mm;
            position: relative; overflow: hidden;
            border: 1px solid #eee;
            page-break-after: always;
            display: flex; flex-direction: column;
            background-color: white;
          }
          .header { display: flex; align-items: center; padding: 0 4mm; color: white; position: relative; gap: 2mm; }
          .student-name { font-weight: 900; font-size: 14pt; color: #0044ff; text-transform: uppercase; flex: 1; text-shadow: 1px 1px 0px rgba(255,255,255,0.5); }
          .school-logo { width: 14mm; height: 14mm; object-fit: contain; background: white; border-radius: 1mm; padding: 0.5mm; }
          .content { flex: 1; display: flex; padding: 2mm 4mm; gap: 3mm; align-items: center; }
          .info { flex: 1; font-size: 9pt; color: #000; display: flex; flex-direction: column; gap: 1.5mm; }
          .photo-container { width: 22mm; display: flex; flex-direction: column; align-items: center; justify-content: center; }
          .student-photo { 
            width: ${photoStyle === 'circle' ? '22mm' : '22mm'}; 
            height: ${photoStyle === 'circle' ? '22mm' : '26mm'}; 
            object-fit: cover; 
            border: 0.5mm solid #800020; 
            border-radius: ${photoStyle === 'circle' ? '50%' : photoStyle === 'rounded' ? '2mm' : '0'};
          }
          .contacts-front { margin-top: 1.5mm; display: flex; flex-direction: column; align-items: center; gap: 0.2mm; }
          .contact-label-front { font-size: 6pt; font-weight: bold; color: #666; }
          .phone-front { font-size: 6.5pt; font-weight: bold; color: #333; }
          .qr-container { margin-top: 1mm; }
          
          @media print {
            .badge-container { border: none; }
            .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="badge-container">
          <div class="header" style="background-color: #800020; height: ${minimal ? '12mm' : '15mm'};">
            <div class="student-name">${data.student.firstName} ${data.student.lastName}</div>
          </div>
          <div class="content">
            <div class="info">
              ${!minimal ? `
                <div class="field"><strong>Class:</strong> ${data.class?.grade?.name || 'N/A'}${data.class?.name ? ` - ${data.class.name}` : ''}</div>
                <div class="field"><strong>Birthdate:</strong> ${new Date(data.student.dateOfBirth).toLocaleDateString()}</div>
                <div class="field"><strong>Year:</strong> ${data.academicYear?.name || 'N/A'}</div>
                <div class="field"><strong>Emergency:</strong> ${data.student.emergencyPhone || 'N/A'}</div>
              ` : ''}
              <div class="qr-container">
                <img src="${qrDataUrl}" alt="QR" style="width: ${minimal ? '35mm' : '22mm'};" />
              </div>
            </div>
            ${!minimal ? `
              <div class="photo-container">
                <img src="${data.student.profileImageUrl || '/placeholder-student.png'}" class="student-photo" />
                <div class="contacts-front">
                  <div class="contact-label-front">Contact:</div>
                  <div class="phone-front">0992023823</div>
                  <div class="phone-front">0914151769</div>
                </div>
              </div>
            ` : ''}
          </div>
          <div class="footer" style="height: 6mm; border-top: 0.2mm solid #e0e0e0; display: flex; align-items: center; justify-content: center; font-size: 8pt; font-weight: bold; color: #800020;"></div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  
  // Wait for images to load before printing
  setTimeout(() => {
    printWindow.print();
  }, 1000);
};

export function useDownloadBadge() {
  return {
    download: async (
      studentId: string,
      format: 'pdf' | 'png' = 'pdf',
      side: 'front' | 'back' | 'combined' = 'combined',
      minimal: boolean = false,
      photoStyle: 'square' | 'rounded' | 'circle' = 'square'
    ) => {
      try {
        if (format === 'pdf') {
          const previewResponse = await badgeApi.getPreview(studentId);
          printBadge(previewResponse, side, minimal, photoStyle);
          return;
        }

        // Keep PNG as is (backend)
        const blob = await badgeApi.downloadBadge(studentId, format, side, minimal, photoStyle);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const extension = format;
        const sideName = side === 'combined' ? 'combined' : side;
        link.download = `badge-${studentId}-${sideName}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error: any) {
        toast.error('Download failed', {
          description: error.message || 'An unexpected error occurred'
        });
      }
    },
    downloadForWord: async (
      studentId: string,
      side: 'front' | 'back' | 'combined' = 'combined',
      minimal: boolean = false,
      photoStyle: 'square' | 'rounded' | 'circle' = 'square'
    ) => {
      try {
        const previewResponse = await badgeApi.getPreview(studentId);
        downloadBadgeForWord(previewResponse, side, minimal, photoStyle);
        toast.success('Badge downloaded', {
          description: 'Open the HTML file in Microsoft Word to edit and print'
        });
      } catch (error: any) {
        toast.error('Download failed', {
          description: error.message || 'An unexpected error occurred'
        });
      }
    },
  };
}
