<script setup>
import { ref, reactive } from 'vue';
import { db, auth } from '../firebase';
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { doc, collection, getDocs, writeBatch, updateDoc } from "firebase/firestore";

const props = defineProps(['user']);
const emit = defineEmits(['back', 'notify']);

const appId = 'gefiga_v1';
const novoNome = ref(props.user?.displayName || '');
const carregando = ref(false);
const processandoReset = ref(false);
const fileInput = ref(null); // Referência para o input invisível

// --- ESTADO DO EDITOR DE IMAGEM ---
const mostrarEditor = ref(false);
const imagemParaEditar = ref(null); // URL temporária da imagem crua
const editorConfig = reactive({
    escala: 1,
    posX: 0,
    posY: 0,
    arrastando: false,
    inicioX: 0,
    inicioY: 0
});

// --- LÓGICA DE AVATAR HÍBRIDO ---
const seeds = ['Felix', 'Aneka', 'Zoe', 'Caleb', 'Liam', 'Molly', 'Buddy', 'Ginger'];
const estiloAvatar = 'adventurer'; 
const avatarSelecionado = ref(props.user?.photoURL || '');

// Gera URL do DiceBear
const getAvatarUrl = (seed) => `https://api.dicebear.com/9.x/${estiloAvatar}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

// Opção A: Escolher da Lista
const selecionarAvatar = (seed) => {
    avatarSelecionado.value = getAvatarUrl(seed);
};

// Opção B: Upload de Arquivo Próprio
const acionarUpload = () => {
    fileInput.value.click(); // Simula o clique no input escondido
};

const aoEscolherArquivo = (event) => {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    if (arquivo.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 5MB.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        // Carrega a imagem crua e abre o editor
        imagemParaEditar.value = e.target.result;
        
        // Reseta configurações do editor
        editorConfig.escala = 1;
        editorConfig.posX = 0;
        editorConfig.posY = 0;
        mostrarEditor.value = true;
    };
    reader.readAsDataURL(arquivo);
};

const iniciarArrasto = (e) => {
    e.preventDefault();
    editorConfig.arrastando = true;
    // Suporta Mouse ou Toque
    const clienteX = e.touches ? e.touches[0].clientX : e.clientX;
    const clienteY = e.touches ? e.touches[0].clientY : e.clientY;
    
    editorConfig.inicioX = clienteX - editorConfig.posX;
    editorConfig.inicioY = clienteY - editorConfig.posY;
};

const arrastar = (e) => {
    if (!editorConfig.arrastando) return;
    e.preventDefault();
    
    const clienteX = e.touches ? e.touches[0].clientX : e.clientX;
    const clienteY = e.touches ? e.touches[0].clientY : e.clientY;

    editorConfig.posX = clienteX - editorConfig.inicioX;
    editorConfig.posY = clienteY - editorConfig.inicioY;
};

const pararArrasto = () => {
    editorConfig.arrastando = false;
};

const confirmarCorte = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Tamanho final da imagem de perfil (300x300 é um bom equilíbrio)
    const tamanhoFinal = 300;
    canvas.width = tamanhoFinal;
    canvas.height = tamanhoFinal;

    const img = new Image();
    img.src = imagemParaEditar.value;
    
    img.onload = () => {
        // Preenche fundo (caso a imagem seja transparente)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, tamanhoFinal, tamanhoFinal);

        // A mágica: Desenha a imagem baseada na posição do editor
        // Precisamos converter a posição visual (px da tela) para a posição real no canvas
        // O container visual tem 256px. O canvas tem 300px. Fator = 300/256 ≈ 1.17
        const fator = tamanhoFinal / 256; 

        ctx.drawImage(
            img, 
            editorConfig.posX * fator, 
            editorConfig.posY * fator, 
            img.width * editorConfig.escala * fator, 
            img.height * editorConfig.escala * fator
        );

        // Salva e fecha
        avatarSelecionado.value = canvas.toDataURL('image/jpeg', 0.9);
        mostrarEditor.value = false;
        imagemParaEditar.value = null; // Limpa memória
    };
};

// --- SALVAR TUDO ---
const atualizarPerfil = async () => {
    if (!novoNome.value.trim()) return;
    carregando.value = true;
    
    try {
        // Atualiza no Auth (Login)
        await updateProfile(auth.currentUser, {
            displayName: novoNome.value,
            photoURL: avatarSelecionado.value
        });

        // Atualiza no Firestore (Banco de Dados) para garantir sincronia
        const userRef = doc(db, 'artifacts', appId, 'users', props.user.uid);
        await updateDoc(userRef, {
            photoURL: avatarSelecionado.value
        });
        
        emit('notify', 'Perfil atualizado com sucesso!');
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar (Imagem muito grande? Tente uma menor).");
    } finally {
        carregando.value = false;
    }
};

// --- (O RESTO DO CÓDIGO PERMANECE IGUAL: EXPORTAR, ZERAR, SENHA) ---
const enviarEmailSenha = async () => {
    try {
        await sendPasswordResetEmail(auth, props.user.email);
        emit('notify', `Link enviado para ${props.user.email}`);
    } catch (e) { alert("Erro: " + e.message); }
};

const exportarDados = async () => {
    try {
        const uid = props.user.uid;
        const dados = { exportado_em: new Date().toISOString(), receitas: [], despesas: [], metas: [] };
        
        const recSnap = await getDocs(collection(db, 'artifacts', appId, 'users', uid, 'receitas'));
        const despSnap = await getDocs(collection(db, 'artifacts', appId, 'users', uid, 'despesas'));
        const metaSnap = await getDocs(collection(db, 'artifacts', appId, 'users', uid, 'metas'));

        recSnap.forEach(d => dados.receitas.push(d.data()));
        despSnap.forEach(d => dados.despesas.push(d.data()));
        metaSnap.forEach(d => dados.metas.push(d.data()));

        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_gefiga.json`;
        a.click();
        emit('notify', 'Backup gerado!');
    } catch (e) { alert("Erro: " + e.message); }
};

const zerarTudo = async (apenasPontos = true) => {
    if (!confirm(apenasPontos ? "Zerar pontos?" : "APAGAR TUDO?")) return;
    processandoReset.value = true;
    try {
        const uid = props.user.uid;
        const batch = writeBatch(db);
        batch.update(doc(db, 'artifacts', appId, 'users', uid), { pontuacao: 0 });

        if (!apenasPontos) {
            const cols = ['receitas', 'despesas', 'metas', 'conquistas'];
            for (const c of cols) {
                const snap = await getDocs(collection(db, 'artifacts', appId, 'users', uid, c));
                snap.forEach(d => batch.delete(d.ref));
            }
        }
        await batch.commit();
        emit('notify', 'Feito!');
        if(!apenasPontos) window.location.reload();
    } catch (e) { alert("Erro: " + e.message); } finally { processandoReset.value = false; }
};

const abrirEnquete = () => window.open('https://forms.google.com/', '_blank');
</script>

<template>
   <div class="max-w-3xl mx-auto p-6 space-y-8 animate-fade-in pb-20">

        <div class="flex items-center gap-4">
            <button @click="emit('back')"
                class="bg-white p-2 rounded-full shadow hover:bg-gray-50 text-gray-600 transition">
                <i class="ph-bold ph-arrow-left text-xl"></i>
            </button>
            <h1 class="text-2xl font-bold text-gray-800">Ajustes</h1>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 class="font-bold text-gray-700 mb-6 flex items-center gap-2">
                <i class="ph-fill ph-identification-card text-indigo-600"></i> Identidade Visual
            </h3>

            <div class="flex flex-col md:flex-row gap-8">
                <div class="flex flex-col items-center gap-3">
                    <div class="relative group cursor-pointer" @click="acionarUpload">
                        <div
                            class="w-28 h-28 rounded-full border-4 border-indigo-100 overflow-hidden bg-gray-50 shadow-inner relative">
                            <img v-if="avatarSelecionado" :src="avatarSelecionado" class="w-full h-full object-cover">
                            <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
                                <i class="ph-fill ph-user text-5xl"></i>
                            </div>
                            <div
                                class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white">
                                <i class="ph-bold ph-camera text-2xl"></i>
                            </div>
                        </div>
                        <div
                            class="absolute bottom-0 right-0 bg-indigo-600 text-white p-1.5 rounded-full border-2 border-white shadow-sm group-hover:scale-110 transition">
                            <i class="ph-bold ph-pencil-simple"></i>
                        </div>
                    </div>
                    <input type="file" ref="fileInput" @change="aoEscolherArquivo" accept="image/*" class="hidden">
                    <p class="text-[10px] font-bold text-gray-400 text-center w-32">Clique para ajustar sua foto</p>
                </div>

                <div class="flex-1 space-y-4">
                    <div>
                        <label class="text-xs font-bold text-gray-500 uppercase mb-2 block">Avatares da Jornada</label>
                        <div class="grid grid-cols-4 sm:grid-cols-8 gap-2">
                            <button v-for="seed in seeds" :key="seed" @click="selecionarAvatar(seed)"
                                class="w-10 h-10 rounded-full border-2 hover:scale-110 transition overflow-hidden bg-gray-50"
                                :class="avatarSelecionado === getAvatarUrl(seed) ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-transparent'">
                                <img :src="getAvatarUrl(seed)" class="w-full h-full">
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Nome de Exibição</label>
                        <div class="flex gap-2">
                            <input v-model="novoNome" type="text"
                                class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 text-gray-900 font-medium">
                            <button @click="atualizarPerfil" :disabled="carregando"
                                class="bg-indigo-600 text-white px-6 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition whitespace-nowrap">
                                {{ carregando ? '...' : 'Salvar' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 class="font-bold text-gray-700 mb-4 flex items-center gap-2"><i
                        class="ph-fill ph-shield-check text-green-600"></i> Segurança</h3>
                <button @click="enviarEmailSenha" class="text-sm font-bold text-indigo-600 hover:underline">Redefinir
                    senha</button>
            </div>
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 class="font-bold text-gray-700 mb-4 flex items-center gap-2"><i
                        class="ph-fill ph-hard-drives text-blue-600"></i> Backup</h3>
                <button @click="exportarDados"
                    class="text-sm font-bold text-gray-700 border border-gray-300 px-3 py-1 rounded hover:bg-gray-50">Baixar
                    Dados</button>
            </div>
        </div>
        <div @click="abrirEnquete"
            class="cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
            <div
                class="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition duration-700">
            </div>
            <div class="flex items-center gap-4 relative z-10">
                <div class="bg-white/20 p-3 rounded-full"><i class="ph-fill ph-star text-3xl text-yellow-300"></i></div>
                <div>
                    <h3 class="font-bold">Avalie o Sistema</h3>
                    <p class="text-xs text-indigo-100">Ajude no TCC respondendo a enquete.</p>
                </div>
            </div>
        </div>
        <div class="bg-red-50 p-6 rounded-2xl border border-red-100">
            <h3 class="font-bold text-red-700 mb-4"><i class="ph-fill ph-warning-octagon"></i> Zona de Reset</h3>
            <div class="flex gap-4">
                <button @click="zerarTudo(true)" :disabled="processandoReset"
                    class="flex-1 bg-white border border-red-200 text-red-600 py-2 rounded font-bold hover:bg-red-50">Resetar
                    Pontos</button>
                <button @click="zerarTudo(false)" :disabled="processandoReset"
                    class="flex-1 bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700">Apagar Tudo</button>
            </div>
        </div>
    </div>

    <div v-if="mostrarEditor"
        class="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <h3 class="text-lg font-bold text-gray-800 mb-4 text-center">Ajuste sua Foto</h3>

            <div class="relative w-64 h-64 mx-auto bg-gray-100 rounded-full overflow-hidden border-4 border-indigo-500 shadow-inner cursor-move touch-none"
                @mousedown="iniciarArrasto" @mousemove="arrastar" @mouseup="pararArrasto" @mouseleave="pararArrasto"
                @touchstart="iniciarArrasto" @touchmove="arrastar" @touchend="pararArrasto">

                <img :src="imagemParaEditar" class="absolute origin-top-left select-none pointer-events-none max-w-none"
                    :style="{
                        transform: `translate(${editorConfig.posX}px, ${editorConfig.posY}px) scale(${editorConfig.escala})`
                    }">
            </div>

            <p class="text-xs text-center text-gray-400 mt-2 mb-4">Arraste para mover • Use o controle abaixo para zoom
            </p>

            <div class="flex items-center gap-3 mb-6">
                <i class="ph-bold ph-minus text-gray-400"></i>
                <input type="range" v-model.number="editorConfig.escala" min="0.5" max="3" step="0.1"
                    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600">
                <i class="ph-bold ph-plus text-gray-400"></i>
            </div>

            <div class="flex gap-3">
                <button @click="mostrarEditor = false"
                    class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200">Cancelar</button>
                <button @click="confirmarCorte"
                    class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200">Confirmar</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
.animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
</style>