interface ThumbnailRailProps {
  pageCount: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
}

export function ThumbnailRail({ pageCount, currentPage, onSelectPage }: ThumbnailRailProps) {
  const visible = Array.from({ length: Math.min(pageCount, 8) }, (_, index) => index + 1);

  return (
    <aside className="hidden w-28 shrink-0 border-r border-graphite-700 bg-graphite-950/90 p-3 lg:block">
      <div className="grid gap-2">
        {visible.map((page) => (
          <button
            key={page}
            type="button"
            className={`grid aspect-[3/4] place-items-center rounded border text-xs ${
              page === currentPage
                ? "border-brand-red bg-document-100 text-graphite-950 shadow-[0_0_0_1px_rgba(198,40,40,0.25)]"
                : "border-graphite-700 bg-graphite-900 text-steel-300"
            }`}
            onClick={() => onSelectPage(page)}
          >
            {page}
          </button>
        ))}
      </div>
    </aside>
  );
}
