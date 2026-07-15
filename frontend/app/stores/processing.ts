const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_SIZE = 4096;
const POLLING_INTERVAL_MS = 1500;

const ALLOWED_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

export type ProcessingStatus =
    | "idle"
    | "submitting"
    | "queued"
    | "processing"
    | "completed"
    | "failed";

interface ImageDimensions {
    width: number;
    height: number;
}

interface ApiErrorResponse {
    statusMessage?: string;
    message?: string;
}

interface SubmitJobResponse {
    jobId: string;
    status:
        | "queued"
        | "processing"
        | "completed"
        | "failed"
        | "unknown";
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

function getImageDimensions(
    file: File,
): Promise<ImageDimensions> {
    return new Promise((resolve, reject) => {
        const imageUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            resolve({
                width: image.naturalWidth,
                height: image.naturalHeight,
            });

            URL.revokeObjectURL(imageUrl);
        };

        image.onerror = () => {
            URL.revokeObjectURL(imageUrl);

            reject(
                new Error("Не удалось прочитать изображение"),
            );
        };

        image.src = imageUrl;
    });
}

function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
    });
}

export const useProcessingStore = defineStore(
    "processing",
    () => {
        const sourceFile = shallowRef<File | null>(null);
        const sourcePreviewUrl = ref<string | null>(null);
        const resultUrl = ref<string | null>(null);

        const status = ref<ProcessingStatus>("idle");
        const isValidating = ref(false);

        const jobId = ref<string | null>(null);
        const queuePosition = ref<number | null>(null);

        const error = ref<string | null>(null);
        const processingTimeMs = ref<number | null>(null);
        const processedModelName = ref<string | null>(null);

        let pollingToken = 0;

        const hasSource = computed(() => {
            return sourceFile.value !== null;
        });

        const hasResult = computed(() => {
            return resultUrl.value !== null;
        });

        const isSubmitting = computed(() => {
            return status.value === "submitting";
        });

        const isQueued = computed(() => {
            return status.value === "queued";
        });

        const isProcessing = computed(() => {
            return (
                status.value === "submitting" ||
                status.value === "queued" ||
                status.value === "processing"
            );
        });

        const isInferenceRunning = computed(() => {
            return status.value === "processing";
        });

        const statusTitle = computed(() => {
            if (status.value === "submitting") {
                return "Добавляем изображение в очередь";
            }

            if (status.value === "queued") {
                return "Изображение ожидает обработки";
            }

            if (status.value === "processing") {
                return "Удаляем фон";
            }

            if (status.value === "failed") {
                return "Не удалось обработать изображение";
            }

            return null;
        });

        const statusDescription = computed(() => {
            if (status.value === "submitting") {
                return "Отправляем изображение на сервер";
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

                return "Обработка начнётся автоматически";
            }

            if (status.value === "processing") {
                return (
                    "Модель загружается и обрабатывает " +
                    "изображение"
                );
            }

            if (status.value === "failed") {
                return error.value;
            }

            return null;
        });

        const processButtonText = computed(() => {
            if (status.value === "submitting") {
                return "Добавляем в очередь...";
            }

            if (status.value === "queued") {
                if (
                    queuePosition.value !== null &&
                    queuePosition.value > 0
                ) {
                    return (
                        `В очереди: ` +
                        `${queuePosition.value}`
                    );
                }

                return "В очереди...";
            }

            if (status.value === "processing") {
                return "Удаляем фон...";
            }

            return "Удалить фон";
        });

        function revokeSourcePreview(): void {
            if (!sourcePreviewUrl.value) {
                return;
            }

            URL.revokeObjectURL(sourcePreviewUrl.value);
            sourcePreviewUrl.value = null;
        }

        function revokeResult(): void {
            if (!resultUrl.value) {
                return;
            }

            URL.revokeObjectURL(resultUrl.value);
            resultUrl.value = null;
        }

        function clearResult(): void {
            revokeResult();

            processingTimeMs.value = null;
            processedModelName.value = null;
        }

        function cancelPolling(): void {
            pollingToken += 1;
        }

        function resetJobState(): void {
            cancelPolling();

            status.value = "idle";
            jobId.value = null;
            queuePosition.value = null;
            error.value = null;
        }

        async function setSourceFile(
            file: File,
        ): Promise<boolean> {
            error.value = null;
            isValidating.value = true;

            try {
                if (!ALLOWED_TYPES.has(file.type)) {
                    throw new Error(
                        "Поддерживаются только JPG, PNG и WEBP",
                    );
                }

                if (file.size > MAX_FILE_SIZE) {
                    throw new Error(
                        "Размер изображения не должен превышать 10 МБ",
                    );
                }

                const dimensions =
                    await getImageDimensions(file);

                if (
                    dimensions.width > MAX_IMAGE_SIZE ||
                    dimensions.height > MAX_IMAGE_SIZE
                ) {
                    throw new Error(
                        "Разрешение изображения не должно превышать 4096 × 4096 px",
                    );
                }

                resetJobState();
                revokeSourcePreview();
                clearResult();

                sourceFile.value = file;
                sourcePreviewUrl.value =
                    URL.createObjectURL(file);

                return true;
            } catch (validationError) {
                error.value =
                    validationError instanceof Error
                        ? validationError.message
                        : "Не удалось выбрать изображение";

                return false;
            } finally {
                isValidating.value = false;
            }
        }

        async function processImage(): Promise<void> {
            const modelsStore = useModelsStore();

            if (!sourceFile.value) {
                error.value =
                    "Сначала выберите изображение";
                return;
            }

            if (!modelsStore.selectedModelName) {
                error.value =
                    "Выберите модель обработки";
                return;
            }

            if (isProcessing.value) {
                return;
            }

            clearResult();
            resetJobState();

            const currentPollingToken = pollingToken;

            status.value = "submitting";

            const formData = new FormData();

            formData.append(
                "image",
                sourceFile.value,
            );

            formData.append(
                "modelName",
                modelsStore.selectedModelName,
            );

            try {
                const response =
                    await fetch("/api/jobs", {
                        method: "POST",
                        body: formData,
                    });

                if (!response.ok) {
                    throw new Error(
                        await getResponseErrorMessage(
                            response,
                        ),
                    );
                }

                const submitResult =
                    (await response.json()) as SubmitJobResponse;

                if (
                    currentPollingToken !== pollingToken
                ) {
                    return;
                }

                jobId.value = submitResult.jobId;
                queuePosition.value =
                    submitResult.queuePosition;

                status.value =
                    submitResult.status === "processing"
                        ? "processing"
                        : "queued";

                await pollJobStatus(
                    submitResult.jobId,
                    currentPollingToken,
                );
            } catch (processingError) {
                if (
                    currentPollingToken !== pollingToken
                ) {
                    return;
                }

                setProcessingError(processingError);
            }
        }

        async function pollJobStatus(
            currentJobId: string,
            currentPollingToken: number,
        ): Promise<void> {
            while (
                currentPollingToken === pollingToken &&
                jobId.value === currentJobId
                ) {
                try {
                    const response = await fetch(
                        `/api/jobs/${currentJobId}`,
                        {
                            method: "GET",
                            headers: {
                                Accept: "application/json",
                            },
                        },
                    );

                    if (!response.ok) {
                        throw new Error(
                            await getResponseErrorMessage(
                                response,
                            ),
                        );
                    }

                    const job =
                        (await response.json()) as JobStatusResponse;

                    if (
                        currentPollingToken !== pollingToken
                    ) {
                        return;
                    }

                    queuePosition.value =
                        job.queuePosition;

                    if (job.status === "queued") {
                        status.value = "queued";
                    } else if (
                        job.status === "processing"
                    ) {
                        status.value = "processing";
                    } else if (
                        job.status === "completed"
                    ) {
                        processingTimeMs.value =
                            job.processingTimeMs;

                        await loadJobResult(
                            currentJobId,
                            currentPollingToken,
                        );

                        return;
                    } else if (
                        job.status === "failed"
                    ) {
                        status.value = "failed";
                        error.value =
                            job.errorMessage ||
                            (
                                "Не удалось обработать " +
                                "изображение"
                            );

                        return;
                    } else {
                        throw new Error(
                            "Сервис вернул неизвестный статус задачи",
                        );
                    }

                    await delay(
                        POLLING_INTERVAL_MS,
                    );
                } catch (pollingError) {
                    if (
                        currentPollingToken !== pollingToken
                    ) {
                        return;
                    }

                    setProcessingError(pollingError);
                    return;
                }
            }
        }

        async function loadJobResult(
            currentJobId: string,
            currentPollingToken: number,
        ): Promise<void> {
            const response = await fetch(
                `/api/jobs/${currentJobId}/result`,
                {
                    method: "GET",
                },
            );

            if (!response.ok) {
                throw new Error(
                    await getResponseErrorMessage(response),
                );
            }

            const resultBlob = await response.blob();

            if (!resultBlob.size) {
                throw new Error(
                    "Сервис вернул пустой результат",
                );
            }

            if (
                currentPollingToken !== pollingToken
            ) {
                return;
            }

            revokeResult();

            resultUrl.value =
                URL.createObjectURL(resultBlob);

            const processingTimeHeader =
                response.headers.get(
                    "X-Processing-Time-Ms",
                );

            if (processingTimeHeader) {
                const parsedProcessingTime =
                    Number(processingTimeHeader);

                processingTimeMs.value =
                    Number.isFinite(
                        parsedProcessingTime,
                    )
                        ? parsedProcessingTime
                        : processingTimeMs.value;
            }

            processedModelName.value =
                response.headers.get("X-Model-Name");

            queuePosition.value = null;
            status.value = "completed";
        }

        async function getResponseErrorMessage(
            response: Response,
        ): Promise<string> {
            let errorMessage =
                "Не удалось обработать изображение";

            try {
                const responseError =
                    (await response.json()) as ApiErrorResponse;

                errorMessage =
                    responseError.statusMessage ??
                    responseError.message ??
                    errorMessage;
            } catch {
                // Сервер вернул ошибку не в JSON-формате.
            }

            return errorMessage;
        }

        function setProcessingError(
            processingError: unknown,
        ): void {
            status.value = "failed";
            queuePosition.value = null;

            error.value =
                processingError instanceof Error
                    ? processingError.message
                    : "Не удалось обработать изображение";
        }

        function reset(): void {
            cancelPolling();

            revokeSourcePreview();
            clearResult();

            sourceFile.value = null;
            error.value = null;

            status.value = "idle";
            jobId.value = null;
            queuePosition.value = null;

            isValidating.value = false;
        }

        return {
            sourceFile,
            sourcePreviewUrl,
            resultUrl,

            status,
            jobId,
            queuePosition,

            isValidating,
            isSubmitting,
            isQueued,
            isProcessing,
            isInferenceRunning,

            error,
            processingTimeMs,
            processedModelName,

            hasSource,
            hasResult,

            statusTitle,
            statusDescription,
            processButtonText,

            setSourceFile,
            processImage,
            clearResult,
            reset,
        };
    },
);