FROM  node:18-alpine

WORKDIR /app

RUN npm install -g http-server

COPY . .

VOLUME .:/front

EXPOSE 5500

CMD ["http-server", "-p", "5500", "--cors"]
