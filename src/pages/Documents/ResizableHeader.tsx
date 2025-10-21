import React, { useState, useEffect } from "react";

interface ResizableHeaderProps {
  width: number;
  onResize: (newWidth: number) => void;
  children: React.ReactNode;
}

const ResizableHeader: React.FC<ResizableHeaderProps> = ({
  width,
  onResize,
  children,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = startWidth + (e.clientX - startX);
    // if (newWidth > 60) onResize(newWidth);
    onResize(newWidth);
  };

  const handleMouseUp = () => setIsResizing(false);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <th style={{ width, position: "relative", userSelect: "none" }}>
      {children}
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "1px",
          cursor: "col-resize",
          zIndex: 2,
          background: "rgba(0, 0, 0, 0.1)",
        }}
      />
    </th>
  );
};

export default ResizableHeader;
