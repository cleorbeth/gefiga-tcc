<script setup>
import { reactive } from 'vue';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const props = defineProps(['uid', 'saldo', 'listaDespesas']); 
const emit = defineEmits(['back', 'points-added']);

const appId = 'gefiga_v1';

const categorias = [
    'Emergência', 'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Bem-estar', 
    'Educação', 'Lazer', 'Doações', 'Vestuário', 'Financeiro', 'Outros'
];

const form = reactive({ 
    id: null, 
    descricao: '', 
    valor: 0, 
    categoria: 'Outros', 
    categoriaCustom: '',
    superflua: false 
});

const getSafeUid = () => {
    if (props.uid) return props.uid;
    if (auth.currentUser) return auth.currentUser.uid;
    throw new Error("Usuário não identificado.");
};

const saveDespesa = async () => {
    try {
        const uid = getSafeUid();
        const col = collection(db, 'artifacts', appId, 'users', uid, 'despesas');

        const categoriaFinal = form.categoria === 'Outros' && form.categoriaCustom.trim() !== '' 
            ? form.categoriaCustom.trim() 
            : form.categoria;
        
        const dados = { 
            descricao: form.descricao, 
            valor: form.valor,
            categoria: form.categoria,
            superflua: form.superflua
        };

        if (form.id) {
            await updateDoc(doc(col, form.id), dados);
        } else {
            if (form.valor > (props.saldo || 0) && !confirm("Atenção: Valor maior que o saldo. Continuar?")) return;
            await addDoc(col, { ...dados, data: serverTimestamp() });
            
            const pontos = form.superflua ? -10 : 5;
            const tipoTexto = form.superflua ? 'Supérflua' : 'Essencial';

            // Enviamos o aviso com os dados dinâmicos
            emit('points-added', pontos, `Despesa ${tipoTexto}: ${form.descricao}`);
        }
        resetForm();
    } catch (e) { alert("Erro: " + e.message); }
};

const deleteItem = async (id) => {
    if(confirm("Excluir?")) {
        const uid = getSafeUid();
        await deleteDoc(doc(db, 'artifacts', appId, 'users', uid, 'despesas', id));
    }
};

const editItem = (item) => {
    form.id = item.id;
    form.descricao = item.descricao;
    form.valor = item.valor;
    form.superflua = item.superflua;
    
    if (categorias.includes(item.categoria)) {
        form.categoria = item.categoria;
        form.categoriaCustom = '';
    } else {
        form.categoria = 'Outros';
        form.categoriaCustom = item.categoria;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const resetForm = () => Object.assign(form, { 
    id: null, 
    descricao: '', 
    valor: 0, 
    categoria: 'Outros', 
    categoriaCustom: '', 
    superflua: false 
});

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
</script>

<template>
    <div class="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in pb-20">
        
        <div class="flex items-center gap-4">
            <button @click="emit('back')" class="bg-white p-2 rounded-full shadow hover:bg-gray-50 text-gray-600 transition">
                <i class="ph-bold ph-arrow-left text-xl"></i>
            </button>
            <h1 class="text-2xl font-bold text-gray-800">Saídas e Despesas</h1>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <form @submit.prevent="saveDespesa" class="grid gap-4 md:grid-cols-2">
                <div class="md:col-span-2">
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Descrição</label>
                    <input v-model="form.descricao" type="text" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-gray-50 text-gray-900 font-medium" required placeholder="O que você comprou/pagou?">
                </div>

                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Valor (R$)</label>
                    <input v-model.number="form.valor" type="number" step="0.01" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-gray-50 text-gray-900 font-medium" required>
                </div>

                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Categoria</label>
                    <select v-model="form.categoria" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-gray-50 text-gray-900 font-medium cursor-pointer">
                        <option v-for="cat in categorias" :key="cat" :value="cat">{{ cat }}</option>
                    </select>
                </div>

                <div v-if="form.categoria === 'Outros'" class="md:col-span-2 animate-fade-in">
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Especifique a Categoria</label>
                    <input v-model="form.categoriaCustom" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-yellow-50 border-yellow-200 text-gray-900 font-medium" placeholder="Ex: Impostos (Opcional)">
                </div>

                <div class="md:col-span-2 mt-2">
                    <label class="text-xs font-bold text-gray-500 uppercase mb-2 block text-center">Classificação do Gasto</label>
                    <div class="grid grid-cols-2 gap-4">
                        <label class="cursor-pointer border-2 rounded-xl p-4 flex flex-col md:flex-row items-center justify-center gap-3 transition-all"
                            :class="!form.superflua ? 'border-yellow-500 bg-yellow-50 shadow-md scale-[1.02]' : 'border-gray-200 hover:border-yellow-200 grayscale opacity-70'">
                            <input type="radio" :value="false" v-model="form.superflua" class="hidden">
                            <div class="text-center">
                                <span class="block font-black text-gray-800">Essencial</span>
                                <span class="text-xs text-green-600 font-bold">+5 pontos</span>
                            </div>
                        </label>

                        <label class="cursor-pointer border-2 rounded-xl p-4 flex flex-col md:flex-row items-center justify-center gap-3 transition-all"
                            :class="form.superflua ? 'border-red-500 bg-red-50 shadow-md scale-[1.02]' : 'border-gray-200 hover:border-red-200 grayscale opacity-70'">
                            <input type="radio" :value="true" v-model="form.superflua" class="hidden">
                            <div class="text-center">
                                <span class="block font-black text-gray-800">Supérflua</span>
                                <span class="text-xs text-red-600 font-bold">-10 pontos</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="md:col-span-2 flex gap-3 pt-4 border-t border-gray-100 mt-2">
                    <button v-if="form.id" @click="resetForm" type="button" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                    <button :disabled="!form.valor || form.valor <= 0" type="submit" class="flex-[2] bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition disabled:opacity-50">
                        {{ form.id ? 'Atualizar Despesa' : 'Registrar Despesa' }}
                    </button>
                </div>
            </form>
        </div>

        <div class="space-y-4">
            <div v-for="d in props.listaDespesas" :key="d.id" class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4" :class="d.superflua ? 'border-l-red-500' : 'border-l-yellow-400'">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-gray-800 text-lg leading-tight">{{ d.descricao }}</span>
                        <span class="px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-widest" :class="d.superflua ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'">
                            {{ d.superflua ? 'Supérfluo' : 'Essencial' }}
                        </span>
                    </div>
                    <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">{{ d.categoria }}</span>
                </div>
                <div class="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                    <span class="font-black text-red-600 text-xl">- {{ formatMoney(d.valor) }}</span>
                    <div class="flex gap-2">
                        <button @click="editItem(d)" class="w-8 h-8 flex items-center justify-center bg-gray-100 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition"><i class="ph-bold ph-pencil-simple"></i></button>
                        <button @click="deleteItem(d.id)" class="w-8 h-8 flex items-center justify-center bg-gray-100 text-red-600 rounded-lg hover:bg-red-50 hover:text-red-700 transition"><i class="ph-bold ph-trash"></i></button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>