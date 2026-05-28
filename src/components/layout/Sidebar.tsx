import { CheckCircle2, Download, Eye, FileUp, PenLine, ShieldCheck } from "lucide-react";
import { useTranslation } from "../../features/i18n/useTranslation";
import { classNames } from "../ui/classNames";

export type WorkflowStep = "import" | "watermark" | "preview" | "export" | "security";

interface SidebarProps {
  activeStep: WorkflowStep;
  hasDocument: boolean;
  watermarkReady: boolean;
  onChange: (step: WorkflowStep) => void;
}

export function Sidebar({ activeStep, hasDocument, watermarkReady, onChange }: SidebarProps) {
  const { t } = useTranslation();
  const items = [
    {
      step: "import" as const,
      label: t("workflow.import"),
      complete: hasDocument,
      icon: FileUp,
    },
    {
      step: "watermark" as const,
      label: t("workflow.watermark"),
      complete: watermarkReady,
      icon: PenLine,
    },
    {
      step: "preview" as const,
      label: t("workflow.preview"),
      complete: false,
      icon: Eye,
    },
    {
      step: "export" as const,
      label: t("workflow.export"),
      complete: false,
      icon: Download,
    },
  ];

  return (
    <aside className="flex w-full shrink-0 items-center gap-2 overflow-x-auto border-b border-graphite-700 bg-graphite-950 px-2 py-2 shadow-[inset_0_-1px_0_rgba(255,255,255,0.02)] lg:w-44 lg:flex-col lg:items-stretch lg:overflow-visible lg:border-b-0 lg:border-r lg:py-3 lg:shadow-[inset_-1px_0_0_rgba(255,255,255,0.02)]">
      <nav className="flex gap-1 lg:grid" aria-label="Workflow">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeStep === item.step;

          return (
            <button
              key={item.step}
              type="button"
              onClick={() => onChange(item.step)}
              className={classNames(
                "flex min-h-10 shrink-0 items-center gap-2 rounded-md border-l-2 px-3 py-2 text-left text-sm transition-colors",
                active
                  ? "border-brand-red bg-graphite-800 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
                  : "border-transparent text-steel-300 hover:bg-graphite-900 hover:text-white",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="mt-0.5 grid h-5 w-5 place-items-center">
                {item.complete ? (
                  <CheckCircle2 size={17} className="text-local-500" aria-hidden="true" />
                ) : (
                  <Icon size={17} aria-hidden="true" />
                )}
              </span>
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => onChange("security")}
        className={classNames(
          "flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors lg:mt-auto",
          activeStep === "security"
            ? "bg-graphite-800 text-white"
            : "text-steel-400 hover:bg-graphite-900 hover:text-white",
        )}
        aria-current={activeStep === "security" ? "page" : undefined}
      >
        <ShieldCheck size={15} aria-hidden="true" />
        <span>{t("workflow.security")}</span>
      </button>
    </aside>
  );
}
