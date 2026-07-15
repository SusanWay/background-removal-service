<script setup lang="ts">
const steps = [
  {
    number: "01",
    title: "Загрузите изображение",
    description:
        "Выберите фотографию в формате JPG, PNG или WEBP размером до 10 МБ.",
  },
  {
    number: "02",
    title: "Выберите модель",
    description:
        "Укажите подходящий режим в зависимости от необходимой скорости и качества.",
  },
  {
    number: "03",
    title: "Скачайте результат",
    description:
        "Сравните изображения и скачайте готовый PNG с прозрачным фоном.",
  },
];
</script>

<template>
  <section
      id="how-it-works"
      class="how-it-works"
  >
    <div class="container">
      <div class="section-heading">
        <span class="section-heading__label">
          Три простых шага
        </span>

        <h2 class="section-heading__title">
          Как пользоваться сервисом
        </h2>

        <p class="section-heading__description">
          Для обработки изображения не потребуется регистрация
          или установка дополнительных программ.
        </p>
      </div>

      <div class="how-it-works__grid">
        <article
            v-for="step in steps"
            :key="step.number"
            class="how-it-works__item"
        >
          <span class="how-it-works__number">
            {{ step.number }}
          </span>

          <h3 class="how-it-works__title">
            {{ step.title }}
          </h3>

          <p class="how-it-works__description">
            {{ step.description }}
          </p>
        </article>
      </div>
    </div>
  </section>
</template>