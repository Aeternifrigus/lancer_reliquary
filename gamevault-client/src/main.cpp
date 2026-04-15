/**
 * GameVault command-line client. Runs through:
 *   1. Register two players
 *   2. Create and play a session (with ELO calculation)
 *   3. Print the leaderboard
 *   4. Award an item to the winner
 *
 * Build: see CMakeLists.txt
 * Run:   ./gamevault-client [server-url]
 *        Defaults to http://localhost:3000
 */

#include <curl/curl.h>
#include <iostream>
#include <iomanip>
#include <stdexcept>
#include <string>
#include <vector>

#include "GameVaultAPI.hpp"

static void printSeparator(const std::string& title) {
    std::cout << "\n─── " << title << " ";
    for (int i = 0; i < static_cast<int>(60 - title.size()); ++i) std::cout << "─";
    std::cout << '\n';
}

static void printPlayer(const Player& p, const std::string& label = "") {
    if (!label.empty()) std::cout << label << '\n';
    std::cout
        << "  id:    " << p.id << '\n'
        << "  name:  " << p.username << '\n'
        << "  elo:   " << p.elo << '\n'
        << "  wins:  " << p.stats.wins
        << "  losses: " << p.stats.losses
        << "  kd: "    << p.stats.kills << '/' << p.stats.deaths
        << '\n';
}

static void printLeaderboard(const LeaderboardPage& lb) {
    std::cout << "\n  Page " << lb.page << " / " << lb.totalPages
              << "  (total: " << lb.total << " players)\n\n";

    std::cout << std::left
              << std::setw(6)  << "Rank"
              << std::setw(20) << "Username"
              << std::setw(8)  << "ELO"
              << std::setw(8)  << "W"
              << std::setw(8)  << "L"
              << std::setw(10) << "Win%"
              << '\n';
    std::cout << std::string(60, '-') << '\n';

    for (const auto& e : lb.entries) {
        std::cout << std::left
                  << std::setw(6)  << ('#' + std::to_string(e.rank))
                  << std::setw(20) << e.username
                  << std::setw(8)  << e.elo
                  << std::setw(8)  << e.wins
                  << std::setw(8)  << e.losses
                  << std::fixed << std::setprecision(0)
                  << std::setw(10) << (e.winRate * 100) << '%'
                  << '\n';
    }
}

int main(int argc, char* argv[]) {
    const std::string serverUrl = (argc > 1) ? argv[1] : "http://localhost:3000";

    std::cout << "GameVault C++ Client\n";
    std::cout << "Connecting to: " << serverUrl << '\n';

    // One-time libcurl global init
    curl_global_init(CURL_GLOBAL_DEFAULT);

    int exitCode = 0;

    try {
        // ─── 1. Register two players ──────────────────────────────────────────
        printSeparator("REGISTERING PLAYERS");

        GameVaultAPI api1(serverUrl);
        auto reg1 = api1.registerPlayer("xSniperPro", "sniper@example.com", "Secur3Pass!");
        std::cout << "Registered:  " << reg1.player.username
                  << " (ELO: " << reg1.player.elo << ")\n";

        GameVaultAPI api2(serverUrl);
        auto reg2 = api2.registerPlayer("LaserRifle99", "laser@example.com", "Secur3Pass!");
        std::cout << "Registered:  " << reg2.player.username
                  << " (ELO: " << reg2.player.elo << ")\n";

        // ─── 2. Login ─────────────────────────────────────────────────────────
        printSeparator("LOGIN");

        auto auth1 = api1.login("xSniperPro", "Secur3Pass!");
        std::cout << "Logged in as: " << auth1.player.username << '\n';

        auto auth2 = api2.login("LaserRifle99", "Secur3Pass!");
        std::cout << "Logged in as: " << auth2.player.username << '\n';

        // ─── 3. Player profiles ───────────────────────────────────────────────
        printSeparator("PROFILES BEFORE SESSION");
        printPlayer(api1.getProfile(auth1.player.id), auth1.player.username + ":");
        printPlayer(api2.getProfile(auth2.player.id), auth2.player.username + ":");

        // ─── 4. Create and play a session ─────────────────────────────────────
        printSeparator("GAME SESSION");

        auto session = api1.createSession(
            "ranked",
            "map_dust2",
            {auth1.player.id, auth2.player.id}
        );
        std::cout << "Session created: " << session.id
                  << " [" << session.status << "]\n";

        // Submit results: api1's player wins
        std::vector<EndSessionEntry> results = {
            {auth1.player.id, 22, 5, 3, 5500, "WIN"},
            {auth2.player.id, 8,  18, 1, 1800, "LOSS"},
        };

        auto finished = api1.endSession(session.id, results);
        std::cout << "Session finished: " << finished.status << '\n';

        for (const auto& r : finished.results) {
            std::cout
                << "  " << r.playerId << ": "
                << r.outcome
                << " | ELO " << r.eloBefore << " → " << r.eloAfter
                << " (" << (r.eloChange >= 0 ? "+" : "") << r.eloChange << ")\n";
        }

        // ─── 5. Profiles after session ────────────────────────────────────────
        printSeparator("PROFILES AFTER SESSION");
        printPlayer(api1.getProfile(auth1.player.id), auth1.player.username + ":");
        printPlayer(api2.getProfile(auth2.player.id), auth2.player.username + ":");

        // ─── 6. Leaderboard ───────────────────────────────────────────────────
        printSeparator("LEADERBOARD (page 1, limit 10)");
        auto lb = api1.getLeaderboard(1, 10);
        printLeaderboard(lb);

        // ─── 7. Rank lookup ───────────────────────────────────────────────────
        printSeparator("RANK LOOKUP");
        auto [rank, entry] = api1.getPlayerRank(auth1.player.id);
        std::cout << auth1.player.username << " is currently ranked #" << rank << '\n';

        // ─── 8. Award item to the winner ──────────────────────────────────────
        printSeparator("AWARD ITEM");
        auto item = api1.awardItem(
            auth1.player.id,
            "mvp_trophy_s01",
            "Season 1 MVP Trophy",
            "COSMETIC",
            "LEGENDARY"
        );
        std::cout << "Awarded: " << item.value("name", "?")
                  << " [" << item.value("rarity", "?") << "]\n";

        // ─── 9. Print inventory ───────────────────────────────────────────────
        printSeparator("INVENTORY");
        auto inv = api1.getInventory(auth1.player.id);
        std::cout << "Items in inventory: " << inv.value("count", 0) << '\n';

        std::cout << "\n=== Demo complete ===\n";

    } catch (const std::exception& ex) {
        std::cerr << "\nFatal error: " << ex.what() << '\n';
        exitCode = 1;
    }

    curl_global_cleanup();
    return exitCode;
}
