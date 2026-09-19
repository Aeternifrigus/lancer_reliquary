#include "HttpClient.hpp"

#include <curl/curl.h>
#include <memory>
#include <stdexcept>
#include <sstream>

// ─── libcurl write callback ────────────────────────────────────────────────────

static size_t writeCallback(char* ptr, size_t size, size_t nmemb, void* userdata) {
    auto* buf = static_cast<std::string*>(userdata);
    buf->append(ptr, size * nmemb);
    return size * nmemb;
}

// ─── RAII owners for libcurl resources ─────────────────────────────────────────
// Each is freed when it goes out of scope, on every return path and when an
// exception is thrown, so no code path can leak a handle.

namespace {

struct CurlEasyDeleter {
    void operator()(CURL* handle) const noexcept { curl_easy_cleanup(handle); }
};

struct CurlSlistDeleter {
    void operator()(curl_slist* list) const noexcept { curl_slist_free_all(list); }
};

using CurlHandle = std::unique_ptr<CURL, CurlEasyDeleter>;
using CurlHeaders = std::unique_ptr<curl_slist, CurlSlistDeleter>;

// curl_slist_append returns NULL on failure and leaves the old list alone, so
// the owner must only be re-seated on success.
void appendHeader(CurlHeaders& headers, const std::string& header) {
    curl_slist* updated = curl_slist_append(headers.get(), header.c_str());
    if (!updated) {
        throw std::runtime_error("Failed to allocate HTTP header");
    }
    headers.release();
    headers.reset(updated);
}

} // namespace

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
    CurlHandle handle(curl_easy_init());
    if (!handle) {
        throw std::runtime_error("Failed to initialise libcurl handle");
    }
    CURL* curl = handle.get();

    std::string responseBody;
    std::string url = m_baseUrl + path;

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseBody);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);

    // Build request headers
    CurlHeaders headers;
    appendHeader(headers, "Content-Type: application/json");
    appendHeader(headers, "Accept: application/json");

    if (m_authToken.has_value()) {
        appendHeader(headers, "Authorization: Bearer " + m_authToken.value());
    }

    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers.get());

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
        throw std::runtime_error(std::string("HTTP request failed: ") + curl_easy_strerror(res));
    }

    long httpCode = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);

    // 4xx and 5xx become exceptions; the message includes the response body
    if (httpCode >= 400) {
        std::ostringstream oss;
        oss << "HTTP " << httpCode << ": " << responseBody;
        throw std::runtime_error(oss.str());
    }

    return responseBody;
}
