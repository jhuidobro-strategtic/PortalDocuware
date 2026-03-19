import React from 'react';
import { Container } from 'reactstrap';

//import Components
import BreadCrumb from '../../Components/Common/BreadCrumb';
import AllTasks from './AllTasks';


const DashboardDocumentDetails = () => {
    document.title="Document Details | Docuware";
    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Document Details" pageTitle="Dashboards" />                    
                    <AllTasks />
                </Container>
            </div>
        </React.Fragment>
    );
};

export default DashboardDocumentDetails;
