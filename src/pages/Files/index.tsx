import React from 'react';
import { Col, Container, Row } from 'reactstrap';

//import Components
import BreadCrumb from '../../Components/Common/BreadCrumb';
import AllTasks from './AllTasks';
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import "simplebar-react/dist/simplebar.min.css";
import "flatpickr/dist/themes/material_blue.css";


const DashboardFiles = () => {
    document.title="Files | Docuware";
    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Files" pageTitle="Dashboards" />                    
                    {/* <AllTasks /> */}
                </Container>
            </div>
        </React.Fragment>
    );
};

export default DashboardFiles;
