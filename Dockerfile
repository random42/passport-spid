FROM node:14

# USER node
WORKDIR /app
RUN npm i -g npm
ADD . ./
RUN NODE_ENV="" npm i
EXPOSE 4000 9229
# CMD ["npm", "run", "dev"]
