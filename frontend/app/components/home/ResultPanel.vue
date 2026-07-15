<script setup lang="ts">
const processingStore = useProcessingStore();
const modelsStore = useModelsStore();

const {
  resultUrl,
  status,
  isProcessing,
  processingTimeMs,
  processedModelName,
  queuePosition,
  statusTitle,
  statusDescription,
} = storeToRefs(processingStore);

const processedModel = computed(() => {
  return modelsStore.models.find(
      (model) =>
          model.uniqueName ===
          processedModelName.value,
  );
});

const formattedProcessingTime = computed(() => {
  if (processingTimeMs.value === null) {
    return null;
  }

  if (processingTimeMs.value < 1000) {
    return `${processingTimeMs.value} мс`;
  }

  return `${(
      processingTimeMs.value / 1000
  ).toFixed(1)} сек`;
});

const isQueued = computed(() => {
  return status.value === "queued";
});

const isActivelyProcessing = computed(() => {
  return (
      status.value === "submitting" ||
      status.value === "processing"
  );
});

function downloadResult(): void {
  if (!resultUrl.value) {
    return;
  }

  const link = document.createElement("a");

  link.href = resultUrl.value;
  link.download = "background-removed.png";

  document.body.appendChild(link);
  link.click();
  link.remove();
}
</script>

<template>
  <article class="workspace-panel result-panel">
    <div class="workspace-panel__header">
      <div>
        <span class="workspace-panel__eyebrow">
          Результат обработки
        </span>

        <h2 class="workspace-panel__title">
          Изображение без фона
        </h2>
      </div>

      <span class="workspace-panel__number">
        02
      </span>
    </div>

    <div class="result-panel__body">
      <div class="result-panel__preview">
        <div
            v-if="isQueued"
            class="result-panel__placeholder"
        >
          <span class="result-panel__loader" />

          <h3 class="result-panel__placeholder-title">
            {{ statusTitle }}
          </h3>

          <p class="result-panel__placeholder-description">
            {{ statusDescription }}
          </p>

          <span
              v-if="
                queuePosition !== null &&
                queuePosition > 0
              "
              class="result-panel__queue-position"
          >
            {{ queuePosition }}
          </span>
        </div>

        <div
            v-else-if="isActivelyProcessing"
            class="result-panel__placeholder"
        >
          <span class="result-panel__loader" />

          <h3 class="result-panel__placeholder-title">
            {{ statusTitle }}
          </h3>

          <p class="result-panel__placeholder-description">
            {{ statusDescription }}
          </p>
        </div>

        <div
            v-else-if="resultUrl"
            class="result-panel__result"
        >
          <img
              class="result-panel__image"
              :src="resultUrl"
              alt="Изображение с удалённым фоном"
          >

          <button
              class="result-panel__download"
              type="button"
              @click="downloadResult"
          >
            Скачать PNG
          </button>
        </div>

        <div
            v-else
            class="result-panel__placeholder"
        >
          <div class="result-panel__placeholder-icon">
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
              <path
                  d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z"
              />
              <path d="m4 16 4-4 3 3 3-3 6 6" />
              <path d="M15.5 8.5h.01" />
            </svg>
          </div>

          <h3 class="result-panel__placeholder-title">
            Здесь появится результат
          </h3>

          <p class="result-panel__placeholder-description">
            Загрузите изображение и запустите обработку
          </p>
        </div>
      </div>

      <div class="result-panel__information">
        <span class="result-panel__information-item">
          <span class="result-panel__information-dot" />

          Прозрачный фон
        </span>

        <span
            v-if="isQueued"
            class="result-panel__information-item"
        >
          Ожидание в очереди
        </span>

        <span
            v-else-if="isProcessing"
            class="result-panel__information-item"
        >
          Выполняется обработка
        </span>

        <span
            v-if="processedModel"
            class="result-panel__information-item"
        >
          {{ processedModel.fullName }}
        </span>

        <span
            v-if="formattedProcessingTime"
            class="result-panel__information-item"
        >
          {{ formattedProcessingTime }}
        </span>

        <span
            v-if="!resultUrl && !isProcessing"
            class="result-panel__information-item"
        >
          Формат результата: PNG
        </span>
      </div>
    </div>
  </article>
</template>