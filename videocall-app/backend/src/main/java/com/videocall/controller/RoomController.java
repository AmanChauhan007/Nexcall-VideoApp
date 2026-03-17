package com.videocall.controller;

import com.videocall.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    @Autowired
    private RoomService roomService;

    @GetMapping("/{roomId}")
    public ResponseEntity<Map<String, Object>> getRoomInfo(@PathVariable String roomId) {
        return ResponseEntity.ok(roomService.getRoomInfo(roomId));
    }

    @PostMapping("/generate")
    public ResponseEntity<Map<String, String>> generateRoomId() {
        String roomId = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Map<String, String> response = new HashMap<>();
        response.put("roomId", roomId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> resp = new HashMap<>();
        resp.put("status", "UP");
        resp.put("service", "VideoCall Signaling Server");
        return ResponseEntity.ok(resp);
    }
}
