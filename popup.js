function renderHistory(history, tabId) {
    const historyContainer = document.getElementById('history');
    historyContainer.innerHTML = '';

    console.log(history)

    history.slice().reverse().forEach(entry => {
        const div = document.createElement('div');
        div.className = 'seek-item';
        div.textContent = entry.label;

        div.addEventListener('click', () => {

            console.log(chrome);
            // Get current time before jumping
            chrome.tabs.sendMessage(tabId, { type: 'getCurrentTime' }, response => {
                const currentTime = response?.time;
                if (typeof currentTime !== 'number') return;

                // Jump to the "from" time of this entry
                chrome.tabs.sendMessage(tabId, {
                    type: 'seekTo',
                    time: entry.from
                });

                // Add new seek to content script and refresh UI
                chrome.tabs.sendMessage(tabId, {
                    type: 'recordSeek',
                    from: currentTime,
                    to: entry.from
                }, updated => {
                    if (updated?.history) {
                        renderHistory(updated.history, tabId);
                    }
                });
            });
        });

        historyContainer.appendChild(div);
    });
}

try {
    // Load initial history
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const tabId = tabs[0].id;

        chrome.tabs.sendMessage(tabId, { type: 'requestSeekHistory' }, response => {
            if (!response?.history) return;
            renderHistory(response.history, tabId);
        });
    });
}
catch (err) {
    console.log("got error");
    console.log(err);
}
