FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV U2NET_HOME=/models

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt

RUN pip install \
    --no-cache-dir \
    --disable-pip-version-check \
    -r requirements.txt

COPY backend/ ./

EXPOSE 50051

HEALTHCHECK \
    --interval=15s \
    --timeout=10s \
    --start-period=10m \
    --retries=3 \
    CMD ["python", "healthcheck.py"]

CMD ["python", "main.py"]