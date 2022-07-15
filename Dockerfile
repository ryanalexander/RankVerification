FROM node:16

WORKDIR /usr/src/app

COPY . .

RUN yarn install
RUN rm -rf ./data/

CMD [ "yarn", "run", "start" ]