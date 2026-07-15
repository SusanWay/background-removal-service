import {
    submitJobGrpc,
} from "../../grpc/background-removal-client";
import {
    throwGrpcHttpError,
} from "../../utils/grpc-error";
import {
    mapGrpcJobStatus,
} from "../../utils/job-status";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

export default defineEventHandler(async (event) => {
    const formData = await readMultipartFormData(event);

    if (!formData) {
        throw createError({
            statusCode: 400,
            statusMessage:
                "Не удалось прочитать данные запроса",
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
            statusMessage:
                "Модель обработки не выбрана",
        });
    }

    try {
        const response = await submitJobGrpc(
            imagePart.data,
            modelName,
        );

        setResponseStatus(event, 202);

        return {
            jobId: response.job_id,
            status: mapGrpcJobStatus(response.status),
            queuePosition: response.queue_position,
        };
    } catch (error) {
        throwGrpcHttpError(error);
    }
});