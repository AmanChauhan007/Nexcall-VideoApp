import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const [name, setName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()

  const generateRoom = async () => {
    try {
      const res = await fetch('/api/rooms/generate', { method: 'POST' })
      const data = await res.json()
      setRoomId(data.roomId)
    } catch {
      const id = Math.random().toString(36).substring(2, 10).toUpperCase()
      setRoomId(id)
    }
  }

  const handleJoin = () => {
    if (!name.trim() || !roomId.trim()) return
    const userId = crypto.randomUUID()
    localStorage.setItem('vc_user', JSON.stringify({ userId, userName: name.trim() }))
    navigate(`/room/${roomId.trim().toUpperCase()}`)
  }

  const copyRoom = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(79,124,255,0.15) 0%, transparent 60%), #050810'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '460px', width: '100%' }}>

        {/* Logo */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '20px',
            background: 'linear-gradient(135deg,#4f7cff,#a259ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: '32px',
            boxShadow: '0 0 48px rgba(79,124,255,0.35)'
          }}>📹</div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: 'clamp(38px,6vw,56px)', letterSpacing: '-2px',
            color: '#f1f5f9', margin: 0
          }}>
            Nex<span style={{ color: '#4f7cff' }}>Call</span>
          </h1>
          <p style={{ color: '#64748b', marginTop: '10px', fontSize: '15px', lineHeight: 1.5 }}>
            Crystal-clear video calling.<br />No downloads. No accounts.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(13,17,23,0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px', padding: '36px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.4)'
        }}>
          <input
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#f1f5f9', fontSize: '15px', marginBottom: '12px',
              boxSizing: 'border-box'
            }}
          />

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <input
              placeholder="Room ID (e.g. AB12CD34)"
              value={roomId}
              onChange={e => setRoomId(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              style={{
                flex: 1, padding: '14px 16px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f1f5f9', fontSize: '14px', letterSpacing: '2px',
                fontFamily: 'Syne, sans-serif', fontWeight: 600, boxSizing: 'border-box'
              }}
            />
            {roomId && (
              <button
                onClick={copyRoom}
                style={{
                  padding: '14px 14px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: copied ? '#22c55e' : '#94a3b8', fontSize: '18px', cursor: 'pointer'
                }}
                title="Copy Room ID"
              >{copied ? '✓' : '📋'}</button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={generateRoom}
              style={{
                flex: 1, padding: '15px', borderRadius: '12px',
                background: 'rgba(79,124,255,0.12)', border: '1px solid rgba(79,124,255,0.25)',
                color: '#4f7cff', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              + New Room
            </button>
            <button
              onClick={handleJoin}
              disabled={!name.trim() || !roomId.trim()}
              style={{
                flex: 2, padding: '15px', borderRadius: '12px',
                background: (!name.trim() || !roomId.trim())
                  ? 'rgba(79,124,255,0.25)'
                  : 'linear-gradient(135deg,#4f7cff,#a259ff)',
                color: 'white', fontSize: '15px', fontWeight: 700,
                fontFamily: 'Syne, sans-serif', letterSpacing: '0.5px',
                cursor: (!name.trim() || !roomId.trim()) ? 'not-allowed' : 'pointer',
                boxShadow: (!name.trim() || !roomId.trim()) ? 'none' : '0 8px 28px rgba(79,124,255,0.4)',
                border: 'none', transition: 'all 0.2s'
              }}
            >
              Join Room →
            </button>
          </div>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '32px', flexWrap: 'wrap' }}>
          {[['🔒', 'Peer-to-peer'], ['⚡', 'Ultra-low latency'], ['💬', 'Live chat']].map(([icon, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '13px' }}>
              <span style={{ fontSize: '14px' }}>{icon}</span>{label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
