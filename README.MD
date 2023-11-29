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
- The python server (`py/main.py`) must first be started.

Then run:

```sh
ENERGY_MONITOR_WS_URL="ws://localhost:3100" cargo run -- [language] [problem_path]
```

## Contest app

Some initial setup is required:

- npx remix init
- npm install
- npm run setup

An `.env` file must be present credentials and properties.

For instance:

```
DATABASE_URL="file:./data.db?connection_limit=1"
SESSION_SECRET="99a64178-97f7-4ef2-bc8c-b88f3946efae"
BOOTSTRAP_ACCESS_KEY="976da142-7afe-49c5-8c08-bdea79ae2452"
REPO_BASE_PATH= "/path/to/repo/speed-war"
```

Then, to start app:

```
npm run dev
```
