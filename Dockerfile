FROM node:20

# USER node
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN npm i -g npm@9
ADD package*.json ./
RUN NODE_ENV="" npm ci --ignore-scripts
ADD . ./
EXPOSE 4000 9229
CMD ["npm", "run", "dev"]
