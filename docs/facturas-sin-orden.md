# Facturas a Expedientes sin OC/OS

## Prueba local

Portal: http://localhost:3000. El arranque utiliza `.local/local_backend_settings.py` cuando existe. La copia de pruebas está en `.local/docuware-local.sqlite3`; los archivos nuevos se guardan en `.local/media`. Estos datos no se sincronizan con la base compartida.

1. Registrar y guardar una factura con proveedor/RUC, serie, número, moneda, importe positivo y PDF disponible en Gestión de documentos.
2. En Editar, debajo de Notas, pulsar **Enviar a Expedientes sin OC/OS**. La acción también aparece en el menú del registro.
3. Escribir el motivo, seleccionar Senior y, opcionalmente, Junior. Se puede adjuntar un sustento PDF de hasta 20 MB. Enviar a aprobación.
4. Cada firmante entra en **Expedientes → Envíos sin OC/OS**, revisa el PDF y aprueba/rechaza con comentario. Junior firma antes del Senior cuando está asignado.
5. Tras la aprobación final se crea un expediente pendiente de pago, sin generar OC/OS. Usar **Origen → Sin OC/OS** en Expedientes. Excel incorpora origen y motivo en ambas hojas.
6. Las NC/ND posteriores se registran desde **Ajustes NC / ND**. Una NC aprobada sobre una factura pagada puede producir saldo a favor. Es posible reservar saldos para otro expediente aprobado sin OC/OS del mismo proveedor y moneda.

## Permisos

- `expedients.send_without_order`: enviar facturas sin OC/OS; se mantienen los accesos habituales a documentos.
- `expedients.approve_without_order`: aprobar/rechazar envíos asignados en la etapa correspondiente. La cuenta también requiere la facultad de firma JR/SENIOR para ser seleccionable.
- Superadmin dispone de todos los permisos y puede intervenir en las etapas pendientes.
- La bandeja de firmas funciona sin conceder acceso a toda la lista de Expedientes.
- Pago, cierre, reapertura, eliminación y ajustes mantienen permisos separados.

En la copia local se habilitó al Senior de pruebas indicado por el usuario. No se cambiaron permisos en la base compartida.

## Controles y publicación pendiente

No se admiten duplicados por factura con OC/OS vigente, envío pendiente/aprobado o expediente existente. Se normalizan ceros iniciales del número. El envío bloquea la edición de la factura y sus ítems y la creación de una OC/OS. Un rechazo permite corregir y reenviar. Los PDF archivados se conservan con el historial.

La migración `expedientes/0011_direct_invoice_admission.py` está preparada para una futura publicación; no se aplicó a la base compartida. El commit y push no aplican esta migración automáticamente a la base compartida; debe incluirse en el despliegue del backend antes de activar el flujo en ese entorno.
