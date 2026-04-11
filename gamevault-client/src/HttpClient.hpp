#pragma once

#include <string>
#include <optional>
#include <stdexcept>

/**
 * Thin libcurl wrapper that handles GET, POST, and PATCH requests.
 * All methods throw std::runtime_error on network or HTTP errors.
 */
class HttpClient {
public:
    explicit HttpClient(const std::string& baseUrl);
    ~HttpClient();

    // Not copyable: each instance owns a curl handle
    HttpClient(const HttpClient&) = delete;
    HttpClient& operator=(const HttpClient&) = delete;

    HttpClient(HttpClient&&) noexcept;
    HttpClient& operator=(HttpClient&&) noexcept;

    /** Set the Authorization header for all subsequent requests. */
    void setAuthToken(const std::string& token);

    /** Clear the Authorization header. */
    void clearAuthToken();

    std::string get(const std::string& path) const;
    std::string post(const std::string& path, const std::string& jsonBody) const;
    std::string patch(const std::string& path, const std::string& jsonBody) const;

private:
    struct Impl;
    std::string m_baseUrl;
    std::optional<std::string> m_authToken;

    std::string request(
        const std::string& method,
        const std::string& path,
        const std::string& body
    ) const;
};
