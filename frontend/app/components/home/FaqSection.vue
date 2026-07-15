<script setup lang="ts">
const questions = [
  {
    question: "Какие изображения можно загружать?",
    answer:
        "Сервис поддерживает изображения в форматах JPG, JPEG, PNG и WEBP. Максимальный размер файла — 10 МБ.",
  },
  {
    question: "Чем отличаются модели обработки?",
    answer:
        "Модели отличаются скоростью работы, потреблением ресурсов и качеством обработки сложных контуров. Быстрый режим подходит для простых объектов, а точный — для волос, шерсти и мелких деталей.",
  },
  {
    question: "Сохраняются ли загруженные изображения?",
    answer:
        "Нет. Изображение используется только во время выполнения запроса и не сохраняется после завершения обработки.",
  },
  {
    question: "В каком формате возвращается результат?",
    answer:
        "Результат возвращается в формате PNG с прозрачным фоном и alpha-каналом.",
  },
  {
    question: "Сервис бесплатный?",
    answer:
        "Да. Это некоммерческий учебный проект, созданный для изучения ML-моделей и разработки веб-сервисов.",
  },
];
</script>

<template>
  <section
      id="faq"
      class="faq"
  >
    <div class="container faq__container">
      <div class="section-heading faq__heading">
        <span class="section-heading__label">
          FAQ
        </span>

        <h2 class="section-heading__title">
          Частые вопросы
        </h2>

        <p class="section-heading__description">
          Основная информация об обработке изображений
          и работе сервиса.
        </p>
      </div>

      <div class="faq__list">
        <details
            v-for="item in questions"
            :key="item.question"
            class="faq__item"
        >
          <summary class="faq__question">
            <span>
              {{ item.question }}
            </span>

            <span class="faq__icon" />
          </summary>

          <div class="faq__answer">
            <p>
              {{ item.answer }}
            </p>
          </div>
        </details>
      </div>
    </div>
  </section>
</template>