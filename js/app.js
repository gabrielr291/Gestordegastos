// ==========================================
// CONFIGURACIÓN E INICIALIZACIÓN
// ==========================================

// PRESUPUESTOS POR DEFECTO (Se sobrescriben con lo guardado en Firestore)
let PRESUPUESTOS_USUARIO = {
  'Alimentación': 250000,
  'Hogar': 400000,
  'Transporte': 100000,
  'Ocio': 120000,
  'Salud': 80000,
  'Gastos Legales': 150000,
  'Otros': 50000
};

let usuarioActual = null;
let filtroMesActual = new Date().toISOString().slice(0, 7);

// Elementos del DOM Principal
const elTotalIngresos = document.getElementById('total-ingresos');
const elTotalGastos = document.getElementById('total-gastos');
const elTotalBalance = document.getElementById('total-balance');
const elTotalPresupuestoRestante = document.getElementById('total-presupuesto-restante');
const elTablaMovimientos = document.getElementById('tabla-movimientos');
const elFiltroMes = document.getElementById('filtro-mes');
const elBtnVerTodo = document.getElementById('btn-ver-todo');
const elFormTransaccion = document.getElementById('form-transaccion');
const elBtnLogout = document.getElementById('btn-logout');
const elThemeToggle = document.getElementById('theme-toggle');
const elLinkAdmin = document.getElementById('link-admin');

// Campos Formulario
const selectTipo = document.getElementById('tipo');
const selectCuotas = document.getElementById('cuotas');
const selectNaturaleza = document.getElementById('naturaleza');

// Modales
const modalMeta = document.getElementById('modal-meta');
const btnNuevaMeta = document.getElementById('btn-nueva-meta');
const btnCancelarMeta = document.getElementById('btn-cancelar-meta');
const formModalMeta = document.getElementById('form-modal-meta');

const modalRecurrente = document.getElementById('modal-recurrente');
const btnNuevaRecurrente = document.getElementById('btn-nueva-recurrente');
const btnCancelarRecurrente = document.getElementById('btn-cancelar-recurrente');
const formModalRecurrente = document.getElementById('form-modal-recurrente');

// ==========================================
// AUTENTICACIÓN Y SESIÓN
// ==========================================

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  usuarioActual = user;

  try {
    const docUser = await db.collection('users').doc(user.uid).get();
    if (docUser.exists && docUser.data().role === 'admin' && elLinkAdmin) {
      elLinkAdmin.classList.remove('hidden');
    }
  } catch (err) {
    console.error("Error comprobando rol de usuario:", err);
  }

  iniciarListenersFirestore(user.uid);
});

if (elBtnLogout) {
  elBtnLogout.addEventListener('click', () => {
    auth.signOut().then(() => {
      window.location.href = 'login.html';
    });
  });
}

// ==========================================
// INDICADORES ECONÓMICOS
// ==========================================

async function cargarIndicadores() {
  try {
    const response = await fetch('https://mindicador.cl/api');
    if (!response.ok) throw new Error('Error API');
    
    const data = await response.json();
    const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 2 });

    const elUf = document.getElementById('val-uf');
    const elUsd = document.getElementById('val-usd');
    const elEur = document.getElementById('val-eur');

    if (elUf) elUf.textContent = formatoCLP.format(data.uf.valor);
    if (elUsd) elUsd.textContent = formatoCLP.format(data.dolar.valor);
    if (elEur) elEur.textContent = formatoCLP.format(data.euro.valor);

  } catch (error) {
    console.error('Error al obtener indicadores:', error);
    ['val-uf', 'val-usd', 'val-eur'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'N/D';
    });
  }
}

// ==========================================
// CAMPOS DINÁMICOS FORMULARIO
// ==========================================

function ajustarCamposFormulario() {
  if (!selectTipo || !selectCuotas || !selectNaturaleza) return;
  const esIngreso = selectTipo.value === 'ingreso';

  selectCuotas.disabled = esIngreso;
  selectNaturaleza.disabled = esIngreso;

  if (esIngreso) {
    selectCuotas.value = '1';
    selectCuotas.classList.add('opacity-50', 'cursor-not-allowed');
    selectNaturaleza.classList.add('opacity-50', 'cursor-not-allowed');
  } else {
    selectCuotas.classList.remove('opacity-50', 'cursor-not-allowed');
    selectNaturaleza.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

if (selectTipo) {
  selectTipo.addEventListener('change', ajustarCamposFormulario);
}

// ==========================================
// REALTIME LISTENERS & TRANSACCIONES
// ==========================================

function iniciarListenersFirestore(userId) {
  if (elFiltroMes) elFiltroMes.value = filtroMesActual;

  // 1. Cargar y escuchar límites de presupuestos del usuario
  db.collection('users').doc(userId).collection('presupuestos')
    .onSnapshot((snapshot) => {
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data && data.limite !== undefined) {
          PRESUPUESTOS_USUARIO[doc.id] = Number(data.limite);
        }
      });
      if (window.ultimosMovimientos) {
        renderizarPresupuestos(window.ultimosMovimientos);
      }
    }, (err) => console.error("Error cargando presupuestos:", err));

  // 2. Transacciones
  db.collection('users').doc(userId).collection('transacciones')
    .orderBy('fecha', 'desc')
    .onSnapshot((snapshot) => {
      const movimientos = [];
      snapshot.forEach((doc) => movimientos.push({ id: doc.id, ...doc.data() }));
      window.ultimosMovimientos = movimientos;
      renderizarTransacciones(movimientos);
      renderizarPresupuestos(movimientos);
    }, (err) => console.error("Error transacciones:", err));

  // 3. Metas
  db.collection('users').doc(userId).collection('metas')
    .onSnapshot((snapshot) => {
      const metas = [];
      snapshot.forEach((doc) => metas.push({ id: doc.id, ...doc.data() }));
      renderizarMetas(metas);
    }, (err) => console.error("Error metas:", err));

  // 4. Recurrentes
  db.collection('users').doc(userId).collection('recurrentes')
    .onSnapshot((snapshot) => {
      const recurrentes = [];
      snapshot.forEach((doc) => recurrentes.push({ id: doc.id, ...doc.data() }));
      renderizarRecurrentes(recurrentes);
    }, (err) => console.error("Error recurrentes:", err));
}

if (elFormTransaccion) {
  elFormTransaccion.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!usuarioActual) return;

    const tipo = selectTipo.value;
    const concepto = document.getElementById('concepto').value.trim();
    const monto = parseFloat(document.getElementById('monto').value) || 0;
    const moneda = document.getElementById('moneda').value;
    const cuotas = parseInt(selectCuotas.value) || 1;
    const fecha = document.getElementById('fecha').value;
    const naturaleza = selectNaturaleza.value;
    const categoria = document.getElementById('categoria').value;

    try {
      await db.collection('users').doc(usuarioActual.uid).collection('transacciones').add({
        tipo,
        concepto,
        monto,
        moneda,
        cuotas: tipo === 'ingreso' ? 1 : cuotas,
        fecha,
        naturaleza: tipo === 'ingreso' ? 'ingreso' : naturaleza,
        categoria: tipo === 'ingreso' ? 'Ingreso' : categoria,
        creado: firebase.firestore.FieldValue.serverTimestamp()
      });

      elFormTransaccion.reset();
      document.getElementById('fecha').valueAsDate = new Date();
      ajustarCamposFormulario();
    } catch (error) {
      console.error("Error transacción:", error);
      alert("No se pudo guardar la transacción.");
    }
  });
}

async function eliminarTransaccion(id) {
  if (!usuarioActual || !confirm("¿Deseas eliminar este registro?")) return;
  try {
    await db.collection('users').doc(usuarioActual.uid).collection('transacciones').doc(id).delete();
  } catch (error) {
    console.error("Error al eliminar transacción:", error);
  }
}

// ==========================================
// EDICIÓN DE PRESUPUESTOS
// ==========================================

async function editarLimitePresupuesto(categoria, limiteActual) {
  if (!usuarioActual) return;

  const nuevoMonto = prompt(`Nuevo límite mensual para "${categoria}":`, limiteActual);
  if (nuevoMonto === null) return;

  const limiteNum = parseFloat(nuevoMonto);
  if (isNaN(limiteNum) || limiteNum <= 0) {
    alert("Ingresa un número válido mayor a 0.");
    return;
  }

  try {
    await db.collection('users')
      .doc(usuarioActual.uid)
      .collection('presupuestos')
      .doc(categoria)
      .set({ limite: limiteNum }, { merge: true });

    PRESUPUESTOS_USUARIO[categoria] = limiteNum;
  } catch (error) {
    console.error("Error guardando el presupuesto:", error);
    alert("No se pudo actualizar el límite del presupuesto.");
  }
}

// ==========================================
// METAS Y RECURRENTES LOGIC
// ==========================================

async function editarMeta(id, actualExistente, nombre) {
  if (!usuarioActual) return;
  const nuevoMonto = prompt(`Actualizar monto ahorrado para "${nombre}":`, actualExistente);
  if (nuevoMonto === null) return;

  const montoNum = parseFloat(nuevoMonto);
  if (isNaN(montoNum) || montoNum < 0) {
    alert("Ingresa un número válido.");
    return;
  }

  try {
    await db.collection('users').doc(usuarioActual.uid).collection('metas').doc(id).update({ actual: montoNum });
  } catch (error) {
    console.error("Error actualizando meta:", error);
  }
}

async function eliminarMeta(id) {
  if (!usuarioActual || !confirm("¿Deseas eliminar esta meta?")) return;
  try {
    await db.collection('users').doc(usuarioActual.uid).collection('metas').doc(id).delete();
  } catch (error) {
    console.error("Error eliminando meta:", error);
  }
}

async function ejecutarRecurrente(concepto, monto, categoria, tipo) {
  if (!usuarioActual) return;
  const fechaHoy = new Date().toISOString().split('T')[0];

  try {
    await db.collection('users').doc(usuarioActual.uid).collection('transacciones').add({
      tipo: tipo || 'gasto',
      concepto,
      monto: Number(monto) || 0,
      moneda: 'CLP',
      cuotas: 1,
      fecha: fechaHoy,
      naturaleza: tipo === 'ingreso' ? 'ingreso' : 'variable',
      categoria: categoria || 'Otros',
      creado: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert(`¡${concepto} añadido exitosamente a los movimientos!`);
  } catch (error) {
    console.error("Error registrando recurrente:", error);
  }
}

async function eliminarRecurrente(id) {
  if (!usuarioActual || !confirm("¿Deseas eliminar este gasto/ingreso recurrente?")) return;
  try {
    await db.collection('users').doc(usuarioActual.uid).collection('recurrentes').doc(id).delete();
  } catch (error) {
    console.error("Error eliminando recurrente:", error);
  }
}

// Modales Event Listeners
if (btnNuevaMeta && modalMeta) {
  btnNuevaMeta.addEventListener('click', () => { modalMeta.classList.remove('hidden'); modalMeta.classList.add('flex'); });
}
if (btnCancelarMeta && modalMeta) {
  btnCancelarMeta.addEventListener('click', () => { modalMeta.classList.add('hidden'); modalMeta.classList.remove('flex'); if (formModalMeta) formModalMeta.reset(); });
}
if (formModalMeta) {
  formModalMeta.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!usuarioActual) return;
    const nombre = document.getElementById('meta-nombre').value.trim();
    const monto = parseFloat(document.getElementById('meta-monto').value) || 0;
    const actual = parseFloat(document.getElementById('meta-actual').value) || 0;

    try {
      await db.collection('users').doc(usuarioActual.uid).collection('metas').add({ nombre, monto, actual, creado: firebase.firestore.FieldValue.serverTimestamp() });
      modalMeta.classList.add('hidden'); modalMeta.classList.remove('flex'); formModalMeta.reset();
    } catch (err) { console.error("Error guardando meta:", err); }
  });
}

if (btnNuevaRecurrente && modalRecurrente) {
  btnNuevaRecurrente.addEventListener('click', () => { modalRecurrente.classList.remove('hidden'); modalRecurrente.classList.add('flex'); });
}
if (btnCancelarRecurrente && modalRecurrente) {
  btnCancelarRecurrente.addEventListener('click', () => { modalRecurrente.classList.add('hidden'); modalRecurrente.classList.remove('flex'); if (formModalRecurrente) formModalRecurrente.reset(); });
}
if (formModalRecurrente) {
  formModalRecurrente.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!usuarioActual) return;
    const tipo = document.getElementById('rec-tipo').value;
    const concepto = document.getElementById('rec-concepto').value.trim();
    const monto = parseFloat(document.getElementById('rec-monto').value) || 0;
    const categoria = document.getElementById('rec-categoria').value;

    try {
      await db.collection('users').doc(usuarioActual.uid).collection('recurrentes').add({ tipo, concepto, monto, categoria, creado: firebase.firestore.FieldValue.serverTimestamp() });
      modalRecurrente.classList.add('hidden'); modalRecurrente.classList.remove('flex'); formModalRecurrente.reset();
    } catch (err) { console.error("Error guardando recurrente:", err); }
  });
}

// ==========================================
// RENDERIZADO UI
// ==========================================

function renderizarTransacciones(movimientos) {
  const movimientosFiltrados = movimientos.filter(m => !filtroMesActual || (m.fecha && m.fecha.startsWith(filtroMesActual)));

  let totalIngresos = 0;
  let totalGastos = 0;

  if (elTablaMovimientos) elTablaMovimientos.innerHTML = '';

  if (movimientosFiltrados.length === 0) {
    if (elTablaMovimientos) {
      elTablaMovimientos.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400">No hay movimientos registrados para este período.</td></tr>`;
    }
  } else {
    movimientosFiltrados.forEach(m => {
      const montoNum = Number(m.monto) || 0;
      if (m.tipo === 'ingreso') totalIngresos += montoNum;
      else totalGastos += montoNum;

      if (elTablaMovimientos) {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition';
        tr.innerHTML = `
          <td class="py-3 px-3 text-slate-500 dark:text-slate-400">${m.fecha || ''}</td>
          <td class="py-3 px-3 font-semibold">${m.concepto || ''}</td>
          <td class="py-3 px-3"><span class="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">${m.categoria || 'Otros'}</span></td>
          <td class="py-3 px-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${m.tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'}">${m.tipo}</span></td>
          <td class="py-3 px-3 text-right font-bold ${m.tipo === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">$${montoNum.toLocaleString('es-CL')}</td>
          <td class="py-3 px-3 text-center">
            <button onclick="eliminarTransaccion('${m.id}')" class="p-1 text-slate-400 hover:text-rose-600 transition" title="Eliminar movimiento">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        `;
        elTablaMovimientos.appendChild(tr);
      }
    });
  }

  const totalBalance = totalIngresos - totalGastos;
  if (elTotalIngresos) elTotalIngresos.textContent = `$${totalIngresos.toLocaleString('es-CL')}`;
  if (elTotalGastos) elTotalGastos.textContent = `$${totalGastos.toLocaleString('es-CL')}`;
  if (elTotalBalance) {
    elTotalBalance.textContent = `$${totalBalance.toLocaleString('es-CL')}`;
    elTotalBalance.className = `text-2xl font-extrabold mt-1 ${totalBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`;
  }
}

function renderizarPresupuestos(movimientos) {
  const contenedor = document.getElementById('lista-presupuestos-progreso');
  if (!contenedor) return;

  const movimientosFiltrados = movimientos.filter(m => !filtroMesActual || (m.fecha && m.fecha.startsWith(filtroMesActual)));

  const gastosPorCategoria = movimientosFiltrados
    .filter(m => m.tipo === 'gasto')
    .reduce((acc, m) => {
      const cat = m.categoria || 'Otros';
      acc[cat] = (acc[cat] || 0) + Number(m.monto || 0);
      return acc;
    }, {});

  let sumaTotalPresupuestos = 0;
  let sumaTotalGastado = 0;
  let html = '';

  Object.keys(PRESUPUESTOS_USUARIO).forEach(cat => {
    const limite = PRESUPUESTOS_USUARIO[cat];
    const gastado = gastosPorCategoria[cat] || 0;
    
    sumaTotalPresupuestos += limite;
    sumaTotalGastado += gastado;

    const porcentaje = Math.min(100, Math.round((gastado / limite) * 100)) || 0;
    const excedido = gastado > limite;
    const colorBarra = excedido ? 'bg-rose-500' : 'bg-brand-500';

    html += `
      <div>
        <div class="flex justify-between items-center text-xs font-medium mb-1">
          <div class="flex items-center gap-1.5">
            <span>${cat}</span>
            <button onclick="editarLimitePresupuesto('${cat}', ${limite})" class="text-slate-400 hover:text-amber-400 transition" title="Editar límite de ${cat}">
              <i class="fa-solid fa-pen text-[10px]"></i>
            </button>
          </div>
          <span class="${excedido ? 'text-rose-500 font-bold' : 'text-slate-400'}">
            $${gastado.toLocaleString('es-CL')} / $${limite.toLocaleString('es-CL')}
          </span>
        </div>
        <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
          <div class="${colorBarra} h-full transition-all duration-300" style="width: ${porcentaje}%"></div>
        </div>
      </div>
    `;
  });

  contenedor.innerHTML = html;

  if (elTotalPresupuestoRestante) {
    const presupuestoDisponible = sumaTotalPresupuestos - sumaTotalGastado;
    elTotalPresupuestoRestante.textContent = `$${presupuestoDisponible.toLocaleString('es-CL')}`;
  }
}

function renderizarMetas(metas) {
  const contenedor = document.getElementById('contenedor-metas');
  if (!contenedor) return;

  contenedor.innerHTML = '';
  if (metas.length === 0) {
    contenedor.innerHTML = `<p class="text-xs text-slate-400 col-span-3">No tienes metas de ahorro creadas.</p>`;
    return;
  }

  metas.forEach(meta => {
    const porcentaje = Math.min(100, Math.round((meta.actual / meta.monto) * 100)) || 0;
    const div = document.createElement('div');
    div.className = 'p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 space-y-2 relative group';
    div.innerHTML = `
      <div class="flex justify-between items-center text-xs">
        <span class="font-bold">${meta.nombre}</span>
        <div class="flex items-center space-x-2">
          <span class="font-bold text-emerald-600">${porcentaje}%</span>
          <button onclick="editarMeta('${meta.id}', ${meta.actual || 0}, '${meta.nombre}')" class="text-slate-400 hover:text-emerald-500 transition" title="Editar progreso">
            <i class="fa-solid fa-pen text-[10px]"></i>
          </button>
          <button onclick="eliminarMeta('${meta.id}')" class="text-slate-400 hover:text-rose-500 transition" title="Eliminar meta">
            <i class="fa-solid fa-trash-can text-[10px]"></i>
          </button>
        </div>
      </div>
      <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
        <div class="bg-emerald-500 h-full transition-all duration-300" style="width: ${porcentaje}%"></div>
      </div>
      <div class="flex justify-between text-[11px] text-slate-400">
        <span>$${(meta.actual || 0).toLocaleString('es-CL')}</span>
        <span>$${(meta.monto || 0).toLocaleString('es-CL')}</span>
      </div>
    `;
    contenedor.appendChild(div);
  });
}

function renderizarRecurrentes(recurrentes) {
  const contenedor = document.getElementById('contenedor-recurrentes');
  if (!contenedor) return;

  contenedor.innerHTML = '';
  if (recurrentes.length === 0) {
    contenedor.innerHTML = `<p class="text-xs text-slate-400 col-span-2">No hay gastos o ingresos recurrentes.</p>`;
    return;
  }

  recurrentes.forEach(rec => {
    const div = document.createElement('div');
    div.className = 'p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs bg-slate-50 dark:bg-slate-900/40';
    div.innerHTML = `
      <div>
        <p class="font-bold">${rec.concepto}</p>
        <span class="text-[10px] text-slate-400">${rec.categoria} (${rec.tipo})</span>
      </div>
      <div class="flex items-center space-x-2">
        <span class="font-bold ${rec.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'} me-1">$${(rec.monto || 0).toLocaleString('es-CL')}</span>
        <button onclick="ejecutarRecurrente('${rec.concepto}', ${rec.monto || 0}, '${rec.categoria}', '${rec.tipo}')" class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition" title="Registrar en movimientos hoy">
          <i class="fa-solid fa-plus text-xs"></i>
        </button>
        <button onclick="eliminarRecurrente('${rec.id}')" class="p-1.5 text-slate-400 hover:text-rose-500 transition" title="Eliminar recurrente">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    `;
    contenedor.appendChild(div);
  });
}

// ==========================================
// MODO OSCURO / CONTROLES FILTRO
// ==========================================

if (elThemeToggle) {
  elThemeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) icon.className = isDark ? 'fa-solid fa-sun text-amber-400' : 'fa-solid fa-moon text-slate-600';
  });
}

if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark');
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) icon.className = 'fa-solid fa-sun text-amber-400';
}

if (elFiltroMes) {
  elFiltroMes.addEventListener('change', (e) => {
    filtroMesActual = e.target.value;
    if (usuarioActual) iniciarListenersFirestore(usuarioActual.uid);
  });
}

if (elBtnVerTodo) {
  elBtnVerTodo.addEventListener('click', () => {
    filtroMesActual = '';
    if (elFiltroMes) elFiltroMes.value = '';
    if (usuarioActual) iniciarListenersFirestore(usuarioActual.uid);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  cargarIndicadores();
  ajustarCamposFormulario();
  const elFechaInput = document.getElementById('fecha');
  if (elFechaInput && !elFechaInput.value) {
    elFechaInput.valueAsDate = new Date();
  }
});