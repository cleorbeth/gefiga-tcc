<script setup>
import { ref, reactive, onMounted } from 'vue';
import { db, auth } from '../firebase'; 
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

const props = defineProps(['uid', 'saldo']);
const emit = defineEmits(['back', 'points-added']);

const metas = ref([]);
const appId = 'gefiga_v1';
const tempInvestment = reactive({});
const categorias = ['Poupança', 'Emergência', 'Viagem', 'Construção', 'Aquisição', 'Outros'];

const form = reactive({
    id: null,
    descricao: '',
    valorAlvo: 0,
    valorAtual: 0,
    categoria: 'Outros'
});

const getSafeUid = () => {
    if (props.uid) return props.uid;
    if (auth.currentUser) return auth.currentUser.uid;
    throw new Error("Usuário não identificado. Recarregue a página.");
};

onMounted(() => {
    try {
        const uid = getSafeUid();
        // === CORREÇÃO 1: Inverti a ordem aqui ===
        // Primeiro espalhamos os dados (...d.data()), e POR ÚLTIMO definimos o id (id: d.id).
        // Isso garante que o ID real do Firestore sempre vença, mesmo que tenha "lixo" salvo no banco.
        onSnapshot(collection(db, 'artifacts', appId, 'users', uid, 'metas'), (snap) => {
            metas.value = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        });
    } catch (e) {
        console.error("Erro ao carregar metas:", e);
    }
});

const saveMeta = async () => {
    try {
        const uid = getSafeUid();
        const col = collection(db, 'artifacts', appId, 'users', uid, 'metas');
        
        // Copia os dados do form
        const dadosParaSalvar = { 
            descricao: form.descricao,
            valorAlvo: form.valorAlvo,
            categoria: form.categoria,
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
    const valorAporte = tempInvestment[meta.id] || 0;

    if (valorAporte <= 0) {
        alert("Digite um valor maior que zero.");
        return;
    }
    
    // Validação de saldo (descomente quando quiser ativar)
    // if (valorAporte > (props.saldo || 0)) {
    //    alert("Saldo insuficiente!");
    //    return;
    // }

    try {
        const uid = getSafeUid();
        
        if (!meta.id) throw new Error("Erro interno: ID da meta não encontrado.");

        const novoTotal = Number(meta.valorAtual || 0) + Number(valorAporte);
        
        const metaRef = doc(db, 'artifacts', appId, 'users', uid, 'metas', meta.id);
        await updateDoc(metaRef, { valorAtual: novoTotal });

        tempInvestment[meta.id] = 0;

        const valorFormatado = formatMoney(valorAporte);
        emit('points-added', 20, 'Investiu ${valorFormatado} na meta: ${meta.descricao}');
        
    } catch (error) {
        console.error(error);
        alert("Falha no investimento: " + error.message);
    }
};

const deleteItem = async (id) => {
    if(confirm("Excluir meta?")) {
        const uid = getSafeUid();
        await deleteDoc(doc(db, 'artifacts', appId, 'users', uid, 'metas', id));
    }
};

const editItem = (item) => {
    Object.assign(form, item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const resetForm = () => {
    // Reset completo
    form.id = null;
    form.descricao = '';
    form.valorAlvo = 0;
    form.valorAtual = 0;
    form.categoria = 'Outros';
};

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const calcPercent = (m) => {
    if (!m.valorAlvo || m.valorAlvo <= 0) return 0;
    const p = ((m.valorAtual || 0) / m.valorAlvo) * 100;
    return Math.min(100, Math.round(p)); 
};
</script>

<template>
  <div class="max-w-5xl mx-auto bg-white p-6 rounded shadow border-l-4 border-blue-500">
      <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-blue-700">Minhas Metas</h2>
          <button @click="emit('back')" class="bg-gray-200 px-4 py-2 rounded text-gray-700 hover:bg-gray-300 font-bold text-sm">
              Voltar
          </button>
      </div>

      <form @submit.prevent="saveMeta" class="bg-blue-50 p-6 rounded-lg mb-8 grid gap-4 md:grid-cols-2 shadow-sm border border-blue-100">
          <div class="md:col-span-2">
              <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Descrição</label>
              <input v-model="form.descricao" class="w-full p-2 border border-gray-300 rounded bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" required placeholder="Ex: Viagem">
          </div>
          <div>
              <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Valor Alvo (R$)</label>
              <input v-model.number="form.valorAlvo" type="number" step="0.01" class="w-full p-2 border border-gray-300 rounded bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" required>
          </div>
          <div>
              <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Categoria</label>
              <select v-model="form.categoria" class="w-full p-2 border border-gray-300 rounded bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-500">
                  <option v-for="cat in categorias" :key="cat" :value="cat">{{ cat }}</option>
              </select>
          </div>
          <div class="md:col-span-2 flex gap-2 mt-2">
            <button type="submit" class="flex-grow bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-bold shadow">
                {{ form.id ? 'Salvar Alterações' : 'Criar Nova Meta' }}
            </button>
            <button v-if="form.id" @click="resetForm" type="button" class="bg-gray-300 px-6 rounded text-gray-700 font-bold hover:bg-gray-400">
                Cancelar
            </button>
          </div>
      </form>

      <div class="grid gap-6 md:grid-cols-2">
          <div v-for="m in metas" :key="m.id" class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
               
               <div class="flex justify-between items-start mb-3">
                   <div>
                       <h4 class="font-bold text-lg text-gray-800">{{ m.descricao }}</h4>
                       <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">{{ m.categoria }}</span>
                   </div>
                   <div class="flex flex-col gap-2">
                       <button @click="editItem(m)" class="bg-gray-100 text-blue-600 text-xs px-3 py-1 rounded border font-bold hover:bg-blue-50">Editar</button>
                       <button @click="deleteItem(m.id)" class="bg-gray-100 text-red-600 text-xs px-3 py-1 rounded border font-bold hover:bg-red-50">Excluir</button>
                   </div>
               </div>
               
               <div class="mb-4 bg-gray-50 p-3 rounded-lg">
                   <div class="flex justify-between text-sm mb-1 font-mono text-gray-600">
                       <span>Atual: {{ formatMoney(m.valorAtual || 0) }}</span>
                       <span>Alvo: {{ formatMoney(m.valorAlvo) }}</span>
                   </div>
                   <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden border border-gray-300">
                      <div class="bg-blue-600 h-3 rounded-full transition-all duration-1000 ease-out" :style="{ width: calcPercent(m) + '%' }"></div>
                  </div>
                  <p class="text-right text-xs text-blue-600 font-bold mt-1">{{ calcPercent(m) }}%</p>
               </div>

               <div class="bg-blue-50 p-3 rounded-lg border border-blue-100">
                   <label class="text-xs font-bold text-gray-500 block mb-2">Investir do Saldo Disponível:</label>
                   <div class="flex items-center gap-3">
                       <input type="range" min="0" :max="props.saldo || 1000" step="10" v-model.number="tempInvestment[m.id]" class="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600">
                       
                       <span class="text-sm font-bold text-gray-900 bg-white px-2 py-1 rounded border min-w-[80px] text-center">
                           {{ formatMoney(tempInvestment[m.id] || 0) }}
                       </span>
                       
                       <button @click="investInMeta(m)" class="bg-green-500 text-white rounded-full p-2 hover:bg-green-600 hover:scale-105 transition shadow active:scale-95">
                           <i class="ph ph-check font-bold text-lg"></i>
                       </button>
                   </div>
               </div>
          </div>
      </div>
  </div>
</template>