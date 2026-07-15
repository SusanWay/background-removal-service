<script setup lang="ts">
import type {
  ProcessingModel,
} from "~/stores/models";

defineProps<{
  models: ProcessingModel[];
  selectedModel?: ProcessingModel;
  isLoading?: boolean;
}>();

const modelValue = defineModel<string>({
  required: true,
});
</script>

<template>
  <div class="model-selector">
    <div class="model-selector__top">
      <div class="model-selector__heading">
        <span class="model-selector__step">
          03
        </span>

        <div>
          <h2 class="model-selector__title">
            Выберите режим
          </h2>

          <p class="model-selector__subtitle">
            Настройте баланс скорости и качества
          </p>
        </div>
      </div>

      <div
          v-if="models.length"
          class="model-selector__control"
          role="radiogroup"
          aria-label="Режим обработки изображения"
      >
        <button
            v-for="model in models"
            :key="model.uniqueName"
            class="model-selector__button"
            :class="{
            'model-selector__button--active':
              modelValue === model.uniqueName,
          }"
            type="button"
            role="radio"
            :aria-checked="modelValue === model.uniqueName"
            @click="modelValue = model.uniqueName"
        >
          {{ model.name }}
        </button>
      </div>

      <p
          v-else-if="isLoading"
          class="model-selector__status"
      >
        Загружаем доступные модели...
      </p>
    </div>

    <Transition
        name="model-description"
        mode="out-in"
    >
      <div
          v-if="selectedModel"
          :key="selectedModel.uniqueName"
          class="model-selector__description"
      >
        <div class="model-selector__description-main">
          <span class="model-selector__model-name">
            {{ selectedModel.fullName }}
          </span>

          <p class="model-selector__model-text">
            {{ selectedModel.description }}
          </p>

          <p class="model-selector__best-for">
            <strong>Подходит для:</strong>

            {{ selectedModel.bestFor }}
          </p>
        </div>

        <div class="model-selector__properties">
          <div class="model-selector__property">
            <span class="model-selector__property-label">
              Скорость
            </span>

            <strong class="model-selector__property-value">
              {{ selectedModel.speed }}
            </strong>
          </div>

          <div class="model-selector__property">
            <span class="model-selector__property-label">
              Качество
            </span>

            <strong class="model-selector__property-value">
              {{ selectedModel.quality }}
            </strong>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>