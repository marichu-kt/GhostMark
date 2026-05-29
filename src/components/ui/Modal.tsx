import { type MouseEvent, type ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import { useTranslation } from "../../features/i18n/useTranslation";

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ open, title, children, onClose }: ModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <section
        className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-xl border border-graphite-700 bg-[#101722]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between border-b border-graphite-700 px-5 py-4">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <Button variant="ghost" size="icon" aria-label={t("actions.close")} onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </Button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}
