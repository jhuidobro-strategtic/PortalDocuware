# Desarrollo local en Windows

Los tres repositorios deben estar juntos: `PortalDocuware`, `app-django-docuware` y `app-flask-ocr-lector`.

Desde el portal, iniciar todo:

```powershell
.\scripts\local.ps1
```

Detener los procesos iniciados por el script:

```powershell
.\scripts\local.ps1 -Stop
```

| Servicio | Direccion | Funcion |
| --- | --- | --- |
| React | http://localhost:3000 | Portal y formularios |
| Django | http://localhost:8000/api/ | API, datos, documentos e importaciones |
| Flask | http://localhost:5001 | OCR, QR y lectura de PDF |
| Worker Django | Sin puerto | Procesa importaciones con `--local-only` |

El lanzador configura el portal para la API local y Django para el OCR local. Django conserva la base externa, R2 y SUNAT configurados en su `.env`. Las acciones de escritura desde el portal afectan esos recursos externos. No se ejecutan migraciones al iniciar.

Las cargas realizadas desde esta API usan `LOCAL_INVOICE_PROCESSING=true`; el worker procesa exclusivamente los trabajos `uploaded_local`. Los registros y archivos siguen guardandose en la base y el almacenamiento externos.

Dependencias instaladas en este equipo:

- Node.js y `node_modules` del portal.
- Python 3.13 en `app-django-docuware/venv`, con su `requirements.txt`.
- Python 3.12 en `app-flask-ocr-lector/.venv`, con su `requirements.txt`.
- Tesseract en `C:\Program Files\Tesseract-OCR`; idiomas `spa` y `eng` desde `app-flask-ocr-lector/tessdata`.
- Poppler disponible en `PATH` (`pdftoppm`, `pdfinfo`, `pdftotext`).

Los logs y los identificadores de proceso se guardan en `PortalDocuware/.local/`. El script evita arrancar sobre los puertos ocupados. Para aplicar cambios de Python, detener y volver a iniciar los servicios; React conserva la recarga de desarrollo.

Comprobaciones rapidas:

```powershell
Invoke-RestMethod http://localhost:8000/health/
Invoke-RestMethod http://localhost:8000/health/db/
Invoke-RestMethod http://localhost:5001/
```
