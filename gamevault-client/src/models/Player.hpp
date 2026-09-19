#pragma once

#include <string>
#include <nlohmann/json.hpp>

struct PlayerStats {
    int wins        = 0;
    int losses      = 0;
    int draws       = 0;
    int kills       = 0;
    int deaths      = 0;
    int gamesPlayed = 0;
};

struct Player {
    std::string id;
    std::string username;
    std::string email;
    int         elo     = 1200;
    PlayerStats stats;
    std::string createdAt;
};

// ─── JSON deserialisation ──────────────────────────────────────────────────────

inline void from_json(const nlohmann::json& j, PlayerStats& s) {
    j.at("wins").get_to(s.wins);
    j.at("losses").get_to(s.losses);
    j.at("draws").get_to(s.draws);
    j.at("kills").get_to(s.kills);
    j.at("deaths").get_to(s.deaths);
    j.at("gamesPlayed").get_to(s.gamesPlayed);
}

inline void from_json(const nlohmann::json& j, Player& p) {
    // Full player documents use "_id"; the /auth responses use "id" and
    // leave out stats, so accept both shapes.
    if (j.contains("_id")) {
        j.at("_id").get_to(p.id);
    } else {
        j.at("id").get_to(p.id);
    }
    j.at("username").get_to(p.username);
    if (j.contains("email")) j.at("email").get_to(p.email);
    j.at("elo").get_to(p.elo);
    if (j.contains("stats")) j.at("stats").get_to(p.stats);
    if (j.contains("createdAt")) j.at("createdAt").get_to(p.createdAt);
}
