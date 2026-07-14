import asyncio

from server.grpc_server import run_grpc_server


if __name__ == "__main__":
    asyncio.run(run_grpc_server())