// ==========================================
// CONTROL DE PESTAÑAS (INICIAR SESIÓN / REGISTRARSE)
// ==========================================

const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const errorMsg = document.getElementById('error-msg');

const clasesActiva = ['border-b-2', 'border-blue-500', 'text-blue-500', 'font-bold'];
const clasesInactiva = ['border-b-2', 'border-transparent', 'text-slate-400'];

function mostrarError(mensaje) {
  if (errorMsg) {
    errorMsg.textContent = mensaje;
    errorMsg.classList.remove('hidden');
  } else {
    alert(mensaje);
  }
}

function ocultarError() {
  if (errorMsg) errorMsg.classList.add('hidden');
}

function activarLogin() {
  ocultarError();
  formLogin.classList.remove('hidden');
  formRegister.classList.add('hidden');

  tabLogin.classList.remove(...clasesInactiva);
  tabLogin.classList.add(...clasesActiva);

  tabRegister.classList.remove(...clasesActiva);
  tabRegister.classList.add(...clasesInactiva);
}

function activarRegistro() {
  ocultarError();
  formRegister.classList.remove('hidden');
  formLogin.classList.add('hidden');

  tabRegister.classList.remove(...clasesInactiva);
  tabRegister.classList.add(...clasesActiva);

  tabLogin.classList.remove(...clasesActiva);
  tabLogin.classList.add(...clasesInactiva);
}

if (tabLogin && tabRegister) {
  tabLogin.addEventListener('click', activarLogin);
  tabRegister.addEventListener('click', activarRegistro);
}

// ==========================================
// AUTENTICACIÓN CON FIREBASE
// ==========================================

// 1. INICIAR SESIÓN
if (formLogin) {
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarError();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      await auth.signInWithEmailAndPassword(email, password);
      window.location.href = 'index.html';
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      let msg = "Error al iniciar sesión. Revisa tus credenciales.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        msg = "Correo o contraseña incorrectos.";
      }
      mostrarError(msg);
    }
  });
}

// 2. REGISTRARSE
if (formRegister) {
  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarError();

    // Se corrige 'reg-name' coincidiendo con login.html
    const nombre = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;

    if (password !== passwordConfirm) {
      mostrarError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 8) {
      mostrarError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    try {
      // Crear usuario en Firebase Auth
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Crear el documento de usuario en Firestore respetando las reglas de seguridad
      await db.collection('users').doc(user.uid).set({
        name: nombre,
        email: email,
        role: 'user', // Asignación obligatoria de rol 'user'
        disabled: false,
        creado: firebase.firestore.FieldValue.serverTimestamp()
      });

      window.location.href = 'index.html';
    } catch (error) {
      console.error("Error al registrarse:", error);
      let msg = "No se pudo crear la cuenta.";
      if (error.code === 'auth/email-already-in-use') {
        msg = "El correo electrónico ya está registrado.";
      } else if (error.code === 'auth/weak-password') {
        msg = "La contraseña es muy débil.";
      }
      mostrarError(msg);
    }
  });
}