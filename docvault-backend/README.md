# DocVault Backend — Full Stack with Kafka + AI

## Architecture

```
React Frontend (port 3000)
        │ JWT Bearer
        ▼
  API Gateway :8080  (Spring Boot + Spring Cloud Gateway)
  ├── JWT validation + Redis blacklist
  ├── Routes: /api/documents → Documents :8081
  ├── Routes: /api/comments  → Comments  :8082
  ├── Routes: /api/events    → ESB       :8083
  └── Routes: /api/ai        → AI Python :8085
        │
  ┌─────┴─────────────────────┐
  │         Redpanda (Kafka)  │  topic: document-events
  │         redpanda:9092     │  topic: comment-events
  └──────┬────────┬───────────┘
         │        │
  ┌──────▼──┐  ┌──▼───────────────────────┐
  │   ESB   │  │  Python AI Consumer      │
  │ :8083   │  │  :8085                   │
  │Audit log│  │  ① Kafka consumer        │
  │(PG+     │  │  ② HuggingFace summarise │
  │ Redis   │  │  ③ LibreTranslate → FR   │
  │ pubsub) │  │  ④ POST /ai-summary back │
  └─────────┘  └──────────────────────────┘

Data stores:
  PostgreSQL :5432   → users, documents, versions, audit_log
  PostgreSQL :5433   → replica (streaming replication)
  Cassandra  :9042   → comments (partitioned by document_id)
  Redis      :6379   → JWT blacklist, rate limit, notifications
  S3/LocalSt :4566   → binary files (pre-signed URLs)
  Redpanda   :19092  → Kafka-compatible event bus
```

## Quick Start

```bash
docker-compose up --build -d
```

Wait ~3 minutes for all services. Check with:
```bash
docker ps
```

## Service URLs

| Service              | URL                           |
|----------------------|-------------------------------|
| Gateway API          | http://localhost:8080         |
| Documents service    | http://localhost:8081         |
| Comments service     | http://localhost:8082         |
| ESB service          | http://localhost:8083         |
| Python AI consumer   | http://localhost:8085         |
| Redpanda Console     | http://localhost:8090         |
| LibreTranslate UI    | http://localhost:5000         |
| LocalStack S3        | http://localhost:4566         |
| PostgreSQL primary   | localhost:5432                |
| PostgreSQL replica   | localhost:5433                |
| Cassandra            | localhost:9042                |
| Redis                | localhost:6379                |

## Test the Full Flow

```bash
# 1. Login
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@docvault.com","password":"admin123"}'
# → returns accessToken

# 2. Get pre-signed S3 upload URL
curl -X POST http://localhost:8080/api/presigned/upload \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.pdf","contentType":"application/pdf"}'

# 3. Upload file directly to S3
curl -X PUT "<uploadUrl>" \
  -H "Content-Type: application/pdf" \
  --data-binary @test.pdf

# 4. Create document record
curl -X POST http://localhost:8080/api/documents \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Doc","description":"A test document","fileType":"pdf","s3Key":"<s3Key>","status":"published"}'
# → Kafka message published to document-events
# → Python AI consumer picks it up, summarises, translates, saves back

# 5. Check AI summary was saved (wait ~10s for AI processing)
curl http://localhost:8080/api/documents/<docId> \
  -H "Authorization: Bearer <token>"
# → aiSummary and aiSummaryFr fields populated

# 6. Add a comment
curl -X POST http://localhost:8080/api/comments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"documentId":"<docId>","content":"Great document!"}'

# 7. View Kafka topics in Redpanda Console
open http://localhost:8090

# 8. Check audit log
curl http://localhost:8080/api/events/audit \
  -H "Authorization: Bearer <token>"
```

## Kafka Topics

| Topic             | Producer           | Consumers              |
|-------------------|--------------------|------------------------|
| `document-events` | Documents service  | ESB (audit), Python AI |
| `comment-events`  | Comments service   | ESB (audit + Redis)    |

## Connecting Frontend

```bash
cd docvault/
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

Or build with env var baked in:
```bash
VITE_API_BASE_URL=http://localhost:8080 npm run build
```

## K8s Deployment

```bash
# Build images
docker build -t docvault/gateway:1.0.0               ./gateway
docker build -t docvault/service-documents:1.0.0     ./service-documents
docker build -t docvault/service-comments:1.0.0      ./service-comments
docker build -t docvault/service-esb:1.0.0           ./service-esb
docker build -t docvault/service-python-consumer:1.0.0 ./service-python-consumer

# Load into minikube
for img in gateway service-documents service-comments service-esb service-python-consumer; do
  minikube image load docvault/$img:1.0.0
done

# Deploy
kubectl apply -f k8s/00-namespace-config.yaml
kubectl apply -f k8s/01-infrastructure.yaml
kubectl apply -f k8s/02-services.yaml
kubectl apply -f k8s/03-frontend-ingress.yaml

# Check
kubectl get pods -n docvault
```

## Credentials

| Service   | User    | Password    |
|-----------|---------|-------------|
| App Admin | admin@docvault.com | admin123 |
| App User  | bob@docvault.com   | user123  |
| RabbitMQ  | N/A (removed)      | —        |
| PostgreSQL| docvault | docvault123 |
