import { getGrpcModels } from "../grpc/background-removal-client";

export default defineEventHandler(async () => {
    try {
        const response = await getGrpcModels();

        return {
            models: response.models.map((model) => ({
                uniqueName: model.unique_name,
                name: model.display_name,
                description: model.description,
            })),
        };
    } catch (error) {
        console.error(
            "Ошибка получения моделей через gRPC:",
            error,
        );

        throw createError({
            statusCode: 503,
            statusMessage:
                "Сервис обработки изображений временно недоступен",
        });
    }
});