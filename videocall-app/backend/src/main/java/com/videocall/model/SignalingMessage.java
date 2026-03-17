package com.videocall.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SignalingMessage {

    // Types: join, offer, answer, ice-candidate, leave, chat, mute-audio, mute-video, user-list
    private String type;

    // Room info
    private String roomId;
    private String userId;
    private String userName;

    // WebRTC payloads
    private Object sdp;       // for offer/answer
    private Object candidate; // for ice-candidate
    private String targetUserId;

    // Chat
    private String message;

    // Media state
    private Boolean audioMuted;
    private Boolean videoMuted;
}
