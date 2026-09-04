import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type TableColumn<T> = {
  align?: "left" | "center" | "right";
  cellClassName?: string;
  header: ReactNode;
  key: string;
  render: (row: T, index: number) => ReactNode;
};

type TableProps<T> = {
  className?: string;
  columns: TableColumn<T>[];
  emptyState?: { description?: string; title: string } | ReactNode;
  error?: string;
  isLoading?: boolean;
  minWidth?: number;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T, index: number) => string | undefined;
  rowKey: (row: T, index: number) => string;
  rows: T[];
  skeletonRowCount?: number;
};

function alignClass(align: TableColumn<unknown>["align"]) {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

export function Table<T>({
  className,
  columns,
  emptyState,
  error,
  isLoading,
  minWidth = 560,
  onRowClick,
  rowClassName,
  rowKey,
  rows,
  skeletonRowCount = 4,
}: TableProps<T>) {
  const showEmpty = !isLoading && !error && rows.length === 0;

  return (
    <section
      className={cn("min-w-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-xs", className)}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]" style={{ minWidth }}>
          <thead className="text-[12.5px] font-medium tracking-[-0.005em] text-[var(--muted)]">
            <tr className="border-b border-[var(--line)]">
              {columns.map((column) => (
                <th
                  className={cn("px-5 py-2.5 font-medium whitespace-nowrap", alignClass(column.align))}
                  key={column.key}
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {isLoading ? (
              Array.from({ length: skeletonRowCount }, (_, rowIndex) => (
                <tr key={`table-skeleton-${rowIndex}`}>
                  {columns.map((column) => (
                    <td className="px-5 py-3" key={column.key}>
                      <span className="block h-4 w-full max-w-32 animate-pulse rounded-md bg-black/[0.06]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td className="px-5 py-6 text-center text-sm text-[#d70015]" colSpan={columns.length}>
                  {error}
                </td>
              </tr>
            ) : showEmpty ? (
              <tr>
                <td className="px-5 py-10 text-center" colSpan={columns.length}>
                  {emptyState && typeof emptyState === "object" && "title" in emptyState ? (
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{emptyState.title}</p>
                      {emptyState.description ? (
                        <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--muted)]">{emptyState.description}</p>
                      ) : null}
                    </div>
                  ) : (
                    (emptyState ?? <p className="text-sm text-[var(--muted)]">No records to display.</p>)
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  className={cn(
                    "transition-colors duration-150",
                    onRowClick && "cursor-pointer hover:bg-black/[0.025]",
                    rowClassName?.(row, rowIndex),
                  )}
                  key={rowKey(row, rowIndex)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td className={cn("px-5 py-3", alignClass(column.align), column.cellClassName)} key={column.key}>
                      {column.render(row, rowIndex)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
