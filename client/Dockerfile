# Build stage
FROM node:18 AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# Production stage
FROM node:18

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy build output
COPY --from=build /app/dist ./dist

# Expose port 80
EXPOSE 80

# Start static server
CMD ["serve", "-s", "dist", "-l", "80"]
