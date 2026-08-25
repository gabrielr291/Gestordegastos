// ==========================================
// CONTROL DE PESTAÑAS (INICIAR SESIÓN / REGISTRARSE)
// ==========================================

const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

// Definición de estilos para pestañas
const clasesActiva = ['border-b-2', 'border-indigo-500', 'text-indigo-400', 'font-semibold'];
const clasesInactiva = ['border-b-2', 'border-transparent', 'text-slate-400', 'hover:text-slate-300'];

function activarLogin() {
  formLogin.classList.remove('hidden');
  formRegister.classList.add('hidden');

  // Aplicar línea e iluminación a Login
  tabLogin.classList.remove(...clasesInactiva);
  tabLogin.classList.add(...clasesActiva);

  // Quitar línea a Registrarse
  tabRegister.classList.remove(...clasesActiva);
  tabRegister.classList.add(...clasesInactiva);
}

function activarRegistro() {
  formRegister.classList.remove('hidden');
  formLogin.classList.add('hidden');

  // Aplicar línea e iluminación a Registrarse
  tabRegister.classList.remove(...clasesInactiva);
  tabRegister.classList.add(...clasesActiva);

  // Quitar línea a Login
  tabLogin.classList.remove(...clasesActiva);
  tabLogin.classList.add(...clasesInactiva);
}

if (tabLogin && tabRegister) {
  tabLogin.addEventListener('click', activarLogin);
  tabRegister.addEventListener('click', activarRegistro);
}

// ==========================================
// AUTENTICACIÓN FIREBASE
// ==========================================

// Iniciar Sesión
if (formLogin) {
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      await auth.signInWithEmailAndPassword(email, password);
      window.location.href = 'index.html';
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      alert("Error: " + error.message);
    }
  });
}

// Registrarse
if (formRegister) {
  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      await db.collection('users').doc(userCredential.user.uid).set({
        nombre: nombre,
        email: email,
        role: 'user',
        creado: firebase.firestore.FieldValue.serverTimestamp()
      });

      window.location.href = 'index.html';
    } catch (error) {
      console.error("Error al registrarse:", error);
      alert("Error: " + error.message);
    }
  });
}