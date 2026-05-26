import React from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardBody,
  Container,
  Input,
  InputGroup,
  InputGroupText,
  Spinner,
  Table,
} from "reactstrap";

import AppPagination from "../../../../components/common/Pagination";
import BreadCrumb from "../../../../components/common/BreadCrumb";
import FloatingAlerts, {
  FloatingAlertItem,
} from "../../../../components/common/FloatingAlerts";
import TableActionsMenu from "../../../../components/common/TableActionsMenu";
import { formatDateTime, getStatusMeta } from "../shared/formatters";
import { FeedbackState, ScheduleSummary, ScheduleTrip } from "../shared/types";

interface MyScheduleDesktopViewProps {
  clearFeedback: () => void;
  feedback: FeedbackState | null;
  filteredTrips: ScheduleTrip[];
  isAdminProfile: boolean;
  loadingTrips: boolean;
  onOpenTripDetail: (tripId: number) => void;
  onPageChange: (page: number) => void;
  onSearchTermChange: (value: string) => void;
  paginatedTrips: ScheduleTrip[];
  searchTerm: string;
  summary: ScheduleSummary;
  totalPages: number;
  currentPage: number;
}

export const MyScheduleDesktopView = ({
  clearFeedback,
  feedback,
  filteredTrips,
  isAdminProfile,
  loadingTrips,
  onOpenTripDetail,
  onPageChange,
  onSearchTermChange,
  paginatedTrips,
  searchTerm,
  totalPages,
  currentPage,
}: MyScheduleDesktopViewProps) => {
  const { t } = useTranslation();
  const floatingAlerts: FloatingAlertItem[] = [];

  if (feedback) {
    floatingAlerts.push({
      id: "my-schedule-feedback",
      type: feedback.type,
      message: feedback.message,
      autoDismissMs:
        feedback.type === "success" || feedback.type === "info" ? 5000 : undefined,
    });
  }

  return (
    <div className="page-content">
      <Container fluid>
        <FloatingAlerts
          alerts={floatingAlerts}
          onRemove={clearFeedback}
        />

        <BreadCrumb title="My Schedule" pageTitle="Travel Expenses" />

        <Card className="border-0 shadow-sm">
          <CardBody className="p-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
              <div className="flex-grow-1">
                <h5 className="mb-1">{t("My Schedule")}</h5>
                <p className="text-muted mb-0">
                  {isAdminProfile
                    ? t("All trips available for admin profiles.")
                    : t("Trips assigned to the signed-in driver.")}
                </p>
              </div>

              <InputGroup style={{ width: "320px", maxWidth: "100%" }}>
                <InputGroupText>
                  <i className="ri-search-line" />
                </InputGroupText>
                <Input
                  value={searchTerm}
                  onChange={(event) => onSearchTermChange(event.target.value)}
                  placeholder={t("Search trips...")}
                />
              </InputGroup>
            </div>

            {loadingTrips ? (
              <div className="text-center py-5">
                <Spinner color="primary" />
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "90px" }}>ID</th>
                        <th style={{ minWidth: "220px" }}>{t("Trip Number")}</th>
                        <th style={{ width: "140px" }}>{t("Vehicle")}</th>
                        <th style={{ minWidth: "220px" }}>{t("Driver")}</th>
                        <th style={{ width: "140px" }}>{t("Origin")}</th>
                        <th style={{ width: "140px" }}>{t("Destination")}</th>
                        <th style={{ width: "170px" }}>{t("Departure Date")}</th>
                        <th style={{ width: "170px" }}>{t("Return Date")}</th>
                        <th style={{ width: "140px" }}>{t("Status")}</th>
                        <th style={{ width: "120px" }} className="text-center">
                          {t("Actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTrips.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-4">
                            {t("No trips were found.")}
                          </td>
                        </tr>
                      ) : (
                        paginatedTrips.map((trip) => {
                          const statusMeta = getStatusMeta(trip.status, t);

                          return (
                            <tr key={trip.idTrip}>
                              <td>#{trip.idTrip}</td>
                              <td>
                                <div className="fw-semibold">
                                  {trip.tripNumber || "-"}
                                </div>
                                {trip.notes ? (
                                  <div
                                    className="text-muted small text-wrap"
                                    style={{ whiteSpace: "normal" }}
                                  >
                                    {trip.notes}
                                  </div>
                                ) : null}
                              </td>
                              <td>{trip.vehicle?.label || "-"}</td>
                              <td>{trip.driver?.label || "-"}</td>
                              <td>{trip.origin?.label || "-"}</td>
                              <td>{trip.destination?.label || "-"}</td>
                              <td>{formatDateTime(trip.departureDate)}</td>
                              <td>{formatDateTime(trip.returnDate)}</td>
                              <td>
                                <span className={statusMeta.className}>
                                  <i className={statusMeta.icon} />
                                  <span>{statusMeta.label}</span>
                                </span>
                              </td>
                              <td className="text-center">
                                <TableActionsMenu
                                  items={[
                                    {
                                      id: `view-schedule-${trip.idTrip}`,
                                      label: t("View"),
                                      icon: "ri-eye-line",
                                      tone: "neutral",
                                      onClick: () => onOpenTripDetail(trip.idTrip),
                                    },
                                  ]}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="d-flex justify-content-center mt-4">
                    <AppPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={filteredTrips.length}
                      itemsPerPage={10}
                      onPageChange={onPageChange}
                    />
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </Container>
    </div>
  );
};
