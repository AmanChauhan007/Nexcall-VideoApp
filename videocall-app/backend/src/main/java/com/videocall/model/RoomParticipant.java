package com.videocall.model;

import lombok.Data;
import lombok.AllArgsConstructor;
import org.springframework.web.socket.WebSocketSession;

@Data
@AllArgsConstructor
public class RoomParticipant {
    private String userId;
    private String userName;
    private WebSocketSession session;
    private boolean audioMuted;
    private boolean videoMuted;
}
