<template>
  <section class="upload-card">
    <div class="upload-card__content">
      <div class="upload-card__icon">
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
          <path
              d="M12 16V4m0 0L7 9m5-5 5 5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
          />
        </svg>
      </div>

      <h2 class="upload-card__title">
        Загрузите изображение
      </h2>

      <p class="upload-card__description">
        Перетащите файл в эту область или выберите изображение
        на своём устройстве
      </p>

      <button
          class="upload-card__button"
          type="button"
      >
        Выбрать изображение
      </button>

      <span class="upload-card__formats">
        Поддерживаются JPG, JPEG, PNG и WEBP
      </span>
    </div>

    <div class="upload-card__footer">
      <span class="upload-card__privacy">
        Изображения не сохраняются на сервере
      </span>

      <span class="upload-card__limit">
        До 10 МБ
      </span>
    </div>
  </section>
</template>