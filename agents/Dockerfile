FROM python:3.11-slim
WORKDIR /app/agents

COPY agents/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY agents/ ./

ENV PYTHONPATH=/app/agents
ENV PORT=8001
EXPOSE 8001

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8001"]
