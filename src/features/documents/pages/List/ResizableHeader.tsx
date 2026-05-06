import React, { useCallback, useEffect, useState } from "react";

interface ResizableHeaderProps {
  children: React.ReactNode;
  width: number;
  onResize: (width: number) => void;
  className?: string;
}

const ResizableHeader: React.FC<ResizableHeaderProps> = ({
  children,
  width,
  onResize,
  className = "",
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(width);

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsResizing(true);
    setStartX(event.clientX);
    setStartWidth(width);
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isResizing) {
      return;
    }

    const newWidth = startWidth + (event.clientX - startX);

    if (newWidth > 20) {
      onResize(newWidth);
    }
  }, [isResizing, onResize, startWidth, startX]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "default";
    }

    return () => {
      document.body.style.cursor = "default";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, isResizing]);

  return (
    <th
      className={`resizable-th ${className}`}
      style={{
        width: `${width}px`,
        position: "relative",
        backgroundColor: "white",
        zIndex: isResizing ? 50 : "auto",
        userSelect: "none",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "100%",
        }}
      >
        <span
          style={{
            flexGrow: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            paddingRight: "8px",
          }}
        >
          {children}
        </span>

        <div
          onMouseDown={handleMouseDown}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: "1px",
            height: "100%",
            cursor: "col-resize",
            background: "rgba(0, 0, 0, 0.1)",
            zIndex: 100,
          }}
        />
      </div>
    </th>
  );
};

export default ResizableHeader;
