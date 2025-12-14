import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
apiKey: "AIzaSyBTtC-RGnHnrP29WKJqGdwOtYhiHvWDV3Y",
  authDomain: "gefiga-tcc.firebaseapp.com",
  projectId: "gefiga-tcc",
  storageBucket: "gefiga-tcc.firebasestorage.app",
  messagingSenderId: "165260245288",
  appId: "1:165260245288:web:9c29959b634abcafcf781d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Exporta para usar nos componentes
export { auth, db };