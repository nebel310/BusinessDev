FROM python:3.13

RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# +
COPY . .
ENV DATABASE_URL=postgresql+asyncpg://postgres:123456@localhost:5432/business_db
VOLUME ./backend:/app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3001"]
