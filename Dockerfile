FROM node:14

# USER node
WORKDIR /app
RUN npm i -g npm
ADD package*.json ./
RUN NODE_ENV="" npm i --ignore-scripts
ADD . ./
EXPOSE 4000 9229
CMD ["npm", "run", "dev"]
