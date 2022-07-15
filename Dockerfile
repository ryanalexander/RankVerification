FROM node:16

WORKDIR /usr/src/app

COPY . .

RUN yarn install
RUN rm -rf ./data/

RUN yarn build

CMD [ "yarn", "run", "start" ]