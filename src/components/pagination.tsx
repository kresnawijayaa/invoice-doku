import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
  previousHref: string;
  nextHref: string;
};

export function Pagination({ page, totalPages, previousHref, nextHref }: PaginationProps) {
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted">
        Halaman {page} dari {totalPages}
      </p>
      <div className="flex gap-2">
        {canGoPrevious ? (
          <Link className="inline-flex h-9 items-center rounded-md border border-line bg-white px-3 font-medium text-ink" href={previousHref}>
            Previous
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center rounded-md border border-line bg-gray-50 px-3 font-medium text-muted">Previous</span>
        )}
        {canGoNext ? (
          <Link className="inline-flex h-9 items-center rounded-md border border-line bg-white px-3 font-medium text-ink" href={nextHref}>
            Next
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center rounded-md border border-line bg-gray-50 px-3 font-medium text-muted">Next</span>
        )}
      </div>
    </div>
  );
}
