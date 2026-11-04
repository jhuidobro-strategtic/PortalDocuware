import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, CardBody, Col, Container, Row, Spinner } from "reactstrap";
import BreadCrumb from "../../components/common/BreadCrumb";
import { getPreferenceUserId } from "../../helpers/ui-preferences";
import { fetchCatalog, fetchCategorizedSigners, fetchSuppliers } from "../documents/services/orderC.service";
import PreOrderForm, { PreOrderOptions } from "./PreOrderForm";
import { getPreOrders, savePreOrder } from "./services";
import type { PreOrder, PreOrderDraft } from "./types";
import "./PreOrders.css";

const PreOrderFormView = () => {
  const { preOrderId } = useParams<{ preOrderId: string }>();
  const navigate = useNavigate(); const userId = Number(getPreferenceUserId());
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [row, setRow] = useState<PreOrder | null>(null); const [options, setOptions] = useState<PreOrderOptions | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const previewUrl = filePreviewUrl || row?.files[0]?.url;
  const creatorName = (() => { try { const user = JSON.parse(sessionStorage.getItem("authUser") || "{}").data; return user?.fullName || user?.fullname || user?.userName || ""; } catch { return ""; } })();
  useEffect(() => {
    let alive = true; setLoading(true); setError(""); setRow(null); setOptions(null);
    document.title = `${preOrderId ? "Editar preorden" : "Nueva preorden"} | Docuware`;
    const load = async () => {
      if (!userId) throw new Error("No fue posible identificar al usuario.");
      const [suppliers, signers, payment, currency, stores, records] = await Promise.all([
        fetchSuppliers(), fetchCategorizedSigners(), fetchCatalog("PAYMENT_CONDITION"), fetchCatalog("MONEY"), fetchCatalog("STORE_WAREHOUSE"),
        preOrderId ? getPreOrders(userId) : Promise.resolve([]),
      ]);
      const existing = preOrderId ? records.find((item) => item.id === Number(preOrderId)) : null;
      if (preOrderId && !existing) throw new Error("No se encontró la preorden o no tiene acceso a ella.");
      if (existing && (existing.creator_id !== userId || !["DRAFT", "PENDING", "REJECTED"].includes(existing.status))) {
        throw new Error("Solo el creador puede editar una preorden antes de la firma Senior.");
      }
      if (alive) { setRow(existing ?? null); setOptions({ suppliers, seniors: signers.seniorSigners, payment, currency, stores }); }
    };
    load().catch((failure) => { if (alive) setError(failure.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [preOrderId, userId]);
  const save = async (draft: PreOrderDraft, file: File | null) => {
    await savePreOrder(draft, file, userId, row?.id);
    navigate("/pre-orders", { replace: true, state: { message: "Preorden guardada y enviada al Senior." } });
  };
  return <div className="page-content"><Container fluid>
    <BreadCrumb title={preOrderId ? "Editar preorden" : "Nueva preorden"} pageTitle="Pre-Órdenes" />
    {loading ? <Card><CardBody> <div className="preorder-loading" aria-busy="true"><Spinner color="primary" /></div></CardBody></Card> : error ? <Card><CardBody>
        <div className="alert alert-danger" role="alert">{error}</div><Button color="light" onClick={() => navigate("/pre-orders", { replace: true })}>Volver a Pre-Órdenes</Button>
      </CardBody></Card> : options && <Row className="align-items-start"><Col lg={6}><Card><CardBody><PreOrderForm key={row?.id || "new"} row={row} options={options} creatorName={creatorName}
        onClose={() => navigate("/pre-orders", { replace: true })} onSave={save}
        onPreviewChange={setFilePreviewUrl} extractionWarnings={row?.status === "DRAFT" ? row.order_data.extraction?.warnings : undefined} />
      </CardBody></Card></Col><Col lg={6} className="preorder-preview-column">
        <Card><CardBody>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <h4 className="mb-0">Vista previa del documento</h4>
            {previewUrl && <a href={previewUrl} target="_blank" rel="noopener noreferrer">Abrir PDF <i className="ri-external-link-line" aria-hidden="true" /></a>}
          </div>
          {previewUrl ? <iframe title="Documento original de la preorden" src={previewUrl} className="preorder-source-preview w-100 border rounded" />
            : <div className="preorder-preview-empty text-muted">Seleccione el documento de sustento PDF para visualizarlo aquí.</div>}
        </CardBody></Card>
      </Col></Row>}

  </Container></div>;
};
export default PreOrderFormView;
