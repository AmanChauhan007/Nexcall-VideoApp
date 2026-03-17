import { useRef, useState, useCallback, useEffect } from 'react'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
}

const WS_URL = 'ws://localhost:8080/ws/signaling'

export function useWebRTC({ roomId, userId, userName }) {
  const wsRef = useRef(null)
  const localStreamRef = useRef(null)
  const peerConnectionsRef = useRef({}) // userId -> RTCPeerConnection
  const pendingCandidatesRef = useRef({}) // userId -> []

  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState({}) // userId -> {stream, userName}
  const [participants, setParticipants] = useState([]) // [{userId, userName}]
  const [messages, setMessages] = useState([])
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [mediaStates, setMediaStates] = useState({}) // userId -> {audioMuted, videoMuted}

  const sendWs = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  // Create peer connection for a remote user
  const createPeerConnection = useCallback((remoteUserId, remoteUserName) => {
    if (peerConnectionsRef.current[remoteUserId]) {
      return peerConnectionsRef.current[remoteUserId]
    }

    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current)
      })
    }

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendWs({
          type: 'ice-candidate',
          roomId,
          userId,
          targetUserId: remoteUserId,
          candidate: event.candidate
        })
      }
    }

    // Remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams
      setRemoteStreams(prev => ({
        ...prev,
        [remoteUserId]: { stream: remoteStream, userName: remoteUserName }
      }))
    }

    pc.onconnectionstatechange = () => {
      console.log(`Peer ${remoteUserId} state: ${pc.connectionState}`)
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setRemoteStreams(prev => {
          const updated = { ...prev }
          delete updated[remoteUserId]
          return updated
        })
      }
    }

    peerConnectionsRef.current[remoteUserId] = pc
    return pc
  }, [roomId, userId, sendWs])

  const handleMessage = useCallback(async (data) => {
    switch (data.type) {
      case 'joined': {
        // Server tells us we've joined and here are existing users
        setParticipants(data.users || [])
        // Initiate calls to all existing users
        for (const user of (data.users || [])) {
          const pc = createPeerConnection(user.userId, user.userName)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          sendWs({
            type: 'offer',
            roomId,
            userId,
            userName,
            targetUserId: user.userId,
            sdp: offer
          })
        }
        break
      }

      case 'user-joined': {
        setParticipants(prev => [...prev.filter(p => p.userId !== data.userId), { userId: data.userId, userName: data.userName }])
        break
      }

      case 'offer': {
        const pc = createPeerConnection(data.fromUserId, data.fromUserName)
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))

        // Flush pending ICE candidates
        if (pendingCandidatesRef.current[data.fromUserId]) {
          for (const c of pendingCandidatesRef.current[data.fromUserId]) {
            await pc.addIceCandidate(new RTCIceCandidate(c))
          }
          delete pendingCandidatesRef.current[data.fromUserId]
        }

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        sendWs({
          type: 'answer',
          roomId,
          userId,
          targetUserId: data.fromUserId,
          sdp: answer
        })
        break
      }

      case 'answer': {
        const pc = peerConnectionsRef.current[data.fromUserId]
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
        }
        break
      }

      case 'ice-candidate': {
        const pc = peerConnectionsRef.current[data.fromUserId]
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
        } else {
          // Buffer candidate
          if (!pendingCandidatesRef.current[data.fromUserId]) {
            pendingCandidatesRef.current[data.fromUserId] = []
          }
          pendingCandidatesRef.current[data.fromUserId].push(data.candidate)
        }
        break
      }

      case 'user-left': {
        const pc = peerConnectionsRef.current[data.userId]
        if (pc) {
          pc.close()
          delete peerConnectionsRef.current[data.userId]
        }
        setParticipants(prev => prev.filter(p => p.userId !== data.userId))
        setRemoteStreams(prev => {
          const updated = { ...prev }
          delete updated[data.userId]
          return updated
        })
        break
      }

      case 'chat': {
        setMessages(prev => [...prev, {
          id: Date.now(),
          userId: data.userId,
          userName: data.userName,
          message: data.message,
          timestamp: data.timestamp,
          isSelf: data.userId === userId
        }])
        break
      }

      case 'mute-audio':
      case 'mute-video': {
        setMediaStates(prev => ({
          ...prev,
          [data.userId]: {
            ...(prev[data.userId] || {}),
            audioMuted: data.audioMuted ?? prev[data.userId]?.audioMuted,
            videoMuted: data.videoMuted ?? prev[data.userId]?.videoMuted,
          }
        }))
        break
      }
    }
  }, [createPeerConnection, roomId, userId, userName, sendWs])

  // Initialize media and WebSocket
  const init = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      setLocalStream(stream)
    } catch (err) {
      console.error('Media error:', err)
      // Try audio only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        localStreamRef.current = stream
        setLocalStream(stream)
      } catch (e) {
        console.error('No media available')
      }
    }

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionStatus('connected')
      ws.send(JSON.stringify({ type: 'join', roomId, userId, userName }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleMessage(data)
      } catch (e) {
        console.error('Parse error', e)
      }
    }

    ws.onclose = () => setConnectionStatus('disconnected')
    ws.onerror = () => setConnectionStatus('error')
  }, [roomId, userId, userName, handleMessage])

  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return
    const audioTrack = localStreamRef.current.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsAudioMuted(!audioTrack.enabled)
      sendWs({ type: 'mute-audio', roomId, userId, audioMuted: !audioTrack.enabled })
    }
  }, [roomId, userId, sendWs])

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return
    const videoTrack = localStreamRef.current.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setIsVideoMuted(!videoTrack.enabled)
      sendWs({ type: 'mute-video', roomId, userId, videoMuted: !videoTrack.enabled })
    }
  }, [roomId, userId, sendWs])

  const sendChatMessage = useCallback((message) => {
    sendWs({ type: 'chat', roomId, userId, userName, message })
  }, [roomId, userId, userName, sendWs])

  const leaveRoom = useCallback(() => {
    sendWs({ type: 'leave', roomId, userId, userName })

    // Cleanup peer connections
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close())
    peerConnectionsRef.current = {}

    // Stop local media
    localStreamRef.current?.getTracks().forEach(t => t.stop())

    wsRef.current?.close()
  }, [roomId, userId, userName, sendWs])

  useEffect(() => {
    if (roomId && userId) {
      init()
    }
    return () => {
      leaveRoom()
    }
  }, []) // eslint-disable-line

  return {
    localStream,
    remoteStreams,
    participants,
    messages,
    isAudioMuted,
    isVideoMuted,
    connectionStatus,
    mediaStates,
    toggleAudio,
    toggleVideo,
    sendChatMessage,
    leaveRoom
  }
}
