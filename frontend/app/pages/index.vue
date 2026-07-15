<script setup lang="ts">
useSeoMeta({
  title: "Удаление фона с изображения",
  description:
      "Онлайн-сервис для удаления фона с изображений с помощью ML-моделей.",
});
</script>

<template>
  <div class="home-page">
    <section class="home-page__workspace">
      <div class="container home-page__workspace-container">
        <HomeHeroSection />
        <HomeUploadCard />
      </div>
    </section>

    <HomeHowItWorks />
    <HomeFaqSection />
  </div>
</template>