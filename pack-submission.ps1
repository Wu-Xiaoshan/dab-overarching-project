# Creates a submission zip whose root contains compose.yaml, project.env,
# and folders client, database-migrations, grader, redis, server (no parent wrapper).
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Set-Location $root

$nm = Join-Path $root "client\node_modules"
if (Test-Path $nm) {
  Remove-Item -Recurse -Force $nm
}

$out = Join-Path $root "dab-overarching-project-step10.zip"
if (Test-Path $out) {
  Remove-Item -Force $out
}

$items = @(
  (Join-Path $root "compose.yaml"),
  (Join-Path $root "project.env"),
  (Join-Path $root "client"),
  (Join-Path $root "database-migrations"),
  (Join-Path $root "grader"),
  (Join-Path $root "redis"),
  (Join-Path $root "server")
)
Compress-Archive -Path $items -DestinationPath $out -Force

Write-Host "Created: $out"
Write-Host "Verify server/app.js is at zip root:"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($out)
try {
  $entry = $z.Entries | Where-Object { $_.FullName -eq "server/app.js" -or $_.FullName -eq "server\app.js" }
  if (-not $entry) {
    Write-Error "Packaging bug: server/app.js not at archive root."
  } else {
    Write-Host "OK: $($entry.FullName)"
  }
} finally {
  $z.Dispose()
}
