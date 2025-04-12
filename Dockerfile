FROM ubuntu:latest
#надо как то ффмпег закинуть в докер и хорошо тогда будет
RUN apt-get update && apt-get install -y ffmpeg
