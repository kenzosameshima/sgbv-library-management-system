param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

Write-Host "Running restore test from: $BackupFile"
$restoreCmd = "gzip -dc \"$BackupFile\" | psql \"$DatabaseUrl\""
cmd /c $restoreCmd | Out-Null

Write-Host "Restore test finished successfully."
