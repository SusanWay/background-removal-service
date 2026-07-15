<script setup lang="ts">
useSeoMeta({
  title: "Удаление фона с изображения",
  description:
      "Онлайн-сервис для удаления фона с изображений с помощью ML-моделей.",
});
</script>

<template>
  <div class="home-page">
    <section class="home-page__first-screen">
      <div class="home-page__intro">
        <div class="container">
          <HomeHeroSection />
        </div>
      </div>

      <HomeWorkspaceSection />
    </section>

    <HomeHowItWorks />
    <HomeFaqSection />
  </div>
</template>