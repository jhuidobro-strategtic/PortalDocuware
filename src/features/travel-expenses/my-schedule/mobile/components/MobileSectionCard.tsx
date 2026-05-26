import React, { PropsWithChildren } from "react";

interface MobileSectionCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
}

export const MobileSectionCard = ({
  title,
  subtitle,
  children,
}: MobileSectionCardProps) => (
  <section className="my-schedule-app__mobile-section">
    <div className="my-schedule-app__mobile-section-header">
      <div>
        <h2 className="my-schedule-app__mobile-section-title">{title}</h2>
        {subtitle ? (
          <p className="my-schedule-app__mobile-section-subtitle">{subtitle}</p>
        ) : null}
      </div>
    </div>
    {children}
  </section>
);
