<script setup>
import { reactive } from 'vue';
import { db, auth } from '../firebase'; 
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const props = defineProps(['uid', 'saldo', 'listaMetas']);
const emit = defineEmits(['back', 'points-added']);

const appId = 'gefiga_v1';
const tempInvestment = reactive({});
const categorias = ['Poupança', 'Emergência', 'Viagem', 'Construção', 'Aquisição', 'Outros'];

const form = reactive({
    id: null,
    descricao: '',
    valorAlvo: 0,
    valorAtual: 0,
    categoria: 'Outros',
    categoriaCustom: '',
    prazo: ''
});

const getSafeUid = () => {
    if (props.uid) return props.uid;
    if (auth.currentUser) return auth.currentUser.uid;
    throw new Error("Usuário não identificado.");
};

const saveMeta = async () => {
    try {
        const uid = getSafeUid();
        const col = collection(db, 'artifacts', appId, 'users', uid, 'metas');

        const categoriaFinal = form.categoria === 'Outros' && form.categoriaCustom.trim() !== '' 
            ? form.categoriaCustom.trim() 
            : form.categoria;
        
        // Copia os dados do form
        const dadosParaSalvar = { 
            descricao: form.descricao,
            valorAlvo: form.valorAlvo,
            categoria: form.categoria,
            prazo: form.prazo
            // Não enviamos valorAtual na edição para não resetar o progresso
        };

        if (form.id) {
            await updateDoc(doc(col, form.id), dadosParaSalvar);
            alert("Meta atualizada!");
        } else {
            // === CORREÇÃO 2: Limpeza na criação ===
            // Adicionamos data e valor inicial, mas SEM enviar o campo 'id'
            await addDoc(col, { 
                ...dadosParaSalvar, 
                valorAtual: 0, 
                data: serverTimestamp() 
            });
            emit('points-added', 50, 'Planejou uma nova meta: ${form.descricao}');
        }
        resetForm();
    } catch (error) {
        alert("Erro ao salvar: " + error.message);
    }
};

const investInMeta = async (meta) => {
    const valorAporte = Number(tempInvestment[meta.id]) || 0;

    if (valorAporte <= 0) {
        alert("Digite um valor maior que zero.");
        return;
    }

    try {
        const uid = getSafeUid();
        const novoTotal = Number(meta.valorAtual || 0) + Number(valorAporte);
        const metaRef = doc(db, 'artifacts', appId, 'users', uid, 'metas', meta.id);
        await updateDoc(metaRef, { valorAtual: novoTotal });

        tempInvestment[meta.id] = 0;
        const valorFormatado = formatMoney(valorAporte);
        emit('points-added', 20, `Investiu ${valorFormatado} na meta: ${meta.descricao}`);
        
    } catch (error) { alert("Falha no investimento: " + error.message);}
};

const deleteItem = async (id) => {
    if(confirm("Excluir meta?")) {
        const uid = getSafeUid();
        await deleteDoc(doc(db, 'artifacts', appId, 'users', uid, 'metas', id));
    }
};

const editItem = (item) => {
    form.id = item.id;
    form.descricao = item.descricao;
    form.valorAlvo = item.valorAlvo;
    form.prazo = item.prazo || '';
    
    if (categorias.includes(item.categoria)) {
        form.categoria = item.categoria;
        form.categoriaCustom = '';
    } else {
        form.categoria = 'Outros';
        form.categoriaCustom = item.categoria;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const resetForm = () => {
    // Reset completo
    form.id = null;
    form.descricao = '';
    form.valorAlvo = 0;
    form.valorAtual = 0;
    form.categoria = 'Outros';
    form.categoriaCustom = '';
    form.prazo = '';
};

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatarDataSimples = (dataStr) => {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
};

const calcPercent = (m) => {
    if (!m.valorAlvo || m.valorAlvo <= 0) return 0;
    const p = ((m.valorAtual || 0) / m.valorAlvo) * 100;
    return Math.min(100, Math.round(p)); 
};
</script>

<template>
    <div class="max-w-5xl mx-auto p-6 space-y-8 animate-fade-in pb-20">
        
        <div class="flex items-center gap-4">
            <button @click="emit('back')" class="bg-white p-2 rounded-full shadow hover:bg-gray-50 text-gray-600 transition">
                <i class="ph-bold ph-arrow-left text-xl"></i>
            </button>
            <h1 class="text-2xl font-bold text-gray-800">Minhas Metas</h1>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <form @submit.prevent="saveMeta" class="grid gap-4 md:grid-cols-2">
                <div class="md:col-span-2">
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Descrição do Objetivo</label>
                    <input v-model="form.descricao" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 text-gray-900 font-medium" required placeholder="Ex: Viagem para a praia">
                </div>
                
                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Valor Alvo (R$)</label>
                    <input v-model.number="form.valorAlvo" type="number" step="0.01" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 text-gray-900 font-medium" required>
                </div>
                
                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Prazo Limite</label>
                    <input v-model="form.prazo" type="date" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 text-gray-900 font-medium text-sm">
                </div>
                
                <div class="md:col-span-2">
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Categoria</label>
                    <select v-model="form.categoria" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 text-gray-900 font-medium cursor-pointer">
                        <option v-for="cat in categorias" :key="cat" :value="cat">{{ cat }}</option>
                    </select>
                </div>

                <div v-if="form.categoria === 'Outros'" class="md:col-span-2 animate-fade-in">
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Especifique a Categoria</label>
                    <input v-model="form.categoriaCustom" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-yellow-50 border-yellow-200 text-gray-900 font-medium" placeholder="Ex: Casamento (Opcional)">
                </div>

                <div class="md:col-span-2 flex gap-3 pt-4 border-t border-gray-100">
                    <button v-if="form.id" @click="resetForm" type="button" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                    <button type="submit" class="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition">
                        {{ form.id ? 'Salvar Alterações' : 'Criar Nova Meta' }}
                    </button>
                </div>
            </form>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
            <div v-for="m in props.listaMetas" :key="m.id" class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition relative overflow-hidden group">
                <div v-if="calcPercent(m) >= 100" class="absolute -right-10 -top-10 bg-green-400 w-32 h-32 rounded-full blur-3xl opacity-20"></div>

                <div class="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <h4 class="font-black text-xl text-gray-800 leading-tight mb-1">{{ m.descricao }}</h4>
                        <span class="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{{ m.categoria }}</span>
                    </div>
                    <div class="flex gap-2">
                        <button @click="editItem(m)" class="w-8 h-8 flex items-center justify-center bg-gray-100 text-indigo-600 rounded-lg hover:bg-indigo-50 transition"><i class="ph-bold ph-pencil-simple"></i></button>
                        <button @click="deleteItem(m.id)" class="w-8 h-8 flex items-center justify-center bg-gray-100 text-red-600 rounded-lg hover:bg-red-50 transition"><i class="ph-bold ph-trash"></i></button>
                    </div>
                </div>

                <div class="mb-5 relative z-10">
                    <div class="flex justify-between text-xs mb-2 font-bold text-gray-500">
                        <span>Atual: <span class="text-gray-900">{{ formatMoney(m.valorAtual || 0) }}</span></span>
                        <span>Alvo: <span class="text-gray-900">{{ formatMoney(m.valorAlvo) }}</span></span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                        <div class="h-full rounded-full transition-all duration-1000 ease-out"
                             :class="calcPercent(m) >= 100 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gradient-to-r from-blue-500 to-indigo-500'"
                             :style="{ width: calcPercent(m) + '%' }"></div>
                    </div>
                    <div class="flex justify-between mt-1">
                        <span class="text-[10px] text-gray-400 font-medium">{{ m.prazo ? 'Até ' + new Date(m.prazo).toLocaleDateString() : 'Sem prazo' }}</span>
                        <span class="text-xs font-black" :class="calcPercent(m) >= 100 ? 'text-green-600' : 'text-blue-600'">{{ calcPercent(m) }}%</span>
                    </div>
                </div>

                <div v-if="calcPercent(m) < 100" class="bg-indigo-50/50 p-4 rounded-xl border border-indigo-50 relative z-10">
                    <label class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-3 text-center">Investir do Saldo</label>
                    
                    <div class="flex flex-col gap-3">
                        <input type="range" min="0" :max="props.saldo > 0 ? props.saldo : 1000" step="1" 
                            v-model.number="tempInvestment[m.id]" class="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600">
                        
                        <div class="flex items-center gap-2">
                            <div class="relative flex-1">
                                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">R$</span>
                                <input type="number" step="0.01" min="0" v-model.number="tempInvestment[m.id]" 
                                    class="w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                    placeholder="0.00">
                            </div>
                            <button @click="investInMeta(m)" :disabled="!tempInvestment[m.id] || tempInvestment[m.id] <= 0"
                                class="bg-indigo-600 text-white w-10 h-10 rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                                <i class="ph-bold ph-paper-plane-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div v-else class="bg-green-50 text-green-700 p-3 rounded-xl border border-green-100 font-bold text-center flex items-center justify-center gap-2 relative z-10">
                    <i class="ph-fill ph-check-circle text-xl"></i> Meta Concluída!
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>