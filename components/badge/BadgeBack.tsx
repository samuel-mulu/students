'use client';

import { BadgeData } from '@/lib/api/badge';

interface BadgeBackProps {
  data: BadgeData;
}

export function BadgeBack({ data }: BadgeBackProps) {
  return (
    <div className="badge-back" style={{ width: '85.6mm', height: '53.98mm', fontFamily: 'Arial, Helvetica, sans-serif', background: 'white', display: 'flex', flexDirection: 'column' }}>
      {/* Grey Top Band */}
      <div style={{ backgroundColor: '#808080', height: '12mm', width: '100%' }} />

      {/* Center Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3mm', padding: '5mm' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3mm' }}>
          {data.school.logoUrl && (
            <img
              src={data.school.logoUrl}
              alt="School Logo"
              style={{ width: '12mm', height: '12mm', objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div style={{ fontSize: '8pt', fontWeight: 'bold', color: '#333' }}>
            {data.school.name}
          </div>
        </div>
      </div>

      {/* Bottom Contact */}
      <div style={{ height: '10mm', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3mm', borderTop: '0.5mm solid #e0e0e0' }}>
        <span style={{ fontSize: '6pt', color: '#666' }}>Contact number:</span>
        <span style={{ fontSize: '7pt', fontWeight: 'bold', color: '#333', marginLeft: '1mm' }}>
          {data.school.contactNumber}
        </span>
      </div>
    </div>
  );
}
