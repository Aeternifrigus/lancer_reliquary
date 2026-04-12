#include "GameVaultAPI.hpp"

#include <sstream>
#include <stdexcept>

GameVaultAPI::GameVaultAPI(const std::string& baseUrl) : m_http(baseUrl) {}

// ─── Auth ──────────────────────────────────────────────────────────────────────

AuthResult GameVaultAPI::registerPlayer(
    const std::string& username,
    const std::string& email,
    const std::string& password
) {
    nlohmann::json body = {
        {"username", username},
        {"email",    email},
        {"password", password},
    };

    auto data   = parseEnvelope(m_http.post("/auth/register", body.dump()));
    auto result = AuthResult{};
    result.token  = data.at("token").get<std::string>();
    result.player = data.at("player").get<Player>();
    return result;
}

AuthResult GameVaultAPI::login(const std::string& username, const std::string& password) {
    nlohmann::json body = {{"username", username}, {"password", password}};

    auto data   = parseEnvelope(m_http.post("/auth/login", body.dump()));
    auto result = AuthResult{};
    result.token  = data.at("token").get<std::string>();
    result.player = data.at("player").get<Player>();

    // Store token for subsequent authenticated requests
    m_http.setAuthToken(result.token);

    return result;
}

// ─── Players ───────────────────────────────────────────────────────────────────

Player GameVaultAPI::getProfile(const std::string& playerId) {
    auto data = parseEnvelope(m_http.get("/players/" + playerId));
    return data.get<Player>();
}

Player GameVaultAPI::getMyProfile() {
    auto data = parseEnvelope(m_http.get("/players/me"));
    return data.get<Player>();
}

// ─── Sessions ──────────────────────────────────────────────────────────────────

Session GameVaultAPI::createSession(
    const std::string& gameMode,
    const std::string& mapId,
    const std::vector<std::string>& playerIds
) {
    nlohmann::json body = {{"gameMode", gameMode}, {"mapId", mapId}};
    if (!playerIds.empty()) {
        body["playerIds"] = playerIds;
    }

    auto data = parseEnvelope(m_http.post("/sessions", body.dump()));
    return data.get<Session>();
}

Session GameVaultAPI::startSession(const std::string& sessionId) {
    auto data = parseEnvelope(m_http.patch("/sessions/" + sessionId + "/start", "{}"));
    return data.get<Session>();
}

Session GameVaultAPI::endSession(
    const std::string& sessionId,
    const std::vector<EndSessionEntry>& results
) {
    nlohmann::json resultsJson = nlohmann::json::array();
    for (const auto& r : results) {
        resultsJson.push_back({
            {"playerId", r.playerId},
            {"kills",    r.kills},
            {"deaths",   r.deaths},
            {"assists",  r.assists},
            {"score",    r.score},
            {"outcome",  r.outcome},
        });
    }

    nlohmann::json body = {{"results", resultsJson}};
    auto data = parseEnvelope(m_http.patch("/sessions/" + sessionId + "/end", body.dump()));
    return data.get<Session>();
}

Session GameVaultAPI::getSession(const std::string& sessionId) {
    auto data = parseEnvelope(m_http.get("/sessions/" + sessionId));
    return data.get<Session>();
}

// ─── Leaderboard ───────────────────────────────────────────────────────────────

LeaderboardPage GameVaultAPI::getLeaderboard(int page, int limit, int minElo) {
    std::ostringstream oss;
    oss << "/leaderboard?page=" << page << "&limit=" << limit;
    if (minElo > 0) oss << "&minElo=" << minElo;

    auto data = parseEnvelope(m_http.get(oss.str()));
    return data.get<LeaderboardPage>();
}

std::pair<int, LeaderboardEntry> GameVaultAPI::getPlayerRank(const std::string& playerId) {
    auto data  = parseEnvelope(m_http.get("/leaderboard/" + playerId));
    int  rank  = data.at("rank").get<int>();
    auto entry = data.at("entry").get<LeaderboardEntry>();
    return {rank, entry};
}

// ─── Items ─────────────────────────────────────────────────────────────────────

nlohmann::json GameVaultAPI::awardItem(
    const std::string& playerId,
    const std::string& itemId,
    const std::string& name,
    const std::string& type,
    const std::string& rarity
) {
    nlohmann::json body = {
        {"itemId", itemId},
        {"name",   name},
        {"type",   type},
        {"rarity", rarity},
    };
    return parseEnvelope(m_http.post("/items/" + playerId, body.dump()));
}

nlohmann::json GameVaultAPI::getInventory(
    const std::string& playerId,
    const std::string& typeFilter,
    const std::string& rarityFilter
) {
    std::string path = "/items/" + playerId;
    std::string sep  = "?";

    if (!typeFilter.empty()) {
        path += sep + "type=" + typeFilter;
        sep = "&";
    }
    if (!rarityFilter.empty()) {
        path += sep + "rarity=" + rarityFilter;
    }

    return parseEnvelope(m_http.get(path));
}

// ─── Private helpers ───────────────────────────────────────────────────────────

nlohmann::json GameVaultAPI::parseEnvelope(const std::string& responseBody) {
    auto json = nlohmann::json::parse(responseBody);

    if (!json.value("success", false)) {
        std::string err = json.value("error", "Unknown API error");
        throw std::runtime_error("API error: " + err);
    }

    return json.at("data");
}
