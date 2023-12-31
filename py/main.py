import json
import tinytuya
import time
from datetime import datetime
import asyncio 
from websockets.server import serve
from websockets import ConnectionClosed
from threading import Thread

WEBSOCKET_PORT = 3100
EVENT_FREQUENCY_HZ = 2

class TuyaDevice:

    PLUG_IP = "10.42.0.245"
    PLUG_VERSION = "3.3"

    def __init__(self):
        with open("devices.json", "r") as f:
            DEVICE = json.loads(f.read())[0]

        TuyaDevice.DEVICE_ID = DEVICE["id"]
        TuyaDevice.KEY = DEVICE["key"]
        print("PLUGID={},  PLUGIP={},  PLUGKEY={},  PLUGVERS={}".format(
            TuyaDevice.DEVICE_ID, 
            TuyaDevice.PLUG_IP, 
            TuyaDevice.KEY, 
            TuyaDevice.PLUG_VERSION
        ))

        self.callbacks = []

    async def run(self):
        d = tinytuya.OutletDevice(
                TuyaDevice.DEVICE_ID, 
                TuyaDevice.PLUG_IP, 
                TuyaDevice.KEY
        )
        d.set_version(3.3)
        d.set_socketPersistent(True)

        while True:
            d.updatedps([19], nowait=True)

            dps = d.status()['dps']
            w = dps['19'] / 10.0 if '19' in dps else None 
            if w is None:
                continue

            now = datetime.utcnow().isoformat() + "Z" #time.strftime("%Y-%m-%dT%H:%M:%S.%fZ", time.gmtime())
            print("now={}  w={}".format(now, w))
            for callback in self.callbacks:
                await callback(now, w)

            await asyncio.sleep(1.0 / EVENT_FREQUENCY_HZ)

    def add_callback(self, callback):
        self.callbacks.append(callback)
    
    def remove_callback(self, callback):
        self.callbacks.remove(callback)

async def runTuyaThreadWithRetry():
    while True:
        TuyaDevice.singleton = TuyaDevice()
        print("Starting TuyaDevice service")
        try:
            await TuyaDevice.singleton.run()
        except Exception as e:
            print(e)
            await asyncio.sleep(3)
            TuyaDevice.singleton = TuyaDevice()
        
tuyaThread = Thread(target=lambda: asyncio.run(runTuyaThreadWithRetry()))
tuyaThread.start()

async def handle(websocket):
    tuyaDevice = TuyaDevice.singleton
    if tuyaDevice is None:
        await websocket.close()
        return

    async def callback(now, w):
        try: 
            await websocket.send(json.dumps({"timestamp": now, "power": w}))
        except ConnectionClosed as e: 
            print("Connection closed, removing callback")
            tuyaDevice.remove_callback(callback)

    tuyaDevice.add_callback(callback)
    await asyncio.Future()


async def main():
    async with serve(handle, "localhost", WEBSOCKET_PORT):
        print("Started websocket server on port {}", WEBSOCKET_PORT)
        await asyncio.Future()

asyncio.run(main())
