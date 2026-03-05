FROM node:20-alpine

WORKDIR /app

# Copy shared package and install its dependencies
COPY shared/ ./shared/
RUN cd shared && npm install

# Copy service package.json and install dependencies
COPY user_service/package.json ./user_service/
WORKDIR /app/user_service
RUN npm install

# Copy remaining service files
COPY user_service/ .

EXPOSE 3001

CMD ["node", "src/server.js"]
