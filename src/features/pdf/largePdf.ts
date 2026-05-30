export const LARGE_PDF_PAGE_THRESHOLD = 150;
export const LARGE_PDF_PREVIEW_PAGE_LIMIT = 150;

function isUsablePageCount(pageCount: number): boolean {
  return Number.isInteger(pageCount) && pageCount > 0;
}

export function shouldUseLargePdfMode(pageCount: number): boolean {
  return isUsablePageCount(pageCount) && pageCount > LARGE_PDF_PAGE_THRESHOLD;
}

export function getVisiblePageCount(pageCount: number): number {
  if (!isUsablePageCount(pageCount)) {
    return 1;
  }

  return shouldUseLargePdfMode(pageCount)
    ? LARGE_PDF_PREVIEW_PAGE_LIMIT
    : pageCount;
}

export function isPageVisibleInPreview(pageNumber: number, pageCount: number): boolean {
  if (!Number.isInteger(pageNumber) || !Number.isInteger(pageCount)) {
    return false;
  }

  if (pageNumber < 1 || pageNumber > pageCount) {
    return false;
  }

  return pageNumber <= getVisiblePageCount(pageCount);
}

export function clampPreviewPage(pageNumber: number, pageCount: number): number {
  const visiblePageCount = getVisiblePageCount(pageCount);

  if (!Number.isFinite(pageNumber)) {
    return 1;
  }

  return Math.min(Math.max(Math.floor(pageNumber), 1), visiblePageCount);
}
