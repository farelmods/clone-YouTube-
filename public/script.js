const API_KEY = ''; // Kosongkan jika menggunakan mock
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
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
        if (event.state) {
            if (event.state.page === 'video') openVideo(event.state.id, true);
            if (event.state.page === 'channel') openChannel(event.state.id, true);
            if (event.state.page === 'home') {
                closeAllOverlays();
            }
        } else {
            closeAllOverlays();
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

        card.innerHTML = `
            <div class="thumbnail-container">
                <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
            </div>
            <div class="video-details">
                <div class="channel-avatar" style="background-color: ${stringToColor(video.channel)}">
                    ${video.channel.charAt(0)}
                </div>
                <div class="video-info">
                    <h3 class="video-title">${video.title}</h3>
                    <div class="channel-info-row" onclick="event.stopPropagation(); openChannel('${video.channelId}', '${video.channel}')">
                        <div class="channel-avatar-small mobile-only" style="background-color: ${stringToColor(video.channel)}">
                            ${video.channel.charAt(0)}
                        </div>
                        <p class="channel-name">${video.channel} ${video.verified ? '<svg height="12" viewBox="0 0 24 24" width="12" fill="#aaa"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>' : ''}</p>
                    </div>
                    <p class="video-meta">${video.views} x ditonton • ${video.time}</p>
                    <p class="video-description">${video.description || ''}</p>
                </div>
                <button class="icon-btn mobile-only" style="margin-left: auto;">
                    <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
                </button>
            </div>
        `;

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
            <div class="action-item" onclick="toggleAction(this)">
                <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"></path></svg>
                <span>42 rb</span>
            </div>
            <div class="action-item">
                <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.37-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"></path></svg>
            </div>
            <div class="action-item">
                <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M11.73 3L5.83 21h2.09l1.49-4.5h6.18l1.49 4.5h2.09L13.27 3h-1.54zm-1.54 11.5L12.5 7.33 14.81 14.5h-4.62z"></path></svg>
                <span>Bagikan</span>
            </div>
            <div class="action-item">
                <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"></path></svg>
                <span>Remix</span>
            </div>
            <div class="action-item">
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
    videoModal.classList.remove('active');
    const playerWrapper = document.getElementById('player-wrapper');
    playerWrapper.innerHTML = '';

    // Show Mini Player
    const mini = document.getElementById('mini-player');
    const miniThumb = document.getElementById('mini-thumb');
    if (lastVideo) {
        const videoId = typeof lastVideo === 'string' ? lastVideo : lastVideo.id;
        miniThumb.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0"></iframe>`;
        toggleActive('mini-player', true);
    }

    if (history.state && history.state.page === 'video') {
        history.back();
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
        showToast(`Filter diterapkan: ${this.innerText}`);
        // In a real app, we would re-fetch with sort params
        if (currentQuery) fetchVideos(currentQuery);
        closeAllOverlays();
    };
});

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
    document.getElementById('login-modal').classList.remove('active');
}

// Channel View
function openChannel(channelId, channelName, fromPopState = false) {
    const name = channelName || channelId;
    if (!fromPopState) {
        history.pushState({page: 'channel', id: channelId, name: name}, '');
    }

    const channelView = document.getElementById('channel-view');
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
        videosContainer.innerHTML = '';
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
            card.onclick = () => openVideo(video.id);
            videosContainer.appendChild(card);
        });
    }, 600);
}

document.getElementById('close-channel').onclick = () => {
    toggleActive('channel-view', false);
    if (history.state && history.state.page === 'channel') {
        history.back();
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
function openComments() {
    toggleActive('comments-overlay', true);
    renderComments();
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

function renderComments() {
    const list = document.getElementById('comments-list');
    if (!lastVideo) return;
    const videoId = typeof lastVideo === 'string' ? lastVideo : lastVideo.id;

    const videoComments = localComments[videoId] || [];
    const mockComments = [1,2,3,4,5].map(i => ({
        user: `user_${i}`,
        text: 'Wah konten ini sangat bermanfaat bagi nusa dan bangsa. Lanjutkan!',
        time: `${i} jam yang lalu`,
        avatarColor: stringToColor('Commenter '+i)
    }));

    const allComments = [...videoComments, ...mockComments];

    list.innerHTML = allComments.map(c => `
        <div class="comment-item">
            <div class="comment-avatar" style="background-color: ${c.avatarColor}">${c.user.charAt(0)}</div>
            <div class="comment-body">
                <div class="comment-user">@${c.user} <span class="comment-time">${c.time}</span></div>
                <div class="comment-text">${c.text}</div>
                <div class="comment-actions">
                    <span><svg height="16" viewBox="0 0 24 24" width="16" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"></path></svg></span>
                    <span>Balas</span>
                </div>
            </div>
        </div>
    `).join('');
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

function checkLoginState() {
    if (!currentUser && window.innerWidth < 600) {
        // Option: Force login on mobile if desired
    }
}

if (headerLoginBtn) headerLoginBtn.onclick = () => loginModal.classList.add('active');
if (closeLogin) closeLogin.onclick = () => loginModal.classList.remove('active');

loginForm.onsubmit = (e) => {
    e.preventDefault();
    currentUser = { name: 'Pengguna Playtube', email: 'user@example.com' };
    localStorage.setItem('playtube_user', JSON.stringify(currentUser));
    showToast('Login berhasil! Selamat datang.');
    loginModal.classList.remove('active');
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
        `Melihat Keindahan Alam dengan Playtube ${query}`,
        `Review Smartphone Playtube Terbaru 2024 ${query}`,
        `10 Lagu Paling Viral Minggu Ini di Playtube ${query}`,
        `Unboxing Kado Misterius dari Playtube #shorts ${query}`,
        `Live Streaming Game Terpopuler ${query}`,
        `Rahasia di Balik Algoritma Playtube ${query}`,
        `Vlog Harian: Hari yang Menyenangkan ${query}`
    ];

    for (let i = 0; i < count; i++) {
        const id = Math.random().toString(36).substr(2, 9);
        videos.push({
            id: id,
            title: titles[i % titles.length] + (i > 7 ? ' Part ' + (i-6) : ''),
            thumbnail: `https://picsum.photos/seed/${id}/360/202`,
            channel: `Channel ${String.fromCharCode(65 + (i % 26))}`,
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
            <div class="anda-menu-item"><svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M10 18v-6l5 3-5 3zm7-15H7v1h10V3zm3 3H4v1h16V6zm2 3H2v12h20V9zM3 10h18v10H3V10z"></path></svg> Video Anda</div>
            <div class="anda-menu-item"><svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"></path></svg> Hasil download</div>
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

function logout() {
    currentUser = null;
    localStorage.removeItem('playtube_user');
    location.reload();
}

function loadTrending() {
    fetchTrending();
}

function loadSearch(q) {
    searchInput.value = q;
    fetchVideos(q);
}

function loadCategory(cid) {
    const cats = {10: 'musik', 20: 'game', 25: 'berita'};
    fetchCategory(cats[cid] || 'trending');
}

function toggleActive(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    if (show) el.classList.add('active');
    else el.classList.remove('active');
}
