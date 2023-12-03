# Tuya client & power usage server

See https://github.com/jasonacox/tuyapower

To scan for devices on local network:

```
python3 -m tuyapower
```

To acquire access key from Tuya:

```
python3 -m tinytuya wizard
```

## Usage with CLI

In order to measure energy:

- a Tuya Smart Plug device is required
- The python server (`py/main.py`) must first be started.

Then run:

```sh
cd cli && ENERGY_MONITOR_WS_URL="ws://localhost:3100" cargo run -- test --language [language] --problem [problem]
```
