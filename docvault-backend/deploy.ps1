param(
    [string]$CLUSTER_TYPE = "minikube"
)

Write-Host "==================================================================="
Write-Host " DocVault Kubernetes Deployment"
Write-Host "==================================================================="

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$K8S_DIR    = "$SCRIPT_DIR\k8s"

# ── Helper: wait for a Deployment to be ready ─────────────────────────────────
function Wait-Deployment {
    param([string]$Namespace, [string]$Name)
    Write-Host "  Waiting for Deployment/$Name in namespace $Namespace ..."
    kubectl rollout status deployment/$Name -n $Namespace --timeout=300s
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Deployment/$Name did not become ready!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  OK: Deployment/$Name is ready." -ForegroundColor Green
}

# ── Helper: wait for a StatefulSet to be ready ────────────────────────────────
function Wait-StatefulSet {
    param([string]$Namespace, [string]$Name)
    Write-Host "  Waiting for StatefulSet/$Name in namespace $Namespace ..."
    kubectl rollout status statefulset/$Name -n $Namespace --timeout=300s
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: StatefulSet/$Name did not become ready!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  OK: StatefulSet/$Name is ready." -ForegroundColor Green
}

# =============================================================================
# STEP 1 — Namespace, ConfigMap, Secrets
# =============================================================================
Write-Host ""
Write-Host "--- Step 1: Namespace, Config, Secrets ---"
kubectl apply -f "$K8S_DIR\00-namespace-config.yaml"
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR applying namespace/config" -ForegroundColor Red; exit 1 }

# =============================================================================
# STEP 2 — Infrastructure (databases, queues, storage)
# =============================================================================
Write-Host ""
Write-Host "--- Step 2: Infrastructure ---"
kubectl apply -f "$K8S_DIR\01-infrastructure.yaml"
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR applying infrastructure" -ForegroundColor Red; exit 1 }

Write-Host "  Waiting for infrastructure to be ready (this takes 2-4 minutes)..."

# Postgres is a Deployment in your manifests
Wait-Deployment "docvault" "postgres-primary"
Wait-Deployment "docvault" "redis"
Wait-Deployment "docvault" "redpanda"
Wait-Deployment "docvault" "localstack"
Wait-Deployment "docvault" "libretranslate"

# Cassandra is a StatefulSet
Wait-StatefulSet "docvault" "cassandra"

# =============================================================================
# STEP 3 — Cassandra keyspace init (one-time job)
# =============================================================================
Write-Host ""
Write-Host "--- Step 3: Cassandra keyspace init ---"

$CASSANDRA_POD = kubectl get pod -l app=cassandra -n docvault -o jsonpath='{.items[0].metadata.name}'
Write-Host "  Running CQL init on pod: $CASSANDRA_POD"

kubectl exec -n docvault $CASSANDRA_POD -- cqlsh -e @"
CREATE KEYSPACE IF NOT EXISTS docvault
  WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE docvault;

CREATE TABLE IF NOT EXISTS comments (
  document_id  UUID,
  id           UUID,
  user_id      TEXT,
  user_email   TEXT,
  user_name    TEXT,
  content      TEXT,
  resolved     BOOLEAN,
  created_at   TIMESTAMP,
  PRIMARY KEY (document_id, id)
) WITH CLUSTERING ORDER BY (id DESC);
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: Cassandra init may have failed — comments may not work" -ForegroundColor Yellow
} else {
    Write-Host "  OK: Cassandra keyspace ready." -ForegroundColor Green
}

# =============================================================================
# STEP 4 — Application services
# =============================================================================
Write-Host ""
Write-Host "--- Step 4: Application Services ---"
kubectl apply -f "$K8S_DIR\02-services.yaml"
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR applying services" -ForegroundColor Red; exit 1 }

Wait-Deployment "docvault" "gateway"
Wait-Deployment "docvault" "documents"
Wait-Deployment "docvault" "comments"
Wait-Deployment "docvault" "esb"
Wait-Deployment "docvault" "ai-consumer"

# =============================================================================
# STEP 5 — Frontend + Ingress
# =============================================================================
Write-Host ""
Write-Host "--- Step 5: Frontend and Ingress ---"
kubectl apply -f "$K8S_DIR\03-frontend-ingress.yaml"
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR applying frontend/ingress" -ForegroundColor Red; exit 1 }

Wait-Deployment "docvault" "frontend"

# =============================================================================
# Summary
# =============================================================================
Write-Host ""
Write-Host "==================================================================="
Write-Host " All services deployed successfully!" -ForegroundColor Green
Write-Host "==================================================================="
Write-Host ""
Write-Host "Pods:"
kubectl get pods -n docvault
Write-Host ""
Write-Host "Services:"
kubectl get svc -n docvault
Write-Host ""

if ($CLUSTER_TYPE -eq "minikube") {
    $MINIKUBE_IP = minikube ip
    Write-Host "Add this to C:\Windows\System32\drivers\etc\hosts (as Administrator):"
    Write-Host "  $MINIKUBE_IP  docvault.local" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Then open: http://docvault.local"
    Write-Host ""
    Write-Host "Or use port-forward directly:"
    Write-Host "  kubectl port-forward svc/gateway 8080:8080 -n docvault"
    Write-Host "  kubectl port-forward svc/frontend 3000:80 -n docvault"
}

Write-Host ""
Write-Host "To tear down everything:"
Write-Host "  kubectl delete namespace docvault"
