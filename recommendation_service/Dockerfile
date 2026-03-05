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

# Fix file: symlink — Docker Desktop on Windows creates host-path symlinks
RUN rm -rf node_modules/@retail-insight/shared && ln -s /app/shared node_modules/@retail-insight/shared

EXPOSE 3004

CMD ["node", "src/server.js"]
