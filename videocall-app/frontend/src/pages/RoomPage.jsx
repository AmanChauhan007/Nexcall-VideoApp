import React, { useRef, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWebRTC } from '../hooks/useWebRTC'

// ── Video Tile ────────────────────────────────────────────────
function VideoTile({ stream, label, muted = false, isLocal, isAudioOff, isVideoOff, size = 'normal' }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const isSmall = size === 'small'

  return (
    <div style={{
      position: 'relative', borderRadius: isSmall ? '12px' : '16px',
      overflow: 'hidden', background: '#0d1117',
      border: '1px solid rgba(255,255,255,0.07)',
      aspectRatio: '16/9', width: '100%'
    }}>
      {stream && !isVideoOff ? (
        <video
          ref={videoRef} autoPlay muted={muted} playsInline
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: isLocal ? 'scaleX(-1)' : 'none', display: 'block'
          }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '8px',
          background: 'linear-gradient(135deg, #0d1117 0%, #161b27 100%)'
        }}>
          <div style={{
            width: isSmall ? 40 : 56, height: isSmall ? 40 : 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#4f7cff,#a259ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isSmall ? '16px' : '22px', fontFamily: 'Syne, sans-serif',
            fontWeight: 700, color: 'white'
          }}>
            {label?.[0]?.toUpperCase() || '?'}
          </div>
          {!isSmall && <span style={{ color: '#64748b', fontSize: '12px' }}>
            {isVideoOff ? 'Camera off' : 'No video'}
          </span>}
        </div>
      )}

      {/* Name badge */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(0,0,0,0.65)', borderRadius: '7px',
        padding: '3px 8px', backdropFilter: 'blur(8px)'
      }}>
        {isAudioOff && <span style={{ fontSize: '10px' }}>🔇</span>}
        <span style={{ color: 'white', fontSize: '12px', fontWeight: 500 }}>
          {label}{isLocal ? ' (You)' : ''}
        </span>
      </div>

      {/* Local indicator */}
      {isLocal && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(79,124,255,0.8)', borderRadius: '5px',
          padding: '2px 7px', fontSize: '10px', color: 'white', fontWeight: 600
        }}>YOU</div>
      )}
    </div>
  )
}

// ── Control Button ────────────────────────────────────────────
function CtrlBtn({ onClick, active, icon, offIcon, label }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={label}
      style={{
        width: 52, height: 52, borderRadius: '14px',
        background: active
          ? hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)'
          : hover ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.15)',
        border: active
          ? '1px solid rgba(255,255,255,0.12)'
          : '1px solid rgba(239,68,68,0.3)',
        fontSize: '20px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', transition: 'all 0.15s', cursor: 'pointer'
      }}
    >
      {active ? icon : (offIcon || icon)}
    </button>
  )
}

// ── Main Room Page ────────────────────────────────────────────
export default function RoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [chatInput, setChatInput] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [unread, setUnread] = useState(0)
  const chatEndRef = useRef(null)

  const stored = (() => {
    try { return JSON.parse(localStorage.getItem('vc_user') || '{}') }
    catch { return {} }
  })()
  const userId = stored.userId || (() => {
    const id = crypto.randomUUID()
    localStorage.setItem('vc_user', JSON.stringify({ userId: id, userName: 'Guest' }))
    return id
  })()
  const userName = stored.userName || 'Guest'

  const {
    localStream, remoteStreams, participants, messages,
    isAudioMuted, isVideoMuted, connectionStatus, mediaStates,
    toggleAudio, toggleVideo, sendChatMessage, leaveRoom
  } = useWebRTC({ roomId, userId, userName })

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (!showChat && messages.length > 0) {
      setUnread(u => u + 1)
    }
  }, [messages])

  useEffect(() => {
    if (showChat) setUnread(0)
  }, [showChat])

  const handleLeave = () => {
    leaveRoom()
    navigate('/')
  }

  const handleSendChat = (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    sendChatMessage(chatInput.trim())
    setChatInput('')
  }

  // Build streams list
  const allStreams = [
    {
      id: userId, name: userName, stream: localStream, isLocal: true,
      audioOff: isAudioMuted, videoOff: isVideoMuted
    },
    ...Object.entries(remoteStreams).map(([id, { stream, userName: uName }]) => ({
      id, name: uName, stream, isLocal: false,
      audioOff: mediaStates[id]?.audioMuted,
      videoOff: mediaStates[id]?.videoMuted
    }))
  ]

  const count = allStreams.length
  const gridStyle = {
    display: 'grid',
    gap: '10px',
    gridTemplateColumns: count === 1 ? '1fr' : count <= 4 ? 'repeat(2,1fr)' : 'repeat(3,1fr)',
    maxWidth: count === 1 ? '640px' : '100%',
    margin: '0 auto',
    width: '100%'
  }

  const totalParticipants = participants.length + 1

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#050810', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '19px', color: '#f1f5f9' }}>
            Nex<span style={{ color: '#4f7cff' }}>Call</span>
          </span>
          <div style={{
            padding: '3px 12px', background: 'rgba(79,124,255,0.1)',
            border: '1px solid rgba(79,124,255,0.2)', borderRadius: '20px',
            color: '#4f7cff', fontSize: '12px', fontFamily: 'Syne, sans-serif',
            fontWeight: 700, letterSpacing: '1.5px'
          }}>{roomId}</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '12px',
            color: connectionStatus === 'connected' ? '#22c55e' : '#ef4444'
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: connectionStatus === 'connected' ? '#22c55e' : '#ef4444'
            }} />
            {connectionStatus === 'connected' ? `${totalParticipants} in call` : connectionStatus}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { navigator.clipboard.writeText(window.location.href) }}
            style={{
              padding: '7px 14px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#94a3b8', fontSize: '12px', cursor: 'pointer'
            }}
          >📋 Copy Link</button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Videos */}
        <div style={{ flex: 1, padding: '16px', overflow: 'auto', display: 'flex', alignItems: count === 1 ? 'center' : 'flex-start', justifyContent: 'center' }}>
          <div style={gridStyle}>
            {allStreams.map(s => (
              <VideoTile
                key={s.id}
                stream={s.stream}
                label={s.name}
                muted={s.isLocal}
                isLocal={s.isLocal}
                isAudioOff={s.audioOff}
                isVideoOff={s.videoOff}
                size={count > 4 ? 'small' : 'normal'}
              />
            ))}
          </div>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div style={{
            width: '290px', borderLeft: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column',
            background: 'rgba(13,17,23,0.98)', flexShrink: 0
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#f1f5f9', fontSize: '14px', margin: 0 }}>Chat</h3>
              <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {messages.length === 0 && (
                <p style={{ color: '#334155', textAlign: 'center', fontSize: '13px', marginTop: '24px' }}>
                  No messages yet.<br />Say hello! 👋
                </p>
              )}
              {messages.map(m => (
                <div key={m.id} style={{
                  padding: '9px 12px', borderRadius: '10px',
                  background: m.isSelf ? 'rgba(79,124,255,0.15)' : 'rgba(255,255,255,0.04)',
                  alignSelf: m.isSelf ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  border: m.isSelf ? '1px solid rgba(79,124,255,0.2)' : '1px solid rgba(255,255,255,0.06)'
                }}>
                  {!m.isSelf && <p style={{ color: '#4f7cff', fontSize: '11px', fontWeight: 600, marginBottom: '3px', margin: '0 0 3px 0' }}>{m.userName}</p>}
                  <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.5, margin: 0, wordBreak: 'break-word' }}>{m.message}</p>
                  <p style={{ color: '#334155', fontSize: '10px', margin: '4px 0 0', textAlign: m.isSelf ? 'right' : 'left' }}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChat} style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px' }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Message..."
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f1f5f9', fontSize: '13px', boxSizing: 'border-box'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '9px 14px', borderRadius: '10px',
                  background: chatInput.trim() ? '#4f7cff' : 'rgba(79,124,255,0.2)',
                  color: 'white', fontSize: '14px', cursor: chatInput.trim() ? 'pointer' : 'default',
                  border: 'none', transition: 'background 0.15s'
                }}
              >→</button>
            </form>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div style={{
        padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        background: 'rgba(13,17,23,0.98)', flexShrink: 0
      }}>
        <CtrlBtn onClick={toggleAudio} active={!isAudioMuted} icon="🎙️" offIcon="🔇" label={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'} />
        <CtrlBtn onClick={toggleVideo} active={!isVideoMuted} icon="📹" offIcon="📷" label={isVideoMuted ? 'Start Video' : 'Stop Video'} />

        {/* Chat button with badge */}
        <div style={{ position: 'relative' }}>
          <CtrlBtn
            onClick={() => { setShowChat(p => !p); setUnread(0) }}
            active={showChat}
            icon="💬"
            label="Toggle Chat"
          />
          {unread > 0 && !showChat && (
            <div style={{
              position: 'absolute', top: -4, right: -4,
              width: 18, height: 18, background: '#4f7cff', borderRadius: '50%',
              fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700
            }}>{unread}</div>
          )}
        </div>

        {/* Spacer */}
        <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

        {/* Leave */}
        <button
          onClick={handleLeave}
          style={{
            padding: '13px 28px', borderRadius: '14px',
            background: 'linear-gradient(135deg,#ef4444,#dc2626)',
            color: 'white', fontSize: '14px', fontWeight: 700,
            fontFamily: 'Syne, sans-serif', letterSpacing: '0.5px',
            boxShadow: '0 4px 20px rgba(239,68,68,0.35)',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          Leave Call
        </button>
      </div>
    </div>
  )
}
