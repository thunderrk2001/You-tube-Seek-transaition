let seekHistory = [];
let userInitiated = false;
let video;
let lastWatchedTime = 0;
let lastVideoId = null;

function formatTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

function getYouTubeVideoId() {
    try {
        const url = new URL(window.location.href);
        return url.hostname.includes('youtube.com') ? url.searchParams.get('v') : null;
    }
    catch (err) {
        return null
    }

}

function setupTracking() {
    video = document.querySelector('video');

    if (!video) {
        seekHistory = [];
        updateOverlayUI();
        return;
    };

    const videoId = getYouTubeVideoId();

    if (!videoId) {
        seekHistory = [];
        updateOverlayUI();
        return;
    };

    // store last video id
    lastVideoId = videoId;

    if (videoId) {
        chrome.storage.local.get([videoId], result => {
            if (result && Array.isArray(result[videoId])) {
                seekHistory = result[videoId];
                updateOverlayUI();
            }
            else {
                seekHistory = [];
                updateOverlayUI();
            }
        });
    }

    // Update last watched time periodically
    setInterval(() => {
        if (!video.seeking && !video.paused) {
            lastWatchedTime = Math.floor(video.currentTime);
        }
    }, 500);

    // Detect keyboard or mouse seek
    document.addEventListener('keydown', e => {
        if (['ArrowLeft', 'ArrowRight', 'j', 'l', 'J', 'L'].includes(e.key)) {
            userInitiated = true;
        }
    });
    document.addEventListener('mousedown', () => {
        userInitiated = true;
    });

    video.addEventListener('seeking', () => {
        if (userInitiated) {
            const newTime = Math.floor(video.currentTime);
            if (seekHistory.length === 0 || seekHistory[seekHistory.length - 1].to !== newTime) {
                seekHistory.push({ from: lastWatchedTime, to: newTime });
                if (seekHistory.length > 5) seekHistory.shift();
            }
            userInitiated = false;
            updateOverlayUI();
        }
    });

    // Listen for popup requests
    chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
        if (msg.type === 'requestSeekHistory') {
            sendResponse({
                history: seekHistory.map(pair => ({
                    from: pair.from,
                    to: pair.to,
                    label: `${formatTime(pair.from)} → ${formatTime(pair.to)}`
                }))
            });
        }

        if (msg.type === 'seekTo' && typeof msg.time === 'number') {
            video.currentTime = msg.time;
        }
    });
}



if (document.querySelector('video') && !video) {
    setupTracking();
}

try {
    window.addEventListener("yt-navigate-finish", (event) => {

        // if (lastVideoId) {
        //     seekHistory.push({ from: lastWatchedTime, to: lastWatchedTime });
        //     chrome.storage.local.set({ [lastVideoId]: seekHistory });
        // }

        userInitiated = false;
        const videoId = getYouTubeVideoId();
        console.log(videoId)

        setupTracking();

    })
}
catch (err) {
    console.log("git error bro got thius")
}


function createOverlayUI() {
    if (document.getElementById('seek-overlay')) return;

    console.log("📦 Creating overlay UI");
    const container = document.createElement('div');
    container.id = 'seek-overlay';
    container.style.position = 'fixed';
    container.style.top = '20px'; // closer to top
    container.style.right = '20px';
    container.style.zIndex = 9999;
    container.style.background = 'rgba(0, 0, 0, 0.7)'; // transparent black
    container.style.color = '#fff'; // white text
    container.style.border = '1px solid #555';
    container.style.padding = '10px';
    container.style.borderRadius = '10px';
    container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.5)';
    container.style.fontFamily = 'sans-serif';
    container.style.maxWidth = '220px';
    container.style.fontSize = '13px';
    container.style.backdropFilter = 'blur(4px)';

    const header = document.createElement('div');
    header.textContent = 'Last Seeks';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '8px';
    header.style.borderBottom = '1px solid #888';
    header.style.paddingBottom = '4px';
    container.appendChild(header);

    const list = document.createElement('div');
    list.id = 'seek-history-list';
    container.appendChild(list);

    document.body.appendChild(container);
    overlayInitialized = true;
}

function updateOverlayUI() {

    // check and create overlay if not created
    createOverlayUI();


    const list = document.getElementById('seek-history-list');
    list.innerHTML = '';

    if (!list) return;


    const videoId = getYouTubeVideoId();

    if (videoId) {
        chrome.storage.local.set({ [videoId]: seekHistory });
    }

    seekHistory.slice().reverse().forEach(entry => {
        const div = document.createElement('div');
        div.textContent = `${formatTime(entry.from)} → ${formatTime(entry.to)}`;

        div.style.padding = '4px 6px';
        div.style.marginBottom = '6px';
        div.style.background = 'rgba(255,255,255,0.1)';
        div.style.borderRadius = '5px';
        div.style.cursor = 'pointer';
        div.style.color = 'white';
        div.style.transition = 'background 0.2s';

        div.addEventListener('mouseover', () => {
            div.style.background = 'rgba(255,255,255,0.25)';
        });
        div.addEventListener('mouseout', () => {
            div.style.background = 'rgba(255,255,255,0.1)';
        });

        div.addEventListener('click', () => {
            const currentTime = Math.floor(video.currentTime);
            video.currentTime = entry.from;

            if (seekHistory[seekHistory.length - 1]?.from !== currentTime ||
                seekHistory[seekHistory.length - 1]?.to !== entry.from) {
                seekHistory.push({ from: currentTime, to: entry.from });
                if (seekHistory.length > 5) seekHistory.shift();
                updateOverlayUI(); // save again
            }
        });

        list.appendChild(div);
    });
}
