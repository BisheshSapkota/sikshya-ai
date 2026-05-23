export const MAX_ATTACHMENTS = 4;
export const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB per file

export const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
] as const;

export type PendingAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  base64: string;
  previewUrl?: string;
  textContent?: string;
};

export type FileReadError = { name: string; reason: string };

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function stripDataUrlPrefix(dataUrl: string): string {
  const i = dataUrl.indexOf(",");
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

export async function filesToAttachments(
  fileList: FileList | File[]
): Promise<{ ok: PendingAttachment[]; errors: FileReadError[] }> {
  const files = Array.from(fileList);
  const ok: PendingAttachment[] = [];
  const errors: FileReadError[] = [];

  if (files.length > MAX_ATTACHMENTS) {
    errors.push({
      name: "selection",
      reason: `Max ${MAX_ATTACHMENTS} files at once.`,
    });
    return { ok, errors };
  }

  for (const file of files) {
    if (!ACCEPTED_MIME.includes(file.type as (typeof ACCEPTED_MIME)[number])) {
      errors.push({
        name: file.name,
        reason: "Use JPG, PNG, WebP, GIF, PDF, or TXT.",
      });
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      errors.push({
        name: file.name,
        reason: "File too large (max 4 MB).",
      });
      continue;
    }

    try {
      if (file.type === "text/plain") {
        const text = await readAsText(file);
        const trimmed =
          text.length > 8000 ? `${text.slice(0, 8000)}\n…[truncated]` : text;
        ok.push({
          id: `${Date.now()}-${file.name}`,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          base64: "",
          textContent: trimmed,
        });
      } else {
        const dataUrl = await readAsDataUrl(file);
        const base64 = stripDataUrlPrefix(dataUrl);
        ok.push({
          id: `${Date.now()}-${file.name}`,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          base64,
          previewUrl: file.type.startsWith("image/") ? dataUrl : undefined,
        });
      }
    } catch {
      errors.push({ name: file.name, reason: "Could not read file." });
    }
  }

  return { ok, errors };
}
