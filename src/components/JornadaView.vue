<script setup>
import { computed } from 'vue';

const props = defineProps(['pontuacao', 'user']);
const emit = defineEmits(['back']);

// Definição das Patentes e Textos de Feedback
const patentes = [
  { 
    min: 0, 
    nome: "Iniciante", 
    icone: "ph-baby",
    cor: "text-gray-500", 
    bg: "bg-gray-100",
    msg: "Todo grande investidor começou do zero. Aqui você está dando os primeiros passos para entender para onde vai o seu dinheiro." 
  },
  { 
    min: 50, 
    nome: "Aprendiz", 
    icone: "ph-student",
    cor: "text-green-600", 
    bg: "bg-green-100",
    msg: "Você já criou o hábito de registrar! Agora você começa a entender como o controle financeiro evita surpresas no fim do mês." 
  },
  { 
    min: 100, 
    nome: "Poupador", 
    icone: "ph-piggy-bank",
    cor: "text-blue-600", 
    bg: "bg-blue-100",
    msg: "O dinheiro está sobrando! Você aprendeu a cortar gastos supérfluos e suas metas de viagem ou compras estão ficando reais." 
  },
  { 
    min: 150, 
    nome: "Investidor", 
    icone: "ph-trend-up",
    cor: "text-yellow-600", 
    bg: "bg-yellow-100",
    msg: "O dinheiro trabalha para você. Sua disciplina transformou suas finanças em uma ferramenta de liberdade." 
  },
  { 
    min: 200, 
    nome: "Mestre", 
    icone: "ph-crown",
    cor: "text-purple-600", 
    bg: "bg-purple-100",
    msg: "Controle absoluto. Você domina suas finanças, inspira outros e atingiu o nível máximo do GEFIGA!" 
  }
];

// Lógica para encontrar onde o usuário está
const patenteAtual = computed(() => {
  const pts = props.pontuacao || 0;
  return [...patentes].reverse().find(p => pts >= p.min) || patentes[0];
});

const proximaPatente = computed(() => {
  const index = patentes.indexOf(patenteAtual.value);
  return patentes[index + 1] || null;
});

// Calcula porcentagem para a barra de progresso global
const progressoGeral = computed(() => {
    const max = 200;
    const pts = props.pontuacao || 0;
    return Math.min(100, (pts / max) * 100);
});

// Verifica se um nível já foi atingido para mudar o estilo visual
const isDesbloqueado = (p) => (props.pontuacao || 0) >= p.min;

</script>

<template>
    <div class="max-w-4xl mx-auto space-y-6">
        
        <div class="flex items-center gap-4">
            <button @click="emit('back')" class="bg-white p-2 rounded-full shadow hover:bg-gray-50 transition text-gray-600">
                <i class="ph-bold ph-arrow-left text-xl"></i>
            </button>
            <h1 class="text-2xl font-bold text-gray-800">Sua Jornada Financeira</h1>
        </div>

        <div class="bg-indigo-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
            <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
            
            <div class="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div class="w-24 h-24 rounded-full bg-indigo-800 border-4 border-indigo-400 flex items-center justify-center shadow-lg">
                    <i :class="['ph-fill text-5xl', patenteAtual.icone, 'text-yellow-400']"></i>
                </div>

                <div class="text-center md:text-left flex-1">
                    <p class="text-indigo-300 font-bold uppercase tracking-widest text-sm mb-1">Patente Atual</p>
                    <h2 class="text-4xl font-black text-white mb-2">{{ patenteAtual.nome }}</h2>
                    <p class="text-indigo-100 text-lg italic leading-relaxed">"{{ patenteAtual.msg }}"</p>
                </div>

                <div class="text-center bg-indigo-800/50 p-4 rounded-xl backdrop-blur-sm border border-indigo-500/30 min-w-[150px]">
                    <p class="text-xs text-indigo-300 uppercase font-bold">Pontuação</p>
                    <p class="text-3xl font-black text-yellow-400">{{ props.pontuacao }}</p>
                    <p class="text-xs text-indigo-300">pontos</p>
                </div>
            </div>

            <div class="mt-8">
                <div class="flex justify-between text-xs text-indigo-300 mb-2 font-bold uppercase">
                    <span>Início (0)</span>
                    <span>Mestre (200)</span>
                </div>
                <div class="w-full h-3 bg-indigo-950 rounded-full overflow-hidden border border-indigo-800">
                    <div class="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-yellow-400 transition-all duration-1000 ease-out"
                         :style="{ width: progressoGeral + '%' }"></div>
                </div>
            </div>
        </div>

        <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative">
            <h3 class="text-xl font-bold text-gray-800 mb-8 flex items-center gap-2">
                <i class="ph-fill ph-map-trifold text-indigo-600"></i> Mapa de Conquistas
            </h3>
            
            <div class="absolute left-[54px] top-24 bottom-24 w-1 bg-gray-100 rounded-full md:left-[54px]"></div>

            <div class="space-y-8 relative">
                <div v-for="(p, index) in patentes" :key="index" 
                     class="flex items-start gap-6 group transition-all duration-500"
                     :class="isDesbloqueado(p) ? 'opacity-100' : 'opacity-50 grayscale hover:grayscale-0 hover:opacity-80'">
                    
                    <div class="z-10 w-14 h-14 rounded-full border-4 flex items-center justify-center shrink-0 transition-all duration-500"
                         :class="isDesbloqueado(p) ? `${p.bg} border-white shadow-lg scale-110` : 'bg-gray-200 border-white'">
                        <i :class="['ph-fill text-2xl', p.icone, isDesbloqueado(p) ? p.cor : 'text-gray-400']"></i>
                    </div>

                    <div class="flex-1 bg-gray-50 p-5 rounded-xl border border-gray-100 hover:shadow-md transition-shadow relative">
                        <div class="absolute top-6 -left-2 w-4 h-4 bg-gray-50 transform rotate-45 border-l border-b border-gray-100"></div>

                        <div class="flex justify-between items-start mb-2">
                            <h4 class="font-bold text-lg" :class="isDesbloqueado(p) ? 'text-gray-800' : 'text-gray-500'">{{ p.nome }}</h4>
                            <span class="text-xs font-black bg-white px-2 py-1 rounded border shadow-sm"
                                  :class="isDesbloqueado(p) ? 'text-indigo-600 border-indigo-100' : 'text-gray-400 border-gray-200'">
                                {{ p.min }} pts
                            </span>
                        </div>
                        
                        <p class="text-sm leading-relaxed" :class="isDesbloqueado(p) ? 'text-gray-600' : 'text-gray-400'">
                            {{ p.msg }}
                        </p>

                        <div v-if="!isDesbloqueado(p) && (props.pontuacao >= patentes[index-1]?.min)" class="mt-3">
                            <p class="text-xs font-bold text-indigo-600">
                                <i class="ph-bold ph-lock-key-open mr-1"></i> Próximo objetivo: Faltam {{ p.min - props.pontuacao }} pts
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>