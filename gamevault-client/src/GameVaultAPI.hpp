#pragma once

#include "HttpClient.hpp"
#include "models/Player.hpp"
#include "models/Session.hpp"
#include "models/LeaderboardEntry.hpp"

#include <string>
#include <vector>
#include <nlohmann/json.hpp>

/**
 * Typed C++ client for the GameVault REST API.
 * Wraps HttpClient with strongly-typed methods per endpoint.
 *
 * Usage:
 *   GameVaultAPI api("http://localhost:3000");
 *   auto [token, player] = api.login("xSniperPro", "Secur3Pass!");
 *   auto session = api.createSession("ranked", "map_dust2");
 *   api.endSession(session.id, results);
 */
struct AuthResult {
    std::string token;
    Player      player;
};

struct EndSessionEntry {
    std::string playerId;
    int         kills;
    int         deaths;
    int         assists;
    int         score;
    std::string outcome; // "WIN" | "LOSS" | "DRAW"
};

class GameVaultAPI {
public:
    explicit GameVaultAPI(const std::string& baseUrl);

    // ─── Auth ──────────────────────────────────────────────────────────────────
    AuthResult registerPlayer(
        const std::string& username,
        const std::string& email,
        const std::string& password
    );

    AuthResult login(const std::string& username, const std::string& password);

    // ─── Players ───────────────────────────────────────────────────────────────
    Player getProfile(const std::string& playerId);
    Player getMyProfile();

    // ─── Sessions ──────────────────────────────────────────────────────────────
    Session createSession(
        const std::string& gameMode,
        const std::string& mapId,
        const std::vector<std::string>& playerIds = {}
    );

    Session startSession(const std::string& sessionId);

    Session endSession(
        const std::string& sessionId,
        const std::vector<EndSessionEntry>& results
    );

    Session getSession(const std::string& sessionId);

    // ─── Leaderboard ───────────────────────────────────────────────────────────
    LeaderboardPage getLeaderboard(int page = 1, int limit = 20, int minElo = 0);
    std::pair<int, LeaderboardEntry> getPlayerRank(const std::string& playerId);

    // ─── Items ─────────────────────────────────────────────────────────────────
    nlohmann::json awardItem(
        const std::string& playerId,
        const std::string& itemId,
        const std::string& name,
        const std::string& type,
        const std::string& rarity
    );

    nlohmann::json getInventory(
        const std::string& playerId,
        const std::string& typeFilter  = "",
        const std::string& rarityFilter = ""
    );

private:
    HttpClient m_http;

    /** Parse the outer { success, data } envelope and return the inner `data`. */
    nlohmann::json parseEnvelope(const std::string& responseBody);
};
