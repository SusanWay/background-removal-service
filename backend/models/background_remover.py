import ctypes
import gc
import logging
import sys
from typing import Any

from rembg import new_session
from rembg import remove as rembg_remove

from models.registry import ModelRegistry


logger = logging.getLogger(__name__)


class UnsupportedProviderError(Exception):
    """Указан неподдерживаемый поставщик модели."""


class BackgroundRemover:
    """
    Загружает модель непосредственно перед обработкой изображения.

    После обработки ONNX-сессия удаляется, чтобы не хранить
    модель в оперативной памяти между запросами.
    """

    def __init__(
        self,
        model_registry: ModelRegistry,
    ) -> None:
        self._model_registry = model_registry

    def remove_background(
        self,
        image_bytes: bytes,
        model_name: str,
    ) -> bytes:
        """Загружает модель, удаляет фон и освобождает память."""

        model = self._model_registry.get_model(model_name)

        if model.provider != "rembg":
            raise UnsupportedProviderError(
                f'Провайдер "{model.provider}" не поддерживается'
            )

        session: Any | None = None

        try:
            logger.info(
                "Загрузка модели перед обработкой: %s",
                model.unique_name,
            )

            session = new_session(
                model.provider_model_name,
            )

            logger.info(
                "Модель загружена, начало инференса: %s",
                model.unique_name,
            )

            result_bytes = rembg_remove(
                image_bytes,
                session=session,
            )

            return result_bytes

        finally:
            logger.info(
                "Выгрузка модели после обработки: %s",
                model.unique_name,
            )

            # Удаляем ссылку на ONNX-сессию.
            session = None

            # Удаляем локальную ссылку на исходное изображение.
            del image_bytes

            self._release_unused_memory()

            logger.info(
                "Очистка памяти завершена: %s",
                model.unique_name,
            )

    @staticmethod
    def _release_unused_memory() -> None:
        """
        Запускает сборщик мусора Python и пытается вернуть
        освобождённые страницы памяти операционной системе.
        """

        collected_objects = gc.collect()

        if not sys.platform.startswith("linux"):
            logger.debug(
                "GC завершён: collected=%s. "
                "malloc_trim недоступен вне Linux",
                collected_objects,
            )
            return

        try:
            libc = ctypes.CDLL("libc.so.6")

            malloc_trim = libc.malloc_trim
            malloc_trim.argtypes = [ctypes.c_size_t]
            malloc_trim.restype = ctypes.c_int

            trimmed = bool(malloc_trim(0))

        except (AttributeError, OSError) as error:
            logger.warning(
                "Не удалось вызвать malloc_trim: %s",
                error,
            )
            return

        logger.debug(
            "Очистка памяти: collected=%s, malloc_trim=%s",
            collected_objects,
            trimmed,
        )
