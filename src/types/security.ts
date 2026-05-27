export type PrivacyCheckStatus = "pass" | "warning" | "info";

export interface PrivacyCheckItem {
  id: string;
  label: string;
  status: PrivacyCheckStatus;
  detail: string;
}

export interface PrivacyCheckResult {
  completedAt: string;
  summary: string;
  items: PrivacyCheckItem[];
}
