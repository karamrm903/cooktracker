FROM node:20-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    --no-install-recommends \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
