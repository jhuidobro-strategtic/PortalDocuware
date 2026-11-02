param(
    [Parameter(Mandatory)]
    [ValidateSet('frontend', 'api', 'ocr', 'worker')]
    [string]$Service
)

$ErrorActionPreference = 'Stop'
$portal = Split-Path $PSScriptRoot -Parent
$projects = Split-Path $portal -Parent
$django = Join-Path $projects 'app-django-docuware'
$ocr = Join-Path $projects 'app-flask-ocr-lector'
$env:PYTHONUNBUFFERED = '1'

switch ($Service) {
    'frontend' {
        Set-Location $portal
        $env:BROWSER = 'none'
        $env:HOST = 'localhost'
        $env:PORT = '3000'
        $env:REACT_APP_API_URL = 'http://localhost:8000/api/'
        & npm.cmd run dev
    }
    'ocr' {
        Set-Location $ocr
        $poppler = Get-Command pdftoppm.exe -ErrorAction SilentlyContinue
        if (-not $poppler) {
            $bundledPoppler = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin'
            if (Test-Path (Join-Path $bundledPoppler 'pdftoppm.exe')) {
                $env:PATH = "$bundledPoppler;$env:PATH"
                $poppler = Get-Command pdftoppm.exe -ErrorAction SilentlyContinue
            }
        }
        if (-not $poppler) { throw 'Falta Poppler (pdftoppm.exe) en PATH.' }
        $tesseract = Join-Path $env:ProgramFiles 'Tesseract-OCR'
        if (-not (Test-Path (Join-Path $tesseract 'tesseract.exe'))) {
            throw 'Falta Tesseract en Program Files\Tesseract-OCR.'
        }
        $env:PATH = "$tesseract;$env:PATH"
        $env:TESSDATA_PREFIX = Join-Path $ocr 'tessdata'
        & .\.venv\Scripts\python.exe -m flask --app app run --host 127.0.0.1 --port 5001
    }
    { $_ -in 'api', 'worker' } {
        Set-Location $django
        $env:DEBUG = 'true'
        $env:OCR_API_URL = 'http://127.0.0.1:5001/process-document'
        $env:LOCAL_INVOICE_PROCESSING = 'true'
        if ($Service -eq 'api') {
            & .\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000 --noreload
        } else {
            & .\venv\Scripts\python.exe manage.py process_invoice_jobs --local-only
        }
    }
}
exit $LASTEXITCODE
