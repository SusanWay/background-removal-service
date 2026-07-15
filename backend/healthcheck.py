import sys

import grpc
from grpc_health.v1 import health_pb2
from grpc_health.v1 import health_pb2_grpc


GRPC_ADDRESS = "127.0.0.1:50051"
SERVICE_NAME = (
    "background_removal.v1.BackgroundRemovalService"
)
TIMEOUT_SECONDS = 5


def check_health() -> bool:
    """Проверяет готовность gRPC-сервиса."""

    try:
        with grpc.insecure_channel(GRPC_ADDRESS) as channel:
            grpc.channel_ready_future(channel).result(
                timeout=TIMEOUT_SECONDS
            )

            client = health_pb2_grpc.HealthStub(channel)

            response = client.Check(
                health_pb2.HealthCheckRequest(
                    service=SERVICE_NAME,
                ),
                timeout=TIMEOUT_SECONDS,
            )

            return (
                response.status
                == health_pb2.HealthCheckResponse.SERVING
            )
    except (
        grpc.RpcError,
        grpc.FutureTimeoutError,
    ):
        return False


if __name__ == "__main__":
    if check_health():
        print("Backend is healthy")
        sys.exit(0)

    print("Backend is unavailable")
    sys.exit(1)