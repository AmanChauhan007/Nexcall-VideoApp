package com.videocall.service;

import com.videocall.model.Room;
import com.videocall.model.RoomParticipant;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomService {

    private final Map<String, Room> rooms = new ConcurrentHashMap<>();

    public Room getOrCreateRoom(String roomId) {
        return rooms.computeIfAbsent(roomId, Room::new);
    }

    public Room getRoom(String roomId) {
        return rooms.get(roomId);
    }

    public void addParticipant(String roomId, RoomParticipant participant) {
        Room room = getOrCreateRoom(roomId);
        room.addParticipant(participant);
    }

    public void removeParticipant(String roomId, String userId) {
        Room room = rooms.get(roomId);
        if (room != null) {
            room.removeParticipant(userId);
            if (room.isEmpty()) {
                rooms.remove(roomId);
            }
        }
    }

    public List<RoomParticipant> getParticipants(String roomId) {
        Room room = rooms.get(roomId);
        if (room == null) return Collections.emptyList();
        return new ArrayList<>(room.getParticipants().values());
    }

    public RoomParticipant getParticipant(String roomId, String userId) {
        Room room = rooms.get(roomId);
        if (room == null) return null;
        return room.getParticipants().get(userId);
    }

    public Map<String, Object> getRoomInfo(String roomId) {
        Room room = rooms.get(roomId);
        Map<String, Object> info = new HashMap<>();
        info.put("roomId", roomId);
        if (room != null) {
            info.put("participantCount", room.size());
            info.put("exists", true);
            List<Map<String, String>> users = new ArrayList<>();
            room.getParticipants().forEach((id, p) -> {
                Map<String, String> user = new HashMap<>();
                user.put("userId", p.getUserId());
                user.put("userName", p.getUserName());
                users.add(user);
            });
            info.put("participants", users);
        } else {
            info.put("participantCount", 0);
            info.put("exists", false);
            info.put("participants", Collections.emptyList());
        }
        return info;
    }

    public String findRoomBySession(String sessionId) {
        for (Map.Entry<String, Room> entry : rooms.entrySet()) {
            for (RoomParticipant p : entry.getValue().getParticipants().values()) {
                if (p.getSession().getId().equals(sessionId)) {
                    return entry.getKey();
                }
            }
        }
        return null;
    }

    public RoomParticipant findParticipantBySession(String sessionId) {
        for (Room room : rooms.values()) {
            for (RoomParticipant p : room.getParticipants().values()) {
                if (p.getSession().getId().equals(sessionId)) {
                    return p;
                }
            }
        }
        return null;
    }
}
