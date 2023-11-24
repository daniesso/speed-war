import asyncio
from websockets.sync.client import connect

def hello():
    with connect("ws://localhost:3001") as websocket:
        while True:
            message = websocket.recv()
            print(f"Received: {message}")

hello()
