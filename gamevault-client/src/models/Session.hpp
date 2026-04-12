#pragma once

#include <string>
#include <vector>
#include <optional>
#include <nlohmann/json.hpp>

struct SessionResult {
    std::string playerId;
    int kills     = 0;
    int deaths    = 0;
    int assists   = 0;
    int score     = 0;
    std::string outcome;   // WIN | LOSS | DRAW
    int eloBefore = 0;
    int eloAfter  = 0;
    int eloChange = 0;
};

struct Session {
    std::string id;
    std::string gameMode;
    std::string mapId;
    std::string status;    // WAITING | ACTIVE | FINISHED | ABANDONED
    std::vector<std::string> players;
    std::vector<SessionResult> results;
    std::string createdAt;
    std::optional<std::string> startedAt;
    std::optional<std::string> endedAt;
};

inline void from_json(const nlohmann::json& j, SessionResult& r) {
    j.at("playerId").get_to(r.playerId);
    j.at("kills").get_to(r.kills);
    j.at("deaths").get_to(r.deaths);
    if (j.contains("assists")) j.at("assists").get_to(r.assists);
    j.at("score").get_to(r.score);
    j.at("outcome").get_to(r.outcome);
    j.at("eloBefore").get_to(r.eloBefore);
    j.at("eloAfter").get_to(r.eloAfter);
    j.at("eloChange").get_to(r.eloChange);
}

inline void from_json(const nlohmann::json& j, Session& s) {
    j.at("_id").get_to(s.id);
    j.at("gameMode").get_to(s.gameMode);
    j.at("mapId").get_to(s.mapId);
    j.at("status").get_to(s.status);
    if (j.contains("createdAt")) j.at("createdAt").get_to(s.createdAt);

    // players may be ObjectId strings or populated objects
    if (j.contains("players")) {
        for (const auto& p : j.at("players")) {
            if (p.is_string()) {
                s.players.push_back(p.get<std::string>());
            } else if (p.is_object() && p.contains("_id")) {
                s.players.push_back(p.at("_id").get<std::string>());
            }
        }
    }

    if (j.contains("results")) {
        j.at("results").get_to(s.results);
    }
}
