import React, { useEffect, useState } from 'react';
import PropTypes from "prop-types";
import withRouter from '../Components/Common/withRouter';

//import Components
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { changeLayoutMode } from "../slices/layouts/thunk";
import { changeHTMLAttribute } from "../slices/layouts/utils";

//redux
import { useSelector, useDispatch } from "react-redux";

const Layout = (props : any) => {
    const [headerClass, setHeaderClass] = useState("");
    const dispatch : any = useDispatch();
    const {
        layoutType,
        leftSidebarType,
        layoutModeType,
        layoutThemeColorType,
        layoutThemeType,
        layoutWidthType,
        layoutPositionType,
        topbarThemeType,
        leftsidbarSizeType,
        leftSidebarViewType,
        leftSidebarImageType,
        sidebarVisibilitytype
    } = useSelector((state: any) => state.Layout);

    /*
    layout settings
    */
    useEffect(() => {
        if (
            layoutType ||
            leftSidebarType ||
            layoutModeType ||
            layoutThemeType ||
            layoutThemeColorType ||
            layoutWidthType ||
            layoutPositionType ||
            topbarThemeType ||
            leftsidbarSizeType ||
            leftSidebarViewType ||
            leftSidebarImageType ||
            sidebarVisibilitytype
        ) {
            window.dispatchEvent(new Event('resize'));
            changeHTMLAttribute("data-layout", layoutType);
            changeHTMLAttribute("data-sidebar", leftSidebarType);
            changeHTMLAttribute("data-bs-theme", layoutModeType);
            changeHTMLAttribute("data-theme-colors", layoutThemeColorType);
            changeHTMLAttribute("data-theme", layoutThemeType);
            changeHTMLAttribute(
                "data-layout-width",
                layoutWidthType === "lg" ? "fluid" : "boxed"
            );
            changeHTMLAttribute("data-layout-position", layoutPositionType);
            changeHTMLAttribute("data-topbar", topbarThemeType);
            changeHTMLAttribute("data-sidebar-size", leftsidbarSizeType);
            changeHTMLAttribute("data-layout-style", leftSidebarViewType);
            changeHTMLAttribute("data-sidebar-image", leftSidebarImageType);
            changeHTMLAttribute("data-sidebar-visibility", sidebarVisibilitytype);
        }
    }, [layoutType,
        leftSidebarType,
        layoutModeType,
        layoutThemeType,
        layoutThemeColorType,
        layoutWidthType,
        layoutPositionType,
        topbarThemeType,
        leftsidbarSizeType,
        leftSidebarViewType,
        leftSidebarImageType,
        sidebarVisibilitytype,
        dispatch]);
    /*
    call dark/light mode
    */
    const onChangeLayoutMode = (value : any) => {
        if (changeLayoutMode) {
            dispatch(changeLayoutMode(value));
        }
    };

    // class add remove in header 
    useEffect(() => {
        const scrollNavigation = () => {
            const scrollup = document.documentElement.scrollTop;
            setHeaderClass(scrollup > 50 ? "topbar-shadow" : "");
        };

        window.addEventListener("scroll", scrollNavigation, true);
        return () => {
            window.removeEventListener("scroll", scrollNavigation, true);
        };
    }, []);

    useEffect(() => {
        const humberIcon = document.querySelector(".hamburger-icon") as HTMLElement | null;
        if (!humberIcon) {
            return;
        }

        if (sidebarVisibilitytype === 'show' || layoutType === "vertical" || layoutType === "twocolumn") {
            humberIcon.classList.remove('open');
        } else {
            humberIcon.classList.add('open');
        }
    }, [sidebarVisibilitytype, layoutType]);

    return (
        <React.Fragment>
            <div id="layout-wrapper">
                <Header
                    headerClass={headerClass}
                    layoutModeType={layoutModeType}
                    onChangeLayoutMode={onChangeLayoutMode} />
                <Sidebar />
                <div className="main-content">
                    {props.children}
                    <Footer />
                </div>
            </div>
            {/* <RightSidebar /> */}
        </React.Fragment>

    );
};

Layout.propTypes = {
    children: PropTypes.object,
};

export default withRouter(Layout);
