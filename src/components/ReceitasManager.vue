<script setup>
import { reactive } from 'vue';
import { db, auth } from '../firebase'; 
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const props = defineProps(['uid', 'listaReceitas']);
const emit = defineEmits(['back', 'points-added']);

const appId = 'gefiga_v1';

const form = reactive({ 
    id: null, 
    descricao: '', 
    valor: 0, 
    categoria: 'Outros',
    categoriaCustom: '' 
});

const getSafeUid = () => {
    if (props.uid) return props.uid;
    if (auth.currentUser) return auth.currentUser.uid;
    throw new Error("Usuário não identificado.");
};

const saveReceita = async () => {
    try {
        const uid = getSafeUid();
        const col = collection(db, 'artifacts', appId, 'users', uid, 'receitas');
        
        // Define a categoria final (se for Outros e tiver digitado algo, usa o texto digitado)
        const categoriaFinal = form.categoria === 'Outros' && form.categoriaCustom.trim() !== '' 
            ? form.categoriaCustom.trim() 
            : form.categoria;

        const dados = { 
            descricao: form.descricao, 
            valor: form.valor,
            categoria: categoriaFinal
        };

        if (form.id) {
            await updateDoc(doc(col, form.id), dados);
        } else {
            await addDoc(col, { ...dados, data: serverTimestamp() });
            emit('points-added', 10, `Receita registrada: ${form.descricao}`);
        }
        resetForm();
    } catch (error) { alert("Erro: " + error.message); }
};

const deleteItem = async (id) => {
    if(confirm("Apagar?")) {
        const uid = getSafeUid();
        await deleteDoc(doc(db, 'artifacts', appId, 'users', uid, 'receitas', id));
    }
};

const editItem = (item) => {
    form.id = item.id;
    form.descricao = item.descricao;
    form.valor = item.valor;
    
    // Verifica se é uma categoria personalizada para preencher o campo corretamente
    if (categorias.includes(item.categoria || 'Outros')) {
        form.categoria = item.categoria || 'Outros';
        form.categoriaCustom = '';
    } else {
        form.categoria = 'Outros';
        form.categoriaCustom = item.categoria;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const resetForm = () => Object.assign(form, { id: null, descricao: '', valor: 0, categoria: 'Outros', categoriaCustom: '' });

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
</script>

<template>
    <div class="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in pb-20">
        
        <div class="flex items-center gap-4">
            <button @click="emit('back')" class="bg-white p-2 rounded-full shadow hover:bg-gray-50 text-gray-600 transition">
                <i class="ph-bold ph-arrow-left text-xl"></i>
            </button>
            <h1 class="text-2xl font-bold text-gray-800">Entradas e Receitas</h1>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <form @submit.prevent="saveReceita" class="grid gap-4 md:grid-cols-2">
                <div class="md:col-span-2">
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Descrição</label>
                    <input v-model="form.descricao" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 text-gray-900 font-medium" required placeholder="Ex: Salário do mês">
                </div>
                
                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Valor (R$)</label>
                    <input v-model.number="form.valor" type="number" step="0.01" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 text-gray-900 font-medium" required>
                </div>

                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Categoria</label>
                    <select v-model="form.categoria" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 text-gray-900 font-medium cursor-pointer">
                        <option v-for="cat in categorias" :key="cat" :value="cat">{{ cat }}</option>
                    </select>
                </div>

                <div v-if="form.categoria === 'Outros'" class="md:col-span-2 animate-fade-in">
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Especifique a Categoria</label>
                    <input v-model="form.categoriaCustom" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-yellow-50 border-yellow-200 text-gray-900 font-medium" placeholder="Ex: Prêmio de Sorteio (Opcional)">
                </div>

                <div class="md:col-span-2 flex gap-3 pt-4 border-t border-gray-100">
                    <button v-if="form.id" @click="resetForm" type="button" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                    <button :disabled="!form.valor || form.valor <= 0" type="submit" class="flex-[2] bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition disabled:opacity-50">
                        {{ form.id ? 'Salvar Alterações' : 'Adicionar Receita' }}
                    </button>
                </div>
            </form>
        </div>

        <div class="space-y-4">
            <div v-for="r in props.listaReceitas" :key="r.id" class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition flex items-center justify-between border-l-4 border-l-green-500 group">
                <div>
                    <span class="font-bold text-gray-800 block text-lg">{{ r.descricao }}</span>
                    <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">{{ r.categoria || 'Outros' }}</span>
                </div>
                <div class="flex flex-col md:flex-row gap-4 items-end md:items-center">
                    <span class="font-black text-green-600 text-xl">{{ formatMoney(r.valor) }}</span>
                    <div class="flex gap-2">
                        <button @click="editItem(r)" class="w-8 h-8 flex items-center justify-center bg-gray-100 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition"><i class="ph-bold ph-pencil-simple"></i></button>
                        <button @click="deleteItem(r.id)" class="w-8 h-8 flex items-center justify-center bg-gray-100 text-red-600 rounded-lg hover:bg-red-50 hover:text-red-700 transition"><i class="ph-bold ph-trash"></i></button>
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