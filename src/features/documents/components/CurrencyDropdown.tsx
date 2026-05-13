import React, { useState } from "react";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
} from "reactstrap";

interface CurrencyDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

const currencyOptions = [
  { code: "PEN", label: "PEN", flag: "https://flagcdn.com/w40/pe.png" },
  { code: "USD", label: "USD", flag: "https://flagcdn.com/w40/us.png" },
];

const CurrencyDropdown: React.FC<CurrencyDropdownProps> = ({
  value,
  onChange,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedOption =
    currencyOptions.find((option) => option.code === value) ||
    currencyOptions[0];

  return (
    <Dropdown isOpen={dropdownOpen} toggle={() => setDropdownOpen((prev) => !prev)}>
      <DropdownToggle
        caret
        className="bg-white text-dark border"
        style={{ display: "flex", alignItems: "center" }}
      >
        <img
          src={selectedOption.flag}
          alt={selectedOption.label}
          style={{ width: "20px", marginRight: "8px" }}
        />
        {selectedOption.label}
      </DropdownToggle>
      <DropdownMenu className="bg-white">
        {currencyOptions.map((option) => (
          <DropdownItem
            key={option.code}
            onClick={() => onChange(option.code)}
            active={option.code === value}
            className="bg-white text-dark"
          >
            <img
              src={option.flag}
              alt={option.label}
              style={{ width: "20px", marginRight: "8px" }}
            />
            {option.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

export default CurrencyDropdown;
