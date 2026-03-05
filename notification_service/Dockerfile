FROM node:20-alpine

WORKDIR /app

# Copy shared package and install its dependencies
COPY shared/ ./shared/
RUN cd shared && npm install

# Copy service package.json and install dependencies
COPY notification_service/package.json ./notification_service/
WORKDIR /app/notification_service
RUN npm install

# Copy remaining service files
COPY notification_service/ .

EXPOSE 3005

CMD ["node", "src/server.js"]
