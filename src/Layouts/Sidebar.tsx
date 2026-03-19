import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import SimpleBar from "simplebar-react";
import { Container } from "reactstrap";

import logoSm from "../assets/images/logo-sm.png";
import logoDark from "../assets/images/logo-dark.png";
import logoLight from "../assets/images/logo-light.png";
import VerticalLayout from "./VerticalLayouts";

const Sidebar = () => {
  useEffect(() => {
    const verticalOverlay = document.getElementsByClassName("vertical-overlay")[0];

    if (!verticalOverlay) {
      return;
    }

    const closeSidebar = () => {
      document.body.classList.remove("vertical-sidebar-enable");
    };

    verticalOverlay.addEventListener("click", closeSidebar);

    return () => {
      verticalOverlay.removeEventListener("click", closeSidebar);
    };
  }, []);

  const toggleSidebarSize = () => {
    const currentSize = document.documentElement.getAttribute("data-sidebar-size");

    if (currentSize === "sm-hover") {
      document.documentElement.setAttribute("data-sidebar-size", "sm-hover-active");
      return;
    }

    if (currentSize === "sm-hover-active") {
      document.documentElement.setAttribute("data-sidebar-size", "sm-hover");
      return;
    }

    document.documentElement.setAttribute("data-sidebar-size", "sm-hover");
  };

  return (
    <React.Fragment>
      <div className="app-menu navbar-menu">
        <div className="navbar-brand-box">
          <Link to="/documents" className="logo logo-dark">
            <span className="logo-sm">
              <img src={logoSm} alt="" height="22" />
            </span>
            <span className="logo-lg">
              <img src={logoDark} alt="" height="25" />
            </span>
          </Link>

          <Link to="/documents" className="logo logo-light">
            <span className="logo-sm">
              <img src={logoSm} alt="" height="22" />
            </span>
            <span className="logo-lg">
              <img src={logoLight} alt="" height="25" />
            </span>
          </Link>

          <button
            onClick={toggleSidebarSize}
            type="button"
            className="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover"
            id="vertical-hover"
          >
            <i className="ri-record-circle-line"></i>
          </button>
        </div>

        <SimpleBar id="scrollbar" className="h-100">
          <Container fluid>
            <div id="two-column-menu"></div>
            <ul className="navbar-nav" id="navbar-nav">
              <VerticalLayout />
            </ul>
          </Container>
        </SimpleBar>

        <div className="sidebar-background"></div>
      </div>

      <div className="vertical-overlay"></div>
    </React.Fragment>
  );
};

export default Sidebar;
