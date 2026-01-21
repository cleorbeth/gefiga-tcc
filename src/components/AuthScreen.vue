<script setup>
import { ref, reactive } from 'vue';
import { auth } from '../firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "firebase/auth";

const isRegistering = ref(false);
const loading = ref(false);
const errorMessage = ref('');

// Estado do formulário
const form = reactive({
    name: '',
    email: '',
    password: ''
});

// Função principal de autenticação
const handleAuth = async () => {
    loading.value = true;
    errorMessage.value = '';

    try {
        if (isRegistering.value) {
            const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
            await updateProfile(cred.user, { displayName: form.name });
        } else {
            await signInWithEmailAndPassword(auth, form.email, form.password);
        }
    } catch (error) {
        // SEGURANÇA: Se houver erro, limpamos qualquer resquício de login
        await signOut(auth);

        // TRATAMENTO DE ERROS DETALHADO
        console.error("Erro capturado:", error.code);
        let msg = "Ocorreu um erro inesperado. Tente novamente.";

        // Verificamos o código de erro oficial do Firebase para dar a resposta certa
        if (error.code === 'auth/invalid-credential') msg = "E-mail ou senha incorretos.";
        else if (error.code === 'auth/email-already-in-use') msg = "Este e-mail já está em uso.";
        else if (error.code === 'auth/weak-password') msg = "A senha é muito fraca (mínimo 6 caracteres).";
        else if (error.code === 'auth/network-request-failed') msg = "Conexão bloqueada. Verifique sua internet ou AdBlock.";
        else if (error.message.includes("network-error")) msg = "Erro de rede. Verifique se o Firebase está acessível.";
        errorMessage.value = msg;
    } finally {
        loading.value = false;
    }
};

const signInGoogle = async () => {
    errorMessage.value = '';
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (error) {
        // SEGURANÇA: Limpa sessão se o popup for fechado ou der erro
        await signOut(auth);

        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage.value = "O login foi cancelado porque a janela foi fechada.";
        } else {
            errorMessage.value = "Erro no Google: " + error.message;
        }
    }
};
</script>

<template>
    <div class="max-w-4xl mx-auto mt-10 bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col md:flex-row">

        <div
            class="md:w-1/2 bg-indigo-600 p-10 flex flex-col justify-center items-center text-white text-center relative overflow-hidden">
            <div class="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500 rounded-full opacity-50 blur-2xl"></div>
            <div class="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-400 rounded-full opacity-50 blur-2xl"></div>

            <i class="ph ph-coins text-8xl mb-6 text-yellow-300 drop-shadow-lg"></i>
            <h1 class="text-4xl font-bold mb-2 tracking-wide">GEFIGA</h1>
            <p class="text-indigo-100 text-lg mb-6">Gestão Financeira Gamificada</p>

            <div class="space-y-2 text-sm text-indigo-200">
                <p class="flex items-center gap-2 justify-center"><i class="ph ph-check-circle text-green-400"></i>
                    Controle seus gastos</p>
                <p class="flex items-center gap-2 justify-center"><i class="ph ph-trophy text-yellow-400"></i> Ganhe
                    conquistas</p>
                <p class="flex items-center gap-2 justify-center"><i class="ph ph-chart-line-up text-blue-300"></i>
                    Alcance suas metas</p>
            </div>
        </div>

        <div class="md:w-1/2 p-10 bg-white flex flex-col justify-center">
            <h2 class="text-3xl font-bold text-gray-800 mb-2">
                {{ isRegistering ? 'Criar Conta' : 'Bem-vindo de volta!' }}
            </h2>
            <p class="text-gray-500 mb-6">
                {{ isRegistering ? 'Preencha os dados para começar sua jornada.' : 'Insira suas credenciais para acessar.' }}
            </p>

            <transition name="fade">
                <div v-if="errorMessage"
                    class="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4 text-sm flex items-start gap-2">
                    <i class="ph ph-warning-circle text-lg mt-0.5"></i>
                    <span>{{ errorMessage }}</span>
                </div>
            </transition>

            <form @submit.prevent="handleAuth" class="space-y-5">
                <div v-if="isRegistering">
                    <label class="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                    <div class="relative">
                        <i class="ph ph-user absolute left-3 top-3 text-gray-400"></i>
                        <input v-model="form.name" type="text"
                            class="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                            placeholder="Seu nome" required>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Email</label>
                    <div class="relative">
                        <i class="ph ph-envelope absolute left-3 top-3 text-gray-400"></i>
                        <input v-model="form.email" type="email"
                            class="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                            placeholder="exemplo@email.com" required>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Senha</label>
                    <div class="relative">
                        <i class="ph ph-lock-key absolute left-3 top-3 text-gray-400"></i>
                        <input v-model="form.password" type="password"
                            class="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                            placeholder="••••••••" required minlength="6">
                    </div>
                </div>

                <button type="submit" :disabled="loading"
                    class="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed">
                    {{ loading ? 'Carregando...' : (isRegistering ? 'Cadastrar' : 'Entrar na Conta') }}
                </button>
            </form>

            <div class="relative my-6">
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-gray-200"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                    <span class="px-2 bg-white text-gray-500">Ou continue com</span>
                </div>
            </div>

            <button @click="signInGoogle" type="button"
                class="w-full bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2 font-medium">
                <i class="ph ph-google-logo text-xl text-red-500"></i> Google
            </button>

            <div class="mt-8 text-center border-t pt-4">
                <p class="text-sm text-gray-600">
                    {{ isRegistering ? 'Já tem uma conta?' : 'Novo por aqui?' }}
                    <span class="text-indigo-600 font-bold cursor-pointer hover:underline ml-1"
                        @click="isRegistering = !isRegistering">
                        {{ isRegistering ? 'Fazer Login' : 'Criar Conta Grátis' }}
                    </span>
                </p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>