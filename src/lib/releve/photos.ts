import type { Photo } from "@/lib/releve/types";

const MAX_EDGE = 1600;

export async function fileToPhoto(file: File): Promise<Photo> {
  const blob = await compressImage(file);
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return {
    id: crypto.randomUUID(),
    name: `${base}.jpg`,
    blob,
  };
}

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("canvas");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
  if (!blob) throw new Error("encode");
  return blob;
}
