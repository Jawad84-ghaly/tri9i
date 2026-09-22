param([switch]$Lan, [switch]$Tunnel, [switch]$Background)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Installer Node.js 22 LTS puis relancer.' }
if (-not (Test-Path -LiteralPath 'node_modules\expo\bin\cli')) {
  if (Get-Command pnpm -ErrorAction SilentlyContinue) { & pnpm install --frozen-lockfile }
  elseif (Get-Command npm -ErrorAction SilentlyContinue) { & npm install }
  else { throw 'Installer npm ou pnpm pour telecharger les dependances.' }
  if ($LASTEXITCODE -ne 0) { throw 'Installation des dependances interrompue.' }
}
if ($Lan -and $Tunnel) { throw 'Choisir Lan ou Tunnel, pas les deux.' }
if ($Background) {
  $localDirectory = Join-Path $PSScriptRoot '.local'
  New-Item -ItemType Directory -Path $localDirectory -Force | Out-Null
  $scriptPath = Join-Path $PSScriptRoot 'scripts\start-demo.mjs'
  $arguments = @(('"' + $scriptPath + '"'))
  if ($Tunnel) { $arguments += '--tunnel' } elseif ($Lan) { $arguments += '--lan' }
  $backgroundProcess = Start-Process -FilePath (Get-Command node).Source -ArgumentList $arguments -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localDirectory 'expo.out.log') -RedirectStandardError (Join-Path $localDirectory 'expo.err.log') -PassThru
  @{ processId = $backgroundProcess.Id; script = $scriptPath; startedAt = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $localDirectory 'background.json') -Encoding utf8
  Write-Output 'Expo demarre en arriere-plan. Attendre le QR dans .local/qr.png. Arret : ./STOP-DEMO.ps1'
  exit 0
}
if ($Tunnel) { & node scripts/start-demo.mjs --tunnel }
elseif ($Lan) { & node scripts/start-demo.mjs --lan }
else { & node scripts/start-demo.mjs }
exit $LASTEXITCODE
