    const resultsGrid = document.getElementById('results');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const videoModal = document.getElementById('video-modal');
    const closePlayer = document.getElementById('close-player');
    const playerContainer = document.getElementById('player');

    function escapeHTML(str) {
        if (!str) return "";
        return str.replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    }

    async function fetchVideos(url, layout = 'vertical') {
        resultsGrid.innerHTML = '';
        resultsGrid.style.animation = 'none';
        resultsGrid.offsetHeight; // trigger reflow
        resultsGrid.style.animation = null;
        renderSkeletons();
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                renderVideos(data.items, layout);
            } else {
                renderMockVideos(layout);
            }
        } catch (error) {
            console.error(error);
            renderMockVideos(layout);
        }
    }

    function renderSkeletons() {
        resultsGrid.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'card';
            skeleton.innerHTML = `
                <div class="skeleton skeleton-thumb"></div>
                <div class="video-details" style="padding: 0 12px;">
                    <div class="skeleton skeleton-avatar"></div>
                    <div class="video-info">
                        <div class="skeleton skeleton-text skeleton-title"></div>
                        <div class="skeleton skeleton-text skeleton-meta"></div>
                    </div>
                </div>
            `;
            resultsGrid.appendChild(skeleton);
        }
    }

    function renderMockVideos(layout = 'vertical') {
        const mockTitles = [
            "Cara Cepat Belajar Coding untuk Pemula",
            "Misteri Raccoon City! | Resident Evil Trailer 4",
            "AKU JUALAN MIE AYAM DI SIDOARJO TAPI ADA YANG...",
            "Lagu Malaysia Menyentuh Terbaik | Lagu Slow Rock",
            "RAHASIA ANEH DI GAMEPLAY TRAILER KINI TERUNGKAP",
            "Yuta Mio Panik! CCTV Merekam Keranjang...",
            "Jacson Zeran - Meski Harus Deng Dia (feat. Glenn)",
            "Tips Menabung untuk Pelajar agar Cepat Kaya",
            "Review iPhone 16 Pro Max - Apakah Worth It?",
            "Traveling Keliling Dunia dengan Budget Minim"
        ];
        const mockChannels = ["Indo Tech", "Gamer Pro", "Misteri Channel", "Music ID", "Reviewer", "Daily Vlog", "News Update"];

        const mockItems = [];
        for (let i = 0; i < 12; i++) {
            const title = mockTitles[i % mockTitles.length];
            const channel = mockChannels[i % mockChannels.length];
            mockItems.push({
                id: 'mock' + i,
                snippet: {
                    title: title,
                    channelTitle: channel,
                    description: `Video baru tentang ${title} dari channel ${channel}. Jangan lupa like, comment, dan subscribe untuk video seru lainnya!`,
                    thumbnails: { high: { url: `https://picsum.photos/seed/ptv${i}/480/270` } }
                }
            });
        }
        renderVideos(mockItems, layout);
    }

    // History logic
    let watchHistory = JSON.parse(localStorage.getItem('playtube_history') || '[]');

    function addToHistory(video) {
        watchHistory = JSON.parse(localStorage.getItem('playtube_history') || '[]').filter(item => {
            const id1 = typeof item.id === 'string' ? item.id : item.id.videoId;
            const id2 = typeof video.id === 'string' ? video.id : video.id.videoId;
            return id1 !== id2;
        });
        watchHistory.unshift(video);
        if (watchHistory.length > 50) watchHistory.pop();
        localStorage.setItem('playtube_history', JSON.stringify(watchHistory));
    }

    function loadHistory() {
        setActiveSidebar('Riwayat');
        renderVideos(watchHistory);
        if (watchHistory.length === 0) {
            resultsGrid.innerHTML = '<div class="loading" style="grid-column: 1/-1; text-align: center; margin-top: 50px;">Belum ada riwayat tontonan.</div>';
        }
    }

    function renderVideos(items, layout = 'vertical') {
        resultsGrid.innerHTML = '';
        if (!items || items.length === 0) {
            resultsGrid.innerHTML = '<div class="loading">Tidak ada hasil.</div>';
            return;
        }

        // Create a wrapper for the first section of videos
        let currentGrid = document.createElement('div');
        currentGrid.className = layout === 'horizontal' ? 'search-list' : 'grid';
        resultsGrid.appendChild(currentGrid);

        items.forEach((video, index) => {
            const videoId = typeof video.id === 'string' ? video.id : video.id.videoId;
            const snippet = video.snippet;
            if (!videoId) return;

            // Add Shorts section after 8 videos (2 rows on desktop)
            if (index === 8 && layout === 'vertical') {
                renderShortsSection(resultsGrid);
                currentGrid = document.createElement('div');
                currentGrid.className = layout === 'horizontal' ? 'search-list' : 'grid';
                resultsGrid.appendChild(currentGrid);
            }

            const card = document.createElement('div');
            card.className = `card ${layout === 'horizontal' ? 'horizontal' : ''}`;
            card.onclick = () => {
                addToHistory(video);
                openVideo(videoId, video);
            };

            const initials = snippet.channelTitle.charAt(0).toUpperCase();

            if (layout === 'horizontal') {
                card.innerHTML = `
                    <div class="thumbnail-container">
                        <img src="${snippet.thumbnails.high.url}" alt="">
                    </div>
                    <div class="video-details">
                        <div class="video-info">
                            <h3 class="video-title"></h3>
                            <p class="video-meta"></p>
                            <div class="channel-info-row">
                                <div class="channel-avatar-small">${initials}</div>
                                <p class="channel-name"></p>
                            </div>
                            <p class="video-description"></p>
                        </div>
                        <div style="margin-left: auto; padding-top: 4px;">
                            <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
                        </div>
                    </div>
                `;
                card.querySelector('.video-description').textContent = snippet.description || "Video menarik dari " + snippet.channelTitle + ". Tonton sekarang di Playtube.";
            } else {
                card.innerHTML = `
                    <div class="thumbnail-container">
                        <img src="${snippet.thumbnails.high.url}" alt="">
                    </div>
                    <div class="video-details">
                        <div class="channel-avatar">${initials}</div>
                        <div class="video-info">
                            <h3 class="video-title"></h3>
                            <p class="channel-name"></p>
                            <p class="video-meta"></p>
                        </div>
                        <div style="margin-left: auto; padding-top: 4px;">
                            <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
                        </div>
                    </div>
                `;
            }

            // Set text content safely
            const titleEl = card.querySelector('.video-title');
            titleEl.textContent = snippet.title;
            titleEl.title = snippet.title;

            card.querySelector('.channel-name').textContent = snippet.channelTitle;
            card.querySelector('.video-meta').textContent = `${getRandomViews()} • ${getRandomTime()}`;
            currentGrid.appendChild(card);
        });
    }

    function renderShortsSection(container) {
        const section = document.createElement('div');
        section.className = 'shorts-container';

        section.innerHTML = `
            <div class="shorts-header">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--primary-color)"><path d="M17.77 10.32l-1.2-.5L18 8.82a3.74 3.74 0 00-2.39-6.75 3.7 3.7 0 00-1.51.32l-10 4.1a3.75 3.75 0 00-.07 7l1.2.5L4 15.18a3.75 3.75 0 002.46 6.76 3.7 3.7 0 001.46-.3l10-4.1a3.75 3.75 0 00.07-7l-.22-.12zM10 14.5v-5l5 2.5-5 2.5z"></path></svg>
                <span>Shorts</span>
            </div>
            <div class="shorts-grid">
                ${[1,2,3,4,5].map(i => {
                    const shortVideo = {
                        id: 'mock-short-' + i,
                        snippet: {
                            title: `Video Shorts Menarik ${i} #shorts`,
                            channelTitle: 'Shorts Channel',
                            thumbnails: { high: { url: `https://picsum.photos/seed/short${i}/200/350` } }
                        }
                    };
                    return `
                    <div class="short-card" onclick="openVideo('mock-short-${i}', ${JSON.stringify(shortVideo).replace(/"/g, '&quot;')}, true)">
                        <div class="short-thumbnail">
                            <img src="https://picsum.photos/seed/short${i}/200/350" alt="">
                            <div style="position: absolute; bottom: 8px; left: 8px; color: white; font-size: 10px; font-weight: bold; background: rgba(0,0,0,0.6); padding: 2px 4px; border-radius: 2px;">SHORTS</div>
                        </div>
                        <div class="short-title">Video Shorts Menarik ${i} #shorts</div>
                        <div class="short-views">${Math.floor(Math.random()*100)+1} jt x ditonton</div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
        container.appendChild(section);
    }

    function getRandomViews() {
        const views = Math.floor(Math.random() * 1000) + 1;
        return views + " rb x ditonton";
    }

    function getRandomTime() {
        const times = ["1 jam yang lalu", "5 jam yang lalu", "1 hari yang lalu", "3 hari yang lalu", "1 minggu yang lalu", "1 bulan yang lalu"];
        return times[Math.floor(Math.random() * times.length)];
    }

    let currentVideoData = null;

    async function openVideo(videoId, videoData, isShort = false) {
        currentVideoData = videoData || {
            snippet: {
                title: 'Video Playtube Menarik',
                channelTitle: 'Playtube Channel'
            }
        };

        const player = document.getElementById('player');
        const wrapper = document.getElementById('player-wrapper');

        if (isShort) {
            wrapper.classList.add('portrait');
        } else {
            wrapper.classList.remove('portrait');
        }

        if (!player.querySelector('iframe') || !player.querySelector('iframe').src.includes(videoId)) {
            player.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
        }

        // Set ambient glow color randomly from a set of nice colors or purple shades
        const colors = ['rgba(157, 78, 221, 0.4)', 'rgba(123, 44, 191, 0.4)', 'rgba(90, 24, 154, 0.4)', 'rgba(60, 9, 108, 0.4)'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        document.getElementById('ambient-glow').style.background = `radial-gradient(circle at center, ${randomColor} 0%, rgba(15, 15, 15, 0) 70%)`;

        // Ensure player is in modal
        wrapper.appendChild(player);

        videoModal.style.display = 'flex';
        document.getElementById('mini-player').style.display = 'none';
        document.body.style.overflow = 'hidden';

        // Inject video info
        const content = document.getElementById('video-details-content');
        const initials = currentVideoData.snippet.channelTitle.charAt(0).toUpperCase();

        content.innerHTML = `
            <h2 id="player-video-title" style="font-size: 16px;"></h2>
            <div class="meta">${getRandomViews()} • ${getRandomTime()} ...lebih banyak</div>

            <div class="channel-info-bar">
                <div class="channel-avatar">${initials}</div>
                <div>
                    <div id="player-channel-name" style="font-weight: bold; font-size: 14px;"></div>
                    <div class="subs-count">${Math.floor(Math.random() * 10) + 1} jt subscriber</div>
                </div>
                <button class="subscribe-btn" id="subscribe-btn-player">Subscribe</button>
            </div>

            <div class="actions-bar">
                <div class="action-item" onclick="toggleAction(this, 'liked')">
                    <svg height="20" viewBox="0 0 24 24" width="20" fill="white"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"></path></svg>
                    <span>12 rb</span>
                </div>
                <div class="action-item" onclick="toggleAction(this, 'disliked')">
                    <svg height="20" viewBox="0 0 24 24" width="20" fill="white"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.37-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"></path></svg>
                </div>
                <div class="action-item" onclick="shareVideo('${videoId}')">
                    <svg height="20" viewBox="0 0 24 24" width="20" fill="white"><path d="M11.73 15.83L11 14l1.73-1.83L15 13l-3.27 2.83zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5v-9l6 4.5-6 4.5z"></path></svg>
                    <span>Bagikan</span>
                </div>
                <div class="action-item" onclick="showToast('Video didownload')">
                    <svg height="20" viewBox="0 0 24 24" width="20" fill="white"><path d="M17 18V5H7v13h10zm1-14c.55 0 1 .45 1 1v14c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1V5c0-.55.45-1 1-1h12zM8 7h3v2H8V7zm0 4h8v2H8v-2zm0 4h8v2H8v-2z"></path></svg>
                    <span>Download</span>
                </div>
                <div class="action-item" onclick="showToast('Disimpan ke Koleksi')">
                    <svg height="20" viewBox="0 0 24 24" width="20" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"></path></svg>
                    <span>Simpan</span>
                </div>
            </div>

            <div class="description-box" id="description-trigger">
                <div class="description-text">
                    Deskripsi untuk video ini: ${currentVideoData.snippet.title}. Video ini memberikan wawasan baru tentang topik yang sedang hangat diperbincangkan. Pastikan untuk menonton sampai habis agar tidak ketinggalan informasi penting!
                </div>
            </div>

            <div class="comments-preview" id="comments-preview-trigger">
                <div class="comments-header">
                    <span>Komentar</span>
                    <span class="comment-count" id="preview-comment-count">12 rb</span>
                </div>
                <div class="user-comment-preview">
                    <div class="avatar" id="preview-avatar"></div>
                    <div id="preview-comment-text">Wah videonya keren banget, sangat informatif!</div>
                </div>
            </div>
        `;

        document.getElementById('player-video-title').textContent = currentVideoData.snippet.title;
        const channelName = currentVideoData.snippet.channelTitle;
        document.getElementById('player-channel-name').textContent = channelName;

        const subBtn = document.getElementById('subscribe-btn-player');
        updateSubscribeButton(subBtn, channelName);
        subBtn.onclick = () => toggleSubscribe(subBtn, channelName);

        document.getElementById('description-trigger').onclick = function() {
            this.classList.toggle('expanded');
        };

        document.getElementById('comments-preview-trigger').onclick = () => openComments(videoId);

        // Inject suggested videos
        const suggested = document.getElementById('suggested-results');
        suggested.innerHTML = '<div class="loading">Memuat saran...</div>';

        // Use trending as suggested for now
        try {
            const res = await fetch('/api/trending');
            const data = await res.json();
            renderSuggestedVideos(data.items || []);
        } catch(e) {
            renderSuggestedVideos([]);
        }
    }

    function renderSuggestedVideos(items) {
        const suggested = document.getElementById('suggested-results');
        suggested.innerHTML = '';
        const list = items.length > 0 ? items : Array(5).fill(0).map((_,i)=>({
            id: 'suggest'+i,
            snippet: { title: 'Video Terkait ' + (i+1), channelTitle: 'Recommended Channel', thumbnails: { high: { url: `https://picsum.photos/seed/sug${i}/480/270` }}}
        }));

        list.forEach(v => {
            const videoId = typeof v.id === 'string' ? v.id : v.id.videoId;
            const card = document.createElement('div');
            card.className = 'card suggested-card';
            card.style.flexDirection = 'row';
            card.style.padding = '8px 12px';
            card.style.gap = '12px';
            card.onclick = () => openVideo(videoId);
            card.innerHTML = `
                <div class="thumbnail-container">
                    <img src="${v.snippet.thumbnails.high.url}" alt="">
                </div>
                <div class="video-info">
                    <h3 class="video-title" style="font-size: 14px;"></h3>
                    <p class="channel-name" style="font-size: 12px;"></p>
                    <p class="video-meta" style="font-size: 12px;"></p>
                </div>
            `;
            card.querySelector('.video-title').textContent = v.snippet.title;
            card.querySelector('.channel-name').textContent = v.snippet.channelTitle;
            card.querySelector('.video-meta').textContent = getRandomViews() + ' • ' + getRandomTime();
            suggested.appendChild(card);
        });
    }

    closePlayer.onclick = () => {
        videoModal.style.display = 'none';
        document.getElementById('comments-overlay').style.display = 'none';
        document.body.style.overflow = 'auto';

        const mini = document.getElementById('mini-player');
        mini.style.display = 'flex';
        document.getElementById('mini-title').textContent = currentVideoData.snippet.title;
        document.getElementById('mini-channel').textContent = currentVideoData.snippet.channelTitle;

        // Move player to mini thumb
        document.getElementById('mini-thumb').appendChild(document.getElementById('player'));
    };

    document.getElementById('mini-player').onclick = (e) => {
        if (e.target.closest('#mini-close')) {
            document.getElementById('mini-player').style.display = 'none';
            document.getElementById('player').innerHTML = '';
            return;
        }
        if (e.target.closest('#mini-play-pause')) {
            return;
        }
        // Re-open
        const iframe = document.querySelector('#player iframe');
        if (iframe) {
            const videoId = iframe.src.split('/').pop().split('?')[0];
            const isShort = document.getElementById('player-wrapper').classList.contains('portrait');
            openVideo(videoId, currentVideoData, isShort);
        }
    };

    window.onclick = (event) => {
        if (event.target == videoModal) {
            closePlayer.onclick();
        }
        if (event.target == loginModal) {
            loginModal.style.display = 'none';
        }
    };

    function loadTrending() {
        setActiveSidebar('Beranda');
        fetchVideos('/api/trending');
    }

    function loadCategory(id) {
        setActiveSidebar(null, id);
        fetchVideos(`/api/category?id=${id}`);
    }

    function loadSearch(q) {
        setActiveSidebar(null, null, q);
        fetchVideos(`/api/search?q=${encodeURIComponent(q)}`, 'horizontal');
    }

    function loadAnda() {
        setActiveSidebar('Anda');
        resultsGrid.innerHTML = `
            <div class="anda-header">
                <div class="anda-avatar" style="background-color: var(--primary-color)">P</div>
                <div class="anda-info">
                    <h2 style="font-size: 20px; font-weight: 700;">Playtube Premium User</h2>
                    <p style="font-size: 13px;">@playtube_dev • Lihat channel ></p>
                    <div style="display: flex; gap: 8px; margin-top: 12px;">
                        <button style="background: var(--hover-bg); border: none; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px;">
                            <svg height="18" viewBox="0 0 24 24" width="18" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"></path></svg>
                            Ganti akun
                        </button>
                        <button style="background: var(--hover-bg); border: none; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px;">
                            <svg height="18" viewBox="0 0 24 24" width="18" fill="white"><path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 7H13V9H11V7ZM11 11H13V17H11V11Z"></path></svg>
                            Bantuan
                        </button>
                    </div>
                </div>
            </div>

            <div class="anda-section">
                <div class="anda-section-header">
                    <span>Riwayat</span>
                    <button style="background: none; border: 1px solid var(--border-color); color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 500;">Lihat semua</button>
                </div>
                <div class="anda-history-list">
                    ${watchHistory.length > 0 ? watchHistory.map(v => {
                        const videoId = typeof v.id === 'string' ? v.id : v.id.videoId;
                        return `
                        <div class="anda-history-item" onclick="openVideo('${videoId}')">
                            <div class="anda-history-thumb">
                                <img src="${v.snippet.thumbnails.high.url}" alt="">
                            </div>
                            <div class="anda-history-title" style="font-weight: 500; margin-top: 8px;">${v.snippet.title}</div>
                        </div>
                        `;
                    }).join('') : `
                        <div style="padding: 24px; text-align: center; width: 100%;">
                            <svg height="48" viewBox="0 0 24 24" width="48" fill="var(--text-secondary)" style="margin-bottom: 12px;"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 7 7 7.07 7.07 0 0 1-6-3.22l-1.44 1.44A9 9 0 1 0 13 3z"></path></svg>
                            <p style="color: var(--text-secondary); font-size: 14px;">Belum ada riwayat tontonan</p>
                        </div>
                    `}
                </div>
            </div>

            <div class="anda-section" style="border-bottom: none; padding-top: 8px;">
                <div class="anda-menu-item" style="border-radius: 12px; margin: 4px 16px; background: rgba(255,255,255,0.03);">
                    <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M10 14.65v-5.3L15 12l-5 2.65ZM13 13V7l5.2 3-5.2 3ZM22 13h-4v9h-2v-9h-2V7h8v6ZM2 13h1V7H2v6Zm3 0h1V7H5v6Zm3 0h1V7H8v6Z"></path></svg>
                    <div style="flex-grow: 1;">
                        <div style="font-weight: 500;">Video Anda</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">12 video</div>
                    </div>
                    <svg height="24" viewBox="0 0 24 24" width="24" fill="var(--text-secondary)"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"></path></svg>
                </div>
                <div class="anda-menu-item" style="border-radius: 12px; margin: 4px 16px;">
                    <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M17 18V5H7v13h10zm1-14c.55 0 1 .45 1 1v14c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1V5c0-.55.45-1 1-1h12zM8 7h3v2H8V7zm0 4h8v2H8v-2zm0 4h8v2H8v-2z"></path></svg>
                    <div style="flex-grow: 1;">
                        <div style="font-weight: 500;">Download</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">20 video • Disimpan ke Playtube</div>
                    </div>
                </div>
                <div class="anda-menu-item" style="border-radius: 12px; margin: 4px 16px;">
                    <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
                    <div style="flex-grow: 1;">
                        <div style="font-weight: 500;">Video yang disukai</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">156 video</div>
                    </div>
                </div>

                <div style="padding: 16px 32px; font-weight: bold; font-size: 16px;">Setelan</div>

                <div class="anda-menu-item" style="border-radius: 12px; margin: 4px 16px;">
                    <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"></path></svg>
                    <span>Setelan</span>
                </div>
            </div>
        `;
    }

    function setActiveSidebar(text, categoryId, query) {
        const items = document.querySelectorAll('.sidebar-item');
        items.forEach(item => {
            item.classList.remove('active');
            if (text && item.innerText.includes(text)) {
                item.classList.add('active');
            }
        });

        // Update bottom nav
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (text && item.innerText.includes(text)) {
                item.classList.add('active');
            }
        });
    }

    // Search Suggestions Logic
    const suggestionsBox = document.getElementById('search-suggestions');
    let recentSearches = JSON.parse(localStorage.getItem('playtube_recent_searches') || '[]');

    function updateRecentSearches(q) {
        recentSearches = recentSearches.filter(item => item !== q);
        recentSearches.unshift(q);
        if (recentSearches.length > 10) recentSearches.pop();
        localStorage.setItem('playtube_recent_searches', JSON.stringify(recentSearches));
    }

    function showSuggestions() {
        const q = searchInput.value;
        if (q === '' && recentSearches.length > 0) {
            suggestionsBox.innerHTML = '';
            recentSearches.forEach(item => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.onclick = () => selectSuggestion(item);
                div.innerHTML = `
                    <svg height="24" viewBox="0 0 24 24" width="24" fill="currentColor"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 7 7 7.07 7.07 0 0 1-6-3.22l-1.44 1.44A9 9 0 1 0 13 3z"></path></svg>
                    <span></span>
                `;
                div.querySelector('span').textContent = item;
                suggestionsBox.appendChild(div);
            });
            suggestionsBox.style.display = 'block';
        } else if (q.length > 0) {
            // Mock suggestions
            const mocks = [q, q + ' musik', q + ' shorts', q + ' trending', q + ' gaming'];
            suggestionsBox.innerHTML = '';
            mocks.forEach(item => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.onclick = () => selectSuggestion(item);
                div.innerHTML = `
                    <svg height="24" viewBox="0 0 24 24" width="24" fill="currentColor"><path d="M20.87 20.17l-5.59-5.59C16.35 13.35 17 11.75 17 10c0-3.87-3.13-7-7-7s-7 3.13-7 7 3.13 7 7 7c1.75 0 3.35-.65 4.58-1.71l5.59 5.59.7-.71zM10 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"></path></svg>
                    <span></span>
                `;
                div.querySelector('span').textContent = item;
                suggestionsBox.appendChild(div);
            });
            suggestionsBox.style.display = 'block';
        } else {
            suggestionsBox.style.display = 'none';
        }
    }

    function selectSuggestion(val) {
        searchInput.value = val;
        suggestionsBox.style.display = 'none';
        loadSearch(val);
    }

    searchInput.addEventListener('focus', showSuggestions);
    searchInput.addEventListener('input', showSuggestions);
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            suggestionsBox.style.display = 'none';
        }
    });

    searchBtn.onclick = () => {
        const q = searchInput.value;
        if (q) {
            updateRecentSearches(q);
            loadSearch(q);
        }
    };

    searchInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            const q = searchInput.value;
            if (q) {
                updateRecentSearches(q);
                loadSearch(q);
            }
            suggestionsBox.style.display = 'none';
            searchInput.blur();
        }
    };

    // Create Sheet Logic
    const createBtn = document.getElementById('create-btn-mobile');
    const createSheet = document.getElementById('create-sheet');
    const sheetOverlay = document.getElementById('sheet-overlay');
    const closeSheet = document.getElementById('close-sheet');

    createBtn.onclick = () => {
        createSheet.style.display = 'flex';
        sheetOverlay.style.display = 'block';
    };

    const hideSheet = () => {
        createSheet.style.display = 'none';
        sheetOverlay.style.display = 'none';
    };

    closeSheet.onclick = hideSheet;
    sheetOverlay.onclick = hideSheet;

    // Notification Logic
    const notifBtn = document.getElementById('notif-btn');
    const notifOverlay = document.getElementById('notification-overlay');
    const closeNotif = document.getElementById('close-notif');
    const notifList = document.getElementById('notif-list');

    notifBtn.onclick = () => {
        renderNotifications();
        notifOverlay.style.display = 'flex';
    };

    closeNotif.onclick = () => {
        notifOverlay.style.display = 'none';
    };

    function renderNotifications() {
        const mockNotifs = [
            { user: 'Budi Gaming', action: 'mengupload: Review HP Terbaru 2024!', time: '2 jam yang lalu', img: 'https://picsum.photos/seed/n1/60/34' },
            { user: 'Susi Masak', action: 'mengupload: Resep Rendang Enak', time: '5 jam yang lalu', img: 'https://picsum.photos/seed/n2/60/34' },
            { user: 'Playtube', action: 'Selamat datang di Playtube!', time: '1 hari yang lalu', img: 'https://picsum.photos/seed/n3/60/34' },
            { user: 'Tekno Indo', action: 'Sedang LIVE: Apple Event', time: '2 hari yang lalu', img: 'https://picsum.photos/seed/n4/60/34' },
            { user: 'Music Channel', action: 'Video baru: Lagu Hits 2024', time: '3 hari yang lalu', img: 'https://picsum.photos/seed/n5/60/34' }
        ];

        notifList.innerHTML = mockNotifs.map(n => `
            <div class="notif-item">
                <div class="notif-avatar" style="background-image: url('https://ui-avatars.com/api/?name=${n.user}&background=random'); background-size: cover;"></div>
                <div class="notif-content">
                    <div class="notif-text"><b>${n.user}</b> ${n.action}</div>
                    <div class="notif-time">${n.time}</div>
                </div>
                <div class="notif-thumb">
                    <img src="${n.img}" alt="">
                </div>
                <div style="padding-left: 8px;">
                    <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
                </div>
            </div>
        `).join('');
    }

    // Modal & Login Logic
    const loginModal = document.getElementById('login-modal');
    const closeLogin = document.getElementById('close-login');
    const headerLoginBtn = document.getElementById('header-login-btn');
    const mobileAndaBtn = document.getElementById('mobile-anda-btn');
    const loginForm = document.getElementById('login-form');
    const mobileSearchBtn = document.getElementById('mobile-search-btn');

    const mobileSearchBack = document.getElementById('mobile-search-back');

    mobileSearchBtn.onclick = () => {
        document.body.classList.add('mobile-search-active');
        searchInput.focus();
    };

    mobileSearchBack.onclick = () => {
        document.body.classList.remove('mobile-search-active');
    };

    function checkLogin() {
        if (!localStorage.getItem('playtube_logged_in')) {
            loginModal.style.display = 'flex';
            closeLogin.style.display = 'none'; // Force login
        } else {
            loginModal.style.display = 'none';
        }
    }

    headerLoginBtn.onclick = () => loginModal.style.display = 'flex';
    // Removed duplicate onclick for mobileAndaBtn as it's now handled in the HTML
    closeLogin.onclick = () => loginModal.style.display = 'none';

    loginForm.onsubmit = (e) => {
        e.preventDefault();
        localStorage.setItem('playtube_logged_in', 'true');
        alert('Login berhasil! (Simulasi)');
        loginModal.style.display = 'none';
        loadTrending();
    };

    // Sidebar navigation interactivity
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    function selectChip(el, category) {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        if (category === 'trending') loadTrending();
        else loadSearch(category);
        showToast("Memuat kategori: " + el.textContent);
    }

    // Header Auto-hide on Scroll
    let lastScrollY = window.scrollY;
    const headerEl = document.querySelector('header');
    const categoriesBar = document.getElementById('categories-bar');

    window.addEventListener('scroll', () => {
        if (window.innerWidth > 600) return;

        if (window.scrollY > lastScrollY && window.scrollY > 100) {
            headerEl.style.transform = 'translateY(-100%)';
            categoriesBar.style.top = '0';
        } else {
            headerEl.style.transform = 'translateY(0)';
            categoriesBar.style.top = '56px';
        }
        lastScrollY = window.scrollY;
    });

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'show';
        setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
    }

    // Ripple Effect Logic
    document.addEventListener('click', function(e) {
        const target = e.target.closest('.nav-item, .card, .action-item, .chip, .sheet-item, .sidebar-item, .icon-btn, .login-btn, .subscribe-btn, .signin-btn');
        if (target) {
            const rect = target.getBoundingClientRect();
            const diameter = Math.max(target.clientWidth, target.clientHeight);
            const radius = diameter / 2;

            const circle = document.createElement("span");
            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${e.clientX - rect.left - radius}px`;
            circle.style.top = `${e.clientY - rect.top - radius}px`;
            circle.classList.add("ripple");

            target.classList.add('ripple-container');
            const oldRipple = target.querySelector('.ripple');
            if (oldRipple) oldRipple.remove();

            target.appendChild(circle);

            setTimeout(() => {
                if (circle.parentElement) circle.remove();
            }, 600);
        }
    });

    // Comments Logic
    function openComments(videoId) {
        const overlay = document.getElementById('comments-overlay');
        overlay.style.display = 'flex';
        renderComments(videoId);
    }

    document.getElementById('close-comments').onclick = () => {
        document.getElementById('comments-overlay').style.display = 'none';
    };

    function renderComments(videoId) {
        const list = document.getElementById('comments-list');
        const storageKey = 'comments_' + videoId;
        const userComments = JSON.parse(localStorage.getItem(storageKey) || '[]');

        const mockComments = [
            { user: 'Andi Pratama', text: 'Keren banget bang tutorialnya!', time: '1 jam yang lalu' },
            { user: 'Siti Aminah', text: 'Sangat membantu buat tugas kuliah saya.', time: '3 jam yang lalu' },
            { user: 'Budi Santoso', text: 'Ditunggu part 2-nya ya bang.', time: '5 jam yang lalu' }
        ];

        const allComments = [...userComments.slice().reverse(), ...mockComments];

        list.innerHTML = allComments.map(c => `
            <div class="comment-item">
                <div class="comment-avatar" style="background-color: ${stringToColor(c.user)}">${escapeHTML(c.user.charAt(0))}</div>
                <div class="comment-body">
                    <div class="comment-user">${escapeHTML(c.user)} <span class="comment-time">${escapeHTML(c.time)}</span></div>
                    <div class="comment-text">${escapeHTML(c.text)}</div>
                    <div class="comment-actions">
                        <span onclick="showToast('Suka komentar')">Suka</span>
                        <span onclick="showToast('Balas komentar')">Balas</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Update preview
        if (allComments.length > 0) {
            document.getElementById('preview-comment-text').textContent = allComments[0].text;
            const previewAvatar = document.getElementById('preview-avatar');
            previewAvatar.style.backgroundColor = stringToColor(allComments[0].user);
            previewAvatar.textContent = allComments[0].user.charAt(0);
            previewAvatar.style.display = 'flex';
            previewAvatar.style.alignItems = 'center';
            previewAvatar.style.justifyContent = 'center';
            previewAvatar.style.color = 'white';
            previewAvatar.style.fontWeight = 'bold';
            previewAvatar.style.fontSize = '12px';
            document.getElementById('preview-comment-count').textContent = (allComments.length + 12000).toLocaleString('id-ID');
        }
    }

    function stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return "#" + "00000".substring(0, 6 - c.length) + c;
    }

    document.getElementById('send-comment-btn').onclick = () => {
        const input = document.getElementById('new-comment-input');
        const text = input.value;
        if (!text) return;

        const iframe = document.querySelector('#player iframe');
        if (!iframe) return;
        const videoId = iframe.src.split('/').pop().split('?')[0];
        const storageKey = 'comments_' + videoId;
        const userComments = JSON.parse(localStorage.getItem(storageKey) || '[]');

        userComments.push({
            user: 'Playtube User',
            text: text,
            time: 'Baru saja'
        });

        localStorage.setItem(storageKey, JSON.stringify(userComments));
        input.value = '';
        renderComments(videoId);
        showToast('Komentar ditambahkan');
    };

    document.getElementById('new-comment-input').onkeypress = (e) => {
        if (e.key === 'Enter') document.getElementById('send-comment-btn').click();
    };

    function toggleAction(el, type) {
        el.classList.toggle('active');
        if (el.classList.contains('active')) {
            // CSS handles the color change via .active class
            showToast(type === 'liked' ? 'Anda menyukai video ini' : 'Anda tidak menyukai video ini');
        } else {
            // CSS handles return to default
        }
    }

    function shareVideo(videoId) {
        const url = 'https://playtube.com/v/' + videoId;
        navigator.clipboard.writeText(url).then(() => {
            showToast('Link disalin ke clipboard');
        });
    }

    function toggleSubscribe(btn, channelName) {
        let subs = JSON.parse(localStorage.getItem('playtube_subscriptions') || '[]');
        const isSubbed = subs.includes(channelName);

        if (isSubbed) {
            subs = subs.filter(c => c !== channelName);
            showToast('Berhenti subscribe ' + channelName);
        } else {
            subs.push(channelName);
            showToast('Disubscribe: ' + channelName);
        }

        localStorage.setItem('playtube_subscriptions', JSON.stringify(subs));
        updateSubscribeButton(btn, channelName);
    }

    function updateSubscribeButton(btn, channelName) {
        const subs = JSON.parse(localStorage.getItem('playtube_subscriptions') || '[]');
        const isSubbed = subs.includes(channelName);

        if (isSubbed) {
            btn.textContent = 'Disubscribe';
            btn.style.backgroundColor = 'var(--hover-bg)';
            btn.style.color = 'var(--text-secondary)';
        } else {
            btn.textContent = 'Subscribe';
            btn.style.backgroundColor = 'white';
            btn.style.color = 'black';
        }
    }

    // Initial load
    checkLogin();
    if (localStorage.getItem('playtube_logged_in')) {
        loadTrending();
    }
