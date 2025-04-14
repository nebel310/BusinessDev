FROM --platform=linux/amd64 node:18-alpine

WORKDIR /app

RUN npm install -g http-server

COPY . .

EXPOSE 5500

CMD ["http-server", "-p", "5500", "--cors"]