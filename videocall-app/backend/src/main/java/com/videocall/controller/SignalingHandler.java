package com.videocall.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.videocall.model.RoomParticipant;
import com.videocall.model.SignalingMessage;
import com.videocall.service.RoomService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;

@Component
public class SignalingHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(SignalingHandler.class);

    @Autowired
    private RoomService roomService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        logger.info("New WebSocket connection: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        SignalingMessage msg = objectMapper.readValue(message.getPayload(), SignalingMessage.class);
        logger.info("Received [{}] from user={} room={}", msg.getType(), msg.getUserId(), msg.getRoomId());

        switch (msg.getType()) {
            case "join" -> handleJoin(session, msg);
            case "offer" -> handleOffer(session, msg);
            case "answer" -> handleAnswer(session, msg);
            case "ice-candidate" -> handleIceCandidate(session, msg);
            case "leave" -> handleLeave(session, msg);
            case "chat" -> handleChat(session, msg);
            case "mute-audio", "mute-video" -> handleMediaToggle(session, msg);
            default -> logger.warn("Unknown message type: {}", msg.getType());
        }
    }

    private void handleJoin(WebSocketSession session, SignalingMessage msg) throws IOException {
        String roomId = msg.getRoomId();
        String userId = msg.getUserId();
        String userName = msg.getUserName();

        // Get existing participants BEFORE adding new one
        List<RoomParticipant> existingParticipants = roomService.getParticipants(roomId);

        // Add new participant
        RoomParticipant participant = new RoomParticipant(userId, userName, session, false, false);
        roomService.addParticipant(roomId, participant);

        // Send existing users list to the new joiner
        List<Map<String, String>> userList = new ArrayList<>();
        for (RoomParticipant p : existingParticipants) {
            Map<String, String> userInfo = new HashMap<>();
            userInfo.put("userId", p.getUserId());
            userInfo.put("userName", p.getUserName());
            userList.add(userInfo);
        }

        Map<String, Object> joinedMsg = new HashMap<>();
        joinedMsg.put("type", "joined");
        joinedMsg.put("roomId", roomId);
        joinedMsg.put("userId", userId);
        joinedMsg.put("users", userList);
        sendToSession(session, joinedMsg);

        // Notify existing participants about the new user
        Map<String, Object> newUserMsg = new HashMap<>();
        newUserMsg.put("type", "user-joined");
        newUserMsg.put("userId", userId);
        newUserMsg.put("userName", userName);
        broadcastToRoom(roomId, newUserMsg, userId);

        logger.info("User {} ({}) joined room {}. Total: {}", userName, userId, roomId,
                roomService.getParticipants(roomId).size());
    }

    private void handleOffer(WebSocketSession session, SignalingMessage msg) throws IOException {
        RoomParticipant target = roomService.getParticipant(msg.getRoomId(), msg.getTargetUserId());
        if (target != null) {
            Map<String, Object> offerMsg = new HashMap<>();
            offerMsg.put("type", "offer");
            offerMsg.put("sdp", msg.getSdp());
            offerMsg.put("fromUserId", msg.getUserId());
            offerMsg.put("fromUserName", msg.getUserName());
            sendToSession(target.getSession(), offerMsg);
        }
    }

    private void handleAnswer(WebSocketSession session, SignalingMessage msg) throws IOException {
        RoomParticipant target = roomService.getParticipant(msg.getRoomId(), msg.getTargetUserId());
        if (target != null) {
            Map<String, Object> answerMsg = new HashMap<>();
            answerMsg.put("type", "answer");
            answerMsg.put("sdp", msg.getSdp());
            answerMsg.put("fromUserId", msg.getUserId());
            sendToSession(target.getSession(), answerMsg);
        }
    }

    private void handleIceCandidate(WebSocketSession session, SignalingMessage msg) throws IOException {
        RoomParticipant target = roomService.getParticipant(msg.getRoomId(), msg.getTargetUserId());
        if (target != null) {
            Map<String, Object> iceMsg = new HashMap<>();
            iceMsg.put("type", "ice-candidate");
            iceMsg.put("candidate", msg.getCandidate());
            iceMsg.put("fromUserId", msg.getUserId());
            sendToSession(target.getSession(), iceMsg);
        }
    }

    private void handleLeave(WebSocketSession session, SignalingMessage msg) throws IOException {
        String roomId = msg.getRoomId();
        String userId = msg.getUserId();

        roomService.removeParticipant(roomId, userId);

        Map<String, Object> leaveMsg = new HashMap<>();
        leaveMsg.put("type", "user-left");
        leaveMsg.put("userId", userId);
        leaveMsg.put("userName", msg.getUserName());
        broadcastToRoom(roomId, leaveMsg, null);

        logger.info("User {} left room {}", userId, roomId);
    }

    private void handleChat(WebSocketSession session, SignalingMessage msg) throws IOException {
        Map<String, Object> chatMsg = new HashMap<>();
        chatMsg.put("type", "chat");
        chatMsg.put("userId", msg.getUserId());
        chatMsg.put("userName", msg.getUserName());
        chatMsg.put("message", msg.getMessage());
        chatMsg.put("timestamp", System.currentTimeMillis());
        broadcastToRoom(msg.getRoomId(), chatMsg, null);
    }

    private void handleMediaToggle(WebSocketSession session, SignalingMessage msg) throws IOException {
        RoomParticipant participant = roomService.getParticipant(msg.getRoomId(), msg.getUserId());
        if (participant != null) {
            if ("mute-audio".equals(msg.getType())) {
                participant.setAudioMuted(Boolean.TRUE.equals(msg.getAudioMuted()));
            } else {
                participant.setVideoMuted(Boolean.TRUE.equals(msg.getVideoMuted()));
            }
        }

        Map<String, Object> mediaMsg = new HashMap<>();
        mediaMsg.put("type", msg.getType());
        mediaMsg.put("userId", msg.getUserId());
        mediaMsg.put("audioMuted", msg.getAudioMuted());
        mediaMsg.put("videoMuted", msg.getVideoMuted());
        broadcastToRoom(msg.getRoomId(), mediaMsg, msg.getUserId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        // Auto-remove on disconnect
        String roomId = roomService.findRoomBySession(session.getId());
        RoomParticipant participant = roomService.findParticipantBySession(session.getId());

        if (roomId != null && participant != null) {
            roomService.removeParticipant(roomId, participant.getUserId());

            Map<String, Object> leaveMsg = new HashMap<>();
            leaveMsg.put("type", "user-left");
            leaveMsg.put("userId", participant.getUserId());
            leaveMsg.put("userName", participant.getUserName());
            broadcastToRoom(roomId, leaveMsg, null);

            logger.info("Connection closed for user {} in room {}", participant.getUserName(), roomId);
        }
    }

    private void broadcastToRoom(String roomId, Map<String, Object> message, String excludeUserId) {
        List<RoomParticipant> participants = roomService.getParticipants(roomId);
        String json;
        try {
            json = objectMapper.writeValueAsString(message);
        } catch (Exception e) {
            logger.error("Failed to serialize message", e);
            return;
        }

        for (RoomParticipant p : participants) {
            if (excludeUserId != null && p.getUserId().equals(excludeUserId)) continue;
            if (p.getSession().isOpen()) {
                try {
                    p.getSession().sendMessage(new TextMessage(json));
                } catch (IOException e) {
                    logger.error("Failed to send to {}", p.getUserId(), e);
                }
            }
        }
    }

    private void sendToSession(WebSocketSession session, Map<String, Object> message) throws IOException {
        if (session.isOpen()) {
            String json = objectMapper.writeValueAsString(message);
            session.sendMessage(new TextMessage(json));
        }
    }
}
