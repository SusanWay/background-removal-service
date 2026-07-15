<script setup lang="ts">
const processingStore = useProcessingStore();

const {
  sourceFile,
  sourcePreviewUrl,
  isValidating,
  isProcessing,
  error,
  hasSource,
} = storeToRefs(processingStore);

const fileInput = ref<HTMLInputElement>();
const isDragging = ref(false);

function openFileDialog(): void {
  if (isProcessing.value) {
    return;
  }

  fileInput.value?.click();
}

async function handleFile(file?: File): Promise<void> {
  if (!file) {
    return;
  }

  await processingStore.setSourceFile(file);

  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

async function handleInputChange(
    event: Event,
): Promise<void> {
  const input = event.target as HTMLInputElement;

  await handleFile(input.files?.[0]);
}

function handleDragEnter(): void {
  if (!isProcessing.value) {
    isDragging.value = true;
  }
}

function handleDragLeave(event: DragEvent): void {
  const currentTarget = event.currentTarget as HTMLElement;
  const relatedTarget = event.relatedTarget as Node | null;

  if (
      relatedTarget &&
      currentTarget.contains(relatedTarget)
  ) {
    return;
  }

  isDragging.value = false;
}

async function handleDrop(event: DragEvent): Promise<void> {
  isDragging.value = false;

  if (isProcessing.value) {
    return;
  }

  await handleFile(event.dataTransfer?.files[0]);
}
</script>

<template>
  <article class="workspace-panel upload-panel">
    <div class="workspace-panel__header">
      <div>
        <span class="workspace-panel__eyebrow">
          Исходное изображение
        </span>

        <h2 class="workspace-panel__title">
          Загрузите фотографию
        </h2>
      </div>

      <span class="workspace-panel__number">
        01
      </span>
    </div>

    <div class="upload-panel__body">
      <input
          ref="fileInput"
          class="upload-panel__input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          @change="handleInputChange"
      >

      <div
          class="upload-panel__dropzone"
          :class="{
          'upload-panel__dropzone--active': isDragging,
          'upload-panel__dropzone--filled': hasSource,
          'upload-panel__dropzone--disabled':
            isProcessing,
        }"
          @dragenter.prevent="handleDragEnter"
          @dragover.prevent="handleDragEnter"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
      >
        <template v-if="sourcePreviewUrl">
          <img
              class="upload-panel__preview"
              :src="sourcePreviewUrl"
              :alt="sourceFile?.name ?? 'Исходное изображение'"
          >

          <div class="upload-panel__preview-overlay">
            <span class="upload-panel__file-name">
              {{ sourceFile?.name }}
            </span>

            <button
                class="upload-panel__change-button"
                type="button"
                :disabled="isProcessing"
                @click="openFileDialog"
            >
              Заменить изображение
            </button>
          </div>
        </template>

        <template v-else>
          <div class="upload-panel__icon">
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
              <path
                  d="M12 16V4m0 0L7 9m5-5 5 5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
              />
            </svg>
          </div>

          <h3 class="upload-panel__title">
            Перетащите изображение сюда
          </h3>

          <p class="upload-panel__description">
            Или выберите файл на своём устройстве
          </p>

          <button
              class="upload-panel__button"
              type="button"
              :disabled="isValidating"
              @click="openFileDialog"
          >
            {{
              isValidating
                  ? "Проверяем..."
                  : "Выбрать изображение"
            }}
          </button>
        </template>
      </div>

      <p
          v-if="error"
          class="upload-panel__error"
          role="alert"
      >
        {{ error }}
      </p>

      <button
          v-if="hasSource"
          class="upload-panel__process-button"
          type="button"
          :disabled="isProcessing || isValidating"
          @click="processingStore.processImage"
      >
        <span
            v-if="isProcessing"
            class="upload-panel__spinner"
        />

        {{
          isProcessing
              ? "Удаляем фон..."
              : "Удалить фон"
        }}
      </button>

      <div class="upload-panel__requirements">
        <span class="upload-panel__requirements-label">
          Ограничения:
        </span>

        <div class="upload-panel__requirements-list">
          <span class="upload-panel__requirement">
            JPG, PNG, WEBP
          </span>

          <span class="upload-panel__requirement">
            До 10 МБ
          </span>

          <span class="upload-panel__requirement">
            До 4096 × 4096 px
          </span>
        </div>
      </div>
    </div>
  </article>
</template>