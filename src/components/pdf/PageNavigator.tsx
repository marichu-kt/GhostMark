import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "../../features/i18n/useTranslation";
import { Button } from "../ui/Button";

interface PageNavigatorProps {
  currentPage: number;
  visiblePages: number;
  totalPages: number;
  largePdfMode?: boolean;
  onChange: (page: number) => void;
}

export function PageNavigator({
  currentPage,
  visiblePages,
  totalPages,
  largePdfMode = false,
  onChange,
}: PageNavigatorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Button
        size="icon"
        variant="quiet"
        aria-label={t("actions.previousPage")}
        disabled={currentPage <= 1}
        onClick={() => onChange(currentPage - 1)}
      >
        <ChevronLeft size={17} aria-hidden="true" />
      </Button>
      <span className="min-w-24 text-center text-xs text-steel-200 sm:min-w-36">
        {largePdfMode
          ? t("largePdf.pageIndicator", {
              current: currentPage,
              visible: visiblePages,
              total: totalPages,
            })
          : `${t("preview.page")} ${currentPage} ${t("preview.of")} ${totalPages}`}
      </span>
      <Button
        size="icon"
        variant="quiet"
        aria-label={t("actions.nextPage")}
        disabled={currentPage >= visiblePages}
        onClick={() => onChange(currentPage + 1)}
      >
        <ChevronRight size={17} aria-hidden="true" />
      </Button>
    </div>
  );
}
