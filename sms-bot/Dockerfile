# Use Node.js base image with Python support
FROM node:18-bullseye

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for 'python' command
RUN ln -s /usr/bin/python3 /usr/bin/python

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

# Install Python dependencies
RUN pip3 install openai requests python-dotenv pathlib supabase

# Make startup script executable
RUN chmod +x start-production.sh

# Expose port (Railway will override this)
EXPOSE 3000

# Start the application
CMD ["./start-production.sh"] 