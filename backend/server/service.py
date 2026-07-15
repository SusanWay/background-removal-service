import asyncio
import logging
from time import perf_counter

import grpc

from models.background_remover import (
    BackgroundRemover,
    UnsupportedProviderError,
)
from models.registry import ModelNotFoundError, ModelRegistry
from proto import background_removal_pb2
from proto import background_removal_pb2_grpc


logger = logging.getLogger(__name__)


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

        # Очередь запросов не используется.
        # Пока выполняется один инференс, остальные запросы
        # сразу получают ошибку RESOURCE_EXHAUSTED.
        self._is_processing = False

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

        # Проверка и переключение выполняются без await между ними.
        # В рамках одного asyncio event loop другой обработчик
        # не сможет вклиниться между этими операциями.
        if self._is_processing:
            await context.abort(
                grpc.StatusCode.RESOURCE_EXHAUSTED,
                (
                    "Сервис уже обрабатывает другое изображение. "
                    "Повторите попытку после завершения текущей обработки."
                ),
            )

        self._is_processing = True

        request_size_mb = len(request.image) / 1024 / 1024
        started_at = perf_counter()

        logger.info(
            "Начало запроса: model=%s, input_size=%.2f MB",
            request.model_name,
            request_size_mb,
        )

        try:
            result_bytes = await asyncio.to_thread(
                self._background_remover.remove_background,
                request.image,
                request.model_name,
            )

            processing_time_ms = int(
                (perf_counter() - started_at) * 1000
            )

            result_size_mb = len(result_bytes) / 1024 / 1024

            logger.info(
                "Обработка завершена: "
                "model=%s, input_size=%.2f MB, "
                "output_size=%.2f MB, processing_time=%s ms",
                request.model_name,
                request_size_mb,
                result_size_mb,
                processing_time_ms,
            )

            return background_removal_pb2.RemoveBackgroundResponse(
                image=result_bytes,
                model_name=request.model_name,
                processing_time_ms=processing_time_ms,
            )

        except ModelNotFoundError as error:
            logger.warning(
                "Запрошена неизвестная модель: %s",
                request.model_name,
            )

            await context.abort(
                grpc.StatusCode.NOT_FOUND,
                str(error),
            )

        except UnsupportedProviderError as error:
            logger.exception(
                "Неподдерживаемый провайдер модели",
            )

            await context.abort(
                grpc.StatusCode.FAILED_PRECONDITION,
                str(error),
            )

        except MemoryError:
            logger.exception(
                "Недостаточно оперативной памяти",
            )

            await context.abort(
                grpc.StatusCode.RESOURCE_EXHAUSTED,
                (
                    "Недостаточно оперативной памяти "
                    "для обработки изображения."
                ),
            )

        except Exception:
            logger.exception(
                "Ошибка при обработке изображения",
            )

            await context.abort(
                grpc.StatusCode.INTERNAL,
                "Не удалось обработать изображение.",
            )

        finally:
            self._is_processing = False

            logger.info(
                "Backend готов принять следующий запрос",
            )
