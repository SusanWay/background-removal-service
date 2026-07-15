<script setup lang="ts">
interface ProcessingModel {
  uniqueName: string;
  name: string;
  shortName: string;
  description: string;
  bestFor: string;
  speed: string;
  quality: string;
}

const models: ProcessingModel[] = [
  {
    uniqueName: "isnet-general-use",
    name: "Быстрая обработка",
    shortName: "Быстро",
    description:
        "Быстрая модель для повседневных изображений с простым или однородным фоном.",
    bestFor:
        "Фотографии товаров, документов и объектов с хорошо различимыми границами.",
    speed: "Высокая",
    quality: "Хорошее",
  },
  {
    uniqueName: "birefnet-general-lite",
    name: "Сбалансированная обработка",
    shortName: "Баланс",
    description:
        "Оптимальное соотношение скорости и качества для большинства изображений.",
    bestFor:
        "Портреты, фотографии животных и изображения с небольшими деталями.",
    speed: "Средняя",
    quality: "Высокое",
  },
  {
    uniqueName: "birefnet-general",
    name: "Точная обработка",
    shortName: "Качество",
    description:
        "Наиболее точная модель для сложных контуров, волос, шерсти и мелких деталей.",
    bestFor:
        "Сложные изображения, где качество результата важнее времени обработки.",
    speed: "Низкая",
    quality: "Максимальное",
  },
];

const selectedModelName = ref("birefnet-general-lite");

const selectedModel = computed(() => {
  return (
      models.find(
          (model) => model.uniqueName === selectedModelName.value,
      ) ?? models[0]
  );
});
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
      />
    </div>
  </section>
</template>