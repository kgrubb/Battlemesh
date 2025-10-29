<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 font-mono flex items-center justify-center">
    <div class="text-center">
      <div class="text-6xl font-bold text-green-500 mb-4">BATTLEMESH</div>
      <div class="text-xl text-slate-400 mb-8">Choose your interface:</div>
      <div class="flex gap-4 justify-center">
        <NuxtLink to="/admin" class="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold">
          Admin Control
        </NuxtLink>
        <NuxtLink to="/capture-point" class="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-bold">
          Capture Point
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({
  name: 'IndexPage'
})
</script>

