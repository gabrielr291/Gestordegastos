// Lógica de Panel de Administración
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    const doc = await db.collection('users').doc(user.uid).get();
    if (!doc.exists || doc.data().role !== 'admin') {
      alert("Acceso denegado: Se requieren permisos de administrador.");
      window.location.href = "index.html";
      return;
    }
  } catch (err) {
    console.error("Error al verificar perfil de administrador:", err);
    window.location.href = "index.html";
    return;
  }

  cargarUsuarios();
});

function cargarUsuarios() {
  db.collection('users').onSnapshot((snapshot) => {
    const tbody = document.getElementById('tabla-usuarios');
    if (!tbody) return;
    tbody.innerHTML = '';

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const uid = doc.id;
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-800/50 border-b border-slate-700/50 transition";
      
      const emailMostrar = data.email || 'Sin Correo';
      const nombreMostrar = data.name ? `<span class="block text-slate-400 text-[11px] font-normal">${data.name}</span>` : '';

      tr.innerHTML = `
        <td class="p-3 font-semibold max-w-[200px] truncate" title="${emailMostrar}">
          ${emailMostrar}
          ${nombreMostrar}
        </td>
        <td class="p-3">
          <select onchange="cambiarRol('${uid}', this.value)" class="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500">
            <option value="user" ${data.role === 'user' ? 'selected' : ''}>Usuario</option>
            <option value="admin" ${data.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </td>
        <td class="p-3">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${data.disabled ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">
            ${data.disabled ? 'Bloqueado' : 'Activo'}
          </span>
        </td>
        <td class="p-3 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="toggleBloqueo('${uid}', ${!data.disabled})" class="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition">
              ${data.disabled ? 'Desbloquear' : 'Bloquear'}
            </button>
            <button onclick="eliminarUsuario('${uid}')" class="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-600 hover:text-white transition">
              Eliminar Doc
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

async function cambiarRol(uid, nuevoRol) {
  try {
    await db.collection('users').doc(uid).update({ role: nuevoRol });
  } catch (err) {
    console.error("Error actualizando el rol:", err);
  }
}

async function toggleBloqueo(uid, disabled) {
  try {
    await db.collection('users').doc(uid).update({ disabled });
  } catch (err) {
    console.error("Error cambiando el estado de bloqueo:", err);
  }
}

async function eliminarUsuario(uid) {
  if (confirm("¿Deseas borrar el registro del usuario de Firestore?")) {
    try {
      await db.collection('users').doc(uid).delete();
    } catch (err) {
      console.error("Error al eliminar documento de usuario:", err);
    }
  }
}

document.getElementById('btn-logout-admin')?.addEventListener('click', () => {
  auth.signOut().then(() => window.location.href = "login.html");
});