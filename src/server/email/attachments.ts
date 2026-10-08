/**
 * File attachments (quotations, invoices, reports…).
 * Only common business file types are allowed, the real file type is checked from its first bytes,
 * names are cleaned, and sizes are limited. File contents are never stored in the logs.
 */
import "server-only";
import { AppError } from "@/lib/errors";

export const ATTACHMENT_LIMITS = { maxFiles: 5, maxFileBytes: 10 * 1024 * 1024, maxTotalBytes: 25 * 1024 * 1024 } as const;

type Kind = { mime: string; label: string; magic?: (b: Buffer) => boolean };
const startsWith = (sig: number[]) => (b: Buffer) => sig.every((v, i) => b[i] === v);
const zip = startsWith([0x50, 0x4b, 0x03, 0x04]);

/** extension → allowed type. Office files are ZIP containers; PDF/PNG/JPG have fixed signatures. */
export const ALLOWED: Record<string, Kind> = {
  pdf: { mime: "application/pdf", label: "PDF", magic: startsWith([0x25, 0x50, 0x44, 0x46]) },
  png: { mime: "image/png", label: "Image", magic: startsWith([0x89, 0x50, 0x4e, 0x47]) },
  jpg: { mime: "image/jpeg", label: "Image", magic: startsWith([0xff, 0xd8, 0xff]) },
  jpeg: { mime: "image/jpeg", label: "Image", magic: startsWith([0xff, 0xd8, 0xff]) },
  webp: { mime: "image/webp", label: "Image", magic: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word", magic: zip },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "Excel", magic: zip },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", label: "PowerPoint", magic: zip },
  csv: { mime: "text/csv", label: "CSV" },
  txt: { mime: "text/plain", label: "Text" },
};
export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED).map((e) => `.${e}`).join(",");

export type AttachmentInput = { filename: string; content: Buffer | string; contentType?: string };
export type CleanAttachment = { filename: string; contentBase64: string; contentType: string; size: number };
export type AttachmentMeta = { filename: string; size: number; type: string };

function cleanName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[^\w.\- ()]/g, "_").replace(/\s+/g, " ").replace(/^\.+/, "").trim();
  return (cleaned || "file").slice(-120);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  const mb = n / 1024 / 1024;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

/** Validates and normalises attachments. Throws AppError("VALIDATION") with a clear reason. */
export function prepareAttachments(input: AttachmentInput[] | undefined): CleanAttachment[] {
  if (!input || input.length === 0) return [];
  if (input.length > ATTACHMENT_LIMITS.maxFiles) throw new AppError("VALIDATION", `Attach up to ${ATTACHMENT_LIMITS.maxFiles} files.`);
  let total = 0;
  return input.map((file) => {
    const filename = cleanName(file.filename);
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    const kind = ALLOWED[ext];
    if (!kind) throw new AppError("VALIDATION", `"${filename}": this file type can't be sent. Use PDF, JPG, PNG, WEBP, DOCX, XLSX, PPTX, CSV or TXT.`);

    let bytes: Buffer;
    if (Buffer.isBuffer(file.content)) bytes = file.content;
    else {
      const b64 = file.content.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) throw new AppError("VALIDATION", `"${filename}": content must be base64.`);
      bytes = Buffer.from(b64, "base64");
    }
    if (bytes.length === 0) throw new AppError("VALIDATION", `"${filename}" is empty.`);
    if (bytes.length > ATTACHMENT_LIMITS.maxFileBytes) {
      throw new AppError("VALIDATION", `"${filename}" is ${formatBytes(bytes.length)}. Each file can be up to ${formatBytes(ATTACHMENT_LIMITS.maxFileBytes)}.`);
    }
    if (kind.magic && !kind.magic(bytes)) {
      throw new AppError("VALIDATION", `"${filename}" doesn't look like a real ${ext.toUpperCase()} file. Save or export it again and retry.`);
    }
    total += bytes.length;
    if (total > ATTACHMENT_LIMITS.maxTotalBytes) {
      throw new AppError("VALIDATION", `Attachments together are over ${formatBytes(ATTACHMENT_LIMITS.maxTotalBytes)}. Send fewer or smaller files.`);
    }
    return { filename, contentBase64: bytes.toString("base64"), contentType: kind.mime, size: bytes.length };
  });
}

export const toMeta = (files: CleanAttachment[]): AttachmentMeta[] =>
  files.map((f) => ({ filename: f.filename, size: f.size, type: ALLOWED[f.filename.split(".").pop()!.toLowerCase()]?.label ?? "File" }));
