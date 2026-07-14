FROM python:3.12-slim

WORKDIR /app
COPY apps/ml-service/pyproject.toml apps/ml-service/README.md ./
COPY apps/ml-service/app ./app

RUN pip install --no-cache-dir fastapi uvicorn pydantic

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
