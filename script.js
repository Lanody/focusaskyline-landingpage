// ============================================
// HELPER FUNCTIONS
// ============================================

// Scroll to streaming section
function scrollToStreaming() {
  var streamingSection = document.getElementById('streaming');
  if (streamingSection) {
    streamingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Get UTM parameters helper function
function getUTMParams() {
  var params = new URLSearchParams(window.location.search);
  var utm = {};
  if (params.get('utm_source')) utm.utm_source = params.get('utm_source');
  if (params.get('utm_medium')) utm.utm_medium = params.get('utm_medium');
  if (params.get('utm_campaign')) utm.utm_campaign = params.get('utm_campaign');
  if (params.get('utm_term')) utm.utm_term = params.get('utm_term');
  if (params.get('utm_content')) utm.utm_content = params.get('utm_content');
  if (params.get('fbclid')) utm.fbclid = params.get('fbclid');
  return utm;
}

// Get cookie value
function getCookie(name) {
  var value = '; ' + document.cookie;
  var parts = value.split('; ' + name + '=');
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Generate unique event ID for deduplication
function generateEventId() {
  return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ============================================
// CONVERSIONS API (CAPI) - SERVER-SIDE TRACKING
// ============================================

function sendToCAPI(eventName, customData, eventId) {
  // Get Facebook Browser ID (_fbp) and Click ID (_fbc) from cookies
  var fbp = getCookie('_fbp');
  var fbc = getCookie('_fbc');
  
  var payload = {
    event_name: eventName,
    event_id: eventId,
    event_source_url: window.location.href,
    custom_data: customData,
    fbp: fbp,
    fbc: fbc
  };

  // Send to CAPI endpoint (non-blocking)
  fetch('/capi.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    keepalive: true // Ensures request completes even if user navigates away
  }).then(function(response) {
    if (response.ok) {
      console.log('CAPI ' + eventName + ' sent successfully (Event ID: ' + eventId + ')');
    } else {
      console.warn('CAPI ' + eventName + ' failed:', response.status);
    }
  }).catch(function(error) {
    console.warn('CAPI ' + eventName + ' error:', error);
  });
}

// Get tracking parameters with bot detection
function getTrackingParams() {
  var data = {
    content_name: 'Focus A Skyline',
    artist: 'Voices of Metropolis',
    content_type: 'music_album',
    referrer: document.referrer || 'direct'
  };
  
  // Add UTM parameters
  var utm = getUTMParams();
  for (var key in utm) {
    data[key] = utm[key];
  }
  
  // Bot detection parameters
  data.is_webdriver = navigator.webdriver ? 'true' : 'false';
  data.user_agent = navigator.userAgent;
  
  var botPatterns = /bot|crawler|spider|crawling|headless|phantom|selenium|puppeteer/i;
  data.bot_suspected = botPatterns.test(navigator.userAgent) ? 'true' : 'false';
  
  data.has_plugins = navigator.plugins && navigator.plugins.length > 0 ? 'true' : 'false';
  data.language = navigator.language || 'unknown';
  
  return data;
}

// ============================================
// EVENT TRACKING
// ============================================

// Track streaming platform clicks (ViewContent Event)
function trackView(event, platform, url) {
  event.preventDefault();
  
  var eventId = generateEventId();
  var customData = Object.assign({
    content_name: 'Focus A Skyline',
    artist: 'Voices of Metropolis',
    content_category: 'Music Album',
    platform: platform,
    content_type: 'music_link',
    streaming_platform: platform,
    destination_url: url,
    referrer: document.referrer || 'direct'
  }, getUTMParams());
  
  // Send to Browser Pixel
  if (typeof fbq !== 'undefined') {
    fbq('track', 'ViewContent', customData, {eventID: eventId});
    console.log('Meta Pixel ViewContent tracked for ' + platform + ' (Event ID: ' + eventId + ')');
  } else {
    console.error('Meta Pixel (fbq) not loaded!');
  }
  
  // Send to CAPI (Server-Side)
  sendToCAPI('ViewContent', customData, eventId);
  
  // Wait for events to fire, then navigate
  setTimeout(function() {
    window.open(url, '_blank');
  }, 300);
  
  return false;
}

// Track video play
function playVideo() {
  var box = document.getElementById('videoBox');
  if (box.classList.contains('playing')) return;
  
  var eventId = generateEventId();
  var customData = Object.assign({
    content_name: 'Focus A Skyline - Speedpainting',
    artist: 'Voices of Metropolis',
    content_category: 'Video',
    content_type: 'video',
    video_title: 'Speedpainting - Album Cover',
    referrer: document.referrer || 'direct'
  }, getUTMParams());
  
  // Send to Browser Pixel
  if (typeof fbq !== 'undefined') {
    fbq('trackCustom', 'VideoPlay', customData, {eventID: eventId});
    console.log('Meta Pixel VideoPlay tracked (Event ID: ' + eventId + ')');
  }
  
  // Send to CAPI (Server-Side)
  sendToCAPI('VideoPlay', customData, eventId);
  
  document.getElementById('ytFrame').src = document.getElementById('ytFrame').dataset.src;
  box.classList.add('playing');
}

// ============================================
// PAGE INITIALIZATION
// ============================================

// Track time on page (optional - fires after 30 seconds)
setTimeout(function() {
  if (typeof fbq !== 'undefined') {
    var eventId = generateEventId();
    var customData = Object.assign({
      content_name: 'Focus A Skyline',
      artist: 'Voices of Metropolis',
      time_on_page: '30_seconds',
      referrer: document.referrer || 'direct'
    }, getUTMParams());
    
    fbq('trackCustom', 'TimeOnPage', customData, {eventID: eventId});
    sendToCAPI('TimeOnPage', customData, eventId);
  }
}, 30000);

// Send enhanced PageView after page loads
window.addEventListener('load', function() {
  if (typeof fbq !== 'undefined') {
    var eventId = generateEventId();
    var pageViewData = getTrackingParams();
    
    fbq('track', 'PageView', pageViewData, {eventID: eventId});
    sendToCAPI('PageView', pageViewData, eventId);
    
    console.log('Meta Pixel PageView tracked with params (Event ID: ' + eventId + '):', pageViewData);
  }
});
