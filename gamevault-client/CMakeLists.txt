cmake_minimum_required(VERSION 3.20)
project(gamevault-client VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# ─── Compiler warnings ────────────────────────────────────────────────────────

if(MSVC)
    add_compile_options(/W4 /WX)
else()
    add_compile_options(
        -Wall -Wextra -Wpedantic -Werror
        -Wno-unused-parameter
    )
endif()

# ─── Dependencies via Conan ───────────────────────────────────────────────────

find_package(CURL REQUIRED)
find_package(nlohmann_json REQUIRED)

# ─── Source files ─────────────────────────────────────────────────────────────

set(SOURCES
    src/HttpClient.cpp
    src/GameVaultAPI.cpp
    src/main.cpp
)

set(HEADERS
    src/HttpClient.hpp
    src/GameVaultAPI.hpp
    src/models/Player.hpp
    src/models/Session.hpp
    src/models/LeaderboardEntry.hpp
)

# ─── Executable ───────────────────────────────────────────────────────────────

add_executable(gamevault-client ${SOURCES} ${HEADERS})

target_include_directories(gamevault-client PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)

target_link_libraries(gamevault-client
    PRIVATE
        CURL::libcurl
        nlohmann_json::nlohmann_json
)

# Install target (optional)
install(TARGETS gamevault-client DESTINATION bin)
