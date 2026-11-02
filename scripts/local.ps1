param([switch]$Stop)

$ErrorActionPreference = 'Stop'
$portal = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $portal '.local'
$stateFile = Join-Path $runtime 'services.json'
$runner = Join-Path $PSScriptRoot 'run-local-service.ps1'

if ($Stop) {
    if (-not (Test-Path $stateFile)) { Write-Host 'No hay servicios registrados.'; return }
    foreach ($service in (Get-Content $stateFile -Raw | ConvertFrom-Json)) {
        $process = Get-Process -Id $service.pid -ErrorAction SilentlyContinue
        if ($process -and $process.StartTime.ToUniversalTime().Ticks -eq [long]$service.startTicks) {
            & taskkill.exe /PID $process.Id /T /F
        }
    }
    Remove-Item -LiteralPath $stateFile
    return
}

if (Test-Path $stateFile) {
    foreach ($service in (Get-Content $stateFile -Raw | ConvertFrom-Json)) {
        $process = Get-Process -Id $service.pid -ErrorAction SilentlyContinue
        if ($process -and $process.StartTime.ToUniversalTime().Ticks -eq [long]$service.startTicks) {
            throw 'Ya hay servicios registrados en ejecucion. Usa .\scripts\local.ps1 -Stop antes de reiniciar.'
        }
    }
}
foreach ($port in @(3000, 5001, 8000)) {
    if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
        throw "El puerto $port ya esta ocupado. No se iniciaron servicios."
    }
}

$projects = Split-Path $portal -Parent
foreach ($dependency in @(
    (Join-Path $portal 'node_modules/react-scripts/bin/react-scripts.js'),
    (Join-Path $projects 'app-django-docuware/venv/Scripts/python.exe'),
    (Join-Path $projects 'app-flask-ocr-lector/.venv/Scripts/python.exe')
)) {
    if (-not (Test-Path $dependency)) { throw "Falta dependencia: $dependency" }
}

New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$services = @()
foreach ($name in @('ocr', 'api', 'worker', 'frontend')) {
    $process = Start-Process -FilePath (Get-Process -Id $PID).Path -ArgumentList @(
        '-NoProfile', '-File', "`"$runner`"", '-Service', $name
    ) -WorkingDirectory $portal -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $runtime "$name.stdout.log") `
        -RedirectStandardError (Join-Path $runtime "$name.stderr.log")
    $services += [pscustomobject]@{
        name = $name
        pid = $process.Id
        startTicks = $process.StartTime.ToUniversalTime().Ticks.ToString()
    }
    ConvertTo-Json -InputObject $services | Set-Content $stateFile
}
Write-Host 'Servicios lanzados. Revisa .local/*.log para confirmar el arranque.'
Write-Host 'Portal: http://localhost:3000 | API: http://localhost:8000 | OCR: http://localhost:5001'
