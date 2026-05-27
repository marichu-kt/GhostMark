import { useMemo } from "react";
import type { PageRuleConfig, PageRuleMode } from "../../types/watermark";
import { parsePageSelection, resolvePageRules } from "../../features/pdf/pageRules";
import { useTranslation } from "../../features/i18n/useTranslation";
import { FieldGroup } from "../ui/FieldGroup";
import { Input } from "../ui/Input";
import { Notice } from "../ui/Notice";
import { Select } from "../ui/Select";

interface PageRulesPanelProps {
  value: PageRuleConfig;
  totalPages: number;
  onChange: (pages: PageRuleConfig) => void;
}

export function PageRulesPanel({ value, totalPages, onChange }: PageRulesPanelProps) {
  const { t } = useTranslation();
  const requiresSelection = value.mode === "range" || value.mode === "specific" || value.mode === "exclude";
  const validation = useMemo(() => {
    if (!requiresSelection) {
      return null;
    }

    try {
      const pages =
        value.mode === "exclude"
          ? resolvePageRules(value, totalPages)
          : parsePageSelection(value.selection, totalPages);
      return { error: null, count: pages.length };
    } catch (error) {
      return { error: error instanceof Error ? error.message : t("pages.invalidSelection"), count: 0 };
    }
  }, [requiresSelection, t, totalPages, value]);

  return (
    <FieldGroup title={t("workflow.pageRules")} description={t("pages.syntax")}>
      <Select
        label={t("pages.mode")}
        value={value.mode}
        onChange={(event) => onChange({ ...value, mode: event.target.value as PageRuleMode })}
        options={[
          { value: "all", label: t("pages.all") },
          { value: "first", label: t("pages.first") },
          { value: "last", label: t("pages.last") },
          { value: "odd", label: t("pages.odd") },
          { value: "even", label: t("pages.even") },
          { value: "range", label: t("pages.range") },
          { value: "specific", label: t("pages.specific") },
          { value: "exclude", label: t("pages.exclude") },
        ]}
      />
      {requiresSelection ? (
        <Input
          label={t("pages.selection")}
          value={value.selection}
          placeholder="1, 3, 5-9, 12"
          error={validation?.error ?? undefined}
          helpText={
            validation && !validation.error
              ? t("pages.selectedCount", { count: validation.count })
              : t("pages.syntax")
          }
          onChange={(event) => onChange({ ...value, selection: event.target.value })}
        />
      ) : null}
      <Notice>
        {requiresSelection && validation && !validation.error
          ? t("pages.willProcessCount", { count: validation.count })
          : t("pages.syntax")}
      </Notice>
    </FieldGroup>
  );
}
