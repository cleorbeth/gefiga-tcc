<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, onSnapshot, 
    updateDoc, increment, query, orderBy, limit, serverTimestamp } from "firebase/firestore";

// === IMPORTS DOS COMPONENTES ===
import NavBar from './components/NavBar.vue';
import AuthScreen from './components/AuthScreen.vue';
import DashboardHome from './components/DashboardHome.vue';
import ReceitasManager from './components/ReceitasManager.vue';
import DespesasManager from './components/DespesasManager.vue';
import MetasManager from './components/MetasManager.vue';

// === IMPORTS DE TERCEIROS ===
import confetti from 'canvas-confetti';

// === CLASSE PARA NÓ DA LISTA ENCADEADA ===
class LogNode {
    constructor(mensagem, pontos) {
        this.mensagem = mensagem;
        this.pontos = pontos;
        this.data = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        this.proximo = null; // O "ponteiro" para o próximo nó
    }
}

// === ESTADO GLOBAL ===
const user = ref(null);
const pontuacao = ref(0);
const currentView = ref('home');
const appId = 'gefiga_v1'; // Garanta que este ID é o mesmo usado antes

// Dados centralizados
const receitas = ref([]);
const despesas = ref([]);
const metas = ref([]);

// === CÁLCULO DO SALDO (Com correção de tipos) ===
const saldoGlobal = computed(() => {
    // O Number() garante que não dê erro se vier como texto do banco
    const totalRec = receitas.value.reduce((acc, r) => acc + Number(r.valor || 0), 0);
    const totalDesp = despesas.value.reduce((acc, d) => acc + Number(d.valor || 0), 0);
    const totalInvestidoMetas = metas.value.reduce((acc, m) => acc + Number(m.valorAtual || 0), 0);

    return totalRec - totalDesp - totalInvestidoMetas;
});

// Lista Encadeada para Log de Conquistas
const logConquistas = ref(null); // 
const toastAtivo = ref(false);
const toastMsg = ref('');

// Define o que esse componente recebe do pai (App.vue)
const props = defineProps({
    user: Object,
    pontuacao: Number,
    currentView: String,
    nivel: Number,
    progressoNivel: Number
});

// Define os eventos que esse componente envia para o pai
const emit = defineEmits(['navigate', 'logout', 'open-history']);

// Lógica de Nivelamento
const nivel = computed(() => Math.floor((props.pontuacao || 0) / 100) + 1);
const progressoNivel = computed(() => (props.pontuacao || 0) % 100);

// === LÓGICA DE BANCO DE DADOS ===
onMounted(() => {
    onAuthStateChanged(auth, async (u) => {
        user.value = u;
        if (u) {
            // Carregar Pontuação
            const userRef = doc(db, 'artifacts', appId, 'users', u.uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
                pontuacao.value = snap.data().pontuacao || 0;
            } else {
                await setDoc(userRef, { email: u.email, pontuacao: 0 });
            }

            // Ligar os "ouvidos" no banco
            setupListeners(u.uid);
        } else {
            // Limpar tudo ao sair
            receitas.value = [];
            despesas.value = [];
            metas.value = [];
        }
    });
});

// Configura os listeners do Firestore para atualizações em tempo real
const setupListeners = (uid) => {
    const basePath = ['artifacts', appId, 'users', uid];

    // Receitas
    onSnapshot(collection(db, ...basePath, 'receitas'), (snap) => {
        receitas.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });
    // Despesas
    onSnapshot(collection(db, ...basePath, 'despesas'), (snap) => {
        despesas.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });
    // Metas
    onSnapshot(collection(db, ...basePath, 'metas'), (snap) => {
        metas.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });
    onSnapshot(query(collection(db, ...basePath, 'conquistas'), orderBy('timestamp', 'desc'), limit(10)), (snap) => {
        // 1. Começamos com a lista vazia na memória
        logConquistas.value = null;
        let ultimoNoCriado = null;

        // 2. Percorremos os documentos que vieram do banco (já ordenados do mais novo para o mais antigo)
        snap.docs.forEach((docSnap) => {
            const dados = docSnap.data();
            const novoNo = new LogNode(dados.mensagem, dados.pontos);
            novoNo.data = dados.data; // Mantém a hora original salva no banco

            // 3. A mágica da Lista Encadeada:
            if (logConquistas.value === null) {
                // Se for o primeiro item do banco (o mais recente), ele vira a "cabeça" da lista
                logConquistas.value = novoNo;
            } else {
                // Se já temos uma cabeça, o nó anterior aponta para este novo nó
                ultimoNoCriado.proximo = novoNo;
            }
            ultimoNoCriado = novoNo;
        });
    });
};

const handleLogout = () => {
    signOut(auth);
    currentView.value = 'home';
};

// Adiciona pontos com lógica de lista encadeada
const handleAddPoints = async (valor = 1, motivo = "Ação realizada") => {
    if (!user.value) return;

    // Lógica visual do Toast
    toastMsg.value = `+${valor} pts: ${motivo}`;
    toastAtivo.value = true;
    setTimeout(() => toastAtivo.value = false, 3000);

    // Lógica da Lista Encadeada (Inserção no Início - O(1))
    const novoLog = new LogNode(motivo, valor);
    novoLog.proximo = logConquistas.value; // O novo nó aponta para o antigo topo
    logConquistas.value = novoLog; // A cabeça da lista agora é o novo nó

    // PERSISTÊNCIA: Salva a conquista no Firebase
    const conquistasCol = collection(db, 'artifacts', appId, 'users', user.value.uid, 'conquistas');
    await addDoc(conquistasCol, {
        mensagem: motivo,
        pontos: valor,
        data: new Date().toLocaleTimeString('pt-BR'),
        timestamp: serverTimestamp() // Importante para ordenar depois
    });

    // Atualização da pontuação e Firebase
    pontuacao.value += valor;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.value.uid), {
        pontuacao: increment(valor)
    });
};

const navigateTo = (viewName) => {
    currentView.value = viewName;
};

// ALGORITMO DE PERCURSO DE LISTA ENCADEADA
const historyArray = computed(() => {
    const tempArray = [];
    let current = logConquistas.value; // Começa no topo

    while (current !== null) {
        tempArray.push({
            mensagem: current.mensagem,
            pontos: current.pontos,
            data: current.data
        });
        current = current.proximo; // O pulo para o próximo nó (o segredo da lista)
    }
    return tempArray;
});

const showHistory = ref(false);

// O VIGIA (Observer Pattern)
watch(nivel, (novoNivel, nivelAntigo) => {
    // Só dispara se o nível REALMENTE subiu (evita disparar ao carregar o app)
    if (nivelAntigo !== undefined && novoNivel > nivelAntigo) {
        dispararCelebracao();
    }
});

const dispararCelebracao = () => {
    // Configuração do "tiro" de confetes
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#fbbf24', '#22c55e'] // Cores do seu projeto (Índigo, Amarelo, Verde)
    });

    // Se quiser um som, você pode carregar um áudio discreto aqui
    const audio = new Audio('/level-up.mp3'); // O arquivo deve estar na pasta 'public'
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Áudio bloqueado pelo navegador"));
};
</script>

<template>
    <div class="min-h-screen bg-gray-100 text-gray-800 flex flex-col">

        <NavBar v-if="user" :user="user" :pontuacao="pontuacao" @navigate="navigateTo" @logout="handleLogout"
            @open-history="showHistory = true" />

        <div v-if="showHistory" @click="showHistory = false"
            class="fixed inset-0 bg-black/50 z-[60] transition-opacity"></div>

        <aside :class="showHistory ? 'translate-x-0' : 'translate-x-full'"
            class="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-[70] transition-transform duration-300 ease-in-out p-6 overflow-y-auto">
            <div class="flex justify-between items-center mb-6 border-b pb-4">
                <h3 class="text-xl font-bold text-indigo-900 flex items-center gap-2">
                    <i class="ph ph-scroll"></i> Histórico
                </h3>
                <button @click="showHistory = false"
                    class="text-gray-400 hover:text-red-500 transition text-2xl">&times;</button>
            </div>

            <div v-if="historyArray.length === 0" class="text-center py-10 text-gray-400">
                <i class="ph ph-ghost text-5xl mb-2"></i>
                <p>Nenhuma conquista ainda nesta sessão.</p>
            </div>

            <div class="space-y-4">
                <div v-for="(log, index) in historyArray" :key="index"
                    class="bg-indigo-50 p-4 rounded-xl border-l-4 border-indigo-500 relative overflow-hidden group">
                    <div class="flex justify-between items-start">
                        <span class="text-xs font-bold text-indigo-400">{{ log.data }}</span>
                        <span class="text-green-600 font-black text-sm">+{{ log.pontos }}</span>
                    </div>
                    <p class="text-indigo-900 font-semibold mt-1">{{ log.mensagem }}</p>
                </div>
            </div>
        </aside>

        <main class="container mx-auto px-4 py-6 flex-grow">

            <AuthScreen v-if="!user" />

            <div v-else>
                <DashboardHome v-if="currentView === 'home'" :uid="user.uid" :saldo="saldoGlobal"
                    :resumo="{ receitas, despesas, metas }" @navigate="navigateTo" />

                <ReceitasManager v-if="currentView === 'receitas'" :uid="user.uid" @back="navigateTo('home')"
                    @points-added="handleAddPoints" />

                <DespesasManager v-if="currentView === 'despesas'" :uid="user.uid" :saldo="saldoGlobal"
                    @back="navigateTo('home')" @points-added="handleAddPoints" />

                <MetasManager v-if="currentView === 'metas'" :uid="user.uid" :saldo="saldoGlobal"
                    @back="navigateTo('home')" @points-added="handleAddPoints" />
            </div>
        </main>

        <transition name="pop">

            <div v-if="toastAtivo"
                class="fixed bottom-8 right-8 bg-yellow-400 text-indigo-950 p-4 rounded-2xl shadow-2xl flex items-center gap-3 border-b-4 border-yellow-600 z-[100] animate-bounce">

                <div class="bg-yellow-500 p-2 rounded-full">
                    <i class="ph-fill ph-crown text-2xl"></i>
                </div>

                <div class="flex flex-col">
                    <span class="text-xs font-black uppercase tracking-widest opacity-70">Conquista!</span>
                    <span class="font-bold text-lg leading-tight">{{ toastMsg }}</span>
                </div>
            </div>
        </transition>
    </div>
</template>

<style scoped>
.slide-fade-enter-active {
    transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
    transition: all 0.5s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
    transform: translateX(20px);
    opacity: 0;
}
</style>