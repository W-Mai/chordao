import qrcode from 'qrcode-generator';

// Generate QR code as data URL with quiet zone, rounded rect, and optional center logo
export function generateQR(text: string, size: number, logoUrl?: string): Promise<string> {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();

  const modules = qr.getModuleCount();
  const quiet = 4;
  const totalModules = modules + quiet * 2;
  const cellSize = size / totalModules;
  const padding = 8; // extra white padding outside
  const totalSize = size + padding * 2;
  const radius = 12;

  const canvas = document.createElement('canvas');
  canvas.width = totalSize;
  canvas.height = totalSize;
  const ctx = canvas.getContext('2d')!;

  // Transparent background
  ctx.clearRect(0, 0, totalSize, totalSize);

  // White rounded rect background
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(0, 0, totalSize, totalSize, radius);
  ctx.fill();

  // QR modules
  ctx.fillStyle = '#000';
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (qr.isDark(r, c)) {
        const x = padding + (c + quiet) * cellSize;
        const y = padding + (r + quiet) * cellSize;
        ctx.fillRect(x, y, cellSize + 0.5, cellSize + 0.5);
      }
    }
  }

  if (!logoUrl) return Promise.resolve(canvas.toDataURL('image/png'));

  // Draw logo in center
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const logoSize = size * 0.22;
      const pad = 4;
      const cx = (totalSize - logoSize) / 2;
      const cy = (totalSize - logoSize) / 2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(cx - pad, cy - pad, logoSize + pad * 2, logoSize + pad * 2, 4);
      ctx.fill();
      ctx.drawImage(img, cx, cy, logoSize, logoSize);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(canvas.toDataURL('image/png'));
    img.src = logoUrl;
  });
}
