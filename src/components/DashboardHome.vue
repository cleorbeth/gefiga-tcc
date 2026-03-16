<script setup>
import { computed, ref } from 'vue';

// Agora o componente é "burro" (Dumb Component): 
// Ele não vai no banco, ele só recebe dados do pai e mostra.

// Props: 
// - uid: ID do usuário (caso precise no futuro)
// - saldo: O valor já calculado pelo App.vue
// - resumo: Um objeto contendo os arrays { receitas, despesas, metas }
const props = defineProps(['uid', 'saldo', 'resumo']);
const emit = defineEmits(['navigate']);

// --- 1. CONTROLE DE DATA (FILTRO) ---
const dataAtual = new Date();
const mesSelecionado = ref(dataAtual.getMonth()); // 0 = Janeiro, 1 = Fevereiro...
const anoSelecionado = ref(dataAtual.getFullYear());

const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const anos = [2024, 2025, 2026]; // Você pode gerar isso dinamicamente se quiser

// Função auxiliar para verificar se um item pertence ao mês/ano selecionado
const pertenceAoMes = (item) => {
    if (!item.data) return false; // Se não tiver data, ignora
    
    // Converte timestamp do Firebase para Date JS
    const dataItem = item.data.toDate ? item.data.toDate() : new Date(item.data);
    
    // Se "anoSelecionado" for 'todos', retorna true (filtro de ano inteiro)
    if (mesSelecionado.value === 'todos') {
         return dataItem.getFullYear() === anoSelecionado.value;
    }

    return dataItem.getMonth() === mesSelecionado.value && 
           dataItem.getFullYear() === anoSelecionado.value;
};

// --- 2. DADOS FILTRADOS ---
const receitasFiltradas = computed(() => (props.resumo?.receitas || []).filter(pertenceAoMes));
const despesasFiltradas = computed(() => (props.resumo?.despesas || []).filter(pertenceAoMes));

// Calcula totais baseados no filtro
const totalReceitasMes = computed(() => receitasFiltradas.value.reduce((acc, r) => acc + Number(r.valor || 0), 0));
const totalDespesasMes = computed(() => despesasFiltradas.value.reduce((acc, d) => acc + Number(d.valor || 0), 0));
const balancoMes = computed(() => totalReceitasMes.value - totalDespesasMes.value);

// --- 3. GRÁFICO DE CATEGORIAS (ONDE O DINHEIRO VAI) ---
const gastosPorCategoria = computed(() => {
    const totais = {};
    
    // 1. Agrupa e soma os valores
    despesasFiltradas.value.forEach(d => {
        // Se a categoria for Outros e tiver algo customizado, usa o customizado. Senão, usa a categoria normal.
        const nomeCategoria = (d.categoria === 'Outros' && d.categoriaCustom) 
            ? d.categoriaCustom 
            : (d.categoria || 'Outros');
            
        if (!totais[nomeCategoria]) totais[nomeCategoria] = 0;
        totais[nomeCategoria] += Number(d.valor || 0);
    });

    const totalGeral = totalDespesasMes.value;

    // 2. Transforma o objeto em array, calcula a % e ordena do maior para o menor
    return Object.entries(totais)
        .map(([nome, valor]) => ({
            nome,
            valor,
            percentual: totalGeral > 0 ? Math.round((valor / totalGeral) * 100) : 0
        }))
        .sort((a, b) => b.valor - a.valor);
});

// --- 4. METAS (ORDENAÇÃO) ---
const metasOrdenadas = computed(() => {
    // Pegamos a lista de metas que vem do App.vue
    const lista = props.resumo?.metas || [];

    // Fazemos uma cópia da lista e ordenamos
    return [...lista].sort((a, b) => {
        // Se uma meta não tiver prazo, ela vai para o final
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;

        // Ordena da data mais antiga (mais próxima) para a mais distante
        return a.prazo.localeCompare(b.prazo);
    }).slice(0, 3); // Mostra apenas as 3 mais urgentes no Dashboard
});

const formatarDataSimples = (dataStr) => {
  if (!dataStr) return '';
  // Divide "2026-10-10" em ["2026", "10", "10"]
  const [ano, mes, dia] = dataStr.split('-');
  // Retorna no formato brasileiro/português "10/10/2026"
  return `${dia}/${mes}/${ano}`;
};

// --- LÓGICA DE URGÊNCIA ---
const getStatusPrazo = (meta) => {
    if (calcPercent(meta) >= 100) return { texto: 'Concluída', cor: 'text-green-600', bg: 'bg-green-100', icon: 'ph-check-circle' };
    if (!meta.prazo) return { texto: 'Sem prazo', cor: 'text-gray-400', bg: 'bg-gray-100', icon: 'ph-calendar-blank' };

    const hoje = new Date();
    const dataMeta = new Date(meta.prazo);
    const diffTempo = dataMeta - hoje;
    const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return { texto: 'Atrasada', cor: 'text-red-600', bg: 'bg-red-100', icon: 'ph-warning-circle' };
    if (diffDias <= 7) return { texto: 'Urgente!', cor: 'text-orange-600', bg: 'bg-orange-100', icon: 'ph-clock-countdown' };
    return { texto: 'Em dia', cor: 'text-blue-600', bg: 'bg-blue-100', icon: 'ph-calendar-check' };
};

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

// Acessamos os dados que vieram do App.vue através de props.resumo
const qtdReceitas = computed(() => props.resumo?.receitas?.length || 0);
const qtdDespesas = computed(() => props.resumo?.despesas?.length || 0);
const qtdMetas = computed(() => props.resumo?.metas?.length || 0);

</script>

<template>
    <div class="max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8 space-y-6">

        <div class="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-100 mt-4">
            <div>
                <h1 class="text-2xl font-bold text-gray-800">Visão Geral</h1>
                <p class="text-gray-500 text-sm">Como está o seu controle financeiro?</p>
            </div>

            <div class="flex gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                <select v-model="mesSelecionado"
                    class="bg-transparent text-sm font-bold text-gray-700 outline-none p-2 cursor-pointer">
                    <option :value="'todos'">Ano Todo</option>
                    <option v-for="(mes, index) in meses" :key="index" :value="index">{{ mes }}</option>
                </select>
                <select v-model="anoSelecionado"
                    class="bg-white rounded shadow-sm text-sm font-bold text-indigo-600 outline-none p-2 cursor-pointer border border-gray-200">
                    <option v-for="ano in anos" :key="ano" :value="ano">{{ ano }}</option>
                </select>
            </div>

            <div class="flex justify-end gap-3 -mt-2">
                <button @click="emit('navigate', 'recorrentes')"
                    class="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-100 hover:shadow-sm transition flex items-center gap-2 group">
                    <i class="ph-bold ph-arrows-clockwise group-hover:rotate-180 transition-transform duration-500"></i>
                    Automações (Contas Fixas)
                </button>
            </div>

        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4"></div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div @click="emit('navigate', 'receitas')"
                class="bg-green-50 p-6 rounded-xl border border-green-100 cursor-pointer hover:shadow-md transition group relative overflow-hidden">
                <div
                    class="absolute -right-4 -top-4 bg-green-200 w-20 h-20 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-500">
                </div>
                <p class="text-green-800 text-xs font-bold uppercase tracking-wider mb-1">Entradas em {{ mesSelecionado
                    === 'todos' ? anoSelecionado : meses[mesSelecionado] }}</p>
                <h3 class="text-2xl font-black text-green-700">{{ formatMoney(totalReceitasMes) }}</h3>
                <p class="text-xs text-green-600 mt-2 font-medium">{{ receitasFiltradas.length }} registros</p>
            </div>
            <div @click="emit('navigate', 'despesas')"
                class="bg-red-50 p-6 rounded-xl border border-red-100 cursor-pointer hover:shadow-md transition group relative overflow-hidden">
                <div
                    class="absolute -right-4 -top-4 bg-red-200 w-20 h-20 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-500">
                </div>
                <p class="text-red-800 text-xs font-bold uppercase tracking-wider mb-1">Saídas em {{ mesSelecionado ===
                    'todos' ? anoSelecionado : meses[mesSelecionado] }}</p>
                <h3 class="text-2xl font-black text-red-700">{{ formatMoney(totalDespesasMes) }}</h3>
                <p class="text-xs text-red-600 mt-2 font-medium">{{ despesasFiltradas.length }} registros</p>
            </div>
            <div class="bg-indigo-50 p-6 rounded-xl border border-indigo-100 relative overflow-hidden">
                <p class="text-indigo-800 text-xs font-bold uppercase tracking-wider mb-1">Balanço do Período</p>
                <h3 class="text-2xl font-black" :class="balancoMes >= 0 ? 'text-indigo-700' : 'text-red-600'">
                    {{ formatMoney(balancoMes) }}
                </h3>
                <p class="text-xs text-indigo-600 mt-2">Saldo Total Atual: <span class="font-bold">{{
                        formatMoney(props.saldo) }}</span></p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <i class="ph-fill ph-target text-blue-500"></i> Metas em Destaque
                    </h3>
                    <button @click="emit('navigate', 'metas')"
                        class="text-xs font-bold text-blue-600 hover:underline">Ver todas</button>
                </div>

                <div v-if="metasOrdenadas.length === 0" class="text-center py-8 text-gray-400">
                    <p>Nenhuma meta cadastrada ainda.</p>
                </div>

                <div class="space-y-4">
                    <div v-for="meta in metasOrdenadas" :key="meta.id" class="space-y-1">
                        <div class="flex justify-between text-sm">
                            <span class="font-bold text-gray-700">{{ meta.descricao }}</span>
                            <span class="font-bold"
                                :class="calcPercent(meta) >= 100 ? 'text-green-600' : 'text-blue-600'">{{
                                calcPercent(meta) }}%</span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div class="h-full rounded-full transition-all duration-1000"
                                :class="calcPercent(meta) >= 100 ? 'bg-green-500' : 'bg-blue-500'"
                                :style="{ width: calcPercent(meta) + '%' }"></div>
                        </div>
                        <div class="flex justify-between text-xs text-gray-400">
                            <span>Faltam {{ formatMoney(meta.valorAlvo - meta.valorAtual) }}</span>
                            <span v-if="meta.prazo">Prazo: {{ formatarDataSimples(meta.prazo) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <i class="ph-fill ph-pie-chart text-red-500"></i> Onde seu dinheiro vai?
                    </h3>
                </div>

                <div v-if="gastosPorCategoria.length === 0" class="text-center py-8 text-gray-400">
                    <p>Registre despesas para ver o gráfico.</p>
                </div>

                <div class="space-y-5">
                    <div v-for="item in gastosPorCategoria" :key="item.nome" class="group relative">
                        <div class="flex justify-between items-end mb-1">
                            <span class="font-bold text-sm text-gray-700">{{ item.nome }}</span>
                            <span class="text-xs font-bold text-gray-500">{{ formatMoney(item.valor) }}</span>
                        </div>

                        <div class="w-full bg-red-50 rounded-full h-3 overflow-hidden border border-red-100">
                            <div class="h-full bg-red-500 rounded-full transition-all duration-1000 ease-out group-hover:bg-red-600"
                                :style="{ width: item.percentual + '%' }"></div>
                        </div>

                        <span
                            class="absolute -top-6 right-0 bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {{ item.percentual }}% do total
                        </span>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>