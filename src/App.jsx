import { useState, useEffect } from 'react'
import { auth, db } from './firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import {
  doc, setDoc, getDoc, serverTimestamp, collection, addDoc
} from 'firebase/firestore'

// ── ICONOS ──────────────────────────────────────────────
const IconHome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)
const IconQR = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
  </svg>
)
const IconTasks = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
)
const IconCalendar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
const IconStar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
)

// ── LOGIN ────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [esRegistro, setEsRegistro] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) { setError('Completa todos los campos'); return }
    if (esRegistro && !nombre) { setError('Escribe tu nombre'); return }
    setCargando(true)
    setError('')
    try {
      if (esRegistro) {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await setDoc(doc(db, 'colaboradores', cred.user.uid), {
          nombre,
          email,
          puesto: 'Colaborador',
          puntos: 0,
          creadoEn: serverTimestamp()
        })
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (e) {
      const msgs = {
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/invalid-email': 'Correo inválido',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-credential': 'Correo o contraseña incorrectos',
      }
      setError(msgs[e.code] || 'Error: ' + e.message)
    }
    setCargando(false)
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="mb-10 text-center">
        <div className="w-28 h-28 rounded-full bg-gray-800 border-2 border-gray-500 flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
          <img src="/logo.png" alt="Emporio Fitness" className="w-full h-full object-contain p-2" />
        </div>
        <h1 className="text-3xl font-black tracking-widest text-gray-300">EMPORIO</h1>
        <h2 className="text-3xl font-black tracking-widest text-white">FITNESS</h2>
        <p className="text-gray-500 text-sm mt-1">Chimaltenango, Guatemala</p>
      </div>

      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
        <h3 className="text-white font-bold text-lg mb-6 text-center">
          {esRegistro ? 'Crear Cuenta' : 'Iniciar Sesión'}
        </h3>

        {error && (
          <div className="bg-red-900/40 border border-red-500 text-red-300 text-sm rounded-lg px-4 py-2 mb-4">{error}</div>
        )}

        {esRegistro && (
          <div className="mb-4">
            <label className="text-gray-400 text-sm mb-1 block">Nombre completo</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 transition-colors" />
          </div>
        )}

        <div className="mb-4">
          <label className="text-gray-400 text-sm mb-1 block">Correo electrónico</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tucorreo@gmail.com"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 transition-colors" />
        </div>

        <div className="mb-6">
          <label className="text-gray-400 text-sm mb-1 block">Contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 transition-colors" />
        </div>

        <button onClick={handleSubmit} disabled={cargando}
          className="w-full bg-gray-400 hover:bg-gray-300 text-black font-bold py-3 rounded-xl transition-colors text-lg tracking-wide disabled:opacity-50">
          {cargando ? 'Cargando...' : esRegistro ? 'Crear Cuenta' : 'Ingresar'}
        </button>

        <button onClick={() => { setEsRegistro(!esRegistro); setError('') }}
          className="w-full text-center text-gray-500 text-sm mt-4 hover:text-gray-300 transition-colors">
          {esRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿Primera vez? Crear cuenta'}
        </button>
      </div>
    </div>
  )
}

// ── PANTALLAS ────────────────────────────────────────────
function ScreenHome({ colaborador, perfil, onMarcaje }) {
  const hora = new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
  const fecha = new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-gray-800 border-2 border-gray-500 overflow-hidden flex items-center justify-center">
          <span className="text-white font-black text-xl">{perfil?.nombre?.[0]?.toUpperCase() || '?'}</span>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Bienvenido de vuelta</p>
          <h2 className="text-white font-bold text-lg">{perfil?.nombre || colaborador.email.split('@')[0]}</h2>
          <p className="text-gray-500 text-xs capitalize">{fecha}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 mb-4 text-center">
        <p className="text-gray-400 text-sm mb-1">Hora actual</p>
        <p className="text-white text-5xl font-black tracking-widest">{hora}</p>
        <p className="text-gray-500 text-xs mt-2">Ve a Marcaje para registrar tu asistencia</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Tareas hoy</p>
          <p className="text-white text-3xl font-black">3</p>
          <p className="text-gray-500 text-xs">pendientes</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs mb-1">Mis puntos</p>
          <p className="text-gray-300 text-3xl font-black">{perfil?.puntos || 0}</p>
          <p className="text-gray-500 text-xs">acumulados</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-gray-600 rounded-xl p-4 flex items-center gap-3">
        <div className="text-2xl">🏆</div>
        <div>
          <p className="text-gray-300 font-bold text-sm">¡Sigue así!</p>
          <p className="text-gray-500 text-xs">Completa tus tareas para ganar reconocimientos</p>
        </div>
      </div>
    </div>
  )
}

function ScreenMarcaje({ colaborador, perfil }) {
  const [estado, setEstado] = useState('')
  const [cargando, setCargando] = useState(false)

  const registrarMarcaje = async (tipo) => {
    setCargando(true)
    try {
      await addDoc(collection(db, 'marcajes'), {
        uid: colaborador.uid,
        nombre: perfil?.nombre || colaborador.email,
        tipo,
        hora: serverTimestamp(),
        fecha: new Date().toLocaleDateString('es-GT')
      })
      setEstado(tipo === 'entrada'
        ? '✅ Entrada registrada correctamente'
        : '✅ Salida registrada correctamente')
    } catch (e) {
      setEstado('❌ Error al registrar. Intenta de nuevo.')
    }
    setCargando(false)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-sm text-center">
        <div className="text-6xl mb-4">⏱️</div>
        <h2 className="text-white font-bold text-xl mb-2">Registro de Asistencia</h2>
        <p className="text-gray-400 text-sm mb-6">
          Registra tu entrada o salida del gimnasio
        </p>

        {estado && (
          <div className="bg-zinc-800 rounded-xl px-4 py-3 mb-4 text-gray-300 text-sm">
            {estado}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => registrarMarcaje('entrada')}
            disabled={cargando}
            className="w-full bg-gray-400 hover:bg-gray-300 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
            {cargando ? 'Registrando...' : '🟢 Registrar Entrada'}
          </button>
          <button
            onClick={() => registrarMarcaje('salida')}
            disabled={cargando}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
            {cargando ? 'Registrando...' : '🔴 Registrar Salida'}
          </button>
        </div>

        <p className="text-gray-600 text-xs mt-4">
          {new Date().toLocaleString('es-GT')}
        </p>
      </div>
    </div>
  )
}

function ScreenTareas() {
  const tareas = [
    { id: 1, titulo: 'Limpiar equipos de cardio', completada: false, puntos: 20 },
    { id: 2, titulo: 'Atención al cliente en recepción', completada: true, puntos: 30 },
    { id: 3, titulo: 'Clase de spinning 7am', completada: false, puntos: 50 },
  ]
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <h2 className="text-white font-bold text-xl mb-4">Mis Tareas de Hoy</h2>
      <div className="space-y-3">
        {tareas.map(t => (
          <div key={t.id} className={`bg-zinc-900 border rounded-xl p-4 flex items-center gap-3 ${t.completada ? 'border-gray-600 opacity-60' : 'border-zinc-700'}`}>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${t.completada ? 'bg-gray-400 border-gray-400' : 'border-gray-500'}`}>
              {t.completada && <span className="text-black text-xs font-black">✓</span>}
            </div>
            <div className="flex-1">
              <p className={`font-medium text-sm ${t.completada ? 'line-through text-gray-500' : 'text-white'}`}>{t.titulo}</p>
              <p className="text-gray-500 text-xs">{t.puntos} puntos</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScreenCalendario() {
  const dias = ['L','M','M','J','V','S','D']
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <h2 className="text-white font-bold text-xl mb-4">Mi Calendario</h2>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 mb-4">
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {dias.map((d, i) => (
            <div key={i} className="text-gray-500 text-xs font-bold py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {Array.from({length: 30}, (_, i) => i + 1).map(d => (
            <div key={d} className={`py-2 rounded-lg text-sm font-medium ${d === new Date().getDate() ? 'bg-gray-400 text-black font-black' : 'text-gray-300 hover:bg-zinc-700'}`}>
              {d}
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <p className="text-white text-sm">Día laboral — Turno mañana</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-zinc-600"></div>
          <p className="text-gray-400 text-sm">Domingo — Día de descanso</p>
        </div>
      </div>
    </div>
  )
}

function ScreenReconocimientos() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <h2 className="text-white font-bold text-xl mb-4">Reconocimientos</h2>
      <div className="bg-zinc-900 border border-gray-500 rounded-2xl p-5 mb-4 text-center">
        <div className="text-5xl mb-2">🥇</div>
        <p className="text-gray-300 font-black text-lg">Colaborador del Mes</p>
        <p className="text-gray-400 text-sm mt-1">¡Completa tareas y acumula puntos para ganar!</p>
      </div>
      <div className="space-y-3">
        {[
          { icon: '⭐', titulo: 'Puntualidad perfecta', desc: '5 días sin tardanza', puntos: 100 },
          { icon: '💪', titulo: 'Tarea destacada', desc: 'Mejor calificación de la semana', puntos: 50 },
          { icon: '🎯', titulo: 'Meta cumplida', desc: 'Todas las tareas completadas', puntos: 75 },
        ].map((r, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex items-center gap-3">
            <div className="text-2xl">{r.icon}</div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">{r.titulo}</p>
              <p className="text-gray-500 text-xs">{r.desc}</p>
            </div>
            <div className="text-gray-400 font-black text-sm">+{r.puntos}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── NAV ──────────────────────────────────────────────────
const tabs = [
  { id: 'home', label: 'Inicio', icon: <IconHome /> },
  { id: 'marcaje', label: 'Marcaje', icon: <IconQR /> },
  { id: 'tareas', label: 'Tareas', icon: <IconTasks /> },
  { id: 'calendario', label: 'Horario', icon: <IconCalendar /> },
  { id: 'reconocimientos', label: 'Premios', icon: <IconStar /> },
]

// ── APP PRINCIPAL ─────────────────────────────────────────
export default function App() {
  const [colaborador, setColaborador] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [tab, setTab] = useState('home')
  const [iniciando, setIniciando] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setColaborador(user)
        const snap = await getDoc(doc(db, 'colaboradores', user.uid))
        if (snap.exists()) setPerfil(snap.data())
      } else {
        setColaborador(null)
        setPerfil(null)
      }
      setIniciando(false)
    })
    return unsub
  }, [])

  if (iniciando) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 overflow-hidden mx-auto mb-4">
            <img src="/logo.png" alt="logo" className="w-full h-full object-contain" />
          </div>
          <p className="text-gray-400 text-sm">Cargando Emporio Fitness...</p>
        </div>
      </div>
    )
  }

  if (!colaborador) return <Login />

  const renderScreen = () => {
    switch (tab) {
      case 'home': return <ScreenHome colaborador={colaborador} perfil={perfil} />
      case 'marcaje': return <ScreenMarcaje colaborador={colaborador} perfil={perfil} />
      case 'tareas': return <ScreenTareas />
      case 'calendario': return <ScreenCalendario />
      case 'reconocimientos': return <ScreenReconocimientos />
      default: return <ScreenHome colaborador={colaborador} perfil={perfil} />
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col max-w-sm mx-auto relative">
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden">
            <img src="/logo.png" alt="logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-white font-bold text-sm tracking-wider">EMPORIO FITNESS</span>
        </div>
        <button
          onClick={() => signOut(auth)}
          className="text-gray-500 hover:text-gray-300 text-xs transition-colors">
          Salir
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {renderScreen()}
      </div>

      <div className="bg-zinc-900 border-t border-zinc-800 px-2 py-2 flex justify-around">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${tab === t.id ? 'text-gray-300' : 'text-zinc-600 hover:text-zinc-400'}`}>
            {t.icon}
            <span className="text-xs font-medium">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}