<script setup>
import { reactive } from 'vue';
import { db, auth } from '../firebase'; 
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const props = defineProps(['uid', 'listaReceitas']);
const emit = defineEmits(['back', 'points-added']);

const appId = 'gefiga_v1';
const form = reactive({ id: null, descricao: '', valor: 0 });

const getSafeUid = () => {
    if (props.uid) return props.uid;
    if (auth.currentUser) return auth.currentUser.uid;
    throw new Error("Usuário não identificado.");
};

const saveReceita = async () => {
    try {
        const uid = getSafeUid();
        const col = collection(db, 'artifacts', appId, 'users', uid, 'receitas');
        const dados = { descricao: form.descricao, valor: form.valor };

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
    Object.assign(form, item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const resetForm = () => Object.assign(form, { id: null, descricao: '', valor: 0 });

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
</script>

<template>
    <div class="max-w-4xl mx-auto bg-white p-6 rounded shadow border-l-4 border-green-500">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-green-700">Receitas</h2>
            <button @click="emit('back')" class="bg-gray-200 px-4 py-2 rounded text-gray-700 hover:bg-gray-300 font-bold text-sm">Voltar</button>
        </div>

        <form @submit.prevent="saveReceita" class="bg-green-50 p-6 rounded-lg mb-6 flex flex-col md:flex-row gap-4 items-end shadow-sm border border-green-100">
            <div class="flex-grow w-full">
                <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Descrição</label>
                <input v-model="form.descricao" class="w-full p-2 border border-gray-300 rounded bg-white text-gray-900 outline-none focus:ring-2 focus:ring-green-500" required placeholder="Ex: Salário">
            </div>
            <div class="w-full md:w-1/3">
                <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Valor (R$)</label>
                <input v-model.number="form.valor" type="number" step="0.01" class="w-full p-2 border border-gray-300 rounded bg-white text-gray-900 outline-none focus:ring-2 focus:ring-green-500" required>
            </div>
            <button :disabled="!form.valor || form.valor <= 0" class="bg-green-600 text-white px-6 py-2 rounded font-bold h-10 hover:bg-green-700 shadow transition w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
                {{ form.id ? 'Salvar' : 'Adicionar' }}
            </button>
            <button v-if="form.id" @click="resetForm" type="button" class="bg-gray-300 text-gray-700 px-4 py-2 rounded font-bold h-10 hover:bg-gray-400 transition">X</button>
        </form>

        <ul class="space-y-3">
            <li v-for="r in props.listaReceitas" :key="r.id" class="flex justify-between items-center p-4 bg-white border border-gray-200 rounded hover:shadow-sm transition border-l-4 border-l-green-500">
                <span class="font-medium text-gray-800">{{ r.descricao }}</span>
                <div class="flex gap-4 items-center">
                    <span class="font-bold text-green-700">{{ formatMoney(r.valor) }}</span>
                    <div class="flex gap-2">
                        <button @click="editItem(r)" class="bg-gray-100 text-blue-600 text-xs px-3 py-1 rounded border hover:bg-blue-50 font-bold">Editar</button>
                        <button @click="deleteItem(r.id)" class="bg-gray-100 text-red-600 text-xs px-3 py-1 rounded border hover:bg-red-50 font-bold">X</button>
                    </div>
                </div>
            </li>
        </ul>
    </div>
</template>