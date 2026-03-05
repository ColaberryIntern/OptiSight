FROM node:20-alpine

WORKDIR /app

# Copy shared package and install its dependencies
COPY shared/ ./shared/
RUN cd shared && npm install

# Copy service package.json and install dependencies
COPY data_ingestion_service/package.json ./data_ingestion_service/
WORKDIR /app/data_ingestion_service
RUN npm install

# Copy remaining service files
COPY data_ingestion_service/ .

EXPOSE 3002

CMD ["node", "src/server.js"]
