FROM python:3.11-slim

WORKDIR /app

# Install system deps for confluent-kafka
RUN apt-get update && apt-get install -y \
    librdkafka-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Non-root user
RUN useradd -m -u 1001 docvault
USER docvault

EXPOSE 8085

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8085"]
