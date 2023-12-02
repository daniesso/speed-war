FROM ubuntu:22.04 as builder
LABEL Description="Build environment"

ENV HOME /root

SHELL ["/bin/bash", "-c"]

RUN apt-get update && apt-get -y --no-install-recommends install \
    build-essential \
    clang \
    cmake \
    gdb \
    wget

# Let us add some heavy dependency
RUN cd ${HOME} && \
    wget --no-check-certificate --quiet \
    https://boostorg.jfrog.io/artifactory/main/release/1.77.0/source/boost_1_77_0.tar.gz && \
    tar xzf ./boost_1_77_0.tar.gz && \
    cd ./boost_1_77_0 && \
    ./bootstrap.sh && \
    ./b2 install && \
    cd .. && \
    rm -rf ./boost_1_77_0

WORKDIR /app
COPY src .
RUN mkdir build && cd build
WORKDIR /app/build
RUN cmake ../
RUN make

FROM ubuntu:22.04
WORKDIR /app
COPY entry.sh .
RUN chmod +x entry.sh

COPY --from=builder /app/build /app/
CMD ["sleep", "infinity"]