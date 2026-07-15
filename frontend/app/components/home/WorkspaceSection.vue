<script setup lang="ts">
const modelsStore = useModelsStore();

const {
  models,
  selectedModelName,
  selectedModel,
  isLoading,
  error,
} = storeToRefs(modelsStore);

await callOnce(
    "models",
    () => modelsStore.fetchModels(),
);
</script>

<template>
  <section
      id="workspace"
      class="workspace"
  >
    <div class="container workspace__container">
      <div class="workspace__panels">
        <HomeUploadPanel />
        <HomeResultPanel />
      </div>

      <HomeModelSelector
          v-model="selectedModelName"
          :models="models"
          :selected-model="selectedModel"
          :is-loading="isLoading"
      />

      <div
          v-if="error"
          class="workspace__error"
          role="alert"
      >
        <span>
          {{ error }}
        </span>

        <button
            type="button"
            class="workspace__retry"
            @click="modelsStore.fetchModels"
        >
          Повторить
        </button>
      </div>
    </div>
  </section>
</template>