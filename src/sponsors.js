// src/sponsors.js
// Curated list of big tech companies known to sponsor H-1B / work visas
// These companies almost always sponsor and don't always mention it in JDs
// Exposes window.VisaDetector.sponsors

(function (ns) {
    ns = ns || (window.VisaDetector = window.VisaDetector || {});
    ns.sponsors = ns.sponsors || {};

    // Only big tech / major tech companies that definitely sponsor
    const KNOWN_SPONSORS = [
        // FAANG+
        ['Google', 'google', 'alphabet'],
        ['Meta', 'meta', 'meta platforms', 'facebook'],
        ['Amazon', 'amazon', 'amazon web services', 'aws'],
        ['Apple', 'apple', 'apple inc'],
        ['Microsoft', 'microsoft', 'microsoft corporation'],
        ['Netflix', 'netflix'],

        // Major tech
        ['NVIDIA', 'nvidia', 'nvidia corporation'],
        ['Tesla', 'tesla', 'tesla motors', 'tesla inc'],
        ['Uber', 'uber', 'uber technologies'],
        ['Lyft', 'lyft'],
        ['Airbnb', 'airbnb'],
        ['Salesforce', 'salesforce', 'salesforce.com'],
        ['Adobe', 'adobe', 'adobe systems', 'adobe inc'],
        ['Oracle', 'oracle', 'oracle corporation', 'oracle america'],
        ['Intel', 'intel', 'intel corporation'],
        ['Cisco', 'cisco', 'cisco systems'],
        ['Qualcomm', 'qualcomm'],
        ['PayPal', 'paypal'],
        ['Stripe', 'stripe'],
        ['Shopify', 'shopify'],
        ['Snap Inc.', 'snap inc', 'snapchat', 'snap'],
        ['Pinterest', 'pinterest'],
        ['LinkedIn', 'linkedin'],
        ['Twitter/X', 'twitter', 'x corp'],
        ['Databricks', 'databricks'],
        ['Snowflake', 'snowflake', 'snowflake computing'],
        ['Palantir', 'palantir', 'palantir technologies'],
        ['Atlassian', 'atlassian'],
        ['Spotify', 'spotify'],
        ['Reddit', 'reddit'],
        ['DoorDash', 'doordash'],
        ['Instacart', 'instacart'],
        ['Coinbase', 'coinbase'],
        ['Figma', 'figma'],
        ['Discord', 'discord'],
        ['Dropbox', 'dropbox'],
        ['Zoom', 'zoom', 'zoom video', 'zoom video communications'],
        ['Twilio', 'twilio'],
        ['Block', 'block inc', 'square'],
        ['Robinhood', 'robinhood'],
        ['Plaid', 'plaid'],
        ['Notion', 'notion'],
        ['Roblox', 'roblox'],
        ['Epic Games', 'epic games'],
        ['Unity', 'unity', 'unity technologies'],
        ['Datadog', 'datadog'],
        ['Cloudflare', 'cloudflare'],
        ['CrowdStrike', 'crowdstrike'],
        ['Palo Alto Networks', 'palo alto networks'],
        ['ServiceNow', 'servicenow'],
        ['Workday', 'workday'],
        ['Intuit', 'intuit'],
        ['VMware', 'vmware'],
        ['AMD', 'amd', 'advanced micro devices'],
        ['Autodesk', 'autodesk'],
        ['DocuSign', 'docusign'],
        ['MongoDB', 'mongodb'],
        ['Elastic', 'elastic', 'elasticsearch'],
        ['HashiCorp', 'hashicorp'],
        ['Confluent', 'confluent'],

        // AI / ML companies
        ['OpenAI', 'openai'],
        ['Anthropic', 'anthropic'],
        ['Deepmind', 'deepmind'],
        ['Scale AI', 'scale ai'],
        ['Hugging Face', 'hugging face', 'huggingface'],
        ['Cohere', 'cohere'],

        // Autonomous / Space
        ['Waymo', 'waymo'],
        ['Cruise', 'cruise', 'cruise llc'],
        ['SpaceX', 'spacex', 'space x'],
        ['Rivian', 'rivian'],
        ['Lucid', 'lucid', 'lucid motors'],
    ];

    // Precompile for fast matching
    const compiled = KNOWN_SPONSORS.map(([display, ...variants]) => ({
        display,
        variants: variants.map(v => v.toLowerCase())
    }));

    /**
     * Check if a company name matches a known H-1B sponsor.
     * @param {string} companyName - extracted company name
     * @returns {{ isKnown: boolean, matchedName: string|null }}
     */
    ns.sponsors.check = function (companyName) {
        if (!companyName) return { isKnown: false, matchedName: null };
        const normalized = companyName.toLowerCase().trim()
            .replace(/,?\s*(inc\.?|llc|ltd\.?|corp\.?|corporation|co\.?|company|group|plc|sa|ag|se|nv)$/i, '')
            .trim();

        if (!normalized) return { isKnown: false, matchedName: null };

        for (const entry of compiled) {
            for (const variant of entry.variants) {
                // Strict equality first
                if (normalized === variant) {
                    return { isKnown: true, matchedName: entry.display };
                }

                // If the user's extracted company name is a multi-word string that 
                // contains the known sponsor as an exact word boundary (e.g., "Google Inc US" contains "google")
                if (normalized.length > variant.length) {
                    const regex = new RegExp(`\\b${variant}\\b`, 'i');
                    if (regex.test(normalized)) {
                        return { isKnown: true, matchedName: entry.display };
                    }
                }
            }
        }
        return { isKnown: false, matchedName: null };
    };

    ns.sponsors.list = function () {
        return compiled.map(e => e.display);
    };

})(window.VisaDetector = window.VisaDetector || {});
