import grpc
from grpc_health.v1 import health
from grpc_health.v1 import health_pb2
from grpc_health.v1 import health_pb2_grpc

from config.settings import load_models_config
from models.background_remover import BackgroundRemover
from models.registry import ModelRegistry
from proto import background_removal_pb2_grpc
from server.service import BackgroundRemovalService


GRPC_HOST = "0.0.0.0"
GRPC_PORT = 50051
MAX_MESSAGE_SIZE = 64 * 1024 * 1024

SERVICE_NAME = (
    "background_removal.v1.BackgroundRemovalService"
)


async def run_grpc_server() -> None:
    """Создаёт и запускает gRPC-сервер."""

    models = load_models_config()
    model_registry = ModelRegistry(models)

    background_remover = BackgroundRemover(
        model_registry=model_registry,
    )

    grpc_server = grpc.aio.server(
        options=[
            (
                "grpc.max_receive_message_length",
                MAX_MESSAGE_SIZE,
            ),
            (
                "grpc.max_send_message_length",
                MAX_MESSAGE_SIZE,
            ),
        ]
    )

    service = BackgroundRemovalService(
        model_registry=model_registry,
        background_remover=background_remover,
    )

    background_removal_pb2_grpc.add_BackgroundRemovalServiceServicer_to_server(
        service,
        grpc_server,
    )

    health_service = health.HealthServicer()

    health_pb2_grpc.add_HealthServicer_to_server(
        health_service,
        grpc_server,
    )

    health_service.set(
        "",
        health_pb2.HealthCheckResponse.SERVING,
    )

    health_service.set(
        SERVICE_NAME,
        health_pb2.HealthCheckResponse.SERVING,
    )

    address = f"{GRPC_HOST}:{GRPC_PORT}"

    grpc_server.add_insecure_port(address)

    await grpc_server.start()

    print(f"gRPC-сервер запущен на {address}")
    print("Health check: SERVING")

    try:
        await grpc_server.wait_for_termination()
    finally:
        health_service.set(
            "",
            health_pb2.HealthCheckResponse.NOT_SERVING,
        )

        health_service.set(
            SERVICE_NAME,
            health_pb2.HealthCheckResponse.NOT_SERVING,
        )