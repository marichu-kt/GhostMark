import type { PageRuleConfig } from "../../types/watermark";

export class PageSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PageSelectionError";
  }
}

function assertTotalPages(totalPages: number) {
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    throw new PageSelectionError("Page count must be a positive integer.");
  }
}

function parsePositivePage(value: string, totalPages: number): number {
  if (!/^\d+$/.test(value)) {
    throw new PageSelectionError(`"${value}" is not a valid page number.`);
  }

  const page = Number(value);

  if (page < 1) {
    throw new PageSelectionError("Page numbers start at 1.");
  }

  if (page > totalPages) {
    throw new PageSelectionError(`Page ${page} is outside the document range of 1-${totalPages}.`);
  }

  return page - 1;
}

export function parsePageSelection(input: string, totalPages: number): number[] {
  assertTotalPages(totalPages);

  const trimmed = input.trim();

  if (!trimmed) {
    throw new PageSelectionError("Enter at least one page number or range.");
  }

  const pages = new Set<number>();
  const tokens = trimmed.split(",").map((token) => token.trim());

  for (const token of tokens) {
    if (!token) {
      throw new PageSelectionError("Remove empty entries from the page selection.");
    }

    if (token.includes("-")) {
      const parts = token.split("-").map((part) => part.trim());

      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new PageSelectionError(`"${token}" is not a valid page range.`);
      }

      const start = parsePositivePage(parts[0], totalPages);
      const end = parsePositivePage(parts[1], totalPages);

      if (start > end) {
        throw new PageSelectionError(`Range "${token}" must start before it ends.`);
      }

      for (let page = start; page <= end; page += 1) {
        pages.add(page);
      }
    } else {
      pages.add(parsePositivePage(token, totalPages));
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

export function resolvePageRules(config: PageRuleConfig, totalPages: number): number[] {
  assertTotalPages(totalPages);

  const allPages = Array.from({ length: totalPages }, (_, index) => index);

  switch (config.mode) {
    case "all":
      return allPages;
    case "first":
      return [0];
    case "last":
      return [totalPages - 1];
    case "odd":
      return allPages.filter((index) => (index + 1) % 2 === 1);
    case "even":
      return allPages.filter((index) => (index + 1) % 2 === 0);
    case "range":
    case "specific":
      return parsePageSelection(config.selection, totalPages);
    case "exclude": {
      const excluded = new Set(parsePageSelection(config.selection, totalPages));
      return allPages.filter((index) => !excluded.has(index));
    }
    default:
      return allPages;
  }
}
