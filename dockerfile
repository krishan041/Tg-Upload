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

# Expose port 3000 (or your app's port)
EXPOSE 3000

# Run the app (make sure to use the correct entry file, e.g., index.js)
CMD ["node", "index.js"]
