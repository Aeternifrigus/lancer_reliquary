#pragma once

#include <string>
#include <vector>
#include <nlohmann/json.hpp>

struct LeaderboardEntry {
    int         rank        = 0;
    std::string playerId;
    std::string username;
    int         elo         = 0;
    int         wins        = 0;
    int         losses      = 0;
    int         gamesPlayed = 0;
    double      winRate     = 0.0;
};

struct LeaderboardPage {
    std::vector<LeaderboardEntry> entries;
    int total      = 0;
    int page       = 1;
    int limit      = 20;
    int totalPages = 0;
};

inline void from_json(const nlohmann::json& j, LeaderboardEntry& e) {
    j.at("rank").get_to(e.rank);
    j.at("playerId").get_to(e.playerId);
    j.at("username").get_to(e.username);
    j.at("elo").get_to(e.elo);
    j.at("wins").get_to(e.wins);
    j.at("losses").get_to(e.losses);
    j.at("gamesPlayed").get_to(e.gamesPlayed);
    j.at("winRate").get_to(e.winRate);
}

inline void from_json(const nlohmann::json& j, LeaderboardPage& p) {
    j.at("entries").get_to(p.entries);
    j.at("total").get_to(p.total);
    j.at("page").get_to(p.page);
    j.at("limit").get_to(p.limit);
    j.at("totalPages").get_to(p.totalPages);
}
