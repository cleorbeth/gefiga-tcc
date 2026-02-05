<script setup>
import { ref, reactive } from 'vue';
import { db, auth } from '../firebase';
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";

const props = defineProps(['user', 'pontuacao']);
const emit = defineEmits(['back', 'points-added', 'update-display-name']);

const appId = 'gefiga_v1';
const novoNome = ref(props.user?.displayName || '');
const carregando = ref(false);

const atualizarPerfil = async () => {
    if (!novoNome.value.trim()) return;
    carregando.value = true;
    try {
        await updateProfile(auth.currentUser, {
            displayName: novoNome.value
        });
        
        // Em vez de mudar a prop, enviamos o novo nome para o pai
        emit('update-display-name', novoNome.value);
        
        alert("Nome atualizado com sucesso!");
    } catch (error) {
        alert("Erro ao atualizar nome: " + error.message);
    } finally {
        carregando.value = false;
    }
};

const resetarPontos = async () => {
    if (confirm("Tem certeza que deseja zerar sua pontuação? Esta ação não pode ser desfeita.")) {
        try {
            const userRef = doc(db, 'artifacts', appId, 'users', props.user.uid);
            await updateDoc(userRef, {
                pontuacao: 0
            });
            // O App.vue vai detectar a mudança via onSnapshot
            alert("Pontuação resetada!");
        } catch (error) {
            alert("Erro ao resetar: " + error.message);
        }
    }
};
</script>

<template>
    <div class="max-w-2xl mx-auto p-6">
        <div class="flex items-center gap-4 mb-8">
            <button @click="emit('back')" 
                class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition flex items-center gap-2">
                <i class="ph ph-arrow-left"></i>
                Voltar
            </button>
            
            <h2 class="text-2xl font-bold text-gray-800">Configurações da Conta</h2>
        </div>

        <div class="space-y-6">
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-3 mb-4">
                    <i class="ph ph-user-circle text-2xl text-indigo-600"></i>
                    <h3 class="font-bold text-gray-700">Perfil</h3>
                </div>
                <div class="flex gap-3">
                    <input 
                        v-model="novoNome" 
                        type="text" 
                        class="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black border-gray-300"
                        placeholder="Seu nome de exibição"
                    >
                    <button @click="atualizarPerfil" :disabled="carregando"
                        class="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
                        Salvar
                    </button>
                </div>
            </div>

            <div class="bg-red-50 p-6 rounded-xl border border-red-100">
                <div class="flex items-center gap-3 mb-4 text-red-700">
                    <i class="ph ph-warning-octagon text-2xl"></i>
                    <h3 class="font-bold">Zona de Perigo</h3>
                </div>
                <p class="text-sm text-red-600 mb-4">
                    Ao resetar os pontos, seu nível voltará ao 1 e seu histórico de conquistas no gráfico poderá ser afetado.
                </p>
                <button @click="resetarPontos" 
                    class="bg-white border border-red-200 text-red-600 px-6 py-2 rounded-lg font-bold hover:bg-red-600 hover:text-white transition">
                    Zerar Minha Pontuação
                </button>
            </div>
        </div>
    </div>
</template>