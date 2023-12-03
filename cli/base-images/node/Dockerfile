FROM node:21-alpine

WORKDIR /app
COPY entry.sh .
RUN chmod +x entry.sh

COPY src .
RUN npm install
RUN npm run build

CMD ["/app/entry.sh"]