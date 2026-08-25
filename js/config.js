// Configuración Centralizada de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDeoSNGAXoCl6A6PbBF7xdjQMloXG-Ieb4",
  authDomain: "gestor-de-gastos-e0d1f.firebaseapp.com",
  databaseURL: "https://gestor-de-gastos-e0d1f-default-rtdb.firebaseio.com",
  projectId: "gestor-de-gastos-e0d1f",
  storageBucket: "gestor-de-gastos-e0d1f.firebasestorage.app",
  messagingSenderId: "533356763255",
  appId: "1:533356763255:web:00752ee3dec76475344e72",
  measurementId: "G-Q0GFNMFHMK"
};

// Inicialización
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();