<template>
  <footer class="app-footer">
    <div class="container app-footer__container">
      <div class="app-footer__main">
        <NuxtLink
            class="app-footer__logo"
            to="/"
        >
          <span class="app-footer__logo-icon">
            R
          </span>

          <span>
            RemoveBG
          </span>
        </NuxtLink>

        <p class="app-footer__description">
          Некоммерческий учебный проект для исследования
          ML-моделей удаления фона и разработки веб-сервисов.
        </p>
      </div>

      <div class="app-footer__notice">
        <strong class="app-footer__notice-title">
          Обратите внимание
        </strong>

        <p class="app-footer__notice-text">
          Проект создан исключительно в образовательных целях.
          Он не предоставляет платных услуг, не содержит рекламы
          и не предполагает получение коммерческой прибыли.
        </p>
      </div>

      <div class="app-footer__bottom">
        <span>
          © {{ new Date().getFullYear() }} RemoveBG
        </span>

        <a
            class="app-footer__link"
            href="https://github.com/SusanWay/background-removal-service"
            target="_blank"
            rel="noopener noreferrer"
        >
          Исходный код на GitHub
        </a>
      </div>
    </div>
  </footer>
</template>