import grpc

from models.registry import ModelNotFoundError, ModelRegistry
from proto import background_removal_pb2
from proto import background_removal_pb2_grpc
from server.job_queue import (
    JobNotFoundError,
    JobQueue,
    JobQueueFullError,
    JobResultNotReadyError,
    JobStatus,
)


class BackgroundRemovalService(
    background_removal_pb2_grpc.BackgroundRemovalServiceServicer
):
    """Реализация gRPC-сервиса удаления фона."""

    def __init__(
        self,
        model_registry: ModelRegistry,
        job_queue: JobQueue,
    ) -> None:
        self._model_registry = model_registry
        self._job_queue = job_queue

    async def GetModels(
        self,
        request,
        context,
    ) -> background_removal_pb2.GetModelsResponse:
        """Возвращает список доступных моделей."""

        models = self._model_registry.get_models()

        return background_removal_pb2.GetModelsResponse(
            models=[
                background_removal_pb2.ModelInfo(
                    unique_name=model.unique_name,
                    display_name=model.name,
                    description=model.description,
                )
                for model in models
            ],
        )

    async def SubmitJob(
        self,
        request,
        context,
    ) -> background_removal_pb2.SubmitJobResponse:
        """Добавляет изображение в очередь обработки."""

        if not request.image:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "Изображение не передано",
            )

        if not request.model_name:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "Модель обработки не выбрана",
            )

        try:
            # Проверяем существование модели до помещения
            # большого изображения в очередь.
            self._model_registry.get_model(
                request.model_name,
            )

            job = self._job_queue.submit(
                image_bytes=request.image,
                model_name=request.model_name,
            )

        except ModelNotFoundError as error:
            await context.abort(
                grpc.StatusCode.NOT_FOUND,
                str(error),
            )

        except JobQueueFullError as error:
            await context.abort(
                grpc.StatusCode.RESOURCE_EXHAUSTED,
                str(error),
            )

        return background_removal_pb2.SubmitJobResponse(
            job_id=job.job_id,
            status=self._to_proto_status(job.status),
            queue_position=job.queue_position,
        )

    async def GetJobStatus(
        self,
        request,
        context,
    ) -> background_removal_pb2.GetJobStatusResponse:
        """Возвращает актуальное состояние и место задачи."""

        if not request.job_id:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "Идентификатор задачи не передан",
            )

        try:
            job = self._job_queue.get_status(
                request.job_id,
            )

        except JobNotFoundError as error:
            await context.abort(
                grpc.StatusCode.NOT_FOUND,
                str(error),
            )

        return background_removal_pb2.GetJobStatusResponse(
            job_id=job.job_id,
            status=self._to_proto_status(job.status),
            queue_position=job.queue_position,
            error_message=job.error_message,
            processing_time_ms=job.processing_time_ms,
        )

    async def GetJobResult(
        self,
        request,
        context,
    ) -> background_removal_pb2.GetJobResultResponse:
        """
        Возвращает готовый PNG.

        После успешной выдачи задача и результат удаляются из памяти.
        """

        if not request.job_id:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "Идентификатор задачи не передан",
            )

        try:
            result = self._job_queue.take_result(
                request.job_id,
            )

        except JobNotFoundError as error:
            await context.abort(
                grpc.StatusCode.NOT_FOUND,
                str(error),
            )

        except JobResultNotReadyError as error:
            await context.abort(
                grpc.StatusCode.FAILED_PRECONDITION,
                str(error),
            )

        return background_removal_pb2.GetJobResultResponse(
            image=result.image_bytes,
            model_name=result.model_name,
            processing_time_ms=result.processing_time_ms,
        )

    @staticmethod
    def _to_proto_status(
        status: JobStatus,
    ) -> int:
        """Преобразует внутренний статус в protobuf enum."""

        status_mapping = {
            JobStatus.QUEUED:
                background_removal_pb2.JOB_STATUS_QUEUED,
            JobStatus.PROCESSING:
                background_removal_pb2.JOB_STATUS_PROCESSING,
            JobStatus.COMPLETED:
                background_removal_pb2.JOB_STATUS_COMPLETED,
            JobStatus.FAILED:
                background_removal_pb2.JOB_STATUS_FAILED,
        }

        return status_mapping.get(
            status,
            background_removal_pb2.JOB_STATUS_UNSPECIFIED,
        )