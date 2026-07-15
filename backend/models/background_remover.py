from rembg import new_session
from rembg import remove as rembg_remove

from models.registry import ModelRegistry


class UnsupportedProviderError(Exception):
    """Указан неподдерживаемый поставщик модели."""


class BackgroundRemover:
    """Загружает модели и выполняет удаление фона."""

    def __init__(
        self,
        model_registry: ModelRegistry,
    ) -> None:
        self._model_registry = model_registry
        self._sessions: dict[str, object] = {}

        self._load_models()

    def _load_models(self) -> None:
        """Загружает все включённые модели в память."""

        for model in self._model_registry.get_models():
            if model.provider != "rembg":
                raise UnsupportedProviderError(
                    f'Провайдер "{model.provider}" не поддерживается'
                )

            print(f"Загружаю модель: {model.unique_name}")

            self._sessions[model.unique_name] = new_session(
                model.provider_model_name
            )

    def remove_background(
        self,
        image_bytes: bytes,
        model_name: str,
    ) -> bytes:
        """Удаляет фон с помощью выбранной модели."""

        model = self._model_registry.get_model(model_name)
        session = self._sessions[model.unique_name]

        result_bytes = rembg_remove(
            image_bytes,
            session=session,
        )

        return result_bytes