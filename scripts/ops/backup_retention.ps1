param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$BackupDir,
  [int]$KeepDailyDays = 30,
  [int]$KeepWeeklyWeeks = 12
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $BackupDir)) {
  New-Item -Path $BackupDir -ItemType Directory | Out-Null
}

$now = Get-Date
$dailyFile = Join-Path $BackupDir ("sgb_daily_{0}.sql.gz" -f $now.ToString("yyyyMMdd_HHmmss"))

Write-Host "Creating backup: $dailyFile"
$pgDumpCmd = "pg_dump \"$DatabaseUrl\" | gzip > \"$dailyFile\""
cmd /c $pgDumpCmd | Out-Null

Write-Host "Applying retention policy..."
Get-ChildItem -Path $BackupDir -Filter "sgb_daily_*.sql.gz" |
  Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-$KeepDailyDays) } |
  Remove-Item -Force

$weekBoundary = (Get-Date).AddDays(-7 * $KeepWeeklyWeeks)
Get-ChildItem -Path $BackupDir -Filter "sgb_weekly_*.sql.gz" |
  Where-Object { $_.CreationTime -lt $weekBoundary } |
  Remove-Item -Force

if ($now.DayOfWeek -eq [System.DayOfWeek]::Sunday) {
  $weeklyFile = Join-Path $BackupDir ("sgb_weekly_{0}.sql.gz" -f $now.ToString("yyyyMMdd_HHmmss"))
  Copy-Item -Path $dailyFile -Destination $weeklyFile -Force
  Write-Host "Weekly backup snapshot created: $weeklyFile"
}

Write-Host "Backup and retention completed."
