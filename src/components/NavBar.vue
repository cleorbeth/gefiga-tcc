<script setup>
import { computed } from 'vue';

// 1. O defineProps ÚNICO. Ele define quais dados o App.vue envia para cá.
const props = defineProps({
  user: Object,
  pontuacao: Number,
  currentView: String
});

// 2. O defineEmits ÚNICO. Define quais ações este componente avisa ao pai.
const emit = defineEmits(['navigate', 'logout', 'open-history']);

// 3. Lógica de Nível (Usando props. para evitar o ReferenceError)
// Cálculo: $$Nível = \lfloor \frac{props.pontuacao}{100} \rfloor + 1$$
const nivel = computed(() => Math.floor((props.pontuacao || 0) / 100) + 1);

// Cálculo: $$Progresso = props.pontuacao \pmod{100}$$
const progressoNivel = computed(() => (props.pontuacao || 0) % 100);
</script>

<template>
  <nav class="bg-indigo-600 text-white shadow-lg sticky top-0 z-50">
    <div class="container mx-auto px-4 py-3 flex justify-between items-center">

      <div class="flex items-center gap-2 cursor-pointer" @click="emit('navigate', 'home')">
        <i class="ph ph-coins text-2xl"></i>
        <span class="text-xl font-bold">GEFIGA</span>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-3 border-r border-indigo-500 pr-4 mr-2">
          <img v-if="user?.photoURL" :src="user.photoURL" class="w-10 h-10 rounded-full border-2 border-indigo-400">
          <i v-else class="ph ph-user-circle text-3xl opacity-70"></i>

          <div class="flex flex-col min-w-[100px]">
            <span class="text-sm font-bold leading-tight">{{ user?.displayName || 'Usuário' }}</span>

            <div class="flex items-center gap-2 mt-1">
              <span class="text-[10px] font-black uppercase text-indigo-200">Nv. {{ nivel }}</span>
              <div class="h-1.5 w-full bg-indigo-800 rounded-full overflow-hidden shadow-inner">
                <div class="h-full bg-yellow-400 transition-all duration-500 ease-out"
                  :style="{ width: progressoNivel + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <span @click="emit('open-history')"
          class="bg-indigo-700 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-indigo-800 transition active:scale-95">
          <i class="ph ph-star-fill text-yellow-400"></i> {{ pontuacao }} pts
        </span>

        <button @click="emit('logout')" class="hover:text-indigo-200">Sair</button>
      </div>

    </div>
  </nav>
</template>