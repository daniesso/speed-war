FROM rust:1.67 as builder
WORKDIR /app
COPY src .
RUN cargo build --release

FROM debian:bullseye-slim
WORKDIR /app
COPY entry.sh .
RUN chmod +x entry.sh

COPY --from=builder /app/target/release /app/
CMD ["sleep", "infinity"]