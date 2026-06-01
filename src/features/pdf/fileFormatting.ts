export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

export function createDownloadFileName(inputName: string): string {
  const baseName = inputName.replace(/\.pdf$/i, "").trim();
  const safeBaseName = baseName
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[-. ]+$/g, "")
    .trim();

  return safeBaseName ? `${safeBaseName}-GhostMark.pdf` : "GhostMark-output.pdf";
}
