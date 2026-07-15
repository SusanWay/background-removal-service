import grpc

from config.settings import load_models_config
from models.background_remover import BackgroundRemover
from models.registry import ModelRegistry
from proto import background_removal_pb2_grpc
from server.service import BackgroundRemovalService


GRPC_HOST = "[::]"
GRPC_PORT = 50051


async def run_grpc_server() -> None:
    """Создаёт и запускает gRPC-сервер."""

    models = load_models_config()
    model_registry = ModelRegistry(models)

    background_remover = BackgroundRemover(
        model_registry=model_registry,
    )

    grpc_server = grpc.aio.server()

    service = BackgroundRemovalService(
        model_registry=model_registry,
        background_remover=background_remover,
    )

    background_removal_pb2_grpc.add_BackgroundRemovalServiceServicer_to_server(
        service,
        grpc_server,
    )

    address = f"{GRPC_HOST}:{GRPC_PORT}"
    grpc_server.add_insecure_port(address)

    await grpc_server.start()

    print(f"gRPC-сервер запущен на {address}")

    await grpc_server.wait_for_termination()