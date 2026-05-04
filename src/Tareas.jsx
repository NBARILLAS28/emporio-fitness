import { useState, useEffect } from 'react'
import { db } from './firebase'
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, serverTimestamp, orderBy
} from 'firebase/firestore'

// ── VISTA COLABORADOR ────────────────────────────────────
export function TareasColaborador({ colaborador, perfil, onPuntosActualizados }) {
  const [tareas, setTareas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [completando, setCompletando] = useState(null)

  const cargarTareas = async () => {
    setCargando(true)
    try {
      const hoy = new Date().toLocaleDateString('es-GT')
      const q = query(
        collection(db, 'tareas'),
        where('uid', '==', colaborador.uid),
        where('fecha', '==', hoy)
      )
      const snap = await getDocs(q)
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setTareas(lista)
    } catch (e) {
      console.error(e)
    }
    setCargando(false)
  }

  useEffect(() => { cargarTareas() }, [])

  const completarTarea = async (tarea) => {
    if (tarea.completada) return
    setCompletando(tarea.id)
    try {
      await updateDoc(doc(db, 'tareas', tarea.id), {
        completada: true,
        completadaEn: serverTimestamp(),
        calificacion: 5
      })
      // Sumar puntos al colaborador
      const nuevosPuntos = (perfil?.puntos || 0) + tarea.puntos
      await updateDoc(doc(db, 'colaboradores', colaborador.uid), {
        puntos: nuevosPuntos
      })
      onPuntosActualizados(nuevosPuntos)
      cargarTareas()
    } catch (e) {
      console.error(e)
    }
    setCompletando(null)
  }

  const estrellas = (n) => '⭐'.repeat(n)

  if (cargando) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-gray-400">Cargando tareas...</p>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-xl">Mis Tareas</h2>
        <span className="text-gray-500 text-xs">
          {tareas.filter(t => t.completada).length}/{tareas.length} completadas
        </span>
      </div>

      {tareas.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-400 font-medium">No tienes tareas asignadas hoy</p>
          <p className="text-gray-600 text-sm mt-1">El administrador asignará tus tareas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tareas.map(t => (
            <div key={t.id}
              className={`bg-zinc-900 border rounded-xl p-4 ${t.completada ? 'border-gray-600 opacity-70' : 'border-zinc-700'}`}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => completarTarea(t)}
                  disabled={t.completada || completando === t.id}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${t.completada ? 'bg-gray-400 border-gray-400' : 'border-gray-500 hover:border-gray-300'}`}>
                  {t.completada && <span className="text-black text-xs font-black">✓</span>}
                  {completando === t.id && <span className="text-gray-400 text-xs">...</span>}
                </button>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${t.completada ? 'line-through text-gray-500' : 'text-white'}`}>
                    {t.titulo}
                  </p>
                  {t.descripcion && (
                    <p className="text-gray-500 text-xs mt-1">{t.descripcion}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-gray-400 text-xs">+{t.puntos} pts</span>
                    {t.completada && (
                      <span className="text-xs">{estrellas(t.calificacion || 5)}</span>
                    )}
                    {t.completada && (
                      <span className="text-gray-500 text-xs">¡Completada!</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tareas.length > 0 && tareas.every(t => t.completada) && (
        <div className="mt-4 bg-zinc-900 border border-gray-500 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">🏆</div>
          <p className="text-gray-300 font-bold">¡Todas las tareas completadas!</p>
          <p className="text-gray-500 text-sm">Excelente trabajo hoy</p>
        </div>
      )}
    </div>
  )
}

// ── PANEL ADMINISTRADOR ──────────────────────────────────
export function PanelAdmin({ onCerrar }) {
  const [colaboradores, setColaboradores] = useState([])
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [puntos, setPuntos] = useState('20')
  const [uidSeleccionado, setUidSeleccionado] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [tareasTodas, setTareasTodas] = useState([])

  useEffect(() => {
    const cargar = async () => {
      const snapColabs = await getDocs(collection(db, 'colaboradores'))
      setColaboradores(snapColabs.docs.map(d => ({ id: d.id, ...d.data() })))

      const hoy = new Date().toLocaleDateString('es-GT')
      const q = query(collection(db, 'tareas'), where('fecha', '==', hoy), orderBy('creadaEn', 'desc'))
      const snapTareas = await getDocs(q)
      setTareasTodas(snapTareas.docs.map(d => ({ id: d.id, ...d.data() })))
    }
    cargar()
  }, [mensaje])

  const asignarTarea = async () => {
    if (!titulo || !uidSeleccionado) { setMensaje('❌ Selecciona colaborador y escribe el título'); return }
    setCargando(true)
    try {
      const colab = colaboradores.find(c => c.id === uidSeleccionado)
      await addDoc(collection(db, 'tareas'), {
        uid: uidSeleccionado,
        nombreColaborador: colab?.nombre || '',
        titulo,
        descripcion,
        puntos: parseInt(puntos) || 20,
        completada: false,
        fecha: new Date().toLocaleDateString('es-GT'),
        creadaEn: serverTimestamp()
      })
      setMensaje('✅ Tarea asignada correctamente')
      setTitulo('')
      setDescripcion('')
      setPuntos('20')
    } catch (e) {
      setMensaje('❌ Error al asignar tarea')
    }
    setCargando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-bold text-xl">Panel Admin</h2>
        <button onClick={onCerrar} className="text-gray-500 hover:text-gray-300 text-sm">← Salir</button>
      </div>

      {/* Formulario */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 mb-6">
        <h3 className="text-gray-300 font-bold mb-4">Asignar nueva tarea</h3>

        {mensaje && (
          <div className="bg-zinc-800 rounded-xl px-4 py-2 mb-4 text-sm text-gray-300">{mensaje}</div>
        )}

        <div className="mb-3">
          <label className="text-gray-400 text-xs mb-1 block">Colaborador</label>
          <select value={uidSeleccionado} onChange={e => setUidSeleccionado(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gray-400">
            <option value="">Selecciona colaborador...</option>
            {colaboradores.map(c => (
              <option key={c.id} value={c.id}>{c.nombre} — {c.puesto}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="text-gray-400 text-xs mb-1 block">Título de la tarea</label>
          <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
            placeholder="Ej: Limpiar equipos de cardio"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-400" />
        </div>

        <div className="mb-3">
          <label className="text-gray-400 text-xs mb-1 block">Descripción (opcional)</label>
          <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
            placeholder="Detalles adicionales..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-400" />
        </div>

        <div className="mb-4">
          <label className="text-gray-400 text-xs mb-1 block">Puntos por completar</label>
          <select value={puntos} onChange={e => setPuntos(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gray-400">
            <option value="10">10 puntos — Tarea básica</option>
            <option value="20">20 puntos — Tarea normal</option>
            <option value="30">30 puntos — Tarea importante</option>
            <option value="50">50 puntos — Tarea destacada</option>
            <option value="100">100 puntos — Logro especial</option>
          </select>
        </div>

        <button onClick={asignarTarea} disabled={cargando}
          className="w-full bg-gray-400 hover:bg-gray-300 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
          {cargando ? 'Asignando...' : '+ Asignar Tarea'}
        </button>
      </div>

      {/* Tareas de hoy */}
      <div>
        <h3 className="text-gray-300 font-bold mb-3">Tareas asignadas hoy</h3>
        {tareasTodas.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">No hay tareas asignadas hoy</p>
        ) : (
          <div className="space-y-2">
            {tareasTodas.map(t => (
              <div key={t.id} className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${t.completada ? 'bg-gray-400' : 'bg-zinc-600'}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{t.titulo}</p>
                  <p className="text-gray-500 text-xs">{t.nombreColaborador} · {t.puntos} pts</p>
                </div>
                <span className="text-xs text-gray-500">{t.completada ? '✅' : '⏳'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}