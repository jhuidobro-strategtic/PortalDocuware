import React from 'react';
import { Container } from 'reactstrap';

//import Components
import BreadCrumb from '../../Components/Common/BreadCrumb';
import AllTasks from './AllTasks';


const DashboardDocumentsProgramacion = () => {
document.title="Programación | Docuware";
    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Programación" pageTitle="Dashboards" />                    
                    <AllTasks />
                </Container>
            </div>
        </React.Fragment>
    );
};

export default DashboardDocumentsProgramacion;
