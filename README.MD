# Speed War

## CLI

In order to run tests using CLI:

```sh
cd cli
cargo run -- [language] [problem_path]

# For example:
cargo run -- rust ../problems/1
```

To enable debug logging, use:

```sh
RUST_LOG=debug cargo run -- [language] [problem_path]
```

In order to measure energy:

- a Tuya Smart Plug device is required
- The python server (py/main.py) must first be started.

Then run:

```sh
ENERGY_MONITOR_WS_URL="ws://localhost:3100" cargo run -- [language] [problem_path]
```
