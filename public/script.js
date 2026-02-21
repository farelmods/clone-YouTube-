const RESULTS_PER_PAGE = 12;
let currentPage = 1;
let currentQuery = '';
let currentCategory = 'trending';
let isLoading = false;
let isInfiniteScrolling = false;
let nextPageToken = '';
let lastVideo = null;

// DOM Elements
const resultsGrid = document.getElementById('results');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const filterBtn = document.getElementById('filter-btn');
const filterSheet = document.getElementById('filter-sheet');
const sheetOverlay = document.getElementById('sheet-overlay');
const closeFilters = document.getElementById('close-filters');
const suggestionsBox = document.getElementById('search-suggestions');
const clearSearchBtn = document.getElementById('clear-search-btn');
const infiniteLoader = document.getElementById('infinite-loader');
const sentinel = document.getElementById('sentinel');

// State Management
let searchHistory = JSON.parse(localStorage.getItem('playtube_history') || '[]');
let currentUser = JSON.parse(localStorage.getItem('playtube_user') || 'null');
let videoHistory = JSON.parse(localStorage.getItem('playtube_video_history') || '[]');
let subscriptions = JSON.parse(localStorage.getItem('playtube_subs') || '[]');
let localComments = JSON.parse(localStorage.getItem('playtube_comments') || '{}');
let likedVideos = JSON.parse(localStorage.getItem('playtube_liked') || '[]');
let savedVideos = JSON.parse(localStorage.getItem('playtube_saved') || '[]');

// Supabase Configuration (Replace with your actual credentials)
const SUPABASE_URL = 'https://your-project-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
let supabaseClient = null;

if (typeof supabasejs !== 'undefined' || typeof Supabase !== 'undefined') {
    const createClient = (typeof supabasejs !== 'undefined') ? supabasejs.createClient : Supabase.createClient;
    try {
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch(e) {
        console.warn("Supabase not configured correctly. Check SETUP_GUIDE.md");
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Create Sheet Actions
    const sheetItems = document.querySelectorAll('#create-sheet .sheet-item');
    if (sheetItems.length >= 3) {
        sheetItems[0].onclick = () => mockCreateShort();
        sheetItems[1].onclick = () => openUpload();
        sheetItems[2].onclick = () => mockLive();
    }

    // Upload Overlay Handlers
    document.getElementById('close-upload').onclick = () => toggleActive('upload-overlay', false);
    document.getElementById('file-input').onchange = handleFileUpload;

    // Share Modal Close
    document.getElementById('close-share').onclick = () => toggleActive('share-modal', false);
    document.getElementById('copy-link-btn').onclick = () => {
        const urlInput = document.getElementById('share-url');
        urlInput.select();
        document.execCommand('copy');
        showToast('Link disalin ke papan klip');
    };

    // Google Login Handler
    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
        googleLoginBtn.onclick = loginWithGoogle;
    }

    // Logo Click Handler
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.onclick = (e) => {
            e.preventDefault();
            loadTrending();
            setActiveNav(document.querySelector('.nav-item:first-child'));
            document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
            document.querySelector('.sidebar-item:first-child').classList.add('active');
        };
    }

    // Voice Search
    const micBtn = document.querySelector('.mic-btn');
    if (micBtn) {
        micBtn.onclick = openVoiceSearch;
    }
    document.getElementById('close-voice').onclick = () => toggleActive('voice-search-modal', false);

    // Cast
    const castBtn = document.getElementById('cast-btn');
    if (castBtn) {
        castBtn.onclick = () => {
            toggleActive('cast-sheet', true);
            toggleActive('sheet-overlay', true);
        };
    }
    document.getElementById('close-cast').onclick = () => {
        toggleActive('cast-sheet', false);
        toggleActive('sheet-overlay', false);
    };

    // Mobile Search Toggle
    const mobileSearchBtn = document.getElementById('mobile-search-btn');
    const mobileSearchBack = document.getElementById('mobile-search-back');
    if (mobileSearchBtn) {
        mobileSearchBtn.onclick = () => document.body.classList.add('mobile-search-active');
    }
    if (mobileSearchBack) {
        mobileSearchBack.onclick = () => document.body.classList.remove('mobile-search-active');
    }

    loadTrending();
    setupInfiniteScroll();
    setupRippleEffect();
    checkLoginState();

    // Setup back button handling for mobile
    window.addEventListener('popstate', (event) => {
        closeAllOverlays();
        if (event.state) {
            if (event.state.page === 'video') {
                const videoData = event.state.video || event.state.id;
                openVideo(videoData, true);
            }
            if (event.state.page === 'channel') {
                openChannel(event.state.id, event.state.name, true);
            }
        }
    });
});

// Infinite Scroll Setup
function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoading && !isInfiniteScrolling) {
            loadMore();
        }
    }, { threshold: 0.1 });

    observer.observe(sentinel);
}

async function loadMore() {
    if (isLoading) return;
    currentPage++;
    isInfiniteScrolling = true;
    infiniteLoader.style.display = 'flex';

    if (currentQuery) {
        await fetchVideos(currentQuery, true);
    } else if (currentCategory === 'trending') {
        await fetchTrending(true);
    } else {
        await fetchCategory(currentCategory, true);
    }

    isInfiniteScrolling = false;
    infiniteLoader.style.display = 'none';
}

// Fetch Functions
async function fetchVideos(query, append = false) {
    isLoading = true;
    if (!append) {
        currentPage = 1;
        nextPageToken = '';
        resultsGrid.innerHTML = '';
        renderSkeleton(12);
        window.scrollTo(0, 0);
    }

    currentQuery = query;
    currentCategory = '';

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&pageToken=${nextPageToken}`);
        const data = await response.json();

        if (data.error || !data.items) throw new Error(data.error || 'No items');

        nextPageToken = data.nextPageToken || '';
        const videos = data.items.map(normalizeVideoData);
        renderVideos(videos, append);
    } catch (err) {
        console.warn('API Error, using mock data:', err);
        const videos = generateMockVideos(query, RESULTS_PER_PAGE);
        renderVideos(videos, append);
    } finally {
        isLoading = false;
    }
}

async function fetchTrending(append = false) {
    isLoading = true;
    if (!append) {
        currentPage = 1;
        nextPageToken = '';
        resultsGrid.innerHTML = '';
        renderSkeleton(8);
        window.scrollTo(0, 0);
    }

    currentCategory = 'trending';
    currentQuery = '';

    try {
        const response = await fetch(`/api/trending?pageToken=${nextPageToken}`);
        const data = await response.json();

        if (data.error || !data.items) throw new Error(data.error || 'No items');

        nextPageToken = data.nextPageToken || '';
        const videos = data.items.map(normalizeVideoData);

        if (!append) renderShorts();
        renderVideos(videos, append);
    } catch (err) {
        console.warn('API Error, using mock data:', err);
        const videos = generateMockVideos('trending', RESULTS_PER_PAGE);
        if (!append) renderShorts();
        renderVideos(videos, append);
    } finally {
        isLoading = false;
    }
}

// Rendering
function renderVideos(videos, append = false) {
    if (!append) resultsGrid.innerHTML = '';

    const skeletons = resultsGrid.querySelectorAll('.skeleton-card');
    skeletons.forEach(s => s.remove());

    let currentGrid;
    if (append) {
        const containers = resultsGrid.querySelectorAll('.grid, .search-list');
        currentGrid = containers[containers.length - 1];
    } else {
        currentGrid = document.createElement('div');
        currentGrid.className = currentQuery ? 'search-list' : 'grid';
        resultsGrid.appendChild(currentGrid);
    }

    videos.forEach(video => {
        const card = document.createElement('div');
        card.className = currentQuery ? 'card horizontal' : 'card';

        if (currentQuery) {
            // Search result layout
            card.innerHTML = `
                <div class="thumbnail-container">
                    <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
                </div>
                <div class="video-details">
                    <div class="video-info">
                        <h3 class="video-title">${video.title}</h3>
                        <p class="video-meta">${video.views} x ditonton • ${video.time}</p>
                        <div class="channel-info-row" onclick="event.stopPropagation(); openChannel('${video.channelId}', '${video.channel}')">
                            <div class="channel-avatar-small" style="background-color: ${stringToColor(video.channel)}">
                                ${video.channel.charAt(0)}
                            </div>
                            <p class="channel-name">${video.channel} ${video.verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}</p>
                        </div>
                        <p class="video-description">${video.description || ''}</p>
                    </div>
                </div>
            `;
        } else {
            // Grid layout
            card.innerHTML = `
                <div class="thumbnail-container">
                    <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
                </div>
                <div class="video-details">
                    <div class="channel-avatar" style="background-color: ${stringToColor(video.channel)}" onclick="event.stopPropagation(); openChannel('${video.channelId}', '${video.channel}')">
                        ${video.channel.charAt(0)}
                    </div>
                    <div class="video-info">
                        <h3 class="video-title">${video.title}</h3>
                        <div class="channel-info-row" onclick="event.stopPropagation(); openChannel('${video.channelId}', '${video.channel}')">
                            <p class="channel-name">${video.channel} ${video.verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}</p>
                        </div>
                        <p class="video-meta">${video.views} x ditonton • ${video.time}</p>
                    </div>
                </div>
            `;
        }

        card.onclick = () => openVideo(video);
        currentGrid.appendChild(card);
    });
}

function renderShorts() {
    const shortsWrapper = document.createElement('div');
    shortsWrapper.className = 'shorts-container';
    shortsWrapper.innerHTML = `
        <div class="shorts-header">
            <svg height="24" viewBox="0 0 24 24" width="24" fill="#ff0000"><path d="M17.77 10.32l-1.2-.5L18 8.82a3.74 3.74 0 00-2.39-6.75 3.7 3.7 0 00-1.51.32l-10 4.1a3.75 3.75 0 00-.07 7l1.2.5L4 15.18a3.75 3.75 0 002.46 6.76 3.7 3.7 0 001.46-.3l10-4.1a3.75 3.75 0 00.07-7l-.22-.12zM10 14.5v-5l5 2.5-5 2.5z"></path></svg>
            Shorts
        </div>
        <div class="shorts-grid">
            ${[1,2,3,4,5].map(i => `
                <div class="short-card" onclick="openVideo('short_${i}')">
                    <div class="short-thumbnail">
                        <img src="https://picsum.photos/seed/short${i*currentPage}/200/350" alt="Short">
                        <div style="position: absolute; bottom: 8px; left: 8px; font-weight: bold; font-size: 10px; background: rgba(0,0,0,0.6); padding: 2px 4px; border-radius: 2px;">SHORTS</div>
                    </div>
                    <div class="short-title">Video Shorts Menarik ${i} #shorts</div>
                    <div class="short-views">${Math.floor(Math.random()*90)+10} jt ditonton</div>
                </div>
            `).join('')}
        </div>
    `;
    resultsGrid.appendChild(shortsWrapper);
}

function renderSkeleton(count) {
    const skeletonGrid = document.createElement('div');
    skeletonGrid.className = currentQuery ? 'search-list' : 'grid';

    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        skeleton.innerHTML = `
            <div class="skeleton skeleton-thumb"></div>
            <div style="display: flex; gap: 12px; padding: 0 12px;">
                <div class="skeleton skeleton-avatar"></div>
                <div style="flex-grow: 1;">
                    <div class="skeleton skeleton-text skeleton-title"></div>
                    <div class="skeleton skeleton-text skeleton-meta"></div>
                </div>
            </div>
        `;
        skeletonGrid.appendChild(skeleton);
    }
    resultsGrid.appendChild(skeletonGrid);
}

// Video Player Modal
const videoModal = document.getElementById('video-modal');
const closePlayer = document.getElementById('close-player');

function openVideo(video, fromPopState = false) {
    const videoId = typeof video === 'string' ? video : video.id;
    const title = video.title || 'Judul Video';
    const channel = video.channel || 'Channel Name';
    const views = video.views || '1,2 jt';
    const time = video.time || '2 jam yang lalu';
    const channelId = video.channelId || 'channel_1';

    const videoObj = typeof video === 'object' ? video : {
        id: videoId, title, channel, views, time, channelId,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    };

    lastVideo = videoObj;

    if (!fromPopState) {
        history.pushState({page: 'video', id: videoId, video: videoObj}, '');
    }

    // Save to History
    videoHistory = videoHistory.filter(v => v.id !== videoId);
    videoHistory.unshift(videoObj);
    localStorage.setItem('playtube_video_history', JSON.stringify(videoHistory.slice(0, 50)));

    videoModal.classList.add('active');
    toggleActive('mini-player', false);

    const playerWrapper = document.getElementById('player-wrapper');
    playerWrapper.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;

    // Ambient Glow Effect
    const glow = document.getElementById('ambient-glow');
    glow.style.background = `radial-gradient(circle at center, ${stringToColor(channel)}66 0%, rgba(15, 15, 15, 0) 70%)`;

    const isSubbed = subscriptions.some(s => s.id === channelId);

    // Inject Details
    const details = document.getElementById('video-details-content');
    details.innerHTML = `
        <h2>${title}</h2>
        <div class="meta">${views} x ditonton • ${time}</div>

        <div class="channel-info-bar">
            <div class="channel-avatar" style="background-color: ${stringToColor(channel)}">${channel.charAt(0)}</div>
            <div class="channel-meta" onclick="openChannel('${channelId}', '${channel}')">
                <div style="font-weight: bold;">${channel} <svg height="12" viewBox="0 0 24 24" width="12" fill="#aaa"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg></div>
                <div class="subs-count">${(Math.floor(Math.random()*20)+1)} jt subscriber</div>
            </div>
            <button class="subscribe-btn ${isSubbed ? 'active' : ''}"
                    onclick="toggleSubscribe(this, '${channelId}', '${channel}')">
                ${isSubbed ? 'Disubscribe' : 'Subscribe'}
            </button>
        </div>

        <div class="actions-bar">
            <div class="action-item" onclick="toggleLike(this, 'like')">
                <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"></path></svg>
                <span id="like-count">42 rb</span>
            </div>
            <div class="action-item" onclick="toggleLike(this, 'dislike')">
                <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.37-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"></path></svg>
            </div>
            <div class="action-item" onclick="openShare()">
                <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M11.73 3L5.83 21h2.09l1.49-4.5h6.18l1.49 4.5h2.09L13.27 3h-1.54zm-1.54 11.5L12.5 7.33 14.81 14.5h-4.62z"></path></svg>
                <span>Bagikan</span>
            </div>
            <div class="action-item" onclick="downloadVideo()">
                <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M17 18v1H6v-1h11zm-5.5-3.1l-3.3-3.3.7-.7 2.1 2.1V4h1v9l2.1-2.1.7.7-3.3 3.3z"></path></svg>
                <span>Download</span>
            </div>
            <div class="action-item" onclick="toggleSave(this)">
                <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5c0-1.76 1.24-3 3-3 1.54 0 3.04.99 3.57 2.36h1.87C12.96 6.49 14.46 5.5 16 5.5c1.76 0 3 1.24 3 3 0 2.89-3.14 5.74-7.9 10.05z"></path></svg>
                <span>Simpan</span>
            </div>
        </div>

        <div class="description-box" onclick="this.classList.toggle('expanded')">
            <div class="description-text">
                Ini adalah deskripsi video yang cukup panjang untuk mengetes fitur expand dan collapse.
                Jangan lupa untuk subscribe dan nyalakan lonceng notifikasi agar tidak ketinggalan video terbaru!
                <br><br>
                #playtube #viral #ungu #trending
            </div>
        </div>

        <div class="comments-preview" onclick="openComments()">
            <div class="comments-header">
                Komentar <span class="comment-count">1,2 rb</span>
            </div>
            <div class="user-comment-preview">
                <div class="avatar" style="background-color: #9d4edd"></div>
                <div style="flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    Wah videonya keren banget min! Sangat menginspirasi...
                </div>
            </div>
        </div>
    `;

    // Render Suggested
    const suggested = document.getElementById('suggested-results');
    suggested.innerHTML = '';
    const videos = generateMockVideos('suggested', 10);
    const grid = document.createElement('div');
    grid.className = 'grid';
    videos.forEach(v => {
        const card = document.createElement('div');
        card.className = 'card suggested-card';
        card.style.flexDirection = 'row';
        card.style.gap = '8px';
        card.style.padding = '8px';
        card.innerHTML = `
            <div class="thumbnail-container" style="width: 140px; margin-bottom: 0;">
                <img src="${v.thumbnail}">
            </div>
            <div class="video-info">
                <h3 class="video-title" style="font-size: 14px; -webkit-line-clamp: 2;">${v.title}</h3>
                <p class="channel-name" style="font-size: 12px;">${v.channel}</p>
                <p class="video-meta" style="font-size: 11px;">${v.views} ditonton</p>
            </div>
        `;
        card.onclick = () => {
            playerWrapper.innerHTML = `<div class="loading">Memuat...</div>`;
            setTimeout(() => openVideo(v.id), 300);
        };
        grid.appendChild(card);
    });
    suggested.appendChild(grid);
}

closePlayer.onclick = () => {
    // We only call history.back() if we are in a video state.
    // The popstate handler will take care of calling closeAllOverlays().
    if (history.state && history.state.page === 'video') {
        history.back();
    } else {
        closeAllOverlays();
    }

    // Show Mini Player
    const miniThumb = document.getElementById('mini-thumb');
    if (lastVideo) {
        const videoId = typeof lastVideo === 'string' ? lastVideo : lastVideo.id;
        miniThumb.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0"></iframe>`;
        toggleActive('mini-player', true);
    }
};

// Mini Player Actions
document.getElementById('mini-close').onclick = (e) => {
    e.stopPropagation();
    toggleActive('mini-player', false);
    document.getElementById('mini-thumb').innerHTML = '';
};

document.getElementById('mini-player').onclick = () => {
    if (lastVideo) openVideo(lastVideo);
};

// Search Handlers
searchBtn.onclick = () => {
    const q = searchInput.value;
    if (q) {
        fetchVideos(q);
        saveSearchHistory(q);
        suggestionsBox.classList.remove('active');
        searchInput.blur();
    }
};

searchInput.onkeypress = (e) => {
    if (e.key === 'Enter') searchBtn.onclick();
};

searchInput.oninput = (e) => {
    const q = e.target.value;
    if (clearSearchBtn) clearSearchBtn.style.display = q ? 'flex' : 'none';

    if (q.length > 1) {
        const suggestions = ['belajar javascript', 'tutorial unboxing', 'kucing lucu', 'cara memasak nasi goreng', 'playtube music video']
            .filter(s => s.toLowerCase().includes(q.toLowerCase()));

        if (suggestions.length > 0) {
            suggestionsBox.innerHTML = suggestions.map(s => `
                <div class="suggestion-item" onclick="selectSuggestion('${s}')">
                    <svg height="20" viewBox="0 0 24 24" width="20" fill="#aaa"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
                    ${s}
                </div>
            `).join('');
            suggestionsBox.classList.add('active');
        } else {
            suggestionsBox.classList.remove('active');
        }
    } else {
        suggestionsBox.classList.remove('active');
    }
};

function selectSuggestion(s) {
    searchInput.value = s;
    suggestionsBox.classList.remove('active');
    fetchVideos(s);
}

// Clear Search
if (clearSearchBtn) {
    clearSearchBtn.onclick = () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        suggestionsBox.classList.remove('active');
    };
}

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.classList.remove('active');
    }
});

// Category/Chip Select
function selectChip(el, category) {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    currentCategory = category;
    if (category === 'trending') fetchTrending();
    else fetchCategory(category);
}

async function fetchCategory(category, append = false) {
    isLoading = true;
    if (!append) {
        currentPage = 1;
        nextPageToken = '';
        resultsGrid.innerHTML = '';
        renderSkeleton(8);
    }

    try {
        const response = await fetch(`/api/category?id=${category}&pageToken=${nextPageToken}`);
        const data = await response.json();

        if (data.error || !data.items) throw new Error(data.error || 'No items');

        nextPageToken = data.nextPageToken || '';
        const videos = data.items.map(normalizeVideoData);
        renderVideos(videos, append);
    } catch (err) {
        console.warn('API Error, using mock data:', err);
        const videos = generateMockVideos(category, RESULTS_PER_PAGE);
        renderVideos(videos, append);
    } finally {
        isLoading = false;
    }
}

// Filter Bottom Sheet
filterBtn.onclick = () => {
    toggleActive('filter-sheet', true);
    toggleActive('sheet-overlay', true);
};

closeFilters.onclick = () => {
    toggleActive('filter-sheet', false);
    toggleActive('sheet-overlay', false);
};

document.querySelectorAll('.filter-option').forEach(opt => {
    opt.onclick = function() {
        const parent = this.parentElement;
        parent.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
        this.classList.add('active');
        const filterType = this.innerText;
        showToast(`Mengurutkan berdasarkan: ${filterType}`);

        applySearchFilter(filterType);
        closeAllOverlays();
    };
});

function applySearchFilter(type) {
    // This is a mock implementation that sorts the current results
    // In a real app, this would be a new API call
    const currentResultsGrid = resultsGrid.querySelector('.search-list, .grid');
    if (!currentResultsGrid) return;

    const cards = Array.from(currentResultsGrid.children);
    if (cards.length <= 1) return;

    if (type === 'Jumlah Tayangan') {
        cards.sort((a, b) => {
            const vA = parseFloat(a.querySelector('.video-meta').innerText) || 0;
            const vB = parseFloat(b.querySelector('.video-meta').innerText) || 0;
            return vB - vA;
        });
    } else if (type === 'Tanggal Unggah') {
        // Just reverse them to simulate "newest"
        cards.reverse();
    }

    currentResultsGrid.innerHTML = '';
    cards.forEach(c => currentResultsGrid.appendChild(c));
}

sheetOverlay.onclick = () => {
    closeAllOverlays();
};

function closeAllOverlays() {
    toggleActive('filter-sheet', false);
    toggleActive('create-sheet', false);
    toggleActive('sheet-overlay', false);
    toggleActive('comments-overlay', false);
    toggleActive('notification-overlay', false);
    toggleActive('channel-view', false);
    toggleActive('voice-search-modal', false);
    toggleActive('cast-sheet', false);
    toggleActive('share-modal', false);
    toggleActive('upload-overlay', false);
    document.getElementById('video-modal').classList.remove('active');
    document.getElementById('login-modal').classList.remove('active');

    // Stop any playing video when closing modal
    const playerWrapper = document.getElementById('player-wrapper');
    if (playerWrapper) playerWrapper.innerHTML = '';
}

// Channel View
function openChannel(channelId, channelName, fromPopState = false) {
    // If channelName is literally 'true' (from bug), or empty, use channelId
    const name = (channelName && channelName !== true && channelName !== 'true') ? channelName : channelId;

    if (!fromPopState) {
        history.pushState({page: 'channel', id: channelId, name: name}, '');
    }

    const channelView = document.getElementById('channel-view');
    closeAllOverlays(); // Close others first
    toggleActive('channel-view', true);

    // Load channel data
    document.getElementById('channel-name-display').innerText = name;
    document.getElementById('channel-title-header').innerText = name;
    document.getElementById('channel-avatar-large').style.backgroundColor = stringToColor(name);
    document.getElementById('channel-avatar-large').innerText = name.charAt(0);
    document.getElementById('channel-banner').style.background = `linear-gradient(135deg, ${stringToColor(name)} 0%, #333 100%)`;

    const isSubbed = subscriptions.some(s => s.id === channelId);
    const subBtn = document.getElementById('channel-subscribe-btn');
    if (subBtn) {
        subBtn.innerText = isSubbed ? 'Disubscribe' : 'Subscribe';
        subBtn.className = `subscribe-btn ${isSubbed ? 'active' : ''}`;
        subBtn.onclick = () => toggleSubscribe(subBtn, channelId, name);
    }

    const videosContainer = document.getElementById('channel-videos');
    videosContainer.innerHTML = '<div class="loading">Memuat video channel...</div>';

    fetchVideosByChannel(channelId).then(videos => {
        renderChannelVideos(videos);

        // Setup Tabs
        document.querySelectorAll('.channel-tab').forEach(tab => {
            tab.onclick = function() {
                document.querySelectorAll('.channel-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                const type = this.innerText;

                if (type === 'Shorts') {
                    renderChannelVideos(videos.filter(v => v.title.toLowerCase().includes('short')));
                } else if (type === 'Live') {
                    renderChannelVideos(videos.filter(v => v.title.toLowerCase().includes('live')));
                } else {
                    renderChannelVideos(videos);
                }
            };
        });
    }, 600);
}

function renderChannelVideos(videos) {
    const videosContainer = document.getElementById('channel-videos');
    videosContainer.innerHTML = '';

    if (videos.length === 0) {
        videosContainer.innerHTML = '<p style="padding: 40px; text-align: center; color: var(--text-secondary); grid-column: 1/-1;">Belum ada konten di kategori ini.</p>';
        return;
    }

    videos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="thumbnail-container">
                <img src="${video.thumbnail}">
            </div>
            <div class="video-details">
                <div class="video-info">
                    <h3 class="video-title">${video.title}</h3>
                    <p class="video-meta">${video.views} x ditonton • ${video.time}</p>
                </div>
            </div>
        `;
        card.onclick = () => openVideo(video);
        videosContainer.appendChild(card);
    });
}

document.getElementById('close-channel').onclick = () => {
    if (history.state && history.state.page === 'channel') {
        history.back();
    } else {
        toggleActive('channel-view', false);
    }
};

// Create Sheet
const createBtn = document.getElementById('create-btn-mobile');
const createSheet = document.getElementById('create-sheet');
if (createBtn) {
    createBtn.onclick = () => {
        toggleActive('create-sheet', true);
        toggleActive('sheet-overlay', true);
    };
}
document.getElementById('close-sheet').onclick = () => {
    toggleActive('create-sheet', false);
    toggleActive('sheet-overlay', false);
};

// Notifications
const notifBtn = document.getElementById('notif-btn');
const notifOverlay = document.getElementById('notification-overlay');
if (notifBtn) {
    notifBtn.onclick = () => {
        toggleActive('notification-overlay', true);
        renderNotifications();
    };
}
document.getElementById('close-notif').onclick = () => {
    toggleActive('notification-overlay', false);
};

function renderNotifications() {
    const list = document.getElementById('notif-list');
    list.innerHTML = [1,2,3,4,5,6,7,8].map(i => `
        <div class="notif-item">
            <div class="notif-avatar" style="background-color: ${stringToColor('User '+i)}"></div>
            <div class="notif-content">
                <div class="notif-text"><b>Channel Viral ${i}</b> baru saja mengupload video: 10 Cara Membuat Playtube Jadi Ungu</div>
                <div class="notif-time">2 jam yang lalu</div>
            </div>
            <div class="notif-thumb">
                <img src="https://picsum.photos/seed/notif${i}/120/68">
            </div>
        </div>
    `).join('');
}

// Comments
async function openComments() {
    toggleActive('comments-overlay', true);
    const list = document.getElementById('comments-list');
    list.innerHTML = '<div class="loading">Memuat komentar...</div>';

    if (!lastVideo) return;
    const videoId = typeof lastVideo === 'string' ? lastVideo : lastVideo.id;

    try {
        const response = await fetch(`/api/comments?videoId=${videoId}`);
        const data = await response.json();
        renderComments(data.items || []);
    } catch (err) {
        console.error("Fetch comments error:", err);
        renderComments([]);
    }
}
document.getElementById('close-comments').onclick = () => {
    toggleActive('comments-overlay', false);
};

const sendCommentBtn = document.getElementById('send-comment-btn');
const commentInput = document.getElementById('new-comment-input');

if (sendCommentBtn) {
    sendCommentBtn.onclick = () => submitComment();
}

if (commentInput) {
    commentInput.onkeypress = (e) => {
        if (e.key === 'Enter') submitComment();
    };
}

function submitComment() {
    const text = commentInput.value.trim();
    if (!text || !lastVideo) return;

    const videoId = typeof lastVideo === 'string' ? lastVideo : lastVideo.id;
    if (!localComments[videoId]) localComments[videoId] = [];

    const newComment = {
        user: currentUser ? currentUser.name : 'Pengguna Playtube',
        text: text,
        time: 'Baru saja',
        avatarColor: '#9d4edd'
    };

    localComments[videoId].unshift(newComment);
    localStorage.setItem('playtube_comments', JSON.stringify(localComments));

    commentInput.value = '';
    renderComments();
    updateCommentPreview();
}

function renderComments(apiComments = []) {
    const list = document.getElementById('comments-list');
    if (!lastVideo) return;
    const videoId = typeof lastVideo === 'string' ? lastVideo : lastVideo.id;

    const videoComments = localComments[videoId] || [];

    // Normalize local comments to match API structure
    const normalizedLocal = videoComments.map(c => ({
        snippet: {
            topLevelComment: {
                snippet: {
                    authorDisplayName: c.user,
                    textDisplay: c.text,
                    publishedAt: new Date().toISOString(),
                    authorProfileImageUrl: null,
                    avatarColor: c.avatarColor
                }
            }
        }
    }));

    const allComments = [...normalizedLocal, ...apiComments];

    if (allComments.length === 0) {
        list.innerHTML = '<p style="padding: 20px; text-align: center; color: #aaa;">Belum ada komentar.</p>';
        return;
    }

    list.innerHTML = allComments.map(item => {
        const c = item.snippet.topLevelComment.snippet;
        const avatar = c.authorProfileImageUrl ? `<img src="${c.authorProfileImageUrl}" class="comment-avatar">` : `<div class="comment-avatar" style="background-color: ${c.avatarColor || '#9d4edd'}">${c.authorDisplayName.charAt(0)}</div>`;

        return `
            <div class="comment-item">
                ${avatar}
                <div class="comment-body">
                    <div class="comment-user">@${c.authorDisplayName} <span class="comment-time">${timeAgo(c.publishedAt)}</span></div>
                    <div class="comment-text">${c.textDisplay}</div>
                    <div class="comment-actions">
                        <span><svg height="16" viewBox="0 0 24 24" width="16" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"></path></svg></span>
                        <span>Balas</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateCommentPreview() {
    if (!lastVideo) return;
    const videoId = typeof lastVideo === 'string' ? lastVideo : lastVideo.id;
    const videoComments = localComments[videoId] || [];
    if (videoComments.length > 0) {
        const previewText = document.querySelector('.user-comment-preview div[style*="flex-grow: 1"]');
        if (previewText) {
            previewText.innerText = videoComments[0].text;
        }
    }
}

// Login Simulation
const loginModal = document.getElementById('login-modal');
const closeLogin = document.getElementById('close-login');
const loginForm = document.getElementById('login-form');
const headerLoginBtn = document.getElementById('header-login-btn');

async function checkLoginState() {
    if (supabaseClient) {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = {
                name: session.user.user_metadata.full_name || session.user.email.split('@')[0],
                email: session.user.email,
                avatar: session.user.user_metadata.avatar_url
            };
            localStorage.setItem('playtube_user', JSON.stringify(currentUser));
            loginModal.classList.remove('active');
            return;
        }
    }

    if (!currentUser) {
        loginModal.classList.add('active');
        if (closeLogin) closeLogin.style.display = 'none';
    }
}

async function loginWithGoogle() {
    if (!supabaseClient) {
        showToast('Supabase tidak terkonfigurasi. Gunakan login simulasi.');
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });

    if (error) {
        showToast('Gagal login: ' + error.message);
    }
}

if (headerLoginBtn) headerLoginBtn.onclick = () => {
    loginModal.classList.add('active');
    if (closeLogin) closeLogin.style.display = 'block';
};

if (closeLogin) closeLogin.onclick = () => loginModal.classList.remove('active');

loginForm.onsubmit = (e) => {
    e.preventDefault();
    const emailInput = loginForm.querySelector('input[type="text"]');
    const name = emailInput.value.split('@')[0] || 'Pengguna Playtube';
    currentUser = { name: name, email: emailInput.value };
    localStorage.setItem('playtube_user', JSON.stringify(currentUser));
    showToast('Login berhasil! Selamat datang.');
    loginModal.classList.remove('active');
    setTimeout(() => location.reload(), 500);
};

// Toast Utility
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.className = 'show';
    setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
}

// Ripple Effect
function setupRippleEffect() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('.search-btn, .action-item, .chip, .sidebar-item, .nav-item');
        if (target) {
            const ripple = document.createElement('div');
            ripple.className = 'ripple';
            target.appendChild(ripple);

            const rect = target.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = `${size}px`;

            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;

            setTimeout(() => ripple.remove(), 600);
        }
    });
}

// Mock Data Generator
function generateMockVideos(query, count) {
    const videos = [];
    const titles = [
        `Cara Membuat Playtube Berwarna Ungu - Tutorial Lengkap ${query}`,
        `Lagu Pop Terpopuler 2024 - Koleksi Terbaik ${query}`,
        `Melihat Keindahan Alam Nusantara ${query}`,
        `Review Smartphone Ungu Terbaru - Spek Gahar! ${query}`,
        `10 Makanan Viral Minggu Ini di Playtube ${query}`,
        `Unboxing Kado Misterius #shorts ${query}`,
        `Live Streaming Game Horor Paling Menakutkan ${query}`,
        `Rahasia di Balik Algoritma Playtube Ungu ${query}`,
        `Vlog Harian: Jalan-jalan ke Taman Bunga ${query}`
    ];

    for (let i = 0; i < count; i++) {
        const id = Math.random().toString(36).substr(2, 9);
        videos.push({
            id: id,
            title: titles[i % titles.length],
            thumbnail: `https://picsum.photos/seed/${id}/360/202`,
            channel: `Saluran Ungu ${String.fromCharCode(65 + (i % 26))}`,
            channelId: `channel_${i % 5}`,
            views: (Math.random() * 1000).toFixed(1) + ' rb',
            time: (i + 1) + ' jam yang lalu',
            verified: Math.random() > 0.5,
            description: 'Ini adalah deskripsi singkat untuk video mock ini. Silakan tonton sampai habis!'
        });
    }
    return videos;
}

// Swipe Gestures for Mini Player & Sheets
let touchStartY = 0;
const handleTouchStart = (e) => touchStartY = e.touches[0].clientY;
const handleTouchEnd = (e, callback) => {
    const touchEndY = e.changedTouches[0].clientY;
    if (touchEndY - touchStartY > 80) { // Swiped down
        callback();
    }
};

const miniPlayer = document.getElementById('mini-player');
miniPlayer.addEventListener('touchstart', handleTouchStart, {passive: true});
miniPlayer.addEventListener('touchend', (e) => handleTouchEnd(e, () => {
    toggleActive('mini-player', false);
    document.getElementById('mini-thumb').innerHTML = '';
}), {passive: true});

[filterSheet, createSheet, document.getElementById('comments-overlay')].forEach(sheet => {
    sheet.addEventListener('touchstart', handleTouchStart, {passive: true});
    sheet.addEventListener('touchend', (e) => handleTouchEnd(e, () => {
        sheet.classList.remove('active');
        if (sheet.id !== 'comments-overlay') toggleActive('sheet-overlay', false);
    }), {passive: true});
});

// Helper: Normalization
function normalizeVideoData(item) {
    const id = typeof item.id === 'string' ? item.id : item.id.videoId;
    const snippet = item.snippet;
    const stats = item.statistics || {};

    return {
        id: id,
        title: snippet.title,
        thumbnail: snippet.thumbnails.high ? snippet.thumbnails.high.url : (snippet.thumbnails.medium ? snippet.thumbnails.medium.url : snippet.thumbnails.default.url),
        channel: snippet.channelTitle,
        channelId: snippet.channelId,
        views: stats.viewCount ? formatViews(stats.viewCount) : (Math.floor(Math.random() * 500) + 50) + ' rb',
        time: timeAgo(snippet.publishedAt),
        verified: Math.random() > 0.3,
        description: snippet.description || ''
    };
}

function formatViews(views) {
    views = parseInt(views);
    if (views >= 1000000) return (views / 1000000).toFixed(1) + ' jt';
    if (views >= 1000) return (views / 1000).toFixed(1) + ' rb';
    return views + '';
}

function timeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diff = now - past;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return years + ' tahun yang lalu';
    if (months > 0) return months + ' bulan yang lalu';
    if (days > 0) return days + ' hari yang lalu';
    if (hours > 0) return hours + ' jam yang lalu';
    if (minutes > 0) return minutes + ' menit yang lalu';
    return 'Baru saja';
}

// Helper: String to Color
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    // Mix with purple for theme consistency
    return color;
}

function toggleSubscribe(btn, channelId, channelName) {
    const index = subscriptions.findIndex(s => s.id === channelId);

    if (index === -1) {
        subscriptions.push({id: channelId, name: channelName});
        btn.innerText = 'Disubscribe';
        btn.classList.add('active');
        showToast('Ditambahkan ke subscription');
    } else {
        subscriptions.splice(index, 1);
        btn.innerText = 'Subscribe';
        btn.classList.remove('active');
    }
    localStorage.setItem('playtube_subs', JSON.stringify(subscriptions));
}

function toggleAction(btn) {
    btn.classList.toggle('active');
}

function toggleLike(btn, type) {
    const isAlreadyActive = btn.classList.contains('active');
    const actionsBar = btn.parentElement;
    const likeBtn = actionsBar.children[0];
    const dislikeBtn = actionsBar.children[1];
    const likeCountSpan = document.getElementById('like-count');

    let count = parseInt(likeCountSpan.innerText) || 42;

    if (type === 'like') {
        dislikeBtn.classList.remove('active');
        if (isAlreadyActive) {
            btn.classList.remove('active');
            likeCountSpan.innerText = `${count} rb`;
        } else {
            btn.classList.add('active');
            likeCountSpan.innerText = `${count + 1} rb`;
            showToast('Anda menyukai video ini');
        }
    } else {
        likeBtn.classList.remove('active');
        if (isAlreadyActive) {
            btn.classList.remove('active');
        } else {
            btn.classList.add('active');
            showToast('Video ini tidak disukai');
        }
    }
}

function openShare() {
    toggleActive('share-modal', true);
    if (lastVideo) {
        document.getElementById('share-url').value = `https://playtube.com/v/${lastVideo.id}`;
    }
}

function mockShare(platform) {
    showToast(`Membuka ${platform}...`);
    setTimeout(() => {
        toggleActive('share-modal', false);
        showToast(`Berhasil dibagikan ke ${platform}`);
    }, 1500);
}

function downloadVideo() {
    if (!lastVideo) return;
    const videoId = typeof lastVideo === 'string' ? lastVideo : lastVideo.id;
    showToast('Menyiapkan download...');
    window.location.href = `/api/download?videoId=${videoId}`;
}

function mockCreateShort() {
    toggleActive('create-sheet', false);
    toggleActive('sheet-overlay', false);
    showToast('Membuka kamera Shorts...');
    setTimeout(() => {
        showToast('Izinkan akses kamera untuk melanjutkan.');
    }, 1500);
}

function openUpload() {
    toggleActive('create-sheet', false);
    toggleActive('sheet-overlay', false);
    toggleActive('upload-overlay', true);
    document.getElementById('upload-idle').style.display = 'flex';
    document.getElementById('upload-progress').style.display = 'none';
}

function handleFileUpload(e) {
    if (!e.target.files.length) return;
    const file = e.target.files[0];
    const title = document.getElementById('upload-title').value || file.name;
    const desc = document.getElementById('upload-desc').value || '';

    document.getElementById('upload-idle').style.display = 'none';
    document.getElementById('upload-progress').style.display = 'flex';

    const fill = document.getElementById('upload-fill');
    const status = document.getElementById('upload-status');

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('description', desc);

    try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload', true);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = (event.loaded / event.total) * 100;
                fill.style.width = `${percent}%`;
                status.innerText = `${Math.floor(percent)}% selesai`;
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                showToast('Video berhasil diupload ke YouTube!');
                setTimeout(() => {
                    toggleActive('upload-overlay', false);
                    document.getElementById('upload-title').value = '';
                    document.getElementById('upload-desc').value = '';
                    loadTrending();
                }, 1500);
            } else {
                showToast('Upload gagal: ' + xhr.responseText);
                document.getElementById('upload-idle').style.display = 'flex';
                document.getElementById('upload-progress').style.display = 'none';
            }
        };

        xhr.send(formData);
    } catch (err) {
        showToast('Kesalahan koneksi saat upload');
    }
}

function mockLive() {
    toggleActive('create-sheet', false);
    toggleActive('sheet-overlay', false);
    showToast('Menyiapkan siaran langsung...');
    setTimeout(() => {
        showToast('Koneksi tidak stabil, coba lagi nanti.');
    }, 3000);
}

function toggleSave(btn) {
    const isSaved = btn.classList.toggle('active');
    if (isSaved) {
        showToast('Disimpan ke Tonton Nanti');
        if (lastVideo) {
            savedVideos.push(lastVideo);
            localStorage.setItem('playtube_saved', JSON.stringify(savedVideos));
        }
    } else {
        showToast('Dihapus dari Tonton Nanti');
        if (lastVideo) {
            savedVideos = savedVideos.filter(v => v.id !== lastVideo.id);
            localStorage.setItem('playtube_saved', JSON.stringify(savedVideos));
        }
    }
}

async function fetchVideosByChannel(channelId) {
    try {
        // We don't have a direct channel endpoint in server.js yet, but we can search for channel videos
        const response = await fetch(`/api/search?q=${encodeURIComponent(channelId)}`);
        const data = await response.json();
        if (data.error || !data.items) throw new Error();
        return data.items.map(normalizeVideoData);
    } catch (err) {
        return generateMockVideos(channelId, 12);
    }
}

function loadHistory() {
    currentCategory = 'history';
    const displayHistory = videoHistory.length > 0 ? videoHistory : generateMockVideos('history', 6);

    resultsGrid.innerHTML = '';
    const section = document.createElement('div');
    section.className = 'anda-section';
    section.innerHTML = `
        <div class="anda-section-header">
            Riwayat
            ${videoHistory.length > 0 ? '<button class="chip" onclick="clearHistory()">Hapus Semua</button>' : ''}
        </div>
    `;

    const grid = document.createElement('div');
    grid.className = 'grid';

    displayHistory.forEach(v => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="thumbnail-container"><img src="${v.thumbnail}"></div>
            <div class="video-details">
                <div class="video-info">
                    <h3 class="video-title">${v.title}</h3>
                    <p class="video-meta">${v.views} x ditonton • ${v.channel}</p>
                </div>
            </div>
        `;
        card.onclick = () => openVideo(v);
        grid.appendChild(card);
    });

    section.appendChild(grid);
    resultsGrid.appendChild(section);
}

function clearHistory() {
    videoHistory = [];
    localStorage.removeItem('playtube_video_history');
    loadHistory();
    showToast('Riwayat dihapus');
}

function loadAnda() {
    document.body.classList.add('no-categories');
    document.getElementById('categories-bar').style.display = 'none';
    const name = currentUser ? currentUser.name : 'Pengguna Playtube';
    const email = currentUser ? currentUser.email : '@pengguna_playtube';
    const displayHistory = videoHistory.slice(0, 10);

    resultsGrid.innerHTML = `
        <div class="anda-header">
            <div class="anda-avatar" style="background-color: #9d4edd">${name.charAt(0)}</div>
            <div class="anda-info">
                <h2>${name}</h2>
                <p>${email} • Lihat channel</p>
            </div>
        </div>
        <div class="anda-section" id="anda-riwayat-section">
            <div class="anda-section-header">
                <span>Riwayat</span>
                <button class="chip" onclick="loadHistory()">Lihat semua</button>
            </div>
            <div class="anda-history-list" id="anda-history-list">
            </div>
        </div>
        <div class="sidebar-section">
            <div class="anda-menu-item" onclick="loadUserVideos()"><svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M10 18v-6l5 3-5 3zm7-15H7v1h10V3zm3 3H4v1h16V6zm2 3H2v12h20V9zM3 10h18v10H3V10z"></path></svg> Video Anda</div>
            <div class="anda-menu-item" onclick="loadDownloads()"><svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"></path></svg> Hasil download</div>
            <div class="anda-menu-item" onclick="logout()"><svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M20 3v18H8v-1h11V4H8V3h12zm-3 8.5l-4-4v3H2v2h11v3l4-4z"></path></svg> Logout</div>
        </div>
    `;

    const list = document.getElementById('anda-history-list');
    if (displayHistory.length > 0) {
        displayHistory.forEach(v => {
            const item = document.createElement('div');
            item.className = 'anda-history-item';
            item.innerHTML = `
                <div class="anda-history-thumb"><img src="${v.thumbnail}"></div>
                <div class="anda-history-title">${v.title}</div>
            `;
            item.onclick = () => openVideo(v);
            list.appendChild(item);
        });
    } else {
        list.innerHTML = '<p style="padding: 10px; color: #aaa;">Belum ada riwayat tontonan</p>';
    }
}

function loadUserVideos() {
    currentCategory = 'user_videos';
    resultsGrid.innerHTML = `
        <div class="anda-section-header" style="padding: 16px;">Video Anda</div>
        <div class="empty-home-container" style="min-height: 40vh;">
            <div class="empty-home-icon"><svg height="64" viewBox="0 0 24 24" width="64" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"></path></svg></div>
            <div class="empty-home-title">Belum ada video</div>
            <p style="color: var(--text-secondary); margin-bottom: 24px;">Tap tombol buat untuk mulai berbagi video dengan orang lain.</p>
            <button class="chip active" onclick="openUpload()">Upload Video</button>
        </div>
    `;
    window.scrollTo(0, 0);
}

function loadDownloads() {
    currentCategory = 'downloads';
    resultsGrid.innerHTML = `
        <div class="anda-section-header" style="padding: 16px;">Hasil download</div>
        <div class="empty-home-container" style="min-height: 40vh;">
            <div class="empty-home-icon"><svg height="64" viewBox="0 0 24 24" width="64" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"></path></svg></div>
            <div class="empty-home-title">Tidak ada hasil download</div>
            <p style="color: var(--text-secondary);">Video yang Anda download akan muncul di sini.</p>
        </div>
    `;
    window.scrollTo(0, 0);
}

async function logout() {
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    currentUser = null;
    localStorage.removeItem('playtube_user');
    location.reload();
}

function loadTrending() {
    resultsGrid.innerHTML = '';
    document.body.classList.remove('no-categories');
    document.getElementById('categories-bar').style.display = 'flex';
    fetchTrending();
}

function loadSearch(q) {
    document.body.classList.add('no-categories');
    document.getElementById('categories-bar').style.display = 'none';
    searchInput.value = q;
    fetchVideos(q);
}

function loadCategory(cid) {
    const cats = {10: 'musik', 20: 'game', 25: 'berita'};
    fetchCategory(cats[cid] || 'trending');
}

function loadSubscriptions() {
    currentCategory = 'subscriptions';
    document.body.classList.add('no-categories');
    document.getElementById('categories-bar').style.display = 'none';
    resultsGrid.innerHTML = '';

    if (subscriptions.length === 0) {
        resultsGrid.innerHTML = `
            <div class="empty-home-container">
                <div class="empty-home-icon"><svg height="64" viewBox="0 0 24 24" width="64" fill="currentColor"><path d="M10 18v-6l5 3-5 3zm7-15H7v1h10V3zm3 3H4v1h16V6zm2 3H2v12h20V9zM3 10h18v10H3V10z"></path></svg></div>
                <div class="empty-home-title">Jangan ketinggalan video baru</div>
                <div class="empty-home-msg">Subscribe ke channel favorit Anda untuk melihat video terbaru mereka di sini.</div>
                <button class="chip active" onclick="loadTrending()">Telusuri Trending</button>
            </div>
        `;
        return;
    }

    const subHeader = document.createElement('div');
    subHeader.className = 'anda-section-header';
    subHeader.style.paddingTop = '16px';
    subHeader.innerText = 'Subscription Anda';
    resultsGrid.appendChild(subHeader);

    const grid = document.createElement('div');
    grid.className = 'grid';
    resultsGrid.appendChild(grid);

    // Mocking subscription videos
    const videos = generateMockVideos('subs', 12);
    videos.forEach(v => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="thumbnail-container"><img src="${v.thumbnail}"></div>
            <div class="video-details">
                <div class="channel-avatar" style="background-color: ${stringToColor(v.channel)}">${v.channel.charAt(0)}</div>
                <div class="video-info">
                    <h3 class="video-title">${v.title}</h3>
                    <p class="channel-name">${v.channel}</p>
                    <p class="video-meta">${v.views} x ditonton • ${v.time}</p>
                </div>
            </div>
        `;
        card.onclick = () => openVideo(v);
        grid.appendChild(card);
    });
}

function setActiveNav(el) {
    document.querySelectorAll('.nav-item, .sidebar-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');

    // Also sync between mobile nav and desktop sidebar if possible
    const text = el.querySelector('span').innerText;
    document.querySelectorAll('.nav-item, .sidebar-item').forEach(item => {
        if (item.querySelector('span') && item.querySelector('span').innerText === text) {
            item.classList.add('active');
        }
    });
}

function toggleActive(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    if (show) el.classList.add('active');
    else el.classList.remove('active');
}

// Global functional handlers
function openVoiceSearch() {
    toggleActive('voice-search-modal', true);
    const status = document.getElementById('voice-status');
    status.innerText = 'Mendengarkan...';

    setTimeout(() => {
        status.innerText = 'Mencoba mengenali...';
        setTimeout(() => {
            const mockQueries = ['Lagu Pop Terbaru', 'Tutorial Memasak', 'Playtube Features', 'Kucing Lucu'];
            const randomQuery = mockQueries[Math.floor(Math.random() * mockQueries.length)];
            status.innerText = `"${randomQuery}"`;
            setTimeout(() => {
                toggleActive('voice-search-modal', false);
                searchInput.value = randomQuery;
                fetchVideos(randomQuery);
            }, 1000);
        }, 1500);
    }, 2000);
}

function connectToDevice(deviceName) {
    showToast(`Menghubungkan ke ${deviceName}...`);
    setTimeout(() => {
        showToast(`Berhasil terhubung ke ${deviceName}`);
        closeAllOverlays();
    }, 2000);
}
