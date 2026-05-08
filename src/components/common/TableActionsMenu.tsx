import React, {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
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

interface TableActionsMenuPosition {
  top: number;
  left: number;
  placement: "top" | "bottom";
}

const MENU_VIEWPORT_MARGIN = 12;
const MENU_TRIGGER_GAP = 10;

const TableActionsMenu: React.FC<TableActionsMenuProps> = ({
  items,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TableActionsMenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const visibleItems = useMemo(
    () => items.filter((item) => !item.hidden),
    [items]
  );

  const isDisabled = disabled || visibleItems.length === 0;

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !menuRef.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const nextLeft = Math.min(
      Math.max(
        MENU_VIEWPORT_MARGIN,
        triggerRect.right - menuRect.width
      ),
      viewportWidth - menuRect.width - MENU_VIEWPORT_MARGIN
    );
    const spaceBelow = viewportHeight - triggerRect.bottom - MENU_TRIGGER_GAP;
    const spaceAbove = triggerRect.top - MENU_TRIGGER_GAP;
    const shouldOpenUpward =
      spaceBelow < menuRect.height && spaceAbove > spaceBelow;
    const nextTop = shouldOpenUpward
      ? Math.max(
          MENU_VIEWPORT_MARGIN,
          triggerRect.top - menuRect.height - MENU_TRIGGER_GAP
        )
      : Math.min(
          viewportHeight - menuRect.height - MENU_VIEWPORT_MARGIN,
          triggerRect.bottom + MENU_TRIGGER_GAP
        );

    setPosition({
      top: nextTop,
      left: nextLeft,
      placement: shouldOpenUpward ? "top" : "bottom",
    });
  }, []);

  const toggle = () => {
    if (isDisabled) {
      return;
    }

    setOpen((prev) => !prev);
  };

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    updatePosition();
  }, [open, updatePosition, visibleItems.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;

      if (
        target &&
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        closeMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    const handleViewportChange = () => {
      updatePosition();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [closeMenu, open, updatePosition]);

  return (
    <>
      <div className="table-actions-menu">
        <button
          ref={triggerRef}
          onClick={toggle}
          type="button"
          className={`table-actions-menu__trigger ${open ? "is-open" : ""}`}
          disabled={isDisabled}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <i className="ri-more-fill" />
        </button>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className={`table-actions-menu__dropdown table-actions-menu__dropdown--portal table-actions-menu__dropdown--${position?.placement || "bottom"}`}
              style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                visibility: position ? "visible" : "hidden",
              }}
              role="menu"
            >
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  className={`table-actions-menu__item table-actions-menu__item--${
                    item.tone || "neutral"
                  }`}
                  onClick={() => {
                    if (item.disabled) {
                      return;
                    }

                    item.onClick?.();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <i className={`${item.icon} table-actions-menu__item-icon`} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default TableActionsMenu;
