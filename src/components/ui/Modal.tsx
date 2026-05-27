import { type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="presentation">
      <section
        className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-md border border-graphite-700 bg-graphite-900 shadow-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between border-b border-graphite-700 px-5 py-4">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </Button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}
