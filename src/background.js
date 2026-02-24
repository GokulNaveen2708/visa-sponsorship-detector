import { pipeline, env } from '@xenova/transformers';

// Skip local weight checks to avoid CORS/filesystem errors in Chrome extension
env.allowLocalModels = false;
env.useBrowserCache = true; // Use IndexedDB to cache models, saves re-downloading!
env.backends.onnx.wasm.numThreads = 1; // Disable Web Workers for ONNX Runtime (required for MV3 service workers)

// Maintain a single pipeline instance
let classifierPromise = null;

// Initialize the model on boot (asynchronously so it doesn't block the background thread)
async function initializeModel() {
    if (!classifierPromise) {
        console.debug('[VisaDetector][Background] Downloading / Loading MobileBERT zero-shot model...');
        // We use a small ONNX zero-shot classifier
        classifierPromise = pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli');
    }
    return await classifierPromise;
}

// Preload the model
initializeModel().then(() => {
    console.debug('[VisaDetector][Background] AI Model Loaded & Ready.');
}).catch(err => {
    console.error('[VisaDetector][Background] Failed to load model:', err);
});

// Listen for messages from the content script (inject.js / detector.js)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ANALYZE_SENTENCE') {
        const { sentence } = request;

        // We must return a promise-like behavior by returning true and 
        // asynchronously calling sendResponse.
        (async () => {
            try {
                const classifier = await initializeModel();

                // Define our refined candidate labels
                const candidateLabels = [
                    'we provide visa sponsorship',
                    'we do not provide visa sponsorship'
                ];

                // Run the text through the zero-shot classifier
                const result = await classifier(sentence, candidateLabels, { multi_label: false });

                // result = { labels: [...], scores: [...] }
                const topLabel = result.labels[0];
                const topScore = result.scores[0];

                console.debug(`[VisaDetector][Background] Analysis of: "${sentence}" -> ${topLabel} (${(topScore * 100).toFixed(1)}%)`);

                // Use slightly lower threshold (0.55) as zero-shot models can be less confident 
                if (topLabel === 'we provide visa sponsorship' && topScore > 0.55) {
                    sendResponse({ status: 'yes', reason: 'ai-positive', match: 'AI inferred sponsorship' });
                } else if (topLabel === 'we do not provide visa sponsorship' && topScore > 0.55) {
                    sendResponse({ status: 'no', reason: 'ai-negative', match: 'AI inferred no sponsorship' });
                } else {
                    // Model is too unsure
                    sendResponse({ status: 'ambiguous', reason: 'ai-unsure', match: `Confidence too low (${topScore.toFixed(2)})` });
                }

            } catch (err) {
                console.error('[VisaDetector][Background] AI Analysis failed:', err);
                sendResponse({ status: 'unknown', reason: 'ai-error', match: err.message });
            }
        })();

        return true; // Keeps the message channel open for the async response
    }
});
