import React, { ReactNode, useMemo, useState } from "react";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
} from "reactstrap";
import "./TableActionsMenu.css";

type TableActionTone = "primary" | "neutral" | "danger" | "success" | "warning";

export interface TableActionItem {
  id: string;
  label: ReactNode;
  icon: string;
  onClick?: () => void;
  disabled?: boolean;
  hidden?: boolean;
  tone?: TableActionTone;
}

interface TableActionsMenuProps {
  items: TableActionItem[];
  disabled?: boolean;
}

const TableActionsMenu: React.FC<TableActionsMenuProps> = ({
  items,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);

  const visibleItems = useMemo(
    () => items.filter((item) => !item.hidden),
    [items]
  );

  const isDisabled = disabled || visibleItems.length === 0;

  const toggle = () => {
    if (isDisabled) {
      return;
    }

    setOpen((prev) => !prev);
  };

  return (
    <Dropdown
      isOpen={open}
      toggle={toggle}
      className="table-actions-menu"
      direction="down"
    >
      <DropdownToggle
        tag="button"
        type="button"
        className="table-actions-menu__trigger"
        disabled={isDisabled}
      >
        <i className="ri-more-fill" />
      </DropdownToggle>

      <DropdownMenu end className="table-actions-menu__dropdown">
        {visibleItems.map((item) => (
          <DropdownItem
            key={item.id}
            disabled={item.disabled}
            className={`table-actions-menu__item table-actions-menu__item--${
              item.tone || "neutral"
            }`}
            onClick={() => item.onClick?.()}
          >
            <i className={`${item.icon} table-actions-menu__item-icon`} />
            <span>{item.label}</span>
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

export default TableActionsMenu;
