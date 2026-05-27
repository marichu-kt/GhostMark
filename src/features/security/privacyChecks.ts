import type { LoadedPdf } from "../../types/pdf";
import type { PrivacyCheckItem, PrivacyCheckResult } from "../../types/security";
import { networkPolicy } from "./networkPolicy";

interface PrivacyCheckInput {
  loadedPdf: LoadedPdf | null;
  classifiedMode: boolean;
}

function item(
  id: string,
  label: string,
  detail: string,
  status: PrivacyCheckItem["status"] = "pass",
): PrivacyCheckItem {
  return { id, label, detail, status };
}

export function runPrivacyChecks({ loadedPdf, classifiedMode }: PrivacyCheckInput): PrivacyCheckResult {
  return {
    completedAt: new Date().toISOString(),
    summary:
      "Privacy check completed. This verifies GhostMark's application configuration. It does not audit the hosting provider, browser extensions, operating system, or network environment.",
    items: [
      item(
        "upload-endpoint",
        "No upload endpoint is configured",
        networkPolicy.uploadEndpoint === null
          ? "GhostMark has no configured destination for PDF uploads."
          : "An upload endpoint is configured.",
        networkPolicy.uploadEndpoint === null ? "pass" : "warning",
      ),
      item(
        "analytics-provider",
        "No analytics provider is configured",
        networkPolicy.analyticsProvider === null
          ? "No analytics provider is present in application configuration."
          : "An analytics provider is configured.",
        networkPolicy.analyticsProvider === null ? "pass" : "warning",
      ),
      item(
        "document-persistence",
        "Document persistence is disabled",
        networkPolicy.documentPersistenceEnabled
          ? "Document persistence is enabled."
          : "Documents are kept in React state and browser memory only.",
        networkPolicy.documentPersistenceEnabled ? "warning" : "pass",
      ),
      item(
        "external-cdn",
        "External CDN URLs are not configured",
        networkPolicy.externalCdnUrls.length === 0
          ? "The app is built from local project dependencies."
          : "External CDN URLs are configured.",
        networkPolicy.externalCdnUrls.length === 0 ? "pass" : "warning",
      ),
      item(
        "memory-reference",
        "Active PDF reference is memory-only",
        loadedPdf
          ? "A document is loaded in browser memory for the current session."
          : "No active document is loaded.",
        "info",
      ),
      item(
        "classified-mode",
        "Classified Mode behavior",
        classifiedMode
          ? "Classified Mode is active. Language selection is memory-only and stricter cleanup is recommended after export."
          : "Classified Mode is not active.",
        classifiedMode ? "pass" : "info",
      ),
    ],
  };
}
