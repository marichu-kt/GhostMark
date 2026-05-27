import { Download, FileUp, ListChecks, PenLine, ShieldCheck } from "lucide-react";
import { useTranslation } from "../../features/i18n/useTranslation";
import { classNames } from "../ui/classNames";

export type WorkflowStep = "import" | "design" | "pageRules" | "security" | "export";

interface SidebarProps {
  activeStep: WorkflowStep;
  onChange: (step: WorkflowStep) => void;
}

export function Sidebar({ activeStep, onChange }: SidebarProps) {
  const { t } = useTranslation();
  const items = [
    { step: "import" as const, label: t("workflow.import"), icon: FileUp },
    { step: "design" as const, label: t("workflow.design"), icon: PenLine },
    { step: "pageRules" as const, label: t("workflow.pageRules"), icon: ListChecks },
    { step: "security" as const, label: t("workflow.security"), icon: ShieldCheck },
    { step: "export" as const, label: t("workflow.export"), icon: Download },
  ];

  return (
    <aside className="w-56 shrink-0 border-r border-graphite-700 bg-graphite-950 px-3 py-4">
      <nav className="grid gap-1" aria-label="Workflow">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeStep === item.step;

          return (
            <button
              key={item.step}
              type="button"
              onClick={() => onChange(item.step)}
              className={classNames(
                "flex min-h-10 items-center gap-3 rounded-md px-3 text-left text-sm transition-colors",
                active
                  ? "bg-graphite-800 text-white"
                  : "text-steel-300 hover:bg-graphite-900 hover:text-white",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={17} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
