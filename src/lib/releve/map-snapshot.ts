const TILE = "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857";

function loadTile(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => resolve(null), 12000);
    image.onload = () => {
      window.clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    image.src = url;
  });
}

export async function renderTopoPng(lat: number, lng: number): Promise<Uint8Array | null> {
  const zoom = 16;
  const width = 1200;
  const height = 860;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = "#e6e0d4";
  context.fillRect(0, 0, width, height);

  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const centerX = x * 256;
  const centerY = y * 256;
  const originX = centerX - width / 2;
  const originY = centerY - height / 2;
  const x0 = Math.floor(originX / 256);
  const y0 = Math.floor(originY / 256);
  const x1 = Math.floor((originX + width - 1) / 256);
  const y1 = Math.floor((originY + height - 1) / 256);

  const jobs: Promise<void>[] = [];
  let loaded = 0;
  for (let tileX = x0; tileX <= x1; tileX += 1) {
    for (let tileY = y0; tileY <= y1; tileY += 1) {
      const url = `${TILE}/${zoom}/${tileX}/${tileY}.jpeg`;
      jobs.push(
        loadTile(url).then((image) => {
          if (!image) return;
          loaded += 1;
          context.drawImage(image, tileX * 256 - originX, tileY * 256 - originY, 256, 256);
        }),
      );
    }
  }
  await Promise.all(jobs);
  if (loaded === 0) return null;

  const markerX = width / 2;
  const markerY = height / 2;
  context.strokeStyle = "#1b3a2f";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(markerX - 22, markerY);
  context.lineTo(markerX - 10, markerY);
  context.moveTo(markerX + 10, markerY);
  context.lineTo(markerX + 22, markerY);
  context.moveTo(markerX, markerY - 22);
  context.lineTo(markerX, markerY - 10);
  context.moveTo(markerX, markerY + 10);
  context.lineTo(markerX, markerY + 22);
  context.stroke();
  context.beginPath();
  context.arc(markerX, markerY, 9, 0, Math.PI * 2);
  context.fillStyle = "#c65d12";
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = "#f4f0e6";
  context.stroke();

  const metersPerPixel = (156543.03392 * Math.cos(latRad)) / n;
  const steps = [20, 50, 100, 200, 500, 1000, 2000];
  let meters = 100;
  for (const step of steps) {
    if (step / metersPerPixel < width * 0.38) meters = step;
  }
  const bar = meters / metersPerPixel;
  context.fillStyle = "rgba(244,240,230,0.94)";
  context.fillRect(28, height - 92, bar + 28, 44);
  context.strokeStyle = "#1c1915";
  context.lineWidth = 3;
  context.strokeRect(40, height - 74, bar, 10);
  context.fillStyle = "#1c1915";
  context.font = "600 22px sans-serif";
  context.fillText(meters >= 1000 ? `${meters / 1000} km` : `${meters} m`, 44, height - 78);

  context.fillStyle = "rgba(244,240,230,0.94)";
  context.fillRect(0, height - 40, width, 40);
  context.fillStyle = "#1c1915";
  context.font = "20px sans-serif";
  context.fillText("© swisstopo — carte nationale suisse", 20, height - 14);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}
