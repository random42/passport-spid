FROM node:14

# USER node
WORKDIR /app
RUN npm i -g npm@9
ADD package*.json ./
RUN NODE_ENV="" npm ci --ignore-scripts
ADD . ./
EXPOSE 4000 9229
CMD ["npm", "run", "dev"]
