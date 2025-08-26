# Teer Betting App - Quick Start Script
# This script will set up and start the entire application

Write-Host "=== Teer Betting App - Quick Start ===" -ForegroundColor Green
Write-Host ""

# Check if Docker is installed
try {
    $null = docker --version
    $null = docker-compose --version
    Write-Host "✓ Docker and Docker Compose found" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker or Docker Compose not found!" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "1. Build Docker containers" -ForegroundColor White
Write-Host "2. Start all services (Database, Backend, Frontend, Redis, pgAdmin)" -ForegroundColor White
Write-Host "3. Run database migrations" -ForegroundColor White
Write-Host "4. Show access URLs" -ForegroundColor White
Write-Host ""

$confirmation = Read-Host "Continue? (Y/n)"
if ($confirmation -eq 'n' -or $confirmation -eq 'N') {
    Write-Host "Setup cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "=== Step 1: Building containers ===" -ForegroundColor Blue
Write-Host "This may take a few minutes on first run..." -ForegroundColor Yellow

try {
    docker-compose build --no-cache
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
    Write-Host "✓ Containers built successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Build failed. Please check the error messages above." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "=== Step 2: Starting services ===" -ForegroundColor Blue

try {
    docker-compose up -d
    if ($LASTEXITCODE -ne 0) {
        throw "Service start failed"
    }
    Write-Host "✓ Services started successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to start services. Please check the error messages above." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "=== Step 3: Waiting for services to initialize ===" -ForegroundColor Blue
Write-Host "Waiting 30 seconds for database to be ready..." -ForegroundColor Yellow

Start-Sleep -Seconds 30

Write-Host ""
Write-Host "=== Step 4: Running database migrations ===" -ForegroundColor Blue

try {
    docker-compose exec backend alembic upgrade head
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠ Database migrations failed, but this might be normal on first run" -ForegroundColor Yellow
    } else {
        Write-Host "✓ Database migrations completed" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠ Database migrations failed, but this might be normal on first run" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Your Teer Betting App is now running!" -ForegroundColor Green
Write-Host ""
Write-Host "Access your application at:" -ForegroundColor Yellow
Write-Host "  🌐 Frontend:  http://localhost:80" -ForegroundColor Cyan
Write-Host "  🔧 Backend:   http://localhost:8001" -ForegroundColor Cyan
Write-Host "  📚 API Docs:  http://localhost:8001/api/v1/docs" -ForegroundColor Cyan
Write-Host "  🗄️  pgAdmin:   http://localhost:5050 (admin@teer.com / admin)" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== Service Status ===" -ForegroundColor Blue
docker-compose ps

Write-Host ""
Write-Host "=== Quick Commands ===" -ForegroundColor Yellow
Write-Host "View logs:           docker-compose logs -f" -ForegroundColor White
Write-Host "Stop application:    docker-compose down" -ForegroundColor White
Write-Host "Restart application: docker-compose restart" -ForegroundColor White
Write-Host "Update code:         docker-compose down && docker-compose build && docker-compose up -d" -ForegroundColor White
Write-Host ""

Write-Host "=== Management Scripts ===" -ForegroundColor Yellow
Write-Host "Use PowerShell:      .\manage.ps1 help" -ForegroundColor White
Write-Host "Use Make (if available): make help" -ForegroundColor White
Write-Host ""

Write-Host "Happy coding! 🎯" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
