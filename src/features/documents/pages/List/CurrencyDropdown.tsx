import React, { useState } from "react";
import {
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";

interface CurrencyDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

const CurrencyDropdown: React.FC<CurrencyDropdownProps> = ({
  value,
  onChange,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const toggle = () => setDropdownOpen((prev) => !prev);

  const options = [
    { code: "PEN", label: "PEN", flag: "https://flagcdn.com/w40/pe.png" },
    { code: "USD", label: "USD", flag: "https://flagcdn.com/w40/us.png" },
  ];

  const selected = options.find((o) => o.code === value) || options[0];

  return (
    <Dropdown isOpen={dropdownOpen} toggle={toggle}>
      <DropdownToggle
        caret
        className="bg-white text-dark border"
        style={{ display: "flex", alignItems: "center" }}
      >
        <img
          src={selected.flag}
          alt={selected.label}
          style={{ width: "20px", marginRight: "8px" }}
        />
        {selected.label}
      </DropdownToggle>
      <DropdownMenu className="bg-white">
        {options.map((opt) => (
          <DropdownItem
            key={opt.code}
            onClick={() => onChange(opt.code)}
            active={opt.code === value}
            className="bg-white text-dark"
          >
            <img
              src={opt.flag}
              alt={opt.label}
              style={{ width: "20px", marginRight: "8px" }}
            />
            {opt.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

export default CurrencyDropdown;
