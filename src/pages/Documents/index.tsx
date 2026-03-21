import React from 'react';
import { Container } from 'reactstrap';
import { useTranslation } from "react-i18next";

//import Components
import BreadCrumb from '../../Components/Common/BreadCrumb';
import AllTasks from './AllTasks';


const DashboardDocuments = () => {
    const { t } = useTranslation();
document.title=`${t("Documents")} | Docuware`;
    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Documents" pageTitle="Dashboards" />                    
                    <AllTasks />
                </Container>
            </div>
        </React.Fragment>
    );
};

export default DashboardDocuments;
