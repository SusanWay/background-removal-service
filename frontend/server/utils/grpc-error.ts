import {
    status as grpcStatus,
    type ServiceError,
} from "@grpc/grpc-js";

export function isGrpcServiceError(
    error: unknown,
): error is ServiceError {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        "details" in error
    );
}

export function throwGrpcHttpError(
    error: unknown,
): never {
    console.error(
        "Ошибка обращения к Python gRPC-сервису:",
        error,
    );

    if (!isGrpcServiceError(error)) {
        throw createError({
            statusCode: 500,
            statusMessage:
                "Не удалось обратиться к сервису обработки изображений",
        });
    }

    if (error.code === grpcStatus.INVALID_ARGUMENT) {
        throw createError({
            statusCode: 400,
            statusMessage:
                error.details ||
                "Переданы некорректные данные",
        });
    }

    if (error.code === grpcStatus.NOT_FOUND) {
        throw createError({
            statusCode: 404,
            statusMessage:
                error.details ||
                "Запрошенный объект не найден",
        });
    }

    if (error.code === grpcStatus.RESOURCE_EXHAUSTED) {
        throw createError({
            statusCode: 503,
            statusMessage:
                error.details ||
                (
                    "На сервисе сейчас высокая нагрузка. " +
                    "Попробуйте позже."
                ),
        });
    }

    if (error.code === grpcStatus.FAILED_PRECONDITION) {
        throw createError({
            statusCode: 409,
            statusMessage:
                error.details ||
                "Операция пока не может быть выполнена",
        });
    }

    if (error.code === grpcStatus.DEADLINE_EXCEEDED) {
        throw createError({
            statusCode: 504,
            statusMessage:
                "Сервис не успел обработать запрос",
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
            error.details ||
            "Ошибка Python-сервиса обработки изображений",
    });
}