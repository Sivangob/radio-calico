const audioPlayer = document.getElementById('audioPlayer');
const playButton = document.getElementById('playButton');
const playIcon = document.getElementById('playIcon');
const volumeSlider = document.getElementById('volumeSlider');
const timeDisplay = document.getElementById('timeDisplay');
const errorMessage = document.getElementById('errorMessage');

const streamUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';
let hls = null;
let isPlaying = false;
let elapsedSeconds = 0;
let timerInterval = null;

// Initialize volume
audioPlayer.volume = volumeSlider.value / 100;

// Format time as M:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Update elapsed time display
function updateElapsedTime() {
    elapsedSeconds++;
    timeDisplay.textContent = `${formatTime(elapsedSeconds)} / Live`;
}

// Start timer
function startTimer() {
    if (!timerInterval) {
        timerInterval = setInterval(updateElapsedTime, 1000);
    }
}

// Stop timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Reset timer
function resetTimer() {
    stopTimer();
    elapsedSeconds = 0;
    timeDisplay.textContent = '0:00 / Live';
}

// Volume control
volumeSlider.addEventListener('input', (e) => {
    const volume = e.target.value;
    audioPlayer.volume = volume / 100;
});

// Error handling
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    stopTimer();
}

function hideError() {
    errorMessage.style.display = 'none';
}

// Initialize HLS
function initializePlayer() {
    if (Hls.isSupported()) {
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(audioPlayer);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('HLS manifest loaded, stream ready');
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data);
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        showError('Network error: Unable to load stream');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        showError('Media error: Unable to play stream');
                        hls.recoverMediaError();
                        break;
                    default:
                        showError('Fatal error: Cannot recover stream');
                        hls.destroy();
                        break;
                }
            }
        });
    } else if (audioPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        audioPlayer.src = streamUrl;
    } else {
        showError('HLS is not supported in your browser');
    }
}

// Play/Pause functionality
playButton.addEventListener('click', () => {
    hideError();

    if (!isPlaying) {
        if (!hls && Hls.isSupported()) {
            initializePlayer();
        }

        audioPlayer.play().then(() => {
            isPlaying = true;
            playIcon.textContent = '⏸';
            startTimer();
        }).catch((error) => {
            console.error('Play error:', error);
            showError('Unable to play: ' + error.message);
        });
    } else {
        audioPlayer.pause();
        isPlaying = false;
        playIcon.textContent = '▶';
        stopTimer();
    }
});

// Handle audio events
audioPlayer.addEventListener('playing', () => {
    isPlaying = true;
    playIcon.textContent = '⏸';
    startTimer();
});

audioPlayer.addEventListener('pause', () => {
    isPlaying = false;
    playIcon.textContent = '▶';
    stopTimer();
});

// User ID management - create persistent ID based on browser fingerprint + IP
async function generateBrowserFingerprint() {
    // Fetch IP address from backend
    let ipAddress = 'unknown';
    try {
        const ipResponse = await fetch('/api/client-ip');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
    } catch (error) {
        console.error('Error fetching IP:', error);
    }

    const fingerprint = [
        ipAddress,
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        navigator.platform,
        navigator.hardwareConcurrency || 'unknown'
    ].join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'user_' + Math.abs(hash).toString(36);
}

async function getUserId() {
    let userId = localStorage.getItem('radio_user_id');
    if (!userId) {
        userId = await generateBrowserFingerprint();
        localStorage.setItem('radio_user_id', userId);
    }
    return userId;
}

let userId = null;
let currentSongId = null;
let userRating = null;

// Initialize user ID
getUserId().then(id => {
    userId = id;
    console.log('User ID:', userId);
});

// Metadata fetching and display
const metadataUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';

async function fetchMetadata() {
    try {
        const response = await fetch(metadataUrl);
        const data = await response.json();
        updateNowPlaying(data);
        updateRecentlyPlayed(data);
    } catch (error) {
        console.error('Error fetching metadata:', error);
    }
}

function updateNowPlaying(data) {
    // Update artist and title
    document.getElementById('currentArtist').textContent = data.artist || 'Unknown Artist';

    // Extract year from title or date and update both title and year badge
    const title = data.title || 'Unknown Title';
    const yearMatch = title.match(/\((\d{4})\)/);
    const year = yearMatch ? yearMatch[1] : (data.date || '');

    // Add year to title if not already present
    let displayTitle = title;
    if (year && !yearMatch) {
        displayTitle = `${title} (${year})`;
    }

    document.getElementById('currentTitle').textContent = displayTitle;
    document.getElementById('yearBadge').textContent = year;
    document.getElementById('currentAlbum').textContent = data.album || '';

    // Format metadata
    const metaParts = [];
    metaParts.push('Source quality: ' + (data.bit_depth && data.sample_rate ? `${data.bit_depth}-bit ${(data.sample_rate / 1000).toFixed(1)}kHz` : 'Unknown'));

    if (data.bit_depth && data.sample_rate) {
        metaParts.push(`Stream quality: ${(data.sample_rate / 1000).toFixed(0)}kHz FLAC / HLS Lossless`);
    }
    document.getElementById('currentMeta').textContent = metaParts.join('\n');

    // Update album art with cache-busting timestamp
    const albumArt = document.getElementById('albumArt');
    albumArt.src = `https://d3d4yli4hf5bmh.cloudfront.net/cover.jpg?t=${Date.now()}`;

    // Update rating system for new song
    const newSongId = generateSongId(data.artist, data.title);
    if (newSongId !== currentSongId) {
        currentSongId = newSongId;
        userRating = getRatingFromStorage(currentSongId);
        fetchRatings(currentSongId);
        updateRatingUI();
    }
}

function updateRecentlyPlayed(data) {
    const recentTracksList = document.getElementById('recentTracksList');
    recentTracksList.innerHTML = '';

    for (let i = 1; i <= 5; i++) {
        const artist = data[`prev_artist_${i}`];
        const title = data[`prev_title_${i}`];
        const date = data[`prev_date_${i}`];

        if (artist && title) {
            const trackDiv = document.createElement('div');
            trackDiv.className = 'recent-track';

            const artistSpan = document.createElement('span');
            artistSpan.className = 'artist';
            artistSpan.textContent = artist + ': ';

            // Add year to previous track titles if available and not already present
            let displayTitle = title;
            if (date && !title.match(/\((\d{4})\)/)) {
                displayTitle = `${title} (${date})`;
            }

            const titleSpan = document.createElement('span');
            titleSpan.className = 'title';
            titleSpan.textContent = displayTitle;

            trackDiv.appendChild(artistSpan);
            trackDiv.appendChild(titleSpan);
            recentTracksList.appendChild(trackDiv);
        }
    }
}

// Rating system
function generateSongId(artist, title) {
    return btoa(artist + '|' + title).replace(/[^a-zA-Z0-9]/g, '');
}

function getRatingFromStorage(songId) {
    const ratings = JSON.parse(localStorage.getItem('song_ratings') || '{}');
    return ratings[songId] || null;
}

function saveRatingToStorage(songId, ratingType) {
    const ratings = JSON.parse(localStorage.getItem('song_ratings') || '{}');
    ratings[songId] = ratingType;
    localStorage.setItem('song_ratings', JSON.stringify(ratings));
}

async function fetchRatings(songId) {
    try {
        const response = await fetch(`/api/ratings/${songId}`);
        const data = await response.json();
        document.getElementById('thumbsUpCount').textContent = data.thumbs_up || 0;
        document.getElementById('thumbsDownCount').textContent = data.thumbs_down || 0;
    } catch (error) {
        console.error('Error fetching ratings:', error);
    }
}

async function submitRating(ratingType) {
    if (!userId || !currentSongId) {
        console.error('User ID or song ID not initialized');
        return;
    }

    const currentArtist = document.getElementById('currentArtist').textContent;
    const currentTitle = document.getElementById('currentTitle').textContent;

    try {
        const response = await fetch('/api/ratings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                song_id: currentSongId,
                artist: currentArtist,
                title: currentTitle,
                rating_type: ratingType,
                user_id: userId
            })
        });

        const data = await response.json();

        if (response.ok) {
            userRating = ratingType;
            saveRatingToStorage(currentSongId, ratingType);
            updateRatingUI();
            fetchRatings(currentSongId);
        } else {
            console.error('Error submitting rating:', data.error);
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
    }
}

function updateRatingUI() {
    const thumbsUpBtn = document.getElementById('thumbsUpBtn');
    const thumbsDownBtn = document.getElementById('thumbsDownBtn');

    thumbsUpBtn.classList.remove('active');
    thumbsDownBtn.classList.remove('active');

    if (userRating === 'thumbs_up') {
        thumbsUpBtn.classList.add('active');
    } else if (userRating === 'thumbs_down') {
        thumbsDownBtn.classList.add('active');
    }
}

// Rating button event listeners
document.getElementById('thumbsUpBtn').addEventListener('click', () => {
    if (userRating === 'thumbs_up') {
        return; // Already rated thumbs up
    }
    submitRating('thumbs_up');
});

document.getElementById('thumbsDownBtn').addEventListener('click', () => {
    if (userRating === 'thumbs_down') {
        return; // Already rated thumbs down
    }
    submitRating('thumbs_down');
});

// Initialize on page load
initializePlayer();

// Fetch metadata immediately and then every 10 seconds
fetchMetadata();
setInterval(fetchMetadata, 10000);
