FROM node:20-alpine

WORKDIR /app

# Copy shared package and install its dependencies
COPY shared/ ./shared/
RUN cd shared && npm install

# Copy service package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy remaining service files
COPY . .

EXPOSE 3003

CMD ["node", "src/server.js"]
