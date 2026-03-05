FROM node:20-alpine

WORKDIR /app

# Copy shared package and install its dependencies
COPY shared/ ./shared/
RUN cd shared && npm install

# Copy service package.json and install dependencies
WORKDIR /app/service
COPY package.json ./
RUN npm install

# Copy remaining service files
COPY . .

EXPOSE 3002

CMD ["node", "src/server.js"]
