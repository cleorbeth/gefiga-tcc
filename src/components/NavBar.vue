<script setup>
import { computed, ref } from 'vue';

// 1. O defineProps ÚNICO. Ele define quais dados o App.vue envia para cá.
const props = defineProps({
  user: Object,
  pontuacao: Number,
  currentView: String,
  streak: Number
});

// 2. O defineEmits ÚNICO. Define quais ações este componente avisa ao pai.
const emit = defineEmits(['navigate', 'logout', 'open-history']);

// SISTEMA DE PATENTES (Gamificação)
const patentes = [
  { min: 0, nome: "Iniciante", cor: "text-gray-200", msg: "Dando os primeiros passos no controle." },
  { min: 50, nome: "Aprendiz", cor: "text-green-300", msg: "Já entende a importância de registrar." },
  { min: 100, nome: "Poupador", cor: "text-blue-300", msg: "Suas metas estão ficando mais próximas!" },
  { min: 150, nome: "Investidor", cor: "text-yellow-300", msg: "O dinheiro trabalha para você." },
  { min: 200, nome: "Mestre", cor: "text-purple-300", msg: "Controle financeiro total." }
];

// Calcula a patente atual baseada nos pontos
const patenteAtual = computed(() => {
  const pts = props.pontuacao || 0;
  // Encontra a maior patente que o usuário atingiu
  return [...patentes].reverse().find(p => pts >= p.min) || patentes[0];
});

// Calcula quanto falta para a próxima patente
const proximaPatente = computed(() => {
  const atualIndex = patentes.indexOf(patenteAtual.value);
  if (atualIndex === patentes.length - 1) return null; // Já é Mestre
  return patentes[atualIndex + 1];
});

const progressoPatente = computed(() => {
  if (!proximaPatente.value) return 100;
  const base = patenteAtual.value.min;
  const alvo = proximaPatente.value.min;
  const pts = props.pontuacao || 0;
  return Math.min(100, ((pts - base) / (alvo - base)) * 100);
});

const mostrarDetalhesPatente = ref(false);

const menuAberto = ref(false);

</script>

<template>
  <nav class="bg-indigo-600 text-white shadow-lg sticky top-0 z-50">
    <div class="max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-8 py-3 flex justify-between items-center gap-4">

      <div class="flex items-center gap-2 cursor-pointer" @click="emit('navigate', 'home')">
        <i class="ph ph-coins text-2xl"></i>
        <span class="text-xl font-bold">GEFIGA</span>
      </div>

      <div class="flex items-center gap-4">
        
        <div class="hidden sm:flex items-center gap-3 border-r border-indigo-500 pr-4 mr-2">
            <div @click="emit('navigate', 'jornada')" class="flex flex-col min-w-[160px] cursor-pointer hover:scale-105 transition-transform relative group"
                @mouseenter="mostrarDetalhesPatente = true" 
                @mouseleave="mostrarDetalhesPatente = false">

                <div class="flex justify-between items-end mb-1">
                    <span class="text-[10px] font-black uppercase tracking-tighter text-center mb-1" :class="patenteAtual.cor">
                      {{ patenteAtual.nome }}
                    </span>
                    <span v-if="proximaPatente" class="text-[9px] font-bold text-indigo-200 opacity-80">
                      Faltam {{ proximaPatente.min - (pontuacao || 0) }} pts
                    </span>
                    <span v-else class="text-[9px] font-bold text-yellow-300 animate-pulse">
                      NÍVEL MÁXIMO!
                    </span>
                </div>

                <div class="h-2 w-full bg-indigo-800 rounded-full overflow-hidden shadow-inner border border-indigo-500/300">
                    <div class="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-700 ease-out" 
                    :style="{ width: progressoPatente + '%' }">
                  </div>
                </div>
                
                <div v-if="mostrarDetalhesPatente" class="absolute top-10 left-0 bg-white text-gray-800 p-3 rounded-lg shadow-xl w-64 z-50 border border-indigo-100 text-xs text-left cursor-default">
                    <p class="font-bold text-indigo-900 mb-1">{{ patenteAtual.nome }}</p>
                    <p class="mb-2 italic">"{{ patenteAtual.msg }}"</p>
                    <p v-if="proximaPatente" class="text-indigo-600 font-bold border-t pt-2"> 
                      Próxima Patente: {{ proximaPatente.nome }} ({{ proximaPatente.min }} pts)
                    </p>
                </div>
            </div>
        </div>

        <button @click="emit('navigate', 'investimentos')" class="flex items-center gap-2 px-3 py-2 rounded-lg transition" :class="currentView === 'investimentos' ? 'bg-indigo-700' : 'hover:bg-indigo-600'">
            <i class="ph ph-trend-up"></i>
            <span class="hidden md:inline font-bold">Investimentos</span>
        </button>

        <div class="flex items-center gap-1 bg-orange-100/10 border border-orange-500/30 px-3 py-1.5 rounded-full tooltip-trigger cursor-default relative group" title="Dias seguidos acessando o sistema">
            <i class="ph-fill ph-fire text-orange-500 text-lg animate-pulse"></i>
            <span class="text-orange-400 font-black text-sm">{{ streak || 0 }}</span>
            
            <div class="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-50">
                Ofensiva Diária
            </div>
        </div>

        <span @click="emit('open-history')" class="bg-indigo-700 px-3 py-1.5 rounded-full text-sm font-bold cursor-pointer hover:bg-indigo-800 transition active:scale-95 flex items-center gap-1">
          <i class="ph ph-star-fill text-yellow-400"></i> {{ pontuacao }} pts
        </span>

        <div class="relative">
          <div @click="menuAberto = !menuAberto" class="flex items-center gap-2 border-l border-indigo-500 pl-4 cursor-pointer hover:opacity-80 transition">
            <img v-if="user?.photoURL" :src="user.photoURL" class="w-10 h-10 rounded-full border-2 border-indigo-400 object-cover bg-white">
            <i v-else class="ph ph-user-circle text-3xl opacity-70"></i>
            <div class="hidden md:flex flex-col">
              <span class="text-sm font-bold leading-tight flex items-center gap-1">{{ user?.displayName || 'Usuário' }} <i class="ph-bold ph-caret-down text-[10px] opacity-70"></i></span>
            </div>
          </div>

          <div v-if="menuAberto" class="absolute right-0 top-full mt-4 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-fade-in">
            <div class="p-3 bg-gray-50 border-b border-gray-100 text-center"><p class="text-xs text-gray-500 font-bold uppercase">Opções</p></div>
            <button @click="emit('navigate', 'configuracoes'); menuAberto = false" class="w-full text-left px-4 py-3 text-sm text-gray-700 font-bold hover:bg-indigo-50 hover:text-indigo-600 transition flex items-center gap-2">
              <i class="ph-bold ph-gear"></i> Ajustes de Perfil
            </button>
            <button @click="emit('logout'); menuAberto = false" class="w-full text-left px-4 py-3 text-sm text-red-600 font-bold hover:bg-red-50 transition flex items-center gap-2">
              <i class="ph-bold ph-sign-out"></i> Sair do Sistema
            </button>
          </div>
          <div v-if="menuAberto" @click="menuAberto = false" class="fixed inset-0 z-[90]"></div>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
</style>