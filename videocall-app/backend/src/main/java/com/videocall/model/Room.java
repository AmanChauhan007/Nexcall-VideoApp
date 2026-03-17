package com.videocall.model;

import lombok.Data;
import java.util.*;

@Data
public class Room {
    private String roomId;
    private Map<String, RoomParticipant> participants = new LinkedHashMap<>();
    private long createdAt = System.currentTimeMillis();

    public Room(String roomId) {
        this.roomId = roomId;
    }

    public void addParticipant(RoomParticipant participant) {
        participants.put(participant.getUserId(), participant);
    }

    public void removeParticipant(String userId) {
        participants.remove(userId);
    }

    public boolean isEmpty() {
        return participants.isEmpty();
    }

    public int size() {
        return participants.size();
    }
}
