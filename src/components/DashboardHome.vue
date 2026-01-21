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

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
}).format(val);

// Reutilizamos a lógica de cálculo para manter a consistência
const calcPercent = (m) => {
    if (!m.valorAlvo || m.valorAlvo <= 0) return 0;
    const p = ((m.valorAtual || 0) / m.valorAlvo) * 100;
    return Math.min(100, Math.round(p));
};

// A lógica da Triagem
const metaDestaque = computed(() => {
    const metas = props.resumo?.metas;
    if (!metas || metas.length === 0) return null;

    // Criamos uma lista apenas com metas incompletas
    const incompletas = metas.filter(m => calcPercent(m) < 100);

    if (incompletas.length === 0) return null;

    // Ordenamos para encontrar a meta com maior progresso (mais perto de 100%)
    // Usamos [...incompletas] para criar uma cópia e não mexer no dado original da prop
    return [...incompletas].sort((a, b) => calcPercent(b) - calcPercent(a))[0];
});

// Verifica se o saldo atual permite finalizar a meta de destaque agora mesmo
const podeFinalizar = computed(() => {
    if (!metaDestaque.value) return false;
    const faltante = metaDestaque.value.valorAlvo - (metaDestaque.value.valorAtual || 0);
    return props.saldo >= faltante;
});

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

        <div v-if="metaDestaque" :class="podeFinalizar ? 'bg-green-600' : 'bg-indigo-600'"
            class="rounded-2xl p-6 text-white shadow-xl relative overflow-hidden transition-colors duration-500">

            <div
                class="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500 rounded-full opacity-30 blur-3xl group-hover:scale-110 transition-transform duration-700">
            </div>

            <div class="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                <div class="flex-grow space-y-2">
                    <div class="flex items-center gap-2">
                        <i class="ph-fill ph-shooting-star text-yellow-300 text-2xl animate-pulse"></i>
                        <h2 class="text-xl font-black uppercase tracking-widest text-indigo-100">Quase lá!</h2>
                    </div>
                    <p class="text-2xl md:text-3xl font-bold">
                        Faltam {{ 100 - calcPercent(metaDestaque) }}% para: {{ metaDestaque.descricao }}
                    </p>

                    <div class="mt-4">
                        <div
                            class="w-full bg-indigo-900/50 rounded-full h-4 border border-indigo-400/30 overflow-hidden">
                            <div class="bg-yellow-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                                :style="{ width: calcPercent(metaDestaque) + '%' }"></div>
                        </div>
                    </div>
                </div>

                <button @click="emit('navigate', 'metas')"
                    class="bg-yellow-400 text-indigo-950 px-8 py-4 rounded-xl font-black hover:bg-yellow-300 hover:scale-105 transition active:scale-95 shadow-lg whitespace-nowrap">
                    INVESTIR AGORA
                </button>
            </div>

            <p class="text-2xl md:text-3xl font-bold">
                {{ podeFinalizar ? 'Você já tem o saldo necessário!' : `Faltam ${100 - calcPercent(metaDestaque)}% para:
                ${metaDestaque.descricao}` }}
            </p>

            <button @click="emit('navigate', 'metas')"
                :class="podeFinalizar ? 'bg-white text-green-700' : 'bg-yellow-400 text-indigo-950'"
                class="px-8 py-4 rounded-xl font-black transition-all hover:scale-105 shadow-lg">
                {{ podeFinalizar ? 'FINALIZAR AGORA 🏆' : 'INVESTIR AGORA' }}
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div @click="emit('navigate', 'receitas')"
                class="bg-white p-6 rounded-lg shadow hover:shadow-md transition cursor-pointer border-l-4 border-green-500 group">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="font-bold text-lg group-hover:text-green-700 transition">Receitas</h3>
                    <i class="ph ph-arrow-up-right text-green-500 text-2xl bg-green-100 p-2 rounded-full"></i>
                </div>
                <p class="text-sm text-gray-500">Total cadastrado: <span class="font-bold text-gray-800">{{ qtdReceitas
                        }}</span></p>
            </div>

            <div @click="emit('navigate', 'despesas')"
                class="bg-white p-6 rounded-lg shadow hover:shadow-md transition cursor-pointer border-l-4 border-red-500 group">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="font-bold text-lg group-hover:text-red-700 transition">Despesas</h3>
                    <i class="ph ph-arrow-down-right text-red-500 text-2xl bg-red-100 p-2 rounded-full"></i>
                </div>
                <p class="text-sm text-gray-500">Total cadastrado: <span class="font-bold text-gray-800">{{ qtdDespesas
                        }}</span></p>
            </div>

            <div @click="emit('navigate', 'metas')"
                class="bg-white p-6 rounded-lg shadow hover:shadow-md transition cursor-pointer border-l-4 border-blue-500 group">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="font-bold text-lg group-hover:text-blue-700 transition">Metas</h3>
                    <i class="ph ph-target text-blue-500 text-2xl bg-blue-100 p-2 rounded-full"></i>
                </div>
                <p class="text-sm text-gray-500">Total cadastrado: <span class="font-bold text-gray-800">{{ qtdMetas
                        }}</span></p>
            </div>
        </div>
    </div>
</template>