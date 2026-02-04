<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, onSnapshot, 
    updateDoc, increment, query, orderBy, limit, serverTimestamp, addDoc } from "firebase/firestore";

// === IMPORTS DOS COMPONENTES ===
import NavBar from './components/NavBar.vue';
import AuthScreen from './components/AuthScreen.vue';
import DashboardHome from './components/DashboardHome.vue';
import ReceitasManager from './components/ReceitasManager.vue';
import DespesasManager from './components/DespesasManager.vue';
import MetasManager from './components/MetasManager.vue';
import confetti from 'canvas-confetti';

// === CONFIGURAÇÃO ===
const appId = 'gefiga_v1'; 

// === ESTADO GLOBAL ===
const user = ref(null);
const pontuacao = ref(0);
const currentView = ref('home');
const receitas = ref([]);
const despesas = ref([]);
const metas = ref([]);
const carregando = ref(true);

// Estado Visual
const showHistory = ref(false);
const toastAtivo = ref(false);
const toastMsg = ref('');

// === LISTA ENCADEADA (Lógica Acadêmica) ===
// Mantemos a estrutura de nó para cumprir requisito de TCC
class LogNode {
    constructor(data, id) {
        this.id = id;
        this.mensagem = data.descricao || data.mensagem; // Aceita ambos os campos
        this.pontos = data.pontos;
        // Se vier timestamp do firebase, converte. Se não, usa hora atual.
        //this.data = data.data?.toDate ? data.data.toDate().toLocaleTimeString('pt-BR') : (data.hora || 'Agora'); 
        this.data = data.data?.toDate ? data.data.toDate().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : 'Agora';
        this.proximo = null;
    }
}

const headHistorico = ref(null); // Cabeça da Lista Encadeada

// Converte a Lista Encadeada em Array para o v-for do Template
const historyArray = computed(() => {
    const arr = [];
    let current = headHistorico.value;
    while (current) {
        arr.push(current);
        current = current.proximo;
    }
    return arr;
});

// === CÁLCULO DO SALDO ===
const saldoGlobal = computed(() => {
    const totalRec = receitas.value.reduce((acc, r) => acc + Number(r.valor || 0), 0);
    const totalDesp = despesas.value.reduce((acc, d) => acc + Number(d.valor || 0), 0);
    // Nota: Metas geralmente não subtraem do saldo disponível até que se invista nelas.
    // Se 'valorAtual' for dinheiro guardado, talvez deva subtrair. Ajuste conforme sua regra de negócio.
    // Por enquanto, saldo disponível costuma ser Receita - Despesa.
    return totalRec - totalDesp; 
});

// === AÇÕES ===
const handleLogout = async () => {
    await signOut(auth);
    currentView.value = 'home'; 
    receitas.value = []; despesas.value = []; metas.value = [];
};

const navigateTo = (viewName) => {
    currentView.value = viewName;
};

const handleAddPoints = async (pts, descricao) => {
    if (!user.value) return;

    // Garante que pts é um número, para evitar o bug do "24Registrou..."
    const pontosNumericos = Number(pts);

    // Feedback Visual Imediato
    toastMsg.value = `+${pontosNumericos} pts: ${descricao}`;
    toastAtivo.value = true;
    setTimeout(() => toastAtivo.value = false, 3000);
    
    // Efeito Sonoro/Visual
    if (pontosNumericos > 0) dispararCelebracao();

    try {
        // 1. Salva no Firestore
        const conquistasRef = collection(db, "artifacts", appId, "users", user.value.uid, "conquistas");

        await addDoc(conquistasRef, {
            descricao: descricao,
            pontos: pontosNumericos,
            data: serverTimestamp()
        });

        // 2. Atualiza Pontuação Global
        const userRef = doc(db, "artifacts", appId, "users", user.value.uid);
        await updateDoc(userRef, { pontuacao: increment(pontosNumericos) });
        
        // Atualiza localmente para feedback instantâneo (opcional, pois o listener já fará isso)
        pontuacao.value += pontosNumericos;

    } catch (e) {
        console.error("Erro ao salvar pontos:", e);
    }
};

const dispararCelebracao = () => {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#4f46e5', '#fbbf24']
    });
};

// === LISTENERS DO FIREBASE ===
let unsubscribeHistory = null;

const setupListeners = (uid) => {
    carregando.value = true;
    
    // Variáveis de controle
    let checkReceitas = false;
    let checkDespesas = false;
    let checkMetas = false;

    // Função que verifica se tudo terminou (independente de erro ou sucesso)
    const checkDone = () => {
        if (checkReceitas && checkDespesas && checkMetas) {
            carregando.value = false;
        }
    };

    // === CORREÇÃO 2: Caminhos explícitos com 5 segmentos ===
    // Caminho: artifacts (1) -> gefiga_v1 (2) -> users (3) -> UID (4) -> receitas (5) = ÍMPAR (Correto!)

    // 1. Receitas
    onSnapshot(collection(db, 'artifacts', appId, 'users', uid, 'receitas'), (snap) => {
        receitas.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        checkReceitas = true; 
        checkDone();
    }, (error) => { 
        console.error("Erro ao carregar Receitas:", error); 
        checkReceitas = true; // Marca como feito para liberar o loading
        checkDone(); 
    });

    // 2. Despesas
    onSnapshot(collection(db, 'artifacts', appId, 'users', uid, 'despesas'), (snap) => {
        despesas.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        checkDespesas = true; 
        checkDone();
    }, (error) => { 
        console.error("Erro ao carregar Despesas:", error); 
        checkDespesas = true; 
        checkDone(); 
    });

    // 3. Metas
    onSnapshot(collection(db, 'artifacts', appId, 'users', uid, 'metas'), (snap) => {
        metas.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        checkMetas = true; 
        checkDone();
    }, (error) => { 
        console.error("Erro ao carregar Metas:", error); 
        checkMetas = true; 
        checkDone(); 
    });

    // 4. Histórico (Conquistas)
    if (unsubscribeHistory) unsubscribeHistory();
    
    // Nota: Aqui também usamos o caminho completo para a query
    const qHistory = query(
        collection(db, "artifacts", appId, "users", uid, "conquistas"), 
        orderBy("data", "desc"), 
        limit(20)
    );

    unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
        headHistorico.value = null;
        let tail = null;
        snapshot.docs.forEach(doc => {
            const node = new LogNode(doc.data(), doc.id);
            if (!headHistorico.value) { headHistorico.value = node; tail = node; } 
            else { tail.proximo = node; tail = node; }
        });
    }, (e) => console.error("Erro Histórico:", e));
};

/*
const setupListeners = (uid) => {
    carregando.value = true;
    const baseRef = collection(db, 'artifacts', appId, 'users', uid);

    // Variáveis de controle para saber quando tudo terminou
    let carregouReceitas = false;
    let carregouDespesas = false;
    let carregouMetas = false;

    // Função auxiliar para verificar se podemos liberar a tela
    const verificarFimCarregamento = () => {
        if (carregouReceitas && carregouDespesas && carregouMetas) {
            carregando.value = false;
        }
    };

    // 1. Receitas
    onSnapshot(collection(baseRef, 'receitas'), (snap) => {
        receitas.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        carregouReceitas = true;
        verificarFimCarregamento();
    }, (error) => {
        console.error("Erro em Receitas:", error);
        carregouReceitas = true; // Marca como "concluído" (mesmo com erro) para não travar a tela
        verificarFimCarregamento();
    });

    // 2. Despesas
    onSnapshot(collection(baseRef, 'despesas'), (snap) => {
        despesas.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        carregouDespesas = true;
        verificarFimCarregamento();
    }, (error) => {
        console.error("Erro em Despesas:", error);
        carregouDespesas = true;
        verificarFimCarregamento();
    });

    // 3. Metas
    onSnapshot(collection(baseRef, 'metas'), (snap) => {
        metas.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        carregouMetas = true;
        verificarFimCarregamento();
    }, (error) => {
        console.error("Erro em Metas:", error);
        carregouMetas = true;
        verificarFimCarregamento();
    });

    // 4. Histórico (Este não trava o carregamento principal)
    if (unsubscribeHistory) unsubscribeHistory();
    const qHistory = query(collection(baseRef, "conquistas"), orderBy("data", "desc"), limit(20));

    unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
        headHistorico.value = null;
        let tail = null;
        snapshot.docs.forEach(doc => {
            const node = new LogNode(doc.data(), doc.id);
            if (!headHistorico.value) { headHistorico.value = node; tail = node; } 
            else { tail.proximo = node; tail = node; }
        });
    }, (error) => {
        console.error("Erro no Histórico:", error); // Apenas loga o erro
    });
};
*/

// === CICLO DE VIDA ===
onMounted(() => {
    onAuthStateChanged(auth, async (u) => {
        user.value = u;
        
        if (u) {
            // Timeout de segurança: Se travar o carregamento, libera em 4s
            setTimeout(() => { if(carregando.value) carregando.value = false; }, 4000);

            // === CORREÇÃO AQUI: OUVINTE EM TEMPO REAL DO PERFIL ===
            const userRef = doc(db, 'artifacts', appId, 'users', u.uid);
            
            // Em vez de getDoc (uma vez), usamos onSnapshot (sempre atualizado)
            onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    const dados = docSnap.data();
                    // Forçamos ser número para evitar bugs visuais
                    pontuacao.value = Number(dados.pontuacao) || 0;
                } else {
                    // Se é o primeiro acesso real, cria o documento
                    setDoc(userRef, { email: u.email, pontuacao: 0 });
                    pontuacao.value = 0;
                }
            }, (error) => {
                console.error("Erro ao buscar pontuação:", error);
            });
            
            // Inicia os ouvintes das listas (Receitas, Metas, etc)
            setupListeners(u.uid);
        } else {
            // Limpeza ao sair
            if (unsubscribeHistory) unsubscribeHistory();
            receitas.value = [];
            despesas.value = [];
            metas.value = [];
            pontuacao.value = 0;
        }
    });
    // SEGURANÇA EXTRA: Se em 5 segundos nada carregar, força a liberação da tela
    setTimeout(() => {
        if (carregando.value) {
            console.warn("Tempo limite de carregamento excedido. Forçando abertura.");
            carregando.value = false;
        }
    }, 5000); // 5000ms = 5 segundos
});
</script>

<template>
    <div class="min-h-screen bg-gray-100 text-gray-800 flex flex-col font-sans">
        
        <NavBar v-if="user" :user="user" :pontuacao="pontuacao" 
            @navigate="navigateTo" 
            @logout="handleLogout"
            @open-history="showHistory = true" 
        />

        <div v-if="showHistory" @click="showHistory = false" class="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"></div>
        
        <aside :class="showHistory ? 'translate-x-0' : 'translate-x-full'"
            class="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] transition-transform duration-300 ease-in-out p-6 overflow-y-auto border-l border-gray-100">
            
            <div class="flex justify-between items-center mb-8">
                <h3 class="text-2xl font-bold text-indigo-900 flex items-center gap-3">
                    <div class="bg-indigo-100 p-2 rounded-lg"><i class="ph-fill ph-scroll text-indigo-600"></i></div>
                    Histórico
                </h3>
                <button @click="showHistory = false" class="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition text-gray-500">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>

            <div class="space-y-4">
                <div v-if="historyArray.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400 opacity-60">
                    <i class="ph ph-ghost text-6xl mb-4"></i>
                    <p>Nenhuma conquista ainda...</p>
                </div>

                <div v-for="log in historyArray" :key="log.id" 
                    class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4 group">
                    
                    <div class="p-3 rounded-xl transition-transform group-hover:scale-110"
                         :class="log.pontos < 0 ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'">
                        <i :class="log.pontos < 0 ? 'ph-fill ph-warning-circle' : 'ph-fill ph-trophy'" class="text-xl"></i>
                    </div>
                    
                    <div class="flex-1">
                        <div class="flex justify-between items-center mb-1">
                            <span class="font-bold text-gray-800 text-sm leading-tight">{{ log.mensagem }}</span>
                            <span class="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap"
                                :class="log.pontos < 0 ? 'bg-red-100 text-red-700' : 'bg-green-50 text-green-600'">
                                {{ log.pontos > 0 ? '+' : '' }}{{ log.pontos }}
                            </span>
                        </div>
                        <p class="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{{ log.data }}</p>
                    </div>
                </div>
            </div>
        </aside>

        <main class="container mx-auto px-4 py-8 flex-grow">
            <AuthScreen v-if="!user" />

            <div v-else>
                <div v-if="carregando" class="flex justify-center items-center py-20">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>

                <div v-else>
                    <DashboardHome v-if="currentView === 'home'" :uid="user.uid" :saldo="saldoGlobal"
                        :resumo="{ receitas, despesas, metas }" @navigate="navigateTo" />

                    <ReceitasManager v-if="currentView === 'receitas'" :uid="user.uid" 
                        :listaReceitas="receitas" 
                        @back="navigateTo('home')" @points-added="handleAddPoints" />

                    <DespesasManager v-if="currentView === 'despesas'" :uid="user.uid" 
                        :saldo="saldoGlobal" :listaDespesas="despesas"
                        @back="navigateTo('home')" @points-added="handleAddPoints" />

                    <MetasManager v-if="currentView === 'metas'" :uid="user.uid" 
                        :saldo="saldoGlobal" :listaMetas="metas"
                        @back="navigateTo('home')" @points-added="handleAddPoints" />
                </div>
            </div>
        </main>

        <transition name="slide-fade">
            <div v-if="toastAtivo"
                class="fixed bottom-10 right-4 md:right-10 px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-4 border-l-4 max-w-sm"
                :class="toastMsg.includes('-') ? 'bg-red-900 border-red-400 text-white' : 'bg-indigo-900 border-yellow-400 text-white'">
                
                <div class="p-2 rounded-full shadow-lg"
                     :class="toastMsg.includes('-') ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-yellow-400 text-indigo-900 shadow-yellow-400/20'">
                    <i :class="toastMsg.includes('-') ? 'ph-fill ph-thumbs-down' : 'ph-fill ph-crown'" class="text-xl"></i>
                </div>
                
                <div>
                    <p class="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                       :class="toastMsg.includes('-') ? 'text-red-200' : 'text-indigo-300'">
                       {{ toastMsg.includes('-') ? 'Atenção' : 'Nova Conquista' }}
                    </p>
                    <p class="font-bold text-sm leading-tight">{{ toastMsg }}</p>
                </div>
            </div>
        </transition>
    </div>
</template>

<style scoped>
/* Animação suave para o Toast */
.slide-fade-enter-active,
.slide-fade-leave-active {
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
    transform: translateY(20px);
    opacity: 0;
}
</style>