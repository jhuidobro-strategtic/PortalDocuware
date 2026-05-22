import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Pagination as ReactstrapPagination,
  PaginationItem,
  PaginationLink,
} from "reactstrap";
import "./Pagination.css";

type PaginationToken = number | "ellipsis-left" | "ellipsis-right";

interface AppPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  className?: string;
}

const buildPaginationTokens = (
  currentPage: number,
  totalPages: number
): PaginationToken[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis-left",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis-left",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-right",
    totalPages,
  ];
};

const AppPagination: React.FC<AppPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className = "",
}) => {
  const { t } = useTranslation();

  const paginationTokens = useMemo(
    () => buildPaginationTokens(currentPage, totalPages),
    [currentPage, totalPages]
  );

  if (totalPages <= 1) {
    return null;
  }

  const hasResultsSummary =
    typeof totalItems === "number" &&
    Number.isFinite(totalItems) &&
    typeof itemsPerPage === "number" &&
    Number.isFinite(itemsPerPage) &&
    itemsPerPage > 0;

  const startItem = hasResultsSummary
    ? Math.min((currentPage - 1) * itemsPerPage + 1, totalItems || 0)
    : 0;
  const endItem = hasResultsSummary
    ? Math.min(currentPage * itemsPerPage, totalItems || 0)
    : 0;

  return (
    <div className={`app-pagination-shell ${className}`.trim()}>
      <div className="app-pagination-meta">
        {hasResultsSummary
          ? t("Showing {{start}} to {{end}} of {{total}} results", {
              start: startItem,
              end: endItem,
              total: totalItems,
            })
          : t("Page {{current}} of {{total}}", {
              current: currentPage,
              total: totalPages,
            })}
      </div>

      <ReactstrapPagination
        aria-label={t("Pagination")}
        className="app-pagination-list mb-0"
      >
        <PaginationItem
          disabled={currentPage === 1}
          className="app-pagination-nav-item"
        >
          <PaginationLink
            href="#"
            className="app-pagination-nav-link"
            aria-label={t("Previous")}
            onClick={(event) => {
              event.preventDefault();
              if (currentPage > 1) {
                onPageChange(currentPage - 1);
              }
            }}
          >
            <span>{t("Previous")}</span>
          </PaginationLink>
        </PaginationItem>

        {paginationTokens.map((token) =>
          typeof token === "number" ? (
            <PaginationItem key={token} active={currentPage === token}>
              <PaginationLink
                href="#"
                className="app-pagination-page-link"
                aria-label={`${t("Page")} ${token}`}
                aria-current={currentPage === token ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  onPageChange(token);
                }}
              >
                {token}
              </PaginationLink>
            </PaginationItem>
          ) : (
            <PaginationItem
              key={token}
              disabled
              className="app-pagination-ellipsis-item"
            >
              <PaginationLink
                href="#"
                className="app-pagination-ellipsis-link"
                onClick={(event) => event.preventDefault()}
                aria-hidden="true"
              >
                <span className="app-pagination-ellipsis">...</span>
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem
          disabled={currentPage === totalPages}
          className="app-pagination-nav-item"
        >
          <PaginationLink
            href="#"
            className="app-pagination-nav-link"
            aria-label={t("Next")}
            onClick={(event) => {
              event.preventDefault();
              if (currentPage < totalPages) {
                onPageChange(currentPage + 1);
              }
            }}
          >
            <span>{t("Next")}</span>
          </PaginationLink>
        </PaginationItem>
      </ReactstrapPagination>
    </div>
  );
};

export default AppPagination;
