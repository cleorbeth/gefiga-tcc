<script setup>
import { ref, reactive, onMounted } from 'vue';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

const props = defineProps(['uid', 'saldo']); 
const emit = defineEmits(['back', 'points-added']);

const despesas = ref([]);
const appId = 'gefiga_v1';
const categorias = ['Emergência', 'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Bem-estar', 'Educação', 'Lazer', 'Doações', 'Vestuário', 'Financeiro', 'Outros'];

const form = reactive({ id: null, descricao: '', valor: 0, categoria: 'Outros', superflua: false });

const getSafeUid = () => {
    if (props.uid) return props.uid;
    if (auth.currentUser) return auth.currentUser.uid;
    throw new Error("Usuário não identificado.");
};

onMounted(() => {
  try {
      const uid = getSafeUid();
      onSnapshot(collection(db, 'artifacts', appId, 'users', uid, 'despesas'), (snap) => {
          despesas.value = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      });
  } catch (e) { console.error(e); }
});

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
            
            const pontos = form.superflua ? 0 : 5;
            const motivo = form.superflua
                ? `Registrou despesa supérflua: ${form.descricao}`
                : `Registrou despesa essencial: ${form.descricao}`;

            // Enviamos o aviso com os dados dinâmicos
            emit('points-added', pontos, motivo);
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

          <div class="flex items-center gap-2 md:col-span-2 bg-white p-3 rounded border border-gray-200">
              <input v-model="form.superflua" type="checkbox" id="sup" class="h-4 w-4 text-red-600 rounded focus:ring-red-500 border-gray-300">
              <label for="sup" class="text-sm text-gray-700 cursor-pointer font-medium">Esta despesa é Supérflua?</label>
          </div>

          <div class="md:col-span-2 flex gap-2 pt-2">
              <button type="submit" class="flex-grow bg-red-600 text-white py-2 rounded hover:bg-red-700 font-bold transition shadow">
                  {{ form.id ? 'Atualizar' : 'Registrar' }}
              </button>
              <button v-if="form.id" @click="resetForm" type="button" class="bg-gray-300 px-6 rounded text-gray-700 hover:bg-gray-400 font-bold transition">
                  Cancelar
              </button>
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
                  <tr v-for="d in despesas" :key="d.id" class="hover:bg-gray-50">
                      <td class="px-4 py-3 text-sm text-gray-700">
                          {{ d.descricao }}
                          <span v-if="d.superflua" class="ml-2 px-2 py-0.5 text-[10px] bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200 font-bold">Supérfluo</span>
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