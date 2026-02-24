import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = true;
env.useBrowserCache = false;
env.backends.onnx.wasm.numThreads = 1;

const testCases = [
    // Obvious Sponsorship (Should score > 0.6 for 'offers visa sponsorship')
    { sentence: 'We are happy to provide H-1B sponsorship for the right candidate.', expected: 'yes' },
    { sentence: 'Employment visa sponsorship is available for this role.', expected: 'yes' },
    { sentence: 'This position is eligible for visa sponsorship.', expected: 'yes' },
    { sentence: 'We will sponsor your visa transfer if you require one.', expected: 'yes' },

    // Obvious No Sponsorship (Should score > 0.6 for 'does not offer...')
    { sentence: 'Unfortunately, we are unable to provide visa sponsorship at this time.', expected: 'no' },
    { sentence: 'Candidates must be authorized to work in the US without future sponsorship.', expected: 'no' },
    { sentence: 'No visa sponsorship is provided for this position.', expected: 'no' },
    { sentence: 'US Citizenship is required for this role, we cannot sponsor visas.', expected: 'no' },

    // Ambiguous phrasing (Might trigger "unknown" if confidence is < 0.6)
    { sentence: 'Visa sponsorship will be considered on a case-by-case basis.', expected: 'yes' }, // Highly likely yes
    { sentence: 'We currently do not offer sponsorship, but may in the future.', expected: 'no' }, // Likely no for current role
    { sentence: 'Candidates requiring sponsorship will be evaluated appropriately.', expected: 'yes' }, // Mildly yes
    { sentence: 'Sponsorship is not guaranteed.', expected: 'unknown' }, // Too ambiguous
    { sentence: 'Are you legally authorized to work without sponsorship?', expected: 'unknown' }, // This is a question, not a statement of offer

    // Tricky edge cases (Negations, tricky grammar)
    { sentence: 'We are a company that does not shy away from visa sponsorship.', expected: 'yes' }, // Double negative
    { sentence: 'Unlike other companies, we do not require you to have citizenship; we sponsor visas.', expected: 'yes' },
    { sentence: 'While we love international candidates, we cannot sponsor visas for this specific team.', expected: 'no' },
    { sentence: 'We sponsor visas for senior roles only, but not for this junior position.', expected: 'no' }, // Complex logic
    { sentence: 'H-1B transfers are welcome, but new sponsorships are not.', expected: 'unknown' } // Mixed bag, likely unknown or no
];

async function runTests() {
    console.log('Initializing ONNX model (MobileBERT zero-shot classifier)...');
    const classifier = await pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli');
    console.log('Model loaded!\n');

    const candidateLabels = [
        'we provide visa sponsorship',
        'we do not provide visa sponsorship'
    ];

    let passed = 0;

    for (const tc of testCases) {
        console.log(`\nTesting: "${tc.sentence}"`);
        const result = await classifier(tc.sentence, candidateLabels, { multi_label: false });

        const topLabel = result.labels[0];
        const topScore = result.scores[0];

        let aiResult = 'unknown';
        // Lowered threshold slightly because zero-shot models can be less confident on short texts
        if (topLabel === 'we provide visa sponsorship' && topScore > 0.55) {
            aiResult = 'yes';
        } else if (topLabel === 'we do not provide visa sponsorship' && topScore > 0.55) {
            aiResult = 'no';
        }

        const match = expectedMatches(tc.expected, aiResult, topLabel, topScore);
        if (match) passed++;

        console.log(`  Top Label: ${topLabel}`);
        console.log(`  Confidence: ${(topScore * 100).toFixed(1)}%`);
        console.log(`  AI Result: ${aiResult.toUpperCase()} | Expected: ${tc.expected.toUpperCase()}`);
        console.log(`  Status: ${match ? '✅ PASS' : '❌ FAIL'}`);
    }

    console.log(`\n\n--- Test Summary: ${passed}/${testCases.length} PASSED ---`);
}

function expectedMatches(expected, actual, topLabel, topScore) {
    if (expected === actual) return true;
    // Allow 'unknown' as a pass if it's an ambiguous tricky case and the model was unsure
    if (expected === 'unknown' && actual === 'unknown') return true;
    return false;
}

runTests().catch(console.error);
