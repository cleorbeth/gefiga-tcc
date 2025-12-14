<script setup>
import { ref, computed, onMounted } from 'vue';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, onSnapshot, updateDoc, increment } from "firebase/firestore";

// === IMPORTS DOS COMPONENTES ===
import NavBar from './components/NavBar.vue';
import AuthScreen from './components/AuthScreen.vue';
import DashboardHome from './components/DashboardHome.vue';
import ReceitasManager from './components/ReceitasManager.vue';
import DespesasManager from './components/DespesasManager.vue';
import MetasManager from './components/MetasManager.vue';

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
};

const handleLogout = () => {
    signOut(auth);
    currentView.value = 'home';
};

const handleAddPoints = async () => {
    if(!user.value) return;
    pontuacao.value++;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.value.uid), {
        pontuacao: increment(1)
    });
};

const navigateTo = (viewName) => {
    currentView.value = viewName;
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 text-gray-800 flex flex-col">
      
      <NavBar 
        v-if="user" 
        :user="user" 
        :pontuacao="pontuacao" 
        @navigate="navigateTo" 
        @logout="handleLogout"
      />

      <main class="container mx-auto px-4 py-6 flex-grow">
          
          <AuthScreen v-if="!user" />

          <div v-else>
              <DashboardHome 
                  v-if="currentView === 'home'"
                  :uid="user.uid"
                  :saldo="saldoGlobal"
                  :resumo="{ receitas, despesas, metas }" 
                  @navigate="navigateTo"
              />

              <ReceitasManager 
                  v-if="currentView === 'receitas'"
                  :uid="user.uid"
                  @back="navigateTo('home')"
                  @points-added="handleAddPoints"
              />

              <DespesasManager 
                  v-if="currentView === 'despesas'"
                  :uid="user.uid"
                  :saldo="saldoGlobal" 
                  @back="navigateTo('home')"
                  @points-added="handleAddPoints"
              />

              <MetasManager 
                  v-if="currentView === 'metas'"
                  :uid="user.uid"
                  :saldo="saldoGlobal"
                  @back="navigateTo('home')"
                  @points-added="handleAddPoints"
              />
          </div>
      </main>
  </div>
</template>