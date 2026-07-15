interface ApiModel {
    uniqueName: string;
    name: string;
    description: string;
}

interface ModelsResponse {
    models: ApiModel[];
}

export interface ProcessingModel extends ApiModel {
    fullName: string;
    bestFor: string;
    speed: string;
    quality: string;
}

type ModelUiConfig = Omit<
    ProcessingModel,
    keyof ApiModel
>;

const modelUiConfig: Record<string, ModelUiConfig> = {
    "isnet-general-use": {
        fullName: "Быстрая обработка",
        bestFor:
            "Предметы, товары, документы и фотографии с простым или однородным фоном.",
        speed: "Высокая",
        quality: "Хорошее",
    },

    "birefnet-general-lite": {
        fullName: "Оптимальная обработка",
        bestFor:
            "Портреты, фотографии животных и изображения с небольшими деталями.",
        speed: "Средняя",
        quality: "Высокое",
    },

    "birefnet-general": {
        fullName: "Максимальное качество",
        bestFor:
            "Волосы, шерсть, сложные контуры и изображения с большим количеством мелких деталей.",
        speed: "Низкая",
        quality: "Максимальное",
    },
};

function extendModel(model: ApiModel): ProcessingModel {
    const uiConfig = modelUiConfig[model.uniqueName];

    if (uiConfig) {
        return {
            ...model,
            ...uiConfig,
        };
    }

    return {
        ...model,
        fullName: model.name,
        bestFor: "Универсальная обработка изображений.",
        speed: "Не указана",
        quality: "Не указано",
    };
}

export const useModelsStore = defineStore("models", () => {
    const models = ref<ProcessingModel[]>([]);
    const selectedModelName = ref("");

    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const selectedModel = computed(() => {
        return models.value.find(
            (model) => model.uniqueName === selectedModelName.value,
        );
    });

    async function fetchModels(): Promise<void> {
        if (isLoading.value) {
            return;
        }

        isLoading.value = true;
        error.value = null;

        try {
            const response = await $fetch<ModelsResponse>("/api/models");

            models.value = response.models.map(extendModel);

            const selectedModelExists = models.value.some(
                (model) => model.uniqueName === selectedModelName.value,
            );

            if (!selectedModelExists) {
                selectedModelName.value =
                    models.value[1]?.uniqueName ??
                    models.value[0]?.uniqueName ??
                    "";
            }
        } catch (fetchError) {
            console.error(
                "Ошибка загрузки списка моделей:",
                fetchError,
            );

            models.value = [];
            selectedModelName.value = "";
            error.value = "Не удалось загрузить модели";
        } finally {
            isLoading.value = false;
        }
    }

    return {
        models,
        selectedModelName,
        selectedModel,
        isLoading,
        error,
        fetchModels,
    };
});