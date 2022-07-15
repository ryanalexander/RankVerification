FROM node:16

WORKDIR /usr/src/tmp

COPY . .

RUN yarn install
RUN rm -rf data/

RUN mkdir /usr/src/app
RUN mv /usr/src/tmp /usr/src/app

WORKDIR /usr/src/app

CMD [ "yarn", "run", "start" ]