FROM alpine
RUN apk add --no-cache python3 py3-pip
WORKDIR /app
COPY entry.sh .
COPY install-deps.sh .
RUN chmod +x install-deps.sh entry.sh
RUN ./install-deps.sh

COPY src .

CMD ["sleep", "infinity"]