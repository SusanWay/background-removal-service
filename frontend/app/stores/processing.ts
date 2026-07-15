const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_SIZE = 4096;

const ALLOWED_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

interface ImageDimensions {
    width: number;
    height: number;
}

interface ApiErrorResponse {
    statusMessage?: string;
    message?: string;
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

export const useProcessingStore = defineStore(
    "processing",
    () => {
        const sourceFile = shallowRef<File | null>(null);
        const sourcePreviewUrl = ref<string | null>(null);
        const resultUrl = ref<string | null>(null);

        const isValidating = ref(false);
        const isProcessing = ref(false);

        const error = ref<string | null>(null);
        const processingTimeMs = ref<number | null>(null);
        const processedModelName = ref<string | null>(null);

        const hasSource = computed(() => {
            return sourceFile.value !== null;
        });

        const hasResult = computed(() => {
            return resultUrl.value !== null;
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

        async function setSourceFile(file: File): Promise<boolean> {
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

                const dimensions = await getImageDimensions(file);

                if (
                    dimensions.width > MAX_IMAGE_SIZE ||
                    dimensions.height > MAX_IMAGE_SIZE
                ) {
                    throw new Error(
                        "Разрешение изображения не должно превышать 4096 × 4096 px",
                    );
                }

                revokeSourcePreview();
                clearResult();

                sourceFile.value = file;
                sourcePreviewUrl.value = URL.createObjectURL(file);

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
                error.value = "Сначала выберите изображение";
                return;
            }

            if (!modelsStore.selectedModelName) {
                error.value = "Выберите модель обработки";
                return;
            }

            if (isProcessing.value) {
                return;
            }

            isProcessing.value = true;
            error.value = null;

            clearResult();

            const formData = new FormData();

            formData.append("image", sourceFile.value);
            formData.append(
                "modelName",
                modelsStore.selectedModelName,
            );

            try {
                const response = await fetch(
                    "/api/remove-background",
                    {
                        method: "POST",
                        body: formData,
                    },
                );

                if (!response.ok) {
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

                    throw new Error(errorMessage);
                }

                const resultBlob = await response.blob();

                if (!resultBlob.size) {
                    throw new Error(
                        "Сервис вернул пустой результат",
                    );
                }

                resultUrl.value = URL.createObjectURL(resultBlob);

                processingTimeMs.value = Number(
                    response.headers.get("X-Processing-Time-Ms"),
                );

                if (
                    processingTimeMs.value !== null &&
                    !Number.isFinite(processingTimeMs.value)
                ) {
                    processingTimeMs.value = null;
                }

                processedModelName.value =
                    response.headers.get("X-Model-Name");
            } catch (processingError) {
                error.value =
                    processingError instanceof Error
                        ? processingError.message
                        : "Не удалось обработать изображение";
            } finally {
                isProcessing.value = false;
            }
        }

        function reset(): void {
            revokeSourcePreview();
            clearResult();

            sourceFile.value = null;
            error.value = null;
            isValidating.value = false;
            isProcessing.value = false;
        }

        return {
            sourceFile,
            sourcePreviewUrl,
            resultUrl,

            isValidating,
            isProcessing,

            error,
            processingTimeMs,
            processedModelName,

            hasSource,
            hasResult,

            setSourceFile,
            processImage,
            clearResult,
            reset,
        };
    },
);