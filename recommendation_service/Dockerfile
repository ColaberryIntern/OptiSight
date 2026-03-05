FROM node:20-alpine

WORKDIR /app

# Copy shared package and install its dependencies
COPY shared/ ./shared/
RUN cd shared && npm install

# Copy service package.json and install dependencies
COPY recommendation_service/package.json ./recommendation_service/
WORKDIR /app/recommendation_service
RUN npm install

# Copy remaining service files
COPY recommendation_service/ .

EXPOSE 3004

CMD ["node", "src/server.js"]
