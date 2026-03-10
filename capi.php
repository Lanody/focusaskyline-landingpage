<?php
/**
 * Meta Conversions API (CAPI) - Server-Side Event Tracking
 * 
 * This script receives events from the frontend and forwards them to Meta CAPI
 * Benefits: Bypasses ad-blockers, better data quality, server-side verification
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ============================================
// CONFIGURATION - REPLACE WITH YOUR VALUES
// ============================================
define('PIXEL_ID', '767179793116137');
define('ACCESS_TOKEN', 'EAAWn3uYdUAkBQxwI7gQArV9ZAPdrgryp98VnZC7C0lE0QH6BbEo3pqBSrgCDR6IUl7l9WwKj4tDBsw5bzENZBkrjtxFOhmKVrP8rPZCYEQqgQlTOwffIZA3oF5RkCLF1zywFquu2ZBGxfRRg7byIds6APzGiAMhKCy4KS3jv1a0ZABjYgfa170c6zQeMqPOEhj3wwZDZD'); // Get from Events Manager → Settings → Conversions API
define('API_VERSION', 'v22.0');

// ============================================
// SECURITY CHECK
// ============================================
if (ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN_HERE') {
    http_response_code(500);
    echo json_encode(['error' => 'Access token not configured. Please edit capi.php and add your token.']);
    exit;
}

// ============================================
// RECEIVE EVENT DATA FROM FRONTEND
// ============================================
$input = file_get_contents('php://input');
$eventData = json_decode($input, true);

if (!$eventData) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// ============================================
// BUILD CAPI EVENT PAYLOAD
// ============================================

// Get client IP (handle proxies)
$clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
if (strpos($clientIp, ',') !== false) {
    $clientIp = trim(explode(',', $clientIp)[0]);
}

// Get User-Agent
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';

// Event time (Unix timestamp)
$eventTime = time();

// Event name (PageView, ViewContent, etc.)
$eventName = $eventData['event_name'] ?? 'PageView';

// Event ID for deduplication (same ID in browser pixel and CAPI)
$eventId = $eventData['event_id'] ?? uniqid('event_', true);

// Event source URL
$eventSourceUrl = $eventData['event_source_url'] ?? '';

// Custom data (UTM params, platform, etc.)
$customData = $eventData['custom_data'] ?? [];

// User data for hashing (optional but recommended)
$userData = [
    'client_ip_address' => $clientIp,
    'client_user_agent' => $userAgent,
];

// Add fbp (Facebook Browser ID) and fbc (Facebook Click ID) if available
if (!empty($eventData['fbp'])) {
    $userData['fbp'] = $eventData['fbp'];
}
if (!empty($eventData['fbc'])) {
    $userData['fbc'] = $eventData['fbc'];
}

// Build the event payload
$capiEvent = [
    'event_name' => $eventName,
    'event_time' => $eventTime,
    'event_id' => $eventId,
    'event_source_url' => $eventSourceUrl,
    'action_source' => 'website',
    'user_data' => $userData,
    'custom_data' => $customData,
];

// ============================================
// SEND TO META CAPI
// ============================================
$apiUrl = 'https://graph.facebook.com/' . API_VERSION . '/' . PIXEL_ID . '/events';

$payload = [
    'data' => [$capiEvent],
    'access_token' => ACCESS_TOKEN,
];

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// ============================================
// RETURN RESPONSE
// ============================================
if ($httpCode === 200) {
    $responseData = json_decode($response, true);
    echo json_encode([
        'success' => true,
        'event_id' => $eventId,
        'event_name' => $eventName,
        'response' => $responseData,
    ]);
} else {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'error' => 'CAPI request failed',
        'http_code' => $httpCode,
        'response' => $response,
    ]);
}
