$ErrorActionPreference = 'Stop'
$record = Get-Content -LiteralPath (Join-Path $PSScriptRoot '.local\background.json') -Raw | ConvertFrom-Json
$expectedScript = Join-Path $PSScriptRoot 'scripts\start-demo.mjs'
if ($record.script -ne $expectedScript) { throw 'Le processus enregistre ne correspond pas a ce projet.' }
$ownedProcessId = [int]$record.processId
$ownedProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $ownedProcessId"
if (-not $ownedProcess) { Write-Output 'Expo est deja arrete.'; exit 0 }
if (-not $ownedProcess.CommandLine -or -not $ownedProcess.CommandLine.Contains($expectedScript)) { throw 'Identifiant reutilise : aucun autre processus ne sera arrete.' }
& taskkill.exe /PID $ownedProcessId /T /F
if ($LASTEXITCODE -ne 0) { throw 'Impossible d arreter le processus Expo.' }
