<template>
  <div v-if="error" class="min-h-screen bg-slate-950 text-slate-100 font-mono flex items-center justify-center p-4">
    <div class="max-w-2xl">
      <div class="bg-red-900/20 border-2 border-red-500 p-8">
        <div class="text-3xl text-red-500 mb-4">⚠ SYSTEM ERROR</div>
        <div class="text-lg text-slate-300 mb-4">
          An error occurred in the {{ componentName }} system.
        </div>
        <div class="bg-slate-900 border border-red-700 p-4 mb-4 font-mono text-sm text-red-300">
          {{ error.message }}
        </div>
        <div class="flex gap-4">
          <button
            class="px-6 py-3 bg-red-500 text-slate-900 font-bold border-2 border-red-400 hover:bg-red-400"
            @click="handleReset"
          >
            RELOAD PAGE
          </button>
          <button
            v-if="onRetry"
            class="px-6 py-3 bg-slate-700 text-slate-100 border-2 border-slate-600 hover:bg-slate-600"
            @click="handleRetry"
          >
            RETRY
          </button>
        </div>
      </div>
    </div>
  </div>
  <slot v-else />
</template>

<script setup>
const props = defineProps({
  componentName: {
    type: String,
    default: 'BattleMesh'
  },
  onRetry: {
    type: Function,
    default: null
  }
})

const error = ref(null)

const handleError = (err) => {
  console.error('[ErrorBoundary] Caught error:', err)
  error.value = err
}

const handleReset = () => {
  window.location.reload()
}

const handleRetry = () => {
  error.value = null
  if (props.onRetry) {
    props.onRetry()
  }
}

onErrorCaptured((err) => {
  handleError(err)
  return false // Prevent error from propagating
})
</script>
