#include "HttpClient.hpp"

#include <curl/curl.h>
#include <stdexcept>
#include <sstream>

// ─── libcurl write callback ────────────────────────────────────────────────────

static size_t writeCallback(char* ptr, size_t size, size_t nmemb, void* userdata) {
    auto* buf = static_cast<std::string*>(userdata);
    buf->append(ptr, size * nmemb);
    return size * nmemb;
}

// ─── HttpClient implementation ─────────────────────────────────────────────────

HttpClient::HttpClient(const std::string& baseUrl) : m_baseUrl(baseUrl) {
    // curl_global_init is not thread-safe; call it once from main.
    // Individual handles are fine to create per-object.
}

HttpClient::~HttpClient() = default;

HttpClient::HttpClient(HttpClient&&) noexcept = default;
HttpClient& HttpClient::operator=(HttpClient&&) noexcept = default;

void HttpClient::setAuthToken(const std::string& token) {
    m_authToken = token;
}

void HttpClient::clearAuthToken() {
    m_authToken.reset();
}

std::string HttpClient::get(const std::string& path) const {
    return request("GET", path, "");
}

std::string HttpClient::post(const std::string& path, const std::string& jsonBody) const {
    return request("POST", path, jsonBody);
}

std::string HttpClient::patch(const std::string& path, const std::string& jsonBody) const {
    return request("PATCH", path, jsonBody);
}

std::string HttpClient::request(
    const std::string& method,
    const std::string& path,
    const std::string& body
) const {
    CURL* curl = curl_easy_init();
    if (!curl) {
        throw std::runtime_error("Failed to initialise libcurl handle");
    }

    std::string responseBody;
    std::string url = m_baseUrl + path;

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseBody);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);

    // Build request headers
    curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    headers = curl_slist_append(headers, "Accept: application/json");

    if (m_authToken.has_value()) {
        std::string authHeader = "Authorization: Bearer " + m_authToken.value();
        headers = curl_slist_append(headers, authHeader.c_str());
    }

    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

    // Set method and body
    if (method == "POST") {
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, static_cast<long>(body.size()));
    } else if (method == "PATCH") {
        curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PATCH");
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, static_cast<long>(body.size()));
    }
    // GET is the default

    CURLcode res = curl_easy_perform(curl);

    if (res != CURLE_OK) {
        std::string errMsg = "HTTP request failed: ";
        errMsg += curl_easy_strerror(res);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
        throw std::runtime_error(errMsg);
    }

    long httpCode = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    // 4xx and 5xx become exceptions; the message includes the response body
    if (httpCode >= 400) {
        std::ostringstream oss;
        oss << "HTTP " << httpCode << ": " << responseBody;
        throw std::runtime_error(oss.str());
    }

    return responseBody;
}
