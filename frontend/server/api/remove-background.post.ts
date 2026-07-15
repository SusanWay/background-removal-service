import {
    status as grpcStatus,
    type ServiceError,
} from "@grpc/grpc-js";
import {
    removeBackgroundGrpc,
} from "../grpc/background-removal-client";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

function isServiceError(
    error: unknown,
): error is ServiceError {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        "details" in error
    );
}

export default defineEventHandler(async (event) => {
    const formData = await readMultipartFormData(event);

    if (!formData) {
        throw createError({
            statusCode: 400,
            statusMessage: "Не удалось прочитать данные запроса",
        });
    }

    const imagePart = formData.find(
        (part) => part.name === "image",
    );

    const modelPart = formData.find(
        (part) => part.name === "modelName",
    );

    if (!imagePart?.data.length) {
        throw createError({
            statusCode: 400,
            statusMessage: "Изображение не передано",
        });
    }

    if (
        !imagePart.type ||
        !ALLOWED_CONTENT_TYPES.has(imagePart.type)
    ) {
        throw createError({
            statusCode: 415,
            statusMessage:
                "Поддерживаются только изображения JPG, PNG и WEBP",
        });
    }

    if (imagePart.data.length > MAX_FILE_SIZE) {
        throw createError({
            statusCode: 413,
            statusMessage:
                "Размер изображения не должен превышать 10 МБ",
        });
    }

    const modelName = modelPart?.data
        .toString("utf-8")
        .trim();

    if (!modelName) {
        throw createError({
            statusCode: 400,
            statusMessage: "Модель обработки не выбрана",
        });
    }

    try {
        const response = await removeBackgroundGrpc(
            imagePart.data,
            modelName,
        );

        setResponseHeader(
            event,
            "Content-Type",
            "image/png",
        );

        setResponseHeader(
            event,
            "Content-Disposition",
            'inline; filename="background-removed.png"',
        );

        setResponseHeader(
            event,
            "X-Model-Name",
            response.model_name,
        );

        setResponseHeader(
            event,
            "X-Processing-Time-Ms",
            response.processing_time_ms,
        );

        return new Uint8Array(response.image);
    } catch (error) {
        console.error(
            "Ошибка удаления фона через gRPC:",
            error,
        );

        if (isServiceError(error)) {
            if (error.code === grpcStatus.NOT_FOUND) {
                throw createError({
                    statusCode: 404,
                    statusMessage:
                        error.details || "Выбранная модель не найдена",
                });
            }

            if (error.code === grpcStatus.INVALID_ARGUMENT) {
                throw createError({
                    statusCode: 400,
                    statusMessage:
                        error.details || "Некорректные данные запроса",
                });
            }

            if (error.code === grpcStatus.RESOURCE_EXHAUSTED) {
                throw createError({
                    statusCode: 413,
                    statusMessage:
                        "Изображение или результат превышает допустимый размер",
                });
            }

            if (error.code === grpcStatus.DEADLINE_EXCEEDED) {
                throw createError({
                    statusCode: 504,
                    statusMessage:
                        "Обработка изображения заняла слишком много времени",
                });
            }

            if (error.code === grpcStatus.UNAVAILABLE) {
                throw createError({
                    statusCode: 503,
                    statusMessage:
                        "Python-сервис обработки изображений недоступен",
                });
            }

            throw createError({
                statusCode: 502,
                statusMessage:
                    error.details || "Ошибка Python-сервиса",
            });
        }

        throw createError({
            statusCode: 500,
            statusMessage:
                "Не удалось обработать изображение",
        });
    }
});