FROM python:3
WORKDIR /app
COPY entry.sh .
COPY install-deps.sh .
RUN chmod +x install-deps.sh entry.sh
RUN ./install-deps.sh

COPY src .

CMD ["/app/entry.sh"]