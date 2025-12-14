<script setup>
// Define o que esse componente recebe do pai (App.vue)
defineProps({
  user: Object,
  pontuacao: Number,
  currentView: String
});

// Define os eventos que esse componente envia para o pai
const emit = defineEmits(['navigate', 'logout']);
</script>

<template>
  <nav class="bg-indigo-600 text-white shadow-lg sticky top-0 z-50">
    <div class="container mx-auto px-4 py-3 flex justify-between items-center">
      <div class="flex items-center gap-2 cursor-pointer" @click="emit('navigate', 'home')">
        <i class="ph ph-coins text-2xl"></i>
        <span class="text-xl font-bold">GEFIGA</span>
      </div>

      <div class="flex items-center gap-4">
        <span class="bg-indigo-700 px-3 py-1 rounded-full text-sm">
           <i class="ph ph-star-fill text-yellow-400"></i> {{ pontuacao }} pts
        </span>
        <button @click="emit('logout')" class="hover:text-indigo-200">Sair</button>
      </div>
    </div>
  </nav>
</template>