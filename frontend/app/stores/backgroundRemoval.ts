import { defineStore } from "pinia";

const POLLING_INTERVAL_MS = 1500;

export type BackgroundRemovalStatus =
    | "idle"
    | "submitting"
    | "queued"
    | "processing"
    | "completed"
    | "failed";

interface SubmitJobResponse {
    jobId: string;
    status: "queued" | "processing";
    queuePosition: number;
}

interface JobStatusResponse {
    jobId: string;
    status:
        | "queued"
        | "processing"
        | "completed"
        | "failed"
        | "unknown";
    queuePosition: number;
    errorMessage: string | null;
    processingTimeMs: number;
}

interface ApiErrorData {
    statusMessage?: string;
    message?: string;
}

export const useBackgroundRemovalStore = defineStore(
    "backgroundRemoval",
    () => {
        const status = ref<BackgroundRemovalStatus>("idle");

        const jobId = ref<string | null>(null);
        const queuePosition = ref<number | null>(null);

        const resultUrl = ref<string | null>(null);
        const processingTimeMs = ref<number | null>(null);
        const usedModelName = ref<string | null>(null);

        const errorMessage = ref<string | null>(null);

        let pollingToken = 0;

        const isSubmitting = computed(
            () => status.value === "submitting",
        );

        const isQueued = computed(
            () => status.value === "queued",
        );

        const isProcessing = computed(
            () => status.value === "processing",
        );

        const isLoading = computed(
            () =>
                isSubmitting.value ||
                isQueued.value ||
                isProcessing.value,
        );

        const hasResult = computed(
            () =>
                status.value === "completed" &&
                resultUrl.value !== null,
        );

        const queueMessage = computed(() => {
            if (status.value === "submitting") {
                return "Добавляем изображение в очередь…";
            }

            if (status.value === "queued") {
                if (
                    queuePosition.value !== null &&
                    queuePosition.value > 0
                ) {
                    return (
                        `Ваше место в очереди: ` +
                        `${queuePosition.value}`
                    );
                }

                return "Изображение ожидает обработки";
            }

            if (status.value === "processing") {
                return (
                    "Изображение обрабатывается. " +
                    "Модель загружается и удаляет фон…"
                );
            }

            return null;
        });

        async function processImage(
            file: File,
            modelName: string,
        ): Promise<void> {
            resetProcessingState();

            status.value = "submitting";

            const currentToken = ++pollingToken;

            try {
                const formData = new FormData();

                formData.append("image", file);
                formData.append("modelName", modelName);

                const response =
                    await $fetch<SubmitJobResponse>(
                        "/api/jobs",
                        {
                            method: "POST",
                            body: formData,
                        },
                    );

                if (currentToken !== pollingToken) {
                    return;
                }

                jobId.value = response.jobId;
                queuePosition.value =
                    response.queuePosition;

                status.value =
                    response.status === "processing"
                        ? "processing"
                        : "queued";

                await pollJobStatus(
                    response.jobId,
                    currentToken,
                );
            } catch (error) {
                if (currentToken !== pollingToken) {
                    return;
                }

                setError(error);
            }
        }

        async function pollJobStatus(
            currentJobId: string,
            currentToken: number,
        ): Promise<void> {
            while (
                currentToken === pollingToken &&
                jobId.value === currentJobId
                ) {
                await delay(POLLING_INTERVAL_MS);

                if (currentToken !== pollingToken) {
                    return;
                }

                try {
                    const response =
                        await $fetch<JobStatusResponse>(
                            `/api/jobs/${currentJobId}`,
                        );

                    if (currentToken !== pollingToken) {
                        return;
                    }

                    queuePosition.value =
                        response.queuePosition;

                    if (response.status === "queued") {
                        status.value = "queued";
                        continue;
                    }

                    if (response.status === "processing") {
                        status.value = "processing";
                        continue;
                    }

                    if (response.status === "completed") {
                        processingTimeMs.value =
                            response.processingTimeMs;

                        await loadResult(
                            currentJobId,
                            currentToken,
                        );

                        return;
                    }

                    if (response.status === "failed") {
                        status.value = "failed";
                        errorMessage.value =
                            response.errorMessage ||
                            (
                                "Не удалось обработать " +
                                "изображение"
                            );

                        return;
                    }

                    status.value = "failed";
                    errorMessage.value =
                        "Сервис вернул неизвестный статус задачи";

                    return;
                } catch (error) {
                    if (currentToken !== pollingToken) {
                        return;
                    }

                    setError(error);
                    return;
                }
            }
        }

        async function loadResult(
            currentJobId: string,
            currentToken: number,
        ): Promise<void> {
            try {
                const response = await $fetch.raw<Blob>(
                    `/api/jobs/${currentJobId}/result`,
                    {
                        responseType: "blob",
                    },
                );

                if (currentToken !== pollingToken) {
                    return;
                }

                revokeResultUrl();

                const blob = response._data;

                if (!(blob instanceof Blob)) {
                    throw new Error(
                        "Сервис вернул некорректный результат",
                    );
                }

                resultUrl.value =
                    URL.createObjectURL(blob);

                usedModelName.value =
                    response.headers.get("x-model-name");

                const processingTimeHeader =
                    response.headers.get(
                        "x-processing-time-ms",
                    );

                processingTimeMs.value =
                    processingTimeHeader
                        ? Number(processingTimeHeader)
                        : processingTimeMs.value;

                queuePosition.value = null;
                status.value = "completed";
            } catch (error) {
                if (currentToken !== pollingToken) {
                    return;
                }

                setError(error);
            }
        }

        function cancelPolling(): void {
            pollingToken += 1;
        }

        function reset(): void {
            cancelPolling();
            revokeResultUrl();

            status.value = "idle";
            jobId.value = null;
            queuePosition.value = null;
            processingTimeMs.value = null;
            usedModelName.value = null;
            errorMessage.value = null;
        }

        function resetProcessingState(): void {
            cancelPolling();
            revokeResultUrl();

            status.value = "idle";
            jobId.value = null;
            queuePosition.value = null;
            processingTimeMs.value = null;
            usedModelName.value = null;
            errorMessage.value = null;
        }

        function revokeResultUrl(): void {
            if (!resultUrl.value) {
                return;
            }

            URL.revokeObjectURL(resultUrl.value);
            resultUrl.value = null;
        }

        function setError(error: unknown): void {
            status.value = "failed";
            queuePosition.value = null;
            errorMessage.value = getErrorMessage(error);
        }

        function getErrorMessage(error: unknown): string {
            if (
                typeof error === "object" &&
                error !== null &&
                "data" in error
            ) {
                const data = (
                    error as {
                        data?: ApiErrorData;
                    }
                ).data;

                if (data?.statusMessage) {
                    return data.statusMessage;
                }

                if (data?.message) {
                    return data.message;
                }
            }

            if (error instanceof Error) {
                return error.message;
            }

            return "Не удалось обработать изображение";
        }

        function delay(milliseconds: number): Promise<void> {
            return new Promise((resolve) => {
                window.setTimeout(resolve, milliseconds);
            });
        }

        return {
            status,
            jobId,
            queuePosition,
            resultUrl,
            processingTimeMs,
            usedModelName,
            errorMessage,

            isSubmitting,
            isQueued,
            isProcessing,
            isLoading,
            hasResult,
            queueMessage,

            processImage,
            cancelPolling,
            reset,
        };
    },
);