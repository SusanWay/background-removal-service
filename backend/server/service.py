from models.registry import ModelRegistry
from proto import background_removal_pb2
from proto import background_removal_pb2_grpc


class BackgroundRemovalService(
    background_removal_pb2_grpc.BackgroundRemovalServiceServicer
):
    """Реализация gRPC-сервиса удаления фона."""

    def __init__(
        self,
        model_registry: ModelRegistry,
    ) -> None:
        self._model_registry = model_registry

    async def GetModels(
        self,
        request,
        context,
    ) -> background_removal_pb2.GetModelsResponse:
        """Возвращает список доступных моделей."""

        models = self._model_registry.get_models()

        model_messages = [
            background_removal_pb2.ModelInfo(
                unique_name=model.unique_name,
                display_name=model.name,
                description=model.description,
            )
            for model in models
        ]

        return background_removal_pb2.GetModelsResponse(
            models=model_messages,
        )