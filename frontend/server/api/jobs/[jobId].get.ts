import {
    getJobStatusGrpc,
} from "../../grpc/background-removal-client";
import {
    throwGrpcHttpError,
} from "../../utils/grpc-error";
import {
    mapGrpcJobStatus,
} from "../../utils/job-status";

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
        const response = await getJobStatusGrpc(jobId);

        return {
            jobId: response.job_id,
            status: mapGrpcJobStatus(response.status),
            queuePosition: response.queue_position,
            errorMessage: response.error_message || null,
            processingTimeMs:
                Number(response.processing_time_ms) || 0,
        };
    } catch (error) {
        throwGrpcHttpError(error);
    }
});