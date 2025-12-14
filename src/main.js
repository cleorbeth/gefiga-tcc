import { createApp } from 'vue'
import './style.css' // Seu CSS global
import App from './App.vue'

// === CORREÇÃO DOS ÍCONES ===
// Use este formato mais curto:
import "@phosphor-icons/web/regular";
import "@phosphor-icons/web/fill";
// ===========================

createApp(App).mount('#app')