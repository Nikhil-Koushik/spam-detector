# One image, one Render service: Python model API on localhost and
# the Express app on $PORT. Node is copied in so the model keeps the
# Python version it was saved with.
FROM node:22-bookworm-slim AS nodebin

FROM python:3.14-slim-bookworm

COPY --from=nodebin /usr/local/bin/node /usr/local/bin/node
COPY --from=nodebin /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:${PATH}" \
    PYTHON_PORT=8000

WORKDIR /app

RUN python -m venv /opt/venv
COPY python_server/requirements.txt /app/python_server/requirements.txt
RUN pip install --no-cache-dir -r /app/python_server/requirements.txt

COPY node_server/package.json node_server/package-lock.json /app/node_server/
RUN npm --prefix /app/node_server ci --omit=dev

COPY node_server/SPA/react_app/package.json node_server/SPA/react_app/package-lock.json /app/node_server/SPA/react_app/
RUN npm --prefix /app/node_server/SPA/react_app ci

COPY node_server /app/node_server
COPY python_server /app/python_server
COPY scripts /app/scripts

RUN npm --prefix /app/node_server/SPA/react_app run build \
    && rm -rf /app/node_server/SPA/react_app/node_modules

ENV NODE_ENV=production

EXPOSE 10000

CMD ["node", "scripts/start.js"]
