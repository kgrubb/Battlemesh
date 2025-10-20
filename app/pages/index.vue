<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 font-mono flex items-center justify-center">
    <div class="text-center">
      <div class="text-6xl font-bold text-green-500 mb-4">BATTLEMESH</div>
      <div class="text-xl text-slate-400 mb-8">Redirecting to {{ modeName }}...</div>
      <div class="animate-pulse text-green-500">▓▓▓▓▓▓▓▓</div>
    </div>
  </div>
</template>

<script setup>
defineOptions({
  name: 'IndexPage'
})

const config = useRuntimeConfig()
const nodeMode = config.public.nodeMode

const modeName = computed(() => {
  return nodeMode === 'admin' ? 'Admin Control' : 'Capture Point'
})

// Auto-redirect based on node mode
onMounted(() => {
  const targetPath = nodeMode === 'admin' ? '/admin' : '/capture-point'
  navigateTo(targetPath)
})
</script>

