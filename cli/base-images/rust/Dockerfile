FROM rust:1.67 as builder
WORKDIR /app
COPY src .
RUN cargo build --release

FROM debian:bullseye-slim
COPY --from=builder /app/target/release /app/
CMD ["/app/app"]

