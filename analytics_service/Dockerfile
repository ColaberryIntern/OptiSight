FROM node:20-alpine

WORKDIR /app

# Copy shared package and install its dependencies
COPY shared/ ./shared/
RUN cd shared && npm install

# Copy service package.json and install dependencies
COPY analytics_service/package.json ./analytics_service/
WORKDIR /app/analytics_service
RUN npm install

# Copy remaining service files
COPY analytics_service/ .

EXPOSE 3003

CMD ["node", "src/server.js"]
