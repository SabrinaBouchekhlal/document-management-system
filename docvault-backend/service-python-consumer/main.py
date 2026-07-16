"""
DocVault Python AI Consumer
============================
Consumes 'document-events' Kafka topic.
On CREATED events:
  1. Summarises document title + description using HuggingFace BART (free)
  2. Translates summary to French using LibreTranslate (self-hosted)
  3. POSTs result back to Documents service via REST

Also exposes /api/ai/* endpoints for on-demand summarisation from the frontend.
"""

import os
import json
import asyncio
import logging
import threading
import httpx
import uvicorn
from fastapi import FastAPI
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
from pydantic import BaseModel
from confluent_kafka import Consumer, KafkaError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s"
)
log = logging.getLogger("ai-consumer")

# ── Config ─────────────────────────────────────────────────────────────────────
KAFKA_BOOTSTRAP       = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_GROUP_ID        = "ai-consumer-group"
KAFKA_TOPIC           = "document-events"
DOCUMENTS_SERVICE_URL = os.getenv("DOCUMENTS_SERVICE_URL", "http://localhost:8081")
HF_API_URL            = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn"
HF_API_KEY            = os.getenv("HF_API_KEY", "")
LIBRETRANSLATE_URL    = os.getenv("LIBRETRANSLATE_URL", "http://libretranslate:5000")

app = FastAPI(title="DocVault AI Service", version="1.0.0")

# ── Prometheus metrics ─────────────────────────────────────────────────────────
DOCS_PROCESSED   = Counter(
    "ai_documents_processed_total",
    "Total documents processed by AI"
)

SUMMARY_ERRORS   = Counter(
    "ai_summary_errors_total",
    "Total summarisation failures"
)

TRANSLATE_ERRORS = Counter(
    "ai_translate_errors_total",
    "Total translation failures"
)

SUMMARY_LATENCY  = Histogram(
    "ai_summary_duration_seconds",
    "Summarisation duration in seconds"
)

KAFKA_MESSAGES   = Counter(
    "ai_kafka_messages_total",
    "Total Kafka messages received",
    ["status"]
)


# ── Pydantic models ─────────────────────────────────────────────────────────────
class SummariseRequest(BaseModel):
    text: str
    max_length: int = 130
    min_length: int = 30

class TranslateRequest(BaseModel):
    text: str
    source: str = "en"
    target: str = "fr"

class AiProcessRequest(BaseModel):
    documentId: str
    title: str
    description: str = ""


# ── AI helpers ──────────────────────────────────────────────────────────────────
def build_input_text(title: str, description: str) -> str:
    """
    FIX: Build a meaningful input for summarisation.
    Uses both title AND description. If description is absent or very short,
    expands the title into a complete sentence so BART has something to summarise.
    """
    title       = (title or "").strip()
    description = (description or "").strip()

    if description and len(description) > 40:
        # Rich description — use it as the primary input, title as context
        return f"{title}. {description}"[:1024]

    if description:
        # Short description — combine and add some context
        return f"Document: {title}. Details: {description}"[:1024]

    # No useful description — expand the title into a sentence
    # so BART can produce a meaningful summary rather than echoing the title
    return (
        f"This document is titled '{title}'. "
        f"It contains information related to: {title}. "
        f"The document covers topics including {title.lower()} "
        f"and provides detailed information for review."
    )[:1024]


async def summarise_text(title: str, description: str) -> str:
    """
    Call HuggingFace BART for summarisation.
    Falls back to an extractive summary if the API is unavailable.
    """
    input_text = build_input_text(title, description)

    headers = {}
    if HF_API_KEY:
        headers["Authorization"] = f"Bearer {HF_API_KEY}"

    payload = {
        "inputs": input_text,
        "parameters": {
            "max_length": 130,
            "min_length": 30,
            "do_sample": False
        }
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(HF_API_URL, json=payload, headers=headers)

            if resp.status_code == 200:
                result = resp.json()
                if isinstance(result, list) and result:
                    summary = result[0].get("summary_text", "")
                    if summary and len(summary) > 20:
                        log.info("HuggingFace summary OK (%d chars)", len(summary))
                        return summary

            if resp.status_code == 503:
                log.warning("HuggingFace model loading (503), using extractive fallback")
            else:
                log.warning("HuggingFace returned %d: %.200s", resp.status_code, resp.text)

    except httpx.TimeoutException:
        log.warning("HuggingFace timeout, using extractive fallback")
    except Exception as exc:
        log.error("HuggingFace error: %s", exc)

    return extractive_fallback(title, description)


def extractive_fallback(title: str, description: str) -> str:
    """
    FIX: proper extractive fallback that uses description content, NOT just the title.
    Produces a 2-3 sentence summary from the description.
    """
    description = (description or "").strip()
    title       = (title or "").strip()

    if not description:
        return (
            f"This document covers the topic of {title}. "
            f"Please refer to the full document for detailed information."
        )

    # Split into sentences and take the first 2-3
    import re
    sentences = re.split(r'(?<=[.!?])\s+', description)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 15]

    if not sentences:
        return f"{title}: {description[:200]}"

    # Take up to 3 sentences, ensuring we stay under ~200 chars
    selected = []
    total    = 0
    for s in sentences[:3]:
        if total + len(s) < 250:
            selected.append(s)
            total += len(s)

    summary = " ".join(selected) if selected else description[:200]

    # Prefix with title for context
    if not summary.lower().startswith(title.lower()[:10]):
        summary = f"{title}: {summary}"

    return summary


async def translate_to_french(text: str) -> str:
    """Translate text to French via LibreTranslate (self-hosted)."""
    if not text:
        return text
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{LIBRETRANSLATE_URL}/translate",
                json={"q": text, "source": "en", "target": "fr", "format": "text"},
                headers={"Content-Type": "application/json"}
            )
            if resp.status_code == 200:
                result = resp.json()
                translated = result.get("translatedText", text)
                log.info("LibreTranslate OK (%d chars -> %d chars)", len(text), len(translated))
                return translated
            log.warning("LibreTranslate returned %d", resp.status_code)
            return text
    except Exception as exc:
        log.error("Translation failed: %s", exc)
        return f"[French translation unavailable] {text[:200]}"


async def run_ai_pipeline(doc_id: str, title: str, description: str) -> dict:
    """Full pipeline: summarise (EN) → translate (FR) → return both."""
    summary_en = await summarise_text(title, description)
    summary_fr = await translate_to_french(summary_en)
    return {"summary": summary_en, "summaryFr": summary_fr}


async def save_summary_to_documents(doc_id: str, summary_en: str, summary_fr: str):
    """POST the AI result back to the Documents service."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{DOCUMENTS_SERVICE_URL}/api/documents/{doc_id}/ai-summary",
                json={"summary": summary_en, "summaryFr": summary_fr},
                headers={"Content-Type": "application/json"}
            )
            if resp.status_code == 200:
                log.info("AI summary saved to documents service for doc %s", doc_id)
            else:
                log.error("Failed to save summary: %d %s", resp.status_code, resp.text[:200])
    except Exception as exc:
        log.error("Callback to documents service failed: %s", exc)


async def process_document_event(event_data: dict):
    """Process a CREATED event from the Kafka topic."""
    event_type  = event_data.get("type", "")
    doc_id      = event_data.get("documentId")
    title       = event_data.get("documentTitle", "")
    description = event_data.get("documentDescription", "")

    if event_type != "CREATED":
        log.debug("Skipping non-CREATED event: %s", event_type)
        return

    if not doc_id:
        log.warning("Event missing documentId, skipping")
        return

    log.info("AI pipeline starting for doc=%s title='%s'", doc_id, title[:50])

    result = await run_ai_pipeline(doc_id, title, description)
    await save_summary_to_documents(doc_id, result["summary"], result["summaryFr"])


# ── Kafka consumer thread ───────────────────────────────────────────────────────
def kafka_consumer_thread():
    conf = {
        "bootstrap.servers": KAFKA_BOOTSTRAP,
        "group.id":          KAFKA_GROUP_ID,
        "auto.offset.reset": "earliest",
        "enable.auto.commit": True,
    }

    consumer = Consumer(conf)
    consumer.subscribe([KAFKA_TOPIC])
    log.info("Kafka consumer subscribed to '%s' on %s", KAFKA_TOPIC, KAFKA_BOOTSTRAP)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        while True:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    log.error("Kafka error: %s", msg.error())
                continue

            try:
                event_data = json.loads(msg.value().decode("utf-8"))
                log.info("Kafka message: type=%s docId=%s",
                         event_data.get("type"), event_data.get("documentId"))
                loop.run_until_complete(process_document_event(event_data))
            except json.JSONDecodeError as exc:
                log.error("JSON decode error: %s", exc)
            except Exception as exc:
                log.error("Event processing error: %s", exc)
    except KeyboardInterrupt:
        pass
    finally:
        consumer.close()
        loop.close()
        log.info("Kafka consumer shut down")


# ── FastAPI startup ─────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    thread = threading.Thread(target=kafka_consumer_thread, daemon=True)
    thread.start()
    log.info("AI Consumer service started on port 8085")


# ── Health ──────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "UP", "service": "ai-consumer"}

@app.get("/actuator/health")
async def actuator_health():
    return {"status": "UP"}


# ── REST endpoints (callable from Gateway) ──────────────────────────────────────
@app.post("/api/ai/summarise")
async def summarise(req: SummariseRequest):
    """Direct summarisation — frontend can call via Gateway."""
    # For direct calls we use the raw text as both title and description
    summary = await summarise_text(req.text, "")
    return {"success": True, "data": {"summary": summary}}


@app.post("/api/ai/translate")
async def translate(req: TranslateRequest):
    """Direct translation endpoint."""
    translated = await translate_to_french(req.text)
    return {"success": True, "data": {"translated": translated, "target": req.target}}


@app.post("/api/ai/process")
async def process_on_demand(req: AiProcessRequest):
    """
    On-demand AI summary — called from the frontend 'Generate Summary' button.
    Runs the full pipeline and also saves the result to the Documents service.
    """
    log.info("On-demand AI for doc=%s title='%s'", req.documentId, req.title[:50])

    result = await run_ai_pipeline(req.documentId, req.title, req.description)

    # Save to documents service asynchronously
    await save_summary_to_documents(
        req.documentId, result["summary"], result["summaryFr"])

    return {
        "success": True,
        "data": {
            "documentId": req.documentId,
            "summary":    result["summary"],
            "summaryFr":  result["summaryFr"],
        }
    }

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(
        generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8085, reload=False)
