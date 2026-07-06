param(
  [string]$EnvFile = ".env",
  [string]$Registry = "ghcr.io",
  [string]$Namespace = "kresnawijayaa",
  [string]$ImageName = "invoice-doku",
  [string]$Tag = "latest",
  [string]$Image = ""
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $EnvFile)) {
  Write-Error "Env file tidak ditemukan: $EnvFile"
}

if ($Image) {
  $env:APP_IMAGE = $Image
} else {
  $env:APP_IMAGE = "$Registry/$Namespace/$ImageName`:$Tag"
}

Write-Host "Image: $env:APP_IMAGE" -ForegroundColor Cyan

Write-Host "Building image..." -ForegroundColor Cyan
docker compose --env-file $EnvFile -f docker-compose.build.yml build

Write-Host "Pushing image to registry..." -ForegroundColor Cyan
docker compose --env-file $EnvFile -f docker-compose.build.yml push

Write-Host "Done." -ForegroundColor Green
