FROM ghcr.io/puppeteer/puppeteer:latest

# Run as root to allow installs
USER root
WORKDIR /app

# Copy files and install
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Start the bot
CMD["node", "index.js"]
