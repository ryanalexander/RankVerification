FROM node:16

WORKDIR /usr/src/tmp

COPY . .

RUN yarn install
RUN rm -rf data/

WORKDIR /usr/src/app
RUN mv /usr/src/tmp .

CMD [ "yarn", "run", "start" ]