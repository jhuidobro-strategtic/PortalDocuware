import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  Input,
  Label,
  Row,
  Spinner,
} from "reactstrap";

import BreadCrumb from "../../Components/Common/BreadCrumb";
import { buildApiUrl } from "../../helpers/api-url";
import { Document } from "../Documents/types";

interface OrderCFormValues {
  suppliernumber: string;
  suppliername: string;
  field3: string;
  field4: string;
  field5: string;
  field6: string;
  field7: string;
  field8: string;
}

type OrderCFieldName = keyof OrderCFormValues;

interface OrderCFieldConfig {
  name: OrderCFieldName;
  label: string;
  placeholder: string;
  readOnly?: boolean;
  helperText?: string;
}

const ORDER_C_FIELDS: OrderCFieldConfig[] = [
  {
    name: "suppliernumber",
    label: "RUC",
    placeholder: "Autocompletado desde el documento",
    readOnly: true,
    helperText: "Se completa automaticamente con el RUC del registro.",
  },
  {
    name: "suppliername",
    label: "Razon Social",
    placeholder: "Autocompletado desde el documento",
    readOnly: true,
    helperText: "Se completa automaticamente con la razon social del registro.",
  },
  {
    name: "field3",
    label: "Campo 3",
    placeholder: "Pendiente de nombre",
  },
  {
    name: "field4",
    label: "Campo 4",
    placeholder: "Pendiente de nombre",
  },
  {
    name: "field5",
    label: "Campo 5",
    placeholder: "Pendiente de nombre",
  },
  {
    name: "field6",
    label: "Campo 6",
    placeholder: "Pendiente de nombre",
  },
  {
    name: "field7",
    label: "Campo 7",
    placeholder: "Pendiente de nombre",
  },
  {
    name: "field8",
    label: "Campo 8",
    placeholder: "Pendiente de nombre",
  },
];

const createInitialValues = (document: Document | null): OrderCFormValues => ({
  suppliernumber: document?.suppliernumber ?? "",
  suppliername: document?.suppliername ?? "",
  field3: "",
  field4: "",
  field5: "",
  field6: "",
  field7: "",
  field8: "",
});

const DocumentOrderC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { documentId } = useParams();
  const locationState = location.state as { document?: Document } | null;

  const [document, setDocument] = useState<Document | null>(
    locationState?.document ?? null
  );
  const [values, setValues] = useState<OrderCFormValues>(
    createInitialValues(locationState?.document ?? null)
  );
  const [loading, setLoading] = useState(!locationState?.document);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    window.document.title = "Orden C. | Docuware";
  }, []);

  useEffect(() => {
    setValues(createInitialValues(document));
  }, [document]);

  useEffect(() => {
    if (locationState?.document || !documentId) {
      setLoading(false);
      return;
    }

    const fetchDocument = async () => {
      try {
        setLoading(true);
        const response = await fetch(buildApiUrl("documents"));
        const data = await response.json();

        if (!data.success || !Array.isArray(data.data)) {
          throw new Error("No fue posible obtener el documento seleccionado.");
        }

        const selectedDocument =
          data.data.find(
            (item: Document) => String(item.documentid) === String(documentId)
          ) ?? null;

        if (!selectedDocument) {
          throw new Error("No se encontro el registro solicitado.");
        }

        setDocument(selectedDocument);
      } catch (fetchError: any) {
        setError(
          fetchError.message || "Ocurrio un error al cargar la vista Orden C."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId, locationState?.document]);

  const handleChange = (field: OrderCFieldName, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(
      "La vista Orden C. ya esta lista. Cuando me compartas los nombres finales, termino de ajustar campos y logica."
    );
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="text-center my-5">
            <Spinner color="primary" />
          </div>
        </Container>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Orden C." pageTitle="Documentos" />
          <Alert color="danger" className="mb-3">
            {error || "No se encontro informacion para esta vista."}
          </Alert>
          <Button color="light" onClick={() => navigate("/documents")}>
            Volver a Documentos
          </Button>
        </Container>
      </div>
    );
  }

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Orden C." pageTitle="Documentos" />

        <Card className="border-0 shadow-sm mb-4">
          <CardBody>
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
              <div>
                <h4 className="mb-1">Documento #{document.documentid}</h4>
                <p className="text-muted mb-2">
                  Serie {document.documentserial} - Numero {document.documentnumber}
                </p>
                <div className="d-flex flex-wrap gap-2 text-muted small">
                  <span className="badge bg-light text-secondary border">
                    Estado: {document.status ? "Activo" : "Pendiente"}
                  </span>
                  <span className="badge bg-light text-secondary border">
                    Moneda: {document.currency}
                  </span>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2">
                <Button tag={Link} to="/documents" color="light">
                  Volver
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardBody className="p-4">
            <div className="mb-4">
              <h5 className="mb-1">Formulario Orden C.</h5>
              <p className="text-muted mb-0">
                Los dos primeros campos se completan automaticamente con la
                informacion del documento seleccionado.
              </p>
            </div>

            {feedback && (
              <Alert color="info" className="mb-4">
                {feedback}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Row className="g-4">
                {ORDER_C_FIELDS.map((field) => (
                  <Col md={6} key={field.name}>
                    <div>
                      <Label className="form-label">{field.label}</Label>
                      <Input
                        value={values[field.name]}
                        onChange={(event) =>
                          handleChange(field.name, event.target.value)
                        }
                        placeholder={field.placeholder}
                        readOnly={field.readOnly}
                        className={field.readOnly ? "bg-light" : ""}
                      />
                      {field.helperText && (
                        <small className="text-muted d-block mt-1">
                          {field.helperText}
                        </small>
                      )}
                    </div>
                  </Col>
                ))}
              </Row>

              <div className="d-flex flex-wrap justify-content-end gap-2 mt-4">
                <Button type="button" color="light" onClick={() => navigate(-1)}>
                  Cancelar
                </Button>
                <Button type="submit" color="primary">
                  Guardar
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      </Container>
    </div>
  );
};

export default DocumentOrderC;
