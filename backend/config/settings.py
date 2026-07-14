import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


CONFIG_PATH = Path(__file__).with_name("models.json")


class ConfigError(Exception):
    """Ошибка конфигурации приложения."""


@dataclass(frozen=True)
class ModelConfig:
    unique_name: str
    name: str
    description: str
    provider: str
    provider_model_name: str
    enabled: bool


def load_models_config(
    config_path: Path = CONFIG_PATH,
) -> tuple[ModelConfig, ...]:
    """Загружает и проверяет конфигурацию моделей."""

    if not config_path.exists():
        raise ConfigError(
            f"Файл конфигурации не найден: {config_path.resolve()}"
        )

    try:
        raw_config = json.loads(
            config_path.read_text(encoding="utf-8")
        )
    except json.JSONDecodeError as error:
        raise ConfigError(
            f"Некорректный JSON в файле {config_path}: {error}"
        ) from error

    if not isinstance(raw_config, dict):
        raise ConfigError(
            "Корневое значение конфигурации должно быть объектом"
        )

    raw_models = raw_config.get("models")

    if not isinstance(raw_models, list):
        raise ConfigError(
            'Поле "models" должно быть массивом'
        )

    parsed_models = []

    for index, model in enumerate(raw_models):
        parsed_model = _parse_model(model, index)
        parsed_models.append(parsed_model)

    models = tuple(parsed_models)

    _validate_unique_names(models)

    return models


def _parse_model(
    raw_model: Any,
    index: int,
) -> ModelConfig:
    """Проверяет и преобразует одну модель из JSON."""

    if not isinstance(raw_model, dict):
        raise ConfigError(
            f"Модель с индексом {index} должна быть объектом"
        )

    return ModelConfig(
        unique_name=_get_required_string(
            raw_model,
            "unique_name",
            index,
        ),
        name=_get_required_string(
            raw_model,
            "name",
            index,
        ),
        description=_get_required_string(
            raw_model,
            "description",
            index,
        ),
        provider=_get_required_string(
            raw_model,
            "provider",
            index,
        ),
        provider_model_name=_get_required_string(
            raw_model,
            "provider_model_name",
            index,
        ),
        enabled=_get_required_bool(
            raw_model,
            "enabled",
            index,
        ),
    )


def _get_required_string(
    raw_model: dict[str, Any],
    field_name: str,
    model_index: int,
) -> str:
    value = raw_model.get(field_name)

    if not isinstance(value, str) or not value.strip():
        raise ConfigError(
            f'Поле "{field_name}" модели с индексом '
            f"{model_index} должно быть непустой строкой"
        )

    return value.strip()


def _get_required_bool(
    raw_model: dict[str, Any],
    field_name: str,
    model_index: int,
) -> bool:
    value = raw_model.get(field_name)

    if not isinstance(value, bool):
        raise ConfigError(
            f'Поле "{field_name}" модели с индексом '
            f"{model_index} должно быть boolean"
        )

    return value


def _validate_unique_names(
    models: tuple[ModelConfig, ...],
) -> None:
    unique_names: set[str] = set()

    for model in models:
        if model.unique_name in unique_names:
            raise ConfigError(
                "Обнаружено повторяющееся значение "
                f'unique_name: "{model.unique_name}"'
            )

        unique_names.add(model.unique_name)