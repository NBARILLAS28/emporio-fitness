import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { db } from './firebase'
import { doc, setDoc, getDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore'
import { Html5Qrcode } from 'html5-qrcode'

// ── UTILIDAD: genera código del día ──────────────────────
const generarCodigoDelDia = () => {
  const hoy = new Date().toLocaleDateString('es-GT')
  const secreto = 'EMPORIO2026'
  return btoa(`${secreto}-${hoy}`).replace(/=/g, '')
}

// ── TABLET: pantalla que muestra el QR ──────────────────
export function TabletQR() {
  const [codigo, setCodigo] = useState('')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')

  useEffect(() => {
    const actualizar = async () => {
      const codigoHoy = generarCodigoDelDia()
      const hoy = new Date().toLocaleDateString('es-GT')
      setCodigo(codigoHoy)
      setFecha(hoy)
      setHora(new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }))

      // Guardar código del día en Firebase
      await setDoc(doc(db, 'qr_diario', 'hoy'), {
        codigo: codigoHoy,
        fecha: hoy,
        actualizadoEn: serverTimestamp()
      })
    }

    actualizar()
    const intervalo = setInterval(() => {
      setHora(new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }))
    }, 60000)

    return () => clearInterval(intervalo)
  }, [])

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-gray-500 overflow-hidden mx-auto mb-4">
          <img src="/logo.png" alt="logo" className="w-full h-full object-contain p-1" />
        </div>
        <h1 className="text-2xl font-black tracking-widest text-gray-300">EMPORIO FITNESS</h1>
        <p className="text-gray-500 text-sm mt-1">Sistema de Marcaje — Tablet</p>
      </div>

      {/* QR Code */}
      <div className="bg-white rounded-3xl p-6 mb-6 shadow-2xl shadow-gray-500/20">
        {codigo && (
          <QRCodeSVG
            value={codigo}
            size={220}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
          />
        )}
      </div>

      {/* Info */}
      <div className="text-center mb-4">
        <p className="text-gray-400 text-sm">Escanea con tu app para registrar asistencia</p>
        <p className="text-gray-600 text-xs mt-1">Código válido para hoy: {fecha}</p>
      </div>

      {/* Hora */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl px-8 py-4 text-center">
        <p className="text-gray-500 text-xs mb-1">Hora actual</p>
        <p className="text-white text-4xl font-black">{hora}</p>
      </div>

      <p className="text-gray-700 text-xs mt-6">El código se renueva automáticamente cada día</p>
    </div>
  )
}

// ── ESCÁNER: el colaborador escanea el QR ────────────────
export function EscanerQR({ colaborador, perfil, onMarcajeExitoso }) {
  const [estado, setEstado] = useState('idle') // idle | escaneando | exito | error
  const [mensaje, setMensaje] = useState('')
  const [tipoMarcaje, setTipoMarcaje] = useState('entrada')
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)

  const iniciarEscaneo = async () => {
    setEstado('escaneando')
    try {
      const html5Qr = new Html5Qrcode('qr-reader')
      html5QrRef.current = html5Qr

      await html5Qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (codigoLeido) => {
          await html5Qr.stop()
          await verificarYRegistrar(codigoLeido)
        },
        () => {} // errores de frame ignorados
      )
    } catch (e) {
      setEstado('error')
      setMensaje('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }

  const detenerEscaneo = async () => {
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop() } catch (e) {}
    }
    setEstado('idle')
  }

  const verificarYRegistrar = async (codigoLeido) => {
    try {
      // Verificar contra Firebase
      const snap = await getDoc(doc(db, 'qr_diario', 'hoy'))
      if (!snap.exists()) {
        setEstado('error')
        setMensaje('❌ No hay código QR activo hoy. Contacta al administrador.')
        return
      }

      const { codigo: codigoValido, fecha } = snap.data()

      if (codigoLeido !== codigoValido) {
        setEstado('error')
        setMensaje('❌ Código QR inválido o expirado.')
        return
      }

      // Registrar marcaje
      await addDoc(collection(db, 'marcajes'), {
        uid: colaborador.uid,
        nombre: perfil?.nombre || colaborador.email,
        tipo: tipoMarcaje,
        hora: serverTimestamp(),
        fecha: fecha,
        metodo: 'QR'
      })

      setEstado('exito')
      setMensaje(tipoMarcaje === 'entrada'
        ? '✅ ¡Entrada registrada! Buen día.'
        : '✅ ¡Salida registrada! Hasta mañana.')

      if (onMarcajeExitoso) onMarcajeExitoso(tipoMarcaje)

    } catch (e) {
      setEstado('error')
      setMensaje('❌ Error al registrar. Intenta de nuevo.')
    }
  }

  useEffect(() => {
    return () => {
      if (html5QrRef.current) {
        try { html5QrRef.current.stop() } catch (e) {}
      }
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm">

        {/* Selector entrada/salida */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <button
            onClick={() => setTipoMarcaje('entrada')}
            className={`py-3 rounded-xl font-bold text-sm transition-colors ${tipoMarcaje === 'entrada' ? 'bg-gray-400 text-black' : 'bg-zinc-800 text-gray-400'}`}>
            🟢 Entrada
          </button>
          <button
            onClick={() => setTipoMarcaje('salida')}
            className={`py-3 rounded-xl font-bold text-sm transition-colors ${tipoMarcaje === 'salida' ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-gray-400'}`}>
            🔴 Salida
          </button>
        </div>

        {/* Área del escáner */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 mb-4">
          {estado === 'escaneando' && (
            <div>
              <div id="qr-reader" className="rounded-xl overflow-hidden mb-3"></div>
              <button onClick={detenerEscaneo}
                className="w-full bg-zinc-700 text-gray-300 py-2 rounded-xl text-sm">
                Cancelar
              </button>
            </div>
          )}

          {estado === 'idle' && (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">📷</div>
              <p className="text-white font-bold mb-1">Escanear código QR</p>
              <p className="text-gray-500 text-sm mb-4">
                Apunta tu cámara al código QR de la tablet del gimnasio
              </p>
              <button onClick={iniciarEscaneo}
                className="w-full bg-gray-400 hover:bg-gray-300 text-black font-bold py-3 rounded-xl transition-colors">
                Abrir cámara
              </button>
            </div>
          )}

          {estado === 'exito' && (
            <div className="text-center py-6">
              <div className="text-5xl mb-3">🎉</div>
              <p className="text-gray-300 font-bold text-lg">{mensaje}</p>
              <p className="text-gray-500 text-sm mt-2">
                {new Date().toLocaleTimeString('es-GT')}
              </p>
              <button onClick={() => setEstado('idle')}
                className="w-full bg-zinc-700 text-gray-300 py-2 rounded-xl text-sm mt-4">
                Nuevo marcaje
              </button>
            </div>
          )}

          {estado === 'error' && (
            <div className="text-center py-6">
              <div className="text-5xl mb-3">⚠️</div>
              <p className="text-red-400 font-bold">{mensaje}</p>
              <button onClick={() => setEstado('idle')}
                className="w-full bg-zinc-700 text-gray-300 py-2 rounded-xl text-sm mt-4">
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>

        <p className="text-gray-600 text-xs text-center">
          El código QR cambia cada día automáticamente
        </p>
      </div>
    </div>
  )
}