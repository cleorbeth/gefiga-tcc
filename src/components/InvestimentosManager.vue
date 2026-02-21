<script setup>
import { ref, computed } from 'vue';

const props = defineProps(['saldo', 'uid']);
const emit = defineEmits(['back']);

// --- ESTADO DA CALCULADORA ---
const aporteMensal = ref(100);
const tempoAnos = ref(5);
const taxaAnual = ref(10.75); // Taxa média atual (ex: SELIC/CDI)

// --- DADOS DE INVESTIMENTOS (Para fins educativos de TCC) ---
const tiposInvestimento = [
    { nome: 'Poupança', taxa: 6.17, risco: 'Baixíssimo', obs: 'Isento de IR, mas rende menos.' },
    { nome: 'CDB (100% CDI)', taxa: 10.75, risco: 'Baixo', obs: 'Protegido pelo FGC. Ideal para reserva.' },
    { nome: 'Tesouro Selic', taxa: 10.75, risco: 'Baixo', obs: 'O investimento mais seguro do país.' },
    { nome: 'LCI/LCA', taxa: 9.2, risco: 'Baixo', obs: 'Isento de IR para pessoa física.' },
    { nome: 'FIIs', taxa: 12.5, risco: 'Moderado', obs: 'Rendimentos mensais (dividendos).' },
];

// --- LÓGICA MATEMÁTICA ---
// Fórmula de Juros Compostos com Aportes Mensais:
// M = P * ((1 + i)^n - 1) / i
const calcularMontante = (aporte, anos, taxaAnual) => {
    const i = (taxaAnual / 100) / 12; // taxa mensal
    const n = anos * 12; // total de meses
    if (i === 0) return aporte * n;
    return aporte * ((Math.pow(1 + i, n) - 1) / i);
};

const resultadoFinal = computed(() => {
    return calcularMontante(aporteMensal.value, tempoAnos.value, taxaAnual.value);
});

const totalInvestido = computed(() => aporteMensal.value * tempoAnos.value * 12);
const totalJuros = computed(() => resultadoFinal.value - totalInvestido.value);

const formatMoney = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
</script>

<template>
    <div class="max-w-5xl mx-auto space-y-6 pb-10">
        <div class="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border-l-4 border-indigo-500">
            <div>
                <h2 class="text-2xl font-bold text-gray-800">Central de Investimentos</h2>
                <p class="text-sm text-gray-500">Aprenda a fazer o seu dinheiro trabalhar por você.</p>
            </div>
            <button @click="emit('back')" class="bg-gray-100 px-4 py-2 rounded-lg font-bold hover:bg-gray-200">Voltar</button>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
            <div class="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
                    <i class="ph ph-calculator text-indigo-500"></i> Calculadora de Futuro
                </h3>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-black text-gray-400 uppercase">Quanto você pode investir por mês?</label>
                        <input type="range" min="50" max="5000" step="50" v-model.number="aporteMensal" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600">
                        <p class="text-xl font-bold text-indigo-600 mt-1">{{ formatMoney(aporteMensal) }}</p>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-black text-gray-400 uppercase">Tempo (Anos)</label>
                            <input type="number" v-model.number="tempoAnos" class="w-full p-2 border rounded font-bold">
                        </div>
                        <div>
                            <label class="block text-xs font-black text-gray-400 uppercase">Taxa Anual (%)</label>
                            <input type="number" step="0.1" v-model.number="taxaAnual" class="w-full p-2 border rounded font-bold text-green-600">
                        </div>
                    </div>

                    <div class="mt-8 p-6 bg-indigo-900 rounded-2xl text-white">
                        <p class="text-indigo-200 text-sm uppercase font-bold">Resultado estimado após {{ tempoAnos }} anos:</p>
                        <h4 class="text-4xl font-black my-2">{{ formatMoney(resultadoFinal) }}</h4>
                        <div class="flex justify-between text-xs border-t border-indigo-800 pt-4 mt-4">
                            <span>Investido: {{ formatMoney(totalInvestido) }}</span>
                            <span class="text-green-400 font-bold">Juros: +{{ formatMoney(totalJuros) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="space-y-4">
                <div v-for="invest in tiposInvestimento" :key="invest.nome" 
                    class="bg-white p-4 rounded-xl border border-gray-100 hover:border-indigo-300 transition-colors shadow-sm">
                    <div class="flex justify-between items-start mb-1">
                        <span class="font-bold text-gray-800">{{ invest.nome }}</span>
                        <span class="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{{ invest.taxa }}% a.a</span>
                    </div>
                    <p class="text-[11px] text-gray-500 leading-tight mb-2">{{ invest.obs }}</p>
                    <div class="text-[10px] font-bold text-indigo-500 uppercase">Risco: {{ invest.risco }}</div>
                </div>
            </div>
        </div>

        <div class="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
            <h4 class="font-bold text-yellow-800 flex items-center gap-2 mb-2">
                <i class="ph ph-lightbulb"></i> Por que investir?
            </h4>
            <p class="text-sm text-yellow-900/80 leading-relaxed">
                Ao deixar seu dinheiro parado na conta, ele perde poder de compra devido à inflação. Investir em <strong>Renda Fixa</strong> (CDB, Selic, LCI) é a maneira mais segura de proteger seu patrimônio e garantir que você atinja suas metas de longo prazo mais rápido.
            </p>
        </div>
    </div>
</template>