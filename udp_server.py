import asyncio
from loguru import logger

HOST = "10.0.0.1"   # IP VPN del servidor
PORT = 4231

class UDP(asyncio.DatagramProtocol):
    def datagram_received(self, data, addr):
        logger.info(f"UDP RX {addr}: {data!r}")

async def main():
    loop = asyncio.get_running_loop()
    transport, proto = await loop.create_datagram_endpoint(
        lambda: UDP(), local_addr=(HOST, PORT)
    )
    logger.info(f"UDP escuchando en {HOST}:{PORT}")
    try:
        await asyncio.Future()
    finally:
        transport.close()

if __name__ == "__main__":
    asyncio.run(main())
