import asyncio
from time import perf_counter

import grpc

from models.background_remover import BackgroundRemover
from models.registry import ModelNotFoundError, ModelRegistry
from proto import background_removal_pb2
from proto import background_removal_pb2_grpc


class BackgroundRemovalService(
    background_removal_pb2_grpc.BackgroundRemovalServiceServicer
):
    """Реализация gRPC-сервиса удаления фона."""

    def __init__(
        self,
        model_registry: ModelRegistry,
        background_remover: BackgroundRemover,
    ) -> None:
        self._model_registry = model_registry
        self._background_remover = background_remover

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

    async def RemoveBackground(
        self,
        request,
        context,
    ) -> background_removal_pb2.RemoveBackgroundResponse:
        """Удаляет фон с переданного изображения."""

        if not request.image:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "Изображение не передано",
            )

        if not request.model_name:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "Название модели не передано",
            )

        started_at = perf_counter()

        try:
            result_bytes = await asyncio.to_thread(
                self._background_remover.remove_background,
                request.image,
                request.model_name,
            )
        except ModelNotFoundError as error:
            await context.abort(
                grpc.StatusCode.NOT_FOUND,
                str(error),
            )

        processing_time_ms = int(
            (perf_counter() - started_at) * 1000
        )

        return background_removal_pb2.RemoveBackgroundResponse(
            image=result_bytes,
            model_name=request.model_name,
            processing_time_ms=processing_time_ms,
        )