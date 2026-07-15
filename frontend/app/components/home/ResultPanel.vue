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
        <div class="result-panel__placeholder">
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
            Загрузите исходное изображение для начала обработки
          </p>
        </div>
      </div>

      <div class="result-panel__information">
        <span class="result-panel__information-item">
          <span class="result-panel__information-dot" />
          Прозрачный фон
        </span>

        <span class="result-panel__information-item">
          Формат результата: PNG
        </span>
      </div>
    </div>
  </article>
</template>