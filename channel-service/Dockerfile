FROM python:3.11-slim
WORKDIR /app

COPY channel-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY channel-service/ ./channel-service/

ENV PYTHONPATH=/app/channel-service
ENV PORT=8002
EXPOSE 8002

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
