FROM python:3.11-slim AS base

RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS deps
COPY requirements.txt .
RUN pip install --no-cache-dir torch==2.3.1+cpu torchvision==0.18.1+cpu --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

FROM deps AS runner
COPY . .
RUN mkdir -p models/cache

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
