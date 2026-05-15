FROM node:20-alpine

WORKDIR /app

# Copy the shared folder
COPY shared ./shared

# Setup backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production

COPY backend/ .

EXPOSE 3000

CMD ["node", "src/server.js"]
