<template>
  <div class="bg-slate-950 min-h-screen safe-area-inset">
    <NuxtPage />
  </div>
</template>

<script setup>
useHead({
  title: 'BATTLEMESH - Tactical Capture Point Game'
})
</script>

<style>
* {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

html, body {
  overflow-x: hidden;
  margin: 0;
  padding: 0;
  height: 100%;
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height for mobile browsers */
  width: 100%;
  width: 100vw;
  background-color: #020617; /* Ensure background covers any gaps */
}

/* Safe area handling for iPhone notch and home indicator */
.safe-area-inset {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

/* Ensure background extends beyond safe areas */
.bg-slate-950 {
  background-color: #020617;
  /* Extend background beyond safe areas */
  margin-left: calc(-1 * env(safe-area-inset-left));
  margin-right: calc(-1 * env(safe-area-inset-right));
  margin-top: calc(-1 * env(safe-area-inset-top));
  margin-bottom: calc(-1 * env(safe-area-inset-bottom));
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

/* Ensure full screen coverage */
.min-h-screen {
  min-height: 100vh;
  min-height: 100dvh;
}

/* Safari-specific fixes */
@supports (-webkit-touch-callout: none) {
  html, body {
    height: -webkit-fill-available;
  }
  
  .min-h-screen {
    min-height: -webkit-fill-available;
  }
}
</style>
