param(
    [string]$CLUSTER_TYPE = "minikube",
    [string]$CLUSTER_NAME = "minikube"
)

Write-Host "===> Building Docker images (cluster: $CLUSTER_TYPE / $CLUSTER_NAME)"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Resolve-Path "$SCRIPT_DIR"

# ── Point Docker at Minikube's daemon so images are built directly inside it ──
if ($CLUSTER_TYPE -eq "minikube") {
    Write-Host "Switching to Minikube Docker daemon..."
    minikube docker-env --shell powershell | Invoke-Expression
    Write-Host "(Images built inside Minikube — no 'image load' step needed)"
}

function Build-Image {
    param(
        [string]$ImageName,
        [string]$DockerfilePath,
        [string]$ContextPath
    )
    Write-Host ""
    Write-Host "------------------------------------------------------"
    Write-Host "Building: $ImageName"
    Write-Host "  Dockerfile: $DockerfilePath"
    Write-Host "  Context:    $ContextPath"
    Write-Host "------------------------------------------------------"

    docker build -t $ImageName -f "$DockerfilePath" "$ContextPath"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to build $ImageName" -ForegroundColor Red
        exit 1
    }
    Write-Host "OK: $ImageName" -ForegroundColor Green
}

# ── Build all services ────────────────────────────────────────────────────────
# Context is always the project root (.) because the Dockerfiles use
# multi-module paths like COPY gateway/src ...

Build-Image `
    "docvault/gateway:1.0.0" `
    "$PROJECT_ROOT\gateway\Dockerfile" `
    "$PROJECT_ROOT"

Build-Image `
    "docvault/service-documents:1.0.0" `
    "$PROJECT_ROOT\service-documents\Dockerfile" `
    "$PROJECT_ROOT"

Build-Image `
    "docvault/service-comments:1.0.0" `
    "$PROJECT_ROOT\service-comments\Dockerfile" `
    "$PROJECT_ROOT"

Build-Image `
    "docvault/service-esb:1.0.0" `
    "$PROJECT_ROOT\service-esb\Dockerfile" `
    "$PROJECT_ROOT"

Build-Image `
    "docvault/service-python-consumer:1.0.0" `
    "$PROJECT_ROOT\service-python-consumer\Dockerfile" `
    "$PROJECT_ROOT\service-python-consumer"

Build-Image `
    "docvault/frontend:1.0.0" `
    "$PROJECT_ROOT\docvault\Dockerfile" `
    "$PROJECT_ROOT\docvault"

Write-Host ""
Write-Host "===> All images built successfully inside $CLUSTER_TYPE"

# ── For kind: load images manually (minikube doesn't need this) ───────────────
if ($CLUSTER_TYPE -eq "kind") {
    $IMAGES = @(
        "docvault/gateway:1.0.0",
        "docvault/service-documents:1.0.0",
        "docvault/service-comments:1.0.0",
        "docvault/service-esb:1.0.0",
        "docvault/service-python-consumer:1.0.0",
        "docvault/frontend:1.0.0"
    )
    Write-Host ""
    Write-Host "Loading images into kind cluster '$CLUSTER_NAME'..."
    foreach ($img in $IMAGES) {
        Write-Host "  Loading $img ..."
        kind load docker-image $img --name $CLUSTER_NAME
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to load $img" -ForegroundColor Red
            exit 1
        }
    }
    Write-Host "All images loaded into kind." -ForegroundColor Green
}

Write-Host ""
Write-Host "SUCCESS: Ready to deploy." -ForegroundColor Green
Write-Host "Next step: .\deploy.ps1"
