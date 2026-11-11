# Pruebas de los cambios contables 29–33

Portal local: http://localhost:3000

La API conserva la base externa configurada (`docuware_db_prd`). Guardar desde el
portal modifica esa base. Las pruebas automatizadas del backend usan SQLite; las
pruebas de navegador usan respuestas simuladas y no modifican comprobantes reales.

## Cuenta contable y centros de costo

1. Iniciar sesión y abrir Gestión de documentos → Documentos → Editar documento.
2. En Detalle de factura, buscar una cuenta por código o descripción. Por ejemplo,
   `6315093001` corresponde a Peajes - TR. El catálogo tiene 152 cuentas.
3. Para un ítem cuya descripción contiene peaje, desplegar Sugerencias por
   descripción y escoger el área correcta. Las sugerencias no se guardan sin
   selección; las variantes TR/ADM requieren revisión.
4. Comprobar que Código del ítem (proveedor) se conserva independientemente de
   Cuenta contable. Seleccionar los dos centros de costo, si corresponden.
5. Guardar. Si se ofrece generar una orden y solo se están probando los campos,
   elegir No. Volver a abrir el documento y verificar las selecciones.

## Detracciones y retenciones

1. En el mismo formulario, antes de Notas, pulsar Consultar RUC del proveedor.
   Se consulta la identidad/estado del proveedor mediante la integración existente.
   Esta consulta no determina si es agente de retención, buen contribuyente ni si
   cuenta con suspensión de honorarios.
2. Elegir Detracción o Retención y seleccionar un concepto/tasa. No se aplican
   umbrales o exoneraciones automáticamente: Contabilidad confirma la afectación.
3. Ejemplo de cálculo: para un total de 1180.00, Transporte de Carga al 4 % muestra
   descuento de 47.20 y neto de 1132.80. Es un ejemplo aritmético, no una evaluación
   de procedencia tributaria del comprobante.
4. Guardar y reabrir. El servidor conserva concepto y tasa, y recalcula el importe
   si cambia el total del comprobante. Usar Sin descuento para retirar la selección.
5. En un RH que ya tiene retención registrada, no se permite un segundo descuento.
   El importe de retención original se conserva y se exporta por separado.

## Excel de expedientes

1. Abrir Expedientes y seleccionar los filtros correspondientes al documento.
2. Pulsar Exportar Excel.
3. En Expedientes, verificar Código de documento antes de Factura y las nuevas
   columnas de descuentos/neto. Códigos: factura 01, RH 02, boleta 03, nota de
   crédito 07, nota de débito 08, otros 00. Son códigos de exportación, independientes
   de los identificadores internos.
4. En Detalle de facturas, verificar Serie y Número separados, código del proveedor,
   Cuenta contable y códigos de ambos centros de costo.
5. Las columnas de descuento/neto del detalle son datos del comprobante completo,
   repetidos por ítem y rotulados como tales. No sumarlas por ítem; usar Expedientes
   para consultar importes por expediente. Un comprobante puede estar vinculado a
   más de un expediente, por lo que tampoco debe consolidarse sin revisar duplicados.

## Alcance

Las tablas `accounting_account` y `accounting_tax_option` contienen los catálogos.
La migración `documents.0013` usa `documents/accounting_catalog.json` para la carga inicial.
El OCR actual sigue leyendo
los comprobantes. Se ofrecen sugerencias de clasificación, no una asignación
contable definitiva sin revisión. La plantilla adicional de pagos, bancos y
vencimientos no está incluida en estos cambios.

Migraciones agregadas: documents.0012, documents.0013 y documents_items.0008. Deben aplicarse al
desplegar este código en otro entorno. Django local requiere reinicio tras cambios
de Python; React tiene recarga de desarrollo.
