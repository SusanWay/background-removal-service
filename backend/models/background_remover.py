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
    """Загружает модели и выполняет удаление фона."""

    def __init__(
        self,
        model_registry: ModelRegistry,
    ) -> None:
        self._model_registry = model_registry
        self._sessions: dict[str, Any] = {}

        self._load_models()

    def _load_models(self) -> None:
        """Загружает все включённые модели в память."""

        for model in self._model_registry.get_models():
            if model.provider != "rembg":
                raise UnsupportedProviderError(
                    f'Провайдер "{model.provider}" не поддерживается'
                )

            logger.info(
                "Загружаю модель: %s",
                model.unique_name,
            )

            self._sessions[model.unique_name] = new_session(
                model.provider_model_name,
            )

            logger.info(
                "Модель загружена: %s",
                model.unique_name,
            )

    def remove_background(
        self,
        image_bytes: bytes,
        model_name: str,
    ) -> bytes:
        """Удаляет фон с помощью выбранной модели."""

        model = self._model_registry.get_model(model_name)
        session = self._sessions[model.unique_name]

        try:
            result_bytes = rembg_remove(
                image_bytes,
                session=session,
            )

            return result_bytes
        finally:
            # Удаляем локальную ссылку на входное изображение.
            # Сам объект будет полностью освобождён, когда на него
            # больше не останется ссылок в вызывающем коде.
            del image_bytes

            self._release_unused_memory()

    @staticmethod
    def _release_unused_memory() -> None:
        """
        Очищает недоступные Python-объекты и пытается вернуть
        свободные страницы heap операционной системе.

        ONNX-сессии не удаляются: все модели остаются загруженными.
        """

        collected_objects = gc.collect()

        if not sys.platform.startswith("linux"):
            logger.debug(
                "Сборка мусора завершена: collected=%s. "
                "malloc_trim пропущен: платформа не Linux",
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
            logger.debug(
                "Сборка мусора завершена: collected=%s. "
                "Не удалось вызвать malloc_trim: %s",
                collected_objects,
                error,
            )
            return

        logger.debug(
            "Очистка памяти завершена: "
            "collected=%s, malloc_trim=%s",
            collected_objects,
            trimmed,
        )
