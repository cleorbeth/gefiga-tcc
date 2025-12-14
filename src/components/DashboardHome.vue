<script setup>
import { computed } from 'vue';

// Agora o componente é "burro" (Dumb Component): 
// Ele não vai no banco, ele só recebe dados do pai e mostra.

// Props: 
// - uid: ID do usuário (caso precise no futuro)
// - saldo: O valor já calculado pelo App.vue
// - resumo: Um objeto contendo os arrays { receitas, despesas, metas }
const props = defineProps(['uid', 'saldo', 'resumo']); 

const emit = defineEmits(['navigate']);

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Acessamos os dados que vieram do App.vue através de props.resumo
const qtdReceitas = computed(() => props.resumo?.receitas?.length || 0);
const qtdDespesas = computed(() => props.resumo?.despesas?.length || 0);
const qtdMetas = computed(() => props.resumo?.metas?.length || 0);
</script>

<template>
  <div class="space-y-6">
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h1 class="text-2xl font-bold text-gray-800">Resumo Financeiro</h1>
          <p class="text-gray-600 mt-1">
              Saldo Disponível: 
              <span :class="props.saldo >= 0 ? 'text-green-600' : 'text-red-600'" class="font-bold text-2xl ml-2">
                  {{ formatMoney(props.saldo || 0) }}
              </span>
          </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div @click="emit('navigate', 'receitas')" class="bg-white p-6 rounded-lg shadow hover:shadow-md transition cursor-pointer border-l-4 border-green-500 group">
              <div class="flex justify-between items-center mb-2">
                  <h3 class="font-bold text-lg group-hover:text-green-700 transition">Receitas</h3>
                  <i class="ph ph-arrow-up-right text-green-500 text-2xl bg-green-100 p-2 rounded-full"></i>
              </div>
              <p class="text-sm text-gray-500">Total cadastrado: <span class="font-bold text-gray-800">{{ qtdReceitas }}</span></p>
          </div>

          <div @click="emit('navigate', 'despesas')" class="bg-white p-6 rounded-lg shadow hover:shadow-md transition cursor-pointer border-l-4 border-red-500 group">
              <div class="flex justify-between items-center mb-2">
                  <h3 class="font-bold text-lg group-hover:text-red-700 transition">Despesas</h3>
                  <i class="ph ph-arrow-down-right text-red-500 text-2xl bg-red-100 p-2 rounded-full"></i>
              </div>
              <p class="text-sm text-gray-500">Total cadastrado: <span class="font-bold text-gray-800">{{ qtdDespesas }}</span></p>
          </div>

          <div @click="emit('navigate', 'metas')" class="bg-white p-6 rounded-lg shadow hover:shadow-md transition cursor-pointer border-l-4 border-blue-500 group">
              <div class="flex justify-between items-center mb-2">
                  <h3 class="font-bold text-lg group-hover:text-blue-700 transition">Metas</h3>
                  <i class="ph ph-target text-blue-500 text-2xl bg-blue-100 p-2 rounded-full"></i>
              </div>
              <p class="text-sm text-gray-500">Total cadastrado: <span class="font-bold text-gray-800">{{ qtdMetas }}</span></p>
          </div>
      </div>
  </div>
</template>