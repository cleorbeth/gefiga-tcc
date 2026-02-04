<script setup>
import { reactive } from 'vue';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const props = defineProps(['uid', 'saldo', 'listaDespesas']); 
const emit = defineEmits(['back', 'points-added']);

const appId = 'gefiga_v1';
const categorias = ['Emergência', 'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Bem-estar', 'Educação', 'Lazer', 'Doações', 'Vestuário', 'Financeiro', 'Outros'];
const form = reactive({ id: null, descricao: '', valor: 0, categoria: 'Outros', superflua: false });

const getSafeUid = () => {
    if (props.uid) return props.uid;
    if (auth.currentUser) return auth.currentUser.uid;
    throw new Error("Usuário não identificado.");
};

const saveDespesa = async () => {
    try {
        const uid = getSafeUid();
        const col = collection(db, 'artifacts', appId, 'users', uid, 'despesas');
        
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
    Object.assign(form, item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const resetForm = () => Object.assign(form, { id: null, descricao: '', valor: 0, categoria: 'Outros', superflua: false });
const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
</script>

<template>
    <div class="max-w-4xl mx-auto bg-white p-6 rounded shadow border-l-4 border-red-500">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-red-700">Despesas</h2>
            <button @click="emit('back')" class="bg-gray-200 px-4 py-2 rounded text-gray-700 hover:bg-gray-300 font-bold text-sm">Voltar</button>
        </div>

        <form @submit.prevent="saveDespesa" class="bg-red-50 p-6 rounded-lg mb-6 grid gap-4 md:grid-cols-2 shadow-sm border border-red-100">
            <div class="md:col-span-2">
                <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Descrição</label>
                <input v-model="form.descricao" type="text" class="w-full p-2 border border-gray-300 rounded bg-white text-gray-900 outline-none focus:ring-2 focus:ring-red-500" required>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Valor (R$)</label>
                <input v-model.number="form.valor" type="number" step="0.01" class="w-full p-2 border border-gray-300 rounded bg-white text-gray-900 outline-none focus:ring-2 focus:ring-red-500" required>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Categoria</label>
                <select v-model="form.categoria" class="w-full p-2 border border-gray-300 rounded bg-white text-gray-900 outline-none focus:ring-2 focus:ring-red-500">
                    <option v-for="cat in categorias" :key="cat" :value="cat">{{ cat }}</option>
                </select>
            </div>
            <div class="md:col-span-2">
                <label class="block text-xs font-bold text-gray-600 uppercase mb-2">Classificação do Gasto</label>
                <div class="grid grid-cols-2 gap-4">
                    <label class="cursor-pointer border-2 rounded-lg p-3 flex items-center gap-3 transition-all"
                        :class="!form.superflua ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-200'">
                        <input type="radio" :value="false" v-model="form.superflua" class="hidden">
                        <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                             :class="!form.superflua ? 'border-yellow-600' : 'border-gray-300'">
                            <div v-if="!form.superflua" class="w-2.5 h-2.5 rounded-full bg-yellow-600"></div>
                        </div>
                        <div>
                            <span class="block font-bold text-gray-800">Essencial</span>
                            <span class="text-xs text-green-600 font-bold">+5 pontos</span>
                        </div>
                    </label>

                    <label class="cursor-pointer border-2 rounded-lg p-3 flex items-center gap-3 transition-all"
                        :class="form.superflua ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-200'">
                        <input type="radio" :value="true" v-model="form.superflua" class="hidden">
                        <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                             :class="form.superflua ? 'border-red-600' : 'border-gray-300'">
                            <div v-if="form.superflua" class="w-2.5 h-2.5 rounded-full bg-red-600"></div>
                        </div>
                        <div>
                            <span class="block font-bold text-gray-800">Supérflua</span>
                            <span class="text-xs text-red-600 font-bold">-10 pontos</span>
                        </div>
                    </label>
                </div>
            </div>
            <div class="md:col-span-2 flex gap-2 pt-2">
                <button :disabled="!form.valor || form.valor <= 0" type="submit" class="flex-grow bg-red-600 text-white py-2 rounded hover:bg-red-700 font-bold transition shadow disabled:opacity-50">
                    {{ form.id ? 'Atualizar' : 'Registrar' }}
                </button>
                <button v-if="form.id" @click="resetForm" type="button" class="bg-gray-300 px-6 rounded text-gray-700 hover:bg-gray-400 font-bold transition">Cancelar</button>
            </div>
        </form>

        <div class="overflow-x-auto border rounded-lg">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Descrição</th>
                        <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Categoria</th>
                        <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Valor</th>
                        <th class="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Ações</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="d in props.listaDespesas" :key="d.id" 
                        class="hover:bg-gray-50 border-l-4 transition"
                        :class="d.superflua ? 'border-l-red-500 bg-red-50/30' : 'border-l-yellow-400 bg-yellow-50/30'">
                        
                        <td class="px-4 py-3 text-sm text-gray-700">
                            {{ d.descricao }}
                            <span v-if="d.superflua" class="ml-2 px-2 py-0.5 text-[10px] bg-red-100 text-red-800 rounded-full border border-red-200 font-bold">Supérfluo</span>
                            <span v-else class="ml-2 px-2 py-0.5 text-[10px] bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200 font-bold">Essencial</span>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-500">{{ d.categoria }}</td>
                        <td class="px-4 py-3 text-sm font-bold text-red-600">- {{ formatMoney(d.valor) }}</td>
                        <td class="px-4 py-3 text-right text-sm space-x-2">
                            <button @click="editItem(d)" class="bg-gray-100 text-indigo-600 text-xs px-2 py-1 rounded border hover:bg-indigo-50 font-bold">Editar</button>
                            <button @click="deleteItem(d.id)" class="bg-gray-100 text-red-600 text-xs px-2 py-1 rounded border hover:bg-red-50 font-bold">X</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>