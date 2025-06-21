# Dockerfile for IntelliScan (Cloud Ready)
FROM python:3.13-slim

WORKDIR /app

COPY . .

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt || pip install --no-cache-dir .

EXPOSE 5000

CMD ["python", "main.py"]
