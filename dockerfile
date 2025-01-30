# Use an official Node.js runtime as the base image
FROM node:14

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Expose the app's port (8021 as an example)
EXPOSE 8021

# Run the app (make sure to use the correct entry file, e.g., server.js)
CMD ["node", "server.js"]
