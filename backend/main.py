from pathlib import Path
from time import perf_counter

from rembg import new_session, remove


INPUT_PATH = Path("input/image.jpg")
OUTPUT_PATH = Path("output/result.png")
MODEL_NAME = "u2netp"


def main() -> None:
    if not INPUT_PATH.exists():
        raise FileNotFoundError(
            f"Изображение не найдено: {INPUT_PATH.resolve()}"
        )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    print(f"Загружаю модель: {MODEL_NAME}")
    session = new_session(MODEL_NAME)

    image_bytes = INPUT_PATH.read_bytes()

    started_at = perf_counter()

    result_bytes = remove(
        image_bytes,
        session=session,
    )

    processing_time = perf_counter() - started_at

    OUTPUT_PATH.write_bytes(result_bytes)

    print(f"Обработка завершена за {processing_time:.2f} сек.")
    print(f"Результат сохранён: {OUTPUT_PATH.resolve()}")


if __name__ == "__main__":
    main()