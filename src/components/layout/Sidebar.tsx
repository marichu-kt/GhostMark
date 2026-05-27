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
      helper: hasDocument ? t("workflow.complete") : t("workflow.importHelper"),
      complete: hasDocument,
      icon: FileUp,
    },
    {
      step: "watermark" as const,
      label: t("workflow.watermark"),
      helper: watermarkReady ? t("workflow.complete") : t("workflow.watermarkHelper"),
      complete: watermarkReady,
      icon: PenLine,
    },
    {
      step: "preview" as const,
      label: t("workflow.preview"),
      helper: hasDocument ? t("workflow.previewHelper") : t("workflow.selectPdfFirst"),
      complete: false,
      icon: Eye,
    },
    {
      step: "export" as const,
      label: t("workflow.export"),
      helper: watermarkReady ? t("workflow.exportHelper") : t("workflow.exportBlocked"),
      complete: false,
      icon: Download,
    },
    {
      step: "security" as const,
      label: t("workflow.security"),
      helper: t("workflow.securityHelper"),
      complete: false,
      icon: ShieldCheck,
    },
  ];

  return (
    <aside className="w-56 shrink-0 border-r border-graphite-700 bg-graphite-950 px-3 py-4 shadow-[inset_-1px_0_0_rgba(255,255,255,0.02)]">
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
                "flex min-h-14 items-start gap-3 rounded-md border-l-2 px-3 py-2 text-left text-sm transition-colors",
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
              <span className="grid gap-0.5">
                <span className="font-medium">{item.label}</span>
                <span className="text-xs leading-4 text-steel-400">{item.helper}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
