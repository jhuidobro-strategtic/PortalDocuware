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

  return (
    <div className={`app-pagination-shell ${className}`.trim()}>
      <ReactstrapPagination
        aria-label={t("Pagination")}
        className="app-pagination-list mb-0"
      >
        <PaginationItem disabled={currentPage === 1}>
          <PaginationLink
            previous
            href="#"
            aria-label={t("Previous")}
            onClick={(event) => {
              event.preventDefault();
              if (currentPage > 1) {
                onPageChange(currentPage - 1);
              }
            }}
          />
        </PaginationItem>

        {paginationTokens.map((token) =>
          typeof token === "number" ? (
            <PaginationItem key={token} active={currentPage === token}>
              <PaginationLink
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  onPageChange(token);
                }}
              >
                {token}
              </PaginationLink>
            </PaginationItem>
          ) : (
            <PaginationItem key={token} disabled>
              <PaginationLink
                href="#"
                onClick={(event) => event.preventDefault()}
                aria-hidden="true"
              >
                ...
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem disabled={currentPage === totalPages}>
          <PaginationLink
            next
            href="#"
            aria-label={t("Next")}
            onClick={(event) => {
              event.preventDefault();
              if (currentPage < totalPages) {
                onPageChange(currentPage + 1);
              }
            }}
          />
        </PaginationItem>
      </ReactstrapPagination>

      <div className="app-pagination-meta">
        {t("Page {{current}} of {{total}}", {
          current: currentPage,
          total: totalPages,
        })}
      </div>
    </div>
  );
};

export default AppPagination;
