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
      <div class="upload-panel__dropzone">
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
        >
          Выбрать изображение
        </button>
      </div>

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