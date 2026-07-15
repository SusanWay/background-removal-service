import asyncio
import logging
from dataclasses import dataclass
from enum import Enum
from time import perf_counter
from uuid import uuid4

from models.background_remover import BackgroundRemover


logger = logging.getLogger(__name__)

MAX_WAITING_JOBS = 10


class JobQueueFullError(Exception):
    """Очередь обработки заполнена."""


class JobNotFoundError(Exception):
    """Задача с указанным идентификатором не найдена."""


class JobResultNotReadyError(Exception):
    """Результат задачи ещё не готов."""


class JobStatus(str, Enum):
    """Внутренний статус задачи обработки."""

    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ProcessingJob:
    """Задача удаления фона."""

    job_id: str
    image_bytes: bytes
    model_name: str
    status: JobStatus = JobStatus.QUEUED
    result_bytes: bytes | None = None
    error_message: str | None = None
    processing_time_ms: int = 0


@dataclass(frozen=True)
class JobStatusInfo:
    """Публичная информация о состоянии задачи."""

    job_id: str
    status: JobStatus
    queue_position: int
    error_message: str
    processing_time_ms: int


@dataclass(frozen=True)
class JobResult:
    """Готовый результат обработки."""

    image_bytes: bytes
    model_name: str
    processing_time_ms: int


class JobQueue:
    """
    Очередь задач удаления фона.

    Одновременно выполняется только одна задача.
    В ожидании может находиться не более MAX_WAITING_JOBS задач.
    """

    def __init__(
        self,
        background_remover: BackgroundRemover,
    ) -> None:
        self._background_remover = background_remover

        self._queue: asyncio.Queue[str] = asyncio.Queue()
        self._jobs: dict[str, ProcessingJob] = {}
        self._waiting_job_ids: list[str] = []

        self._processing_job_id: str | None = None
        self._worker_task: asyncio.Task[None] | None = None

    def start(self) -> None:
        """Запускает единственный worker очереди."""

        if self._worker_task is not None:
            return

        self._worker_task = asyncio.create_task(
            self._worker(),
            name="background-removal-worker",
        )

        logger.info(
            "Worker очереди запущен: max_waiting_jobs=%s",
            MAX_WAITING_JOBS,
        )

    async def stop(self) -> None:
        """Останавливает worker очереди."""

        if self._worker_task is None:
            return

        self._worker_task.cancel()

        try:
            await self._worker_task
        except asyncio.CancelledError:
            pass
        finally:
            self._worker_task = None

        logger.info("Worker очереди остановлен")

    def submit(
        self,
        image_bytes: bytes,
        model_name: str,
    ) -> JobStatusInfo:
        """Добавляет новую задачу в очередь."""

        if len(self._waiting_job_ids) >= MAX_WAITING_JOBS:
            raise JobQueueFullError(
                "На сервисе сейчас высокая нагрузка. "
                "Попробуйте отправить изображение позже."
            )

        job_id = uuid4().hex

        job = ProcessingJob(
            job_id=job_id,
            image_bytes=image_bytes,
            model_name=model_name,
        )

        self._jobs[job_id] = job
        self._waiting_job_ids.append(job_id)
        self._queue.put_nowait(job_id)

        queue_position = self._waiting_job_ids.index(job_id) + 1

        logger.info(
            "Задача добавлена в очередь: "
            "job_id=%s, model=%s, position=%s, waiting=%s",
            job_id,
            model_name,
            queue_position,
            len(self._waiting_job_ids),
        )

        return JobStatusInfo(
            job_id=job_id,
            status=JobStatus.QUEUED,
            queue_position=queue_position,
            error_message="",
            processing_time_ms=0,
        )

    def get_status(
        self,
        job_id: str,
    ) -> JobStatusInfo:
        """Возвращает текущее состояние задачи."""

        job = self._get_job(job_id)

        return JobStatusInfo(
            job_id=job.job_id,
            status=job.status,
            queue_position=self._get_queue_position(job),
            error_message=job.error_message or "",
            processing_time_ms=job.processing_time_ms,
        )

    def take_result(
        self,
        job_id: str,
    ) -> JobResult:
        """
        Возвращает готовый результат и удаляет задачу из хранилища.

        После этого повторно получить результат по job_id нельзя.
        """

        job = self._get_job(job_id)

        if job.status == JobStatus.FAILED:
            raise JobResultNotReadyError(
                job.error_message or "Обработка изображения завершилась ошибкой"
            )

        if (
            job.status != JobStatus.COMPLETED
            or job.result_bytes is None
        ):
            raise JobResultNotReadyError(
                "Результат изображения ещё не готов"
            )

        result = JobResult(
            image_bytes=job.result_bytes,
            model_name=job.model_name,
            processing_time_ms=job.processing_time_ms,
        )

        del self._jobs[job_id]

        logger.info(
            "Результат выдан и удалён из памяти: job_id=%s",
            job_id,
        )

        return result

    def _get_job(
        self,
        job_id: str,
    ) -> ProcessingJob:
        job = self._jobs.get(job_id)

        if job is None:
            raise JobNotFoundError(
                f'Задача "{job_id}" не найдена'
            )

        return job

    def _get_queue_position(
        self,
        job: ProcessingJob,
    ) -> int:
        if job.status != JobStatus.QUEUED:
            return 0

        try:
            return self._waiting_job_ids.index(job.job_id) + 1
        except ValueError:
            return 0

    async def _worker(self) -> None:
        """Последовательно обрабатывает задачи из очереди."""

        while True:
            job_id = await self._queue.get()

            try:
                await self._process_job(job_id)
            finally:
                self._queue.task_done()

    async def _process_job(
        self,
        job_id: str,
    ) -> None:
        job = self._jobs.get(job_id)

        if job is None:
            logger.warning(
                "Worker получил отсутствующую задачу: job_id=%s",
                job_id,
            )
            return

        self._remove_from_waiting(job_id)

        self._processing_job_id = job_id
        job.status = JobStatus.PROCESSING

        started_at = perf_counter()

        logger.info(
            "Начало обработки задачи: "
            "job_id=%s, model=%s, remaining=%s",
            job.job_id,
            job.model_name,
            len(self._waiting_job_ids),
        )

        try:
            result_bytes = await asyncio.to_thread(
                self._background_remover.remove_background,
                job.image_bytes,
                job.model_name,
            )

            job.result_bytes = result_bytes
            job.status = JobStatus.COMPLETED
            job.processing_time_ms = int(
                (perf_counter() - started_at) * 1000
            )

            logger.info(
                "Задача обработана: "
                "job_id=%s, model=%s, processing_time=%s ms",
                job.job_id,
                job.model_name,
                job.processing_time_ms,
            )

        except Exception as error:
            logger.exception(
                "Ошибка обработки задачи: job_id=%s",
                job.job_id,
            )

            job.status = JobStatus.FAILED
            job.error_message = str(error) or (
                "Не удалось обработать изображение"
            )
            job.processing_time_ms = int(
                (perf_counter() - started_at) * 1000
            )

        finally:
            # Входное изображение больше не нужно ни при успешной
            # обработке, ни при ошибке.
            job.image_bytes = b""
            self._processing_job_id = None

    def _remove_from_waiting(
        self,
        job_id: str,
    ) -> None:
        try:
            self._waiting_job_ids.remove(job_id)
        except ValueError:
            pass