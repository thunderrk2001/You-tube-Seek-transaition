chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'getSeekHistory') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0];
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'requestSeekHistory' }, sendResponse);
      }
    });
    return true; // Needed for async sendResponse
  }

  if (msg.type === 'seekTo') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0];
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'seekTo', time: msg.time });
      }
    });
  }
});
