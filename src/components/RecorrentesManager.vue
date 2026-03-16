<script setup>
import { reactive, ref, onMounted } from 'vue';
import { db, auth } from '../firebase'; 
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

const props = defineProps(['uid']);
const emit = defineEmits(['back', 'notify']);

const appId = 'gefiga_v1';
const contas = ref([]);

const form = reactive({ 
    id: null,
    descricao: '', 
    valor: 0, 
    tipo: 'despesa', // 'despesa' ou 'receita'
    diaLancamento: 1 
});

const getSafeUid = () => props.uid || auth.currentUser?.uid;

// Busca as contas recorrentes em tempo real
onMounted(() => {
    const uid = getSafeUid();
    if (!uid) return;
    onSnapshot(collection(db, 'artifacts', appId, 'users', uid, 'recorrentes'), (snap) => {
        contas.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });
});

const saveConta = async () => {
    try {
        const uid = getSafeUid();
        const col = collection(db, 'artifacts', appId, 'users', uid, 'recorrentes');
        
        if (form.id) {
            // Se tem ID, estamos EDITANDO
            await updateDoc(doc(col, form.id), {
                descricao: form.descricao, 
                valor: form.valor,
                tipo: form.tipo,
                diaLancamento: form.diaLancamento
            });
            emit('notify', `Automação atualizada: ${form.descricao}`);
        } else {
            // Se NÃO tem ID, estamos CRIANDO
            await addDoc(col, { 
                descricao: form.descricao, 
                valor: form.valor,
                tipo: form.tipo,
                diaLancamento: form.diaLancamento,
                ultimoMes: -1, 
                ultimoAno: -1
            });
            emit('notify', `Conta recorrente salva: ${form.descricao}`);
        }
        
        resetForm();
    } catch (error) { alert("Erro: " + error.message); }
};

// Função para jogar os dados da conta selecionada para o formulário
const editConta = (conta) => {
    form.id = conta.id;
    form.descricao = conta.descricao;
    form.valor = conta.valor;
    form.tipo = conta.tipo;
    form.diaLancamento = conta.diaLancamento;
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola a página para o topo suavemente
};

const deleteConta = async (id) => {
    if(confirm("Parar lançamento automático desta conta?")) {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', getSafeUid(), 'recorrentes', id));
    }
};

const resetForm = () => {
    form.id = null; form.descricao = ''; form.valor = 0; form.tipo = 'despesa'; form.diaLancamento = 1;
};

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
</script>

<template>
    <div class="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in pb-20">
        <div class="flex items-center gap-4">
            <button @click="emit('back')" class="bg-white p-2 rounded-full shadow hover:bg-gray-50 text-gray-600 transition">
                <i class="ph-bold ph-arrow-left text-xl"></i>
            </button>
            <h1 class="text-2xl font-bold text-gray-800">Lançamentos Automáticos</h1>
        </div>

        <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-blue-800 text-sm">
            <i class="ph-fill ph-info text-2xl"></i>
            <p><strong>Como funciona:</strong> Contas cadastradas aqui serão lançadas automaticamente nas suas Receitas ou Despesas no dia escolhido assim que você abrir o sistema.</p>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100" :class="form.id ? 'border-indigo-300 ring-2 ring-indigo-50' : ''">
            <div v-if="form.id" class="mb-4 text-indigo-600 font-bold flex items-center gap-2">
                <i class="ph-bold ph-pencil-simple"></i> Editando Automação
            </div>
            
            <form @submit.prevent="saveConta" class="grid gap-4 md:grid-cols-2">
                <div class="md:col-span-2">
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Descrição da Conta</label>
                    <input v-model="form.descricao" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 font-medium" required placeholder="Ex: Conta de Luz / Salário">
                </div>
                
                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Valor Base (R$)</label>
                    <input v-model.number="form.valor" type="number" step="0.01" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 font-medium" required>
                </div>

                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Todo dia...</label>
                    <input v-model.number="form.diaLancamento" type="number" min="1" max="31" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 font-medium" required>
                </div>

                <div class="md:col-span-2 mt-2">
                    <div class="grid grid-cols-2 gap-4">
                        <label class="cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center transition-all" :class="form.tipo === 'receita' ? 'border-green-500 bg-green-50' : 'border-gray-200 grayscale opacity-70'">
                            <input type="radio" value="receita" v-model="form.tipo" class="hidden">
                            <span class="font-black text-gray-800">É uma Entrada (+ Salário)</span>
                        </label>
                        <label class="cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center transition-all" :class="form.tipo === 'despesa' ? 'border-red-500 bg-red-50' : 'border-gray-200 grayscale opacity-70'">
                            <input type="radio" value="despesa" v-model="form.tipo" class="hidden">
                            <span class="font-black text-gray-800">É uma Saída (- Conta)</span>
                        </label>
                    </div>
                </div>

                <div class="md:col-span-2 flex gap-3 mt-4 border-t border-gray-100 pt-4">
                    <button v-if="form.id" @click="resetForm" type="button" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                    <button type="submit" class="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                        {{ form.id ? 'Atualizar Automação' : 'Agendar Lançamento' }}
                    </button>
                </div>
            </form>
        </div>

        <div class="space-y-3">
            <div v-for="conta in contas" :key="conta.id" class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center" :class="conta.tipo === 'receita' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'">
                <div>
                    <span class="font-bold text-gray-800 block">{{ conta.descricao }}</span>
                    <span class="text-xs text-gray-500">Cai todo dia {{ conta.diaLancamento }}</span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-black" :class="conta.tipo === 'receita' ? 'text-green-600' : 'text-red-600'">{{ formatMoney(conta.valor) }}</span>
                    <div class="flex gap-2 ml-2">
                        <button @click="editConta(conta)" class="w-8 h-8 flex items-center justify-center bg-gray-100 text-indigo-600 rounded-lg hover:bg-indigo-50 transition"><i class="ph-bold ph-pencil-simple"></i></button>
                        <button @click="deleteConta(conta.id)" class="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition"><i class="ph-bold ph-trash"></i></button>
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