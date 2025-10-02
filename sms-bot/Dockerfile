# Use Node.js base image with Python 3.11 support
FROM node:20-bookworm

# Install Python 3.11 and pip (claude-agent-sdk requires Python 3.10+)
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Create symlinks for python commands
RUN ln -sf /usr/bin/python3.11 /usr/bin/python3 \
    && ln -sf /usr/bin/python3.11 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build TypeScript
RUN npm run build

# Install Python dependencies from requirements.txt
COPY requirements.txt ./
RUN pip3 install -r requirements.txt

# Make startup script executable
RUN chmod +x start-production-typescript.sh

# Expose port (Railway will override this)
EXPOSE 3000

# Start the application
CMD ["./start-production-typescript.sh"] 