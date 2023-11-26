from alpine
RUN apk add --no-cache python3 py3-pip
WORKDIR /app
COPY install-deps.sh .
RUN chmod +x install-deps.sh
RUN ./install-deps.sh
COPY src .

CMD ["python3", "/app/main.py"]