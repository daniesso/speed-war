FROM clojure as builder

WORKDIR /app
COPY src .
RUN mv "$(lein uberjar | sed -n 's/^Created \(.*standalone\.jar\)/\1/p')" app-standalone.jar

FROM clojure
WORKDIR /app
COPY entry.sh .
RUN chmod +x entry.sh

COPY --from=builder /app/app-standalone.jar /app/app.jar
CMD ["/app/entry.sh"]