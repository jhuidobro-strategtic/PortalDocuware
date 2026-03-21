import React from 'react';
import { Link } from 'react-router-dom';
import { Col, Row } from 'reactstrap';
import { useTranslation } from "react-i18next";

interface BreadCrumbProps {
    title: string;
    pageTitle : string;
}

const BreadCrumb = ({ title, pageTitle } : BreadCrumbProps) => {
    const { t } = useTranslation();
    return (
        <React.Fragment>
            <Row>
                <Col xs={12}>
                    <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                        <h4 className="mb-sm-0">{t(title)}</h4>

                        <div className="page-title-right">
                            <ol className="breadcrumb m-0">
                                <li className="breadcrumb-item"><Link to="#">{t(pageTitle)}</Link></li>
                                <li className="breadcrumb-item active">{t(title)}</li>
                            </ol>
                        </div>

                    </div>
                </Col>
            </Row>
        </React.Fragment>
    );
};

export default BreadCrumb;
