import {
    getJobResultGrpc,
} from "../../../grpc/background-removal-client";
import {
    throwGrpcHttpError,
} from "../../../utils/grpc-error";

export default defineEventHandler(async (event) => {
    const jobId = getRouterParam(event, "jobId")?.trim();

    if (!jobId) {
        throw createError({
            statusCode: 400,
            statusMessage:
                "Идентификатор задачи не передан",
        });
    }

    try {
        const response = await getJobResultGrpc(jobId);

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
        throwGrpcHttpError(error);
    }
});