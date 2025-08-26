# =============================================================================
# TEER BETTING APP - DOCKER MANAGEMENT SCRIPT (PowerShell)
# =============================================================================

param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet("dev", "development", "prod", "production", "full", "stop", "clean", "logs", "backup", "restore", "status", "help")]
    [string]$Command,
    
    [Parameter(Position=1)]
    [string]$Service = "",
    
    [Parameter(Position=2)]
    [string]$Environment = "development"
)

# Colors for output
$Red = "Red"
$Green = "Green" 
$Yellow = "Yellow"
$Blue = "Blue"
$White = "White"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Green
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

function Write-Header {
    param([string]$Message)
    Write-Host "=============================================" -ForegroundColor $Blue
    Write-Host $Message -ForegroundColor $Blue
    Write-Host "=============================================" -ForegroundColor $Blue
}

# Function to check if Docker is running
function Test-Docker {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        Write-Error-Custom "Docker is not running. Please start Docker first."
        exit 1
    }
}

# Function to check if docker-compose is available
function Get-ComposeCommand {
    if (Get-Command "docker-compose" -ErrorAction SilentlyContinue) {
        return "docker-compose"
    }
    elseif (docker compose version 2>$null) {
        return "docker compose"
    }
    else {
        Write-Error-Custom "Docker Compose is not available"
        exit 1
    }
}

# Development environment
function Start-Development {
    Write-Header "Starting Development Environment"
    Test-Docker
    $composeCmd = Get-ComposeCommand
    
    Write-Status "Starting development services..."
    & $composeCmd -f docker-compose.yml -f docker-compose.development.yml up -d
    
    Write-Status "Waiting for services to be ready..."
    Start-Sleep -Seconds 10
    
    Write-Status "Development environment is ready!"
    Write-Host "Services:" -ForegroundColor $Green
    Write-Host "  • Frontend: " -NoNewline; Write-Host "http://localhost" -ForegroundColor $Blue
    Write-Host "  • Backend API: " -NoNewline; Write-Host "http://localhost:8001" -ForegroundColor $Blue
    Write-Host "  • API Docs: " -NoNewline; Write-Host "http://localhost:8001/docs" -ForegroundColor $Blue
    Write-Host "  • pgAdmin: " -NoNewline; Write-Host "http://localhost:5050" -ForegroundColor $Blue -NoNewline; Write-Host " (admin@teer.dev / admin123)"
    Write-Host "  • Redis Commander: " -NoNewline; Write-Host "http://localhost:8081" -ForegroundColor $Blue
    Write-Host "  • Mailhog: " -NoNewline; Write-Host "http://localhost:8025" -ForegroundColor $Blue
    Write-Host "  • File Browser: " -NoNewline; Write-Host "http://localhost:8080" -ForegroundColor $Blue
}

# Production environment
function Start-Production {
    Write-Header "Starting Production Environment"
    Test-Docker
    $composeCmd = Get-ComposeCommand
    
    if (-not (Test-Path ".env.production")) {
        Write-Error-Custom ".env.production file not found. Please create it from .env.template"
        exit 1
    }
    
    Write-Status "Starting production services..."
    & $composeCmd -f docker-compose.production.yml --env-file .env.production up -d
    
    Write-Status "Waiting for services to be ready..."
    Start-Sleep -Seconds 15
    
    Write-Status "Production environment is ready!"
    Write-Host "Services:" -ForegroundColor $Green
    Write-Host "  • Application: " -NoNewline; Write-Host "https://localhost" -ForegroundColor $Blue
    Write-Host "  • Monitoring: " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor $Blue
}

# Full environment with monitoring
function Start-Full {
    Write-Header "Starting Full Environment with Monitoring"
    Test-Docker
    $composeCmd = Get-ComposeCommand
    
    Write-Status "Starting all services..."
    & $composeCmd -f docker-compose.full.yml up -d
    
    Write-Status "Waiting for services to be ready..."
    Start-Sleep -Seconds 20
    
    Write-Status "Full environment is ready!"
    Write-Host "Services:" -ForegroundColor $Green
    Write-Host "  • Frontend: " -NoNewline; Write-Host "http://localhost" -ForegroundColor $Blue
    Write-Host "  • Backend API: " -NoNewline; Write-Host "http://localhost:8001" -ForegroundColor $Blue
    Write-Host "  • pgAdmin: " -NoNewline; Write-Host "http://localhost:5050" -ForegroundColor $Blue
    Write-Host "  • Prometheus: " -NoNewline; Write-Host "http://localhost:9090" -ForegroundColor $Blue
    Write-Host "  • Grafana: " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor $Blue
    Write-Host "  • Kibana: " -NoNewline; Write-Host "http://localhost:5601" -ForegroundColor $Blue
    Write-Host "  • Load Balancer: " -NoNewline; Write-Host "http://localhost:8080" -ForegroundColor $Blue
}

# Stop all services
function Stop-AllServices {
    Write-Header "Stopping All Services"
    $composeCmd = Get-ComposeCommand
    
    Write-Status "Stopping development environment..."
    try { & $composeCmd -f docker-compose.yml -f docker-compose.development.yml down 2>$null } catch {}
    
    Write-Status "Stopping production environment..."
    try { & $composeCmd -f docker-compose.production.yml down 2>$null } catch {}
    
    Write-Status "Stopping full environment..."
    try { & $composeCmd -f docker-compose.full.yml down 2>$null } catch {}
    
    Write-Status "All services stopped."
}

# Clean up everything
function Remove-AllResources {
    Write-Header "Cleaning Up Docker Resources"
    $composeCmd = Get-ComposeCommand
    
    Write-Warning-Custom "This will remove all containers, volumes, and networks for this project."
    $confirmation = Read-Host "Are you sure? (y/N)"
    
    if ($confirmation -eq "y" -or $confirmation -eq "Y") {
        Write-Status "Stopping all services..."
        Stop-AllServices
        
        Write-Status "Removing volumes..."
        docker volume ls -q | Where-Object { $_ -like "*teer*" } | ForEach-Object { docker volume rm $_ 2>$null }
        
        Write-Status "Removing networks..."
        docker network ls -q | Where-Object { $_ -like "*teer*" } | ForEach-Object { docker network rm $_ 2>$null }
        
        Write-Status "Pruning unused Docker resources..."
        docker system prune -f
        
        Write-Status "Cleanup completed."
    }
    else {
        Write-Status "Cleanup cancelled."
    }
}

# Show logs
function Show-Logs {
    param([string]$ServiceName, [string]$Env)
    
    $composeFiles = switch ($Env) {
        { $_ -in "dev", "development" } { "-f docker-compose.yml -f docker-compose.development.yml" }
        { $_ -in "prod", "production" } { "-f docker-compose.production.yml" }
        "full" { "-f docker-compose.full.yml" }
        default { "-f docker-compose.yml" }
    }
    
    $composeCmd = Get-ComposeCommand
    
    if ($ServiceName) {
        Write-Status "Showing logs for $ServiceName in $Env environment..."
        Invoke-Expression "$composeCmd $composeFiles logs -f $ServiceName"
    }
    else {
        Write-Status "Showing logs for all services in $Env environment..."
        Invoke-Expression "$composeCmd $composeFiles logs -f"
    }
}

# Backup database
function Backup-Database {
    Write-Header "Creating Database Backup"
    
    $backupName = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    $backupDir = "./backups"
    
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir | Out-Null
    }
    
    Write-Status "Creating backup: $backupName"
    docker exec teer_db pg_dump -U postgres -d teer_betting | Out-File -FilePath "$backupDir/$backupName" -Encoding UTF8
    
    Write-Status "Backup created: $backupDir/$backupName"
}

# Restore database
function Restore-Database {
    param([string]$BackupFile)
    
    if (-not $BackupFile) {
        Write-Error-Custom "Please specify backup file: .\manage.ps1 restore <backup_file>"
        exit 1
    }
    
    if (-not (Test-Path $BackupFile)) {
        Write-Error-Custom "Backup file not found: $BackupFile"
        exit 1
    }
    
    Write-Header "Restoring Database from Backup"
    Write-Warning-Custom "This will overwrite the current database!"
    $confirmation = Read-Host "Are you sure? (y/N)"
    
    if ($confirmation -eq "y" -or $confirmation -eq "Y") {
        Write-Status "Restoring from: $BackupFile"
        Get-Content $BackupFile | docker exec -i teer_db psql -U postgres -d teer_betting
        Write-Status "Database restored successfully."
    }
    else {
        Write-Status "Restore cancelled."
    }
}

# Show status
function Show-Status {
    Write-Header "Docker Services Status"
    
    Write-Status "Current containers:"
    docker ps -a --filter "name=teer" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    Write-Host ""
    Write-Status "Volume usage:"
    docker volume ls --filter "name=teer" --format "table {{.Name}}\t{{.Driver}}"
    
    Write-Host ""
    Write-Status "Network information:"
    docker network ls --filter "name=teer" --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}"
}

# Show help
function Show-Help {
    Write-Host "Teer Betting App - Docker Management Script" -ForegroundColor $Blue
    Write-Host ""
    Write-Host "Usage: .\manage.ps1 COMMAND [OPTIONS]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  dev                    Start development environment"
    Write-Host "  prod                   Start production environment" 
    Write-Host "  full                   Start full environment with monitoring"
    Write-Host "  stop                   Stop all running services"
    Write-Host "  clean                  Remove all containers, volumes, and networks"
    Write-Host "  logs [service] [env]   Show logs (env: dev/prod/full)"
    Write-Host "  backup                 Create database backup"
    Write-Host "  restore <file>         Restore database from backup"
    Write-Host "  status                 Show current status of all services"
    Write-Host "  help                   Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\manage.ps1 dev                 # Start development environment"
    Write-Host "  .\manage.ps1 logs backend dev    # Show backend logs in development"
    Write-Host "  .\manage.ps1 backup              # Create database backup"
    Write-Host "  .\manage.ps1 clean               # Clean up everything"
}

# Main script logic
switch ($Command) {
    { $_ -in "dev", "development" } { Start-Development }
    { $_ -in "prod", "production" } { Start-Production }
    "full" { Start-Full }
    "stop" { Stop-AllServices }
    "clean" { Remove-AllResources }
    "logs" { Show-Logs -ServiceName $Service -Env $Environment }
    "backup" { Backup-Database }
    "restore" { Restore-Database -BackupFile $Service }
    "status" { Show-Status }
    "help" { Show-Help }
    default {
        Write-Error-Custom "Unknown command: $Command"
        Write-Host ""
        Show-Help
        exit 1
    }
}
