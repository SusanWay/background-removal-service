from config.settings import ModelConfig


class ModelNotFoundError(Exception):
    """Запрошенная модель отсутствует или отключена."""


class ModelRegistry:
    """Хранит конфигурации доступных моделей."""

    def __init__(
        self,
        models: tuple[ModelConfig, ...],
    ) -> None:
        self._models: dict[str, ModelConfig] = {
            model.unique_name: model
            for model in models
            if model.enabled
        }

    def get_models(self) -> tuple[ModelConfig, ...]:
        """Возвращает конфигурации всех доступных моделей."""

        return tuple(self._models.values())

    def get_model(
        self,
        unique_name: str,
    ) -> ModelConfig:
        """Возвращает конфигурацию модели по unique_name."""

        model = self._models.get(unique_name)

        if model is None:
            raise ModelNotFoundError(
                f'Модель "{unique_name}" не найдена или отключена'
            )

        return model