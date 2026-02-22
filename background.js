// background.js (improved logging + inject into all frames + more retries)
const MAX_INJECT_ATTEMPTS = 8;
const RETRY_BASE_MS = 300;

// background.js - send message to content script instead of injecting
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) return console.warn('[VisaDetector][bg] no active tab');
  try {
    // send a message to the content script to trigger a rescan
    chrome.tabs.sendMessage(tab.id, { action: 'visaRescan' }, (resp) => {
      if (chrome.runtime.lastError) {
        // log the real runtime error to service worker console
        console.warn('[VisaDetector][bg] sendMessage error:', chrome.runtime.lastError.message);
        return;
      }
      console.debug('[VisaDetector][bg] sendMessage response:', resp);
    });
  } catch (err) {
    console.error('[VisaDetector][bg] unexpected error', err);
  }
});

//
// function injectWithRetry(tabId, attempt) {
//   chrome.tabs.get(tabId, (tab) => {
//     if (chrome.runtime.lastError) {
//       console.warn('[VisaDetector][bg] tabs.get error', chrome.runtime.lastError.message);
//       return;
//     }
//     if (!tab) {
//       console.warn('[VisaDetector][bg] tab not found', tabId);
//       return;
//     }
//
//     // If still loading, wait a bit (but allow attempts even if not "complete")
//     if (tab.status !== 'complete' && attempt < MAX_INJECT_ATTEMPTS) {
//       const wait = RETRY_BASE_MS * (attempt + 1);
//       console.debug(`[VisaDetector][bg] tab ${tabId} status=${tab.status}, retrying in ${wait}ms (attempt ${attempt+1})`);
//       setTimeout(() => injectWithRetry(tabId, attempt + 1), wait);
//       return;
//     }
//
//     console.debug(`[VisaDetector][bg] attempting injection into tab ${tabId} (attempt ${attempt+1})`);
//     chrome.scripting.executeScript(
//       {
//         target: { tabId, allFrames: true }, // <-- try injecting into all frames
//         files: ['inject.js']
//       },
//       (results) => {
//         if (chrome.runtime.lastError) {
//           // Print the real error message (not object)
//           console.warn('[VisaDetector][bg] injection error:', chrome.runtime.lastError.message);
//
//           // optionally print the results array for successful partial injections
//           if (results) console.debug('[VisaDetector][bg] partial results:', results);
//
//           // retry logic
//           if (attempt < MAX_INJECT_ATTEMPTS) {
//             const wait = RETRY_BASE_MS * (attempt + 1);
//             console.debug(`[VisaDetector][bg] transient injection failure — retrying in ${wait}ms`);
//             setTimeout(() => injectWithRetry(tabId, attempt + 1), wait);
//           } else {
//             console.error('[VisaDetector][bg] injection failed after retries:', chrome.runtime.lastError.message);
//           }
//           return;
//         }
//         console.debug('[VisaDetector][bg] injection successful', results);
//       }
//     );
//   });
// }
