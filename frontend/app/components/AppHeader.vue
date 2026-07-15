<template>
  <header class="app-header">
    <div class="container app-header__container">
      <NuxtLink
          class="app-header__logo"
          to="/"
      >
        <span class="app-header__logo-icon">
          R
        </span>

        <span class="app-header__logo-text">
          RemoveBG
        </span>
      </NuxtLink>

      <nav
          class="app-header__navigation"
          aria-label="Навигация по странице"
      >
        <a
            class="app-header__navigation-link"
            href="#how-it-works"
        >
          Как пользоваться
        </a>

        <a
            class="app-header__navigation-link"
            href="#faq"
        >
          Частые вопросы
        </a>
      </nav>

      <div class="app-header__status">
        <span class="app-header__status-dot" />

        ML-сервис доступен
      </div>
    </div>
  </header>
</template>