"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Show pages in range [start, end]
  const range = 2;
  let start = Math.max(1, currentPage - range);
  let end = Math.min(totalPages, currentPage + range);

  // Ensure we always show at least 5 pages when possible
  if (end - start < range * 2) {
    if (start === 1) {
      end = Math.min(totalPages, start + range * 2);
    } else if (end === totalPages) {
      start = Math.max(1, end - range * 2);
    }
  }

  const pages: number[] = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <nav className="mt-8 flex items-center justify-center gap-1">
      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        이전
      </button>

      {/* First page + ellipsis */}
      {start > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            1
          </button>
          {start > 2 && (
            <span className="px-2 text-sm text-gray-400">...</span>
          )}
        </>
      )}

      {/* Page numbers */}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            p === currentPage
              ? "border-navy-light bg-navy-light text-white"
              : "border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
        >
          {p}
        </button>
      ))}

      {/* Last page + ellipsis */}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="px-2 text-sm text-gray-400">...</span>
          )}
          <button
            onClick={() => onPageChange(totalPages)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        다음
      </button>
    </nav>
  );
}
