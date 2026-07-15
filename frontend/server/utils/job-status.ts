import type {
    GrpcJobStatus,
} from "../grpc/background-removal-client";

export type PublicJobStatus =
    | "queued"
    | "processing"
    | "completed"
    | "failed"
    | "unknown";

export function mapGrpcJobStatus(
    status: GrpcJobStatus,
): PublicJobStatus {
    const statusMap: Record<
        GrpcJobStatus,
        PublicJobStatus
    > = {
        JOB_STATUS_UNSPECIFIED: "unknown",
        JOB_STATUS_QUEUED: "queued",
        JOB_STATUS_PROCESSING: "processing",
        JOB_STATUS_COMPLETED: "completed",
        JOB_STATUS_FAILED: "failed",
    };

    return statusMap[status] ?? "unknown";
}