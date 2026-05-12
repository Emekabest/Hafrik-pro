<?php
/**
 * Hafrik daily notification templates.
 *
 * The cron sender picks one random template for each time slot:
 * - morning: 10:00 China time
 * - evening: 20:00 China time
 *
 * Keep titles short. Keep bodies useful, not spammy.
 */

return [
    'morning' => [
        [
            'category' => 'community',
            'title' => 'Start with your community',
            'body' => 'See what people are asking, sharing, and building on Hafrik today.',
            'data' => ['type' => 'daily', 'screen' => 'GroupScreen', 'category' => 'community'],
        ],
        [
            'category' => 'china_life',
            'title' => 'China life tip',
            'body' => 'Before paying for anything, confirm the address, price, and delivery details clearly.',
            'data' => ['type' => 'daily', 'screen' => 'ExploreHome', 'category' => 'china_life'],
        ],
        [
            'category' => 'marketplace',
            'title' => 'Buying from China today?',
            'body' => 'Check Hafrik Shop picks and use AI to understand products before you buy.',
            'data' => ['type' => 'daily', 'screen' => 'MarketplaceScreen', 'category' => 'marketplace'],
        ],
        [
            'category' => 'shipping',
            'title' => 'Import smarter',
            'body' => 'Planning to ship goods? Hafrik can help you think through sourcing, payment, and delivery.',
            'data' => ['type' => 'daily', 'screen' => 'HafrikXHome', 'category' => 'shipping'],
        ],
        [
            'category' => 'study',
            'title' => 'Study in China',
            'body' => 'Scholarship or self-sponsored? Hafrik can help you understand the best path.',
            'data' => ['type' => 'daily', 'screen' => 'HafrikXVisa', 'category' => 'study'],
        ],
        [
            'category' => 'ai',
            'title' => 'Ask Hafrik AI',
            'body' => 'Need a caption, translation, product check, or travel tip? Ask Hafrik AI.',
            'data' => ['type' => 'daily', 'screen' => 'AIChat', 'category' => 'ai'],
        ],
    ],

    'evening' => [
        [
            'category' => 'reels',
            'title' => 'Catch today on Hafrik',
            'body' => 'Watch fresh reels and see what the community shared today.',
            'data' => ['type' => 'daily', 'screen' => 'Reels2', 'category' => 'reels', 'mode' => 'discover'],
        ],
        [
            'category' => 'community',
            'title' => 'Join the conversation',
            'body' => 'Someone may be asking the same question you can answer today.',
            'data' => ['type' => 'daily', 'screen' => 'GroupScreen', 'category' => 'community'],
        ],
        [
            'category' => 'explore',
            'title' => 'Explore your city',
            'body' => 'Find markets, African food, hotels, services, and useful places around you.',
            'data' => ['type' => 'daily', 'screen' => 'ExploreHome', 'category' => 'explore'],
        ],
        [
            'category' => 'wallet',
            'title' => 'Wallet ready?',
            'body' => 'You can fund your Hafrik wallet and prepare for shopping, services, or shipping.',
            'data' => ['type' => 'daily', 'screen' => 'WalletScreen', 'category' => 'wallet'],
        ],
        [
            'category' => 'marketplace',
            'title' => 'Evening shop check',
            'body' => 'Browse useful items and save what you may want to buy later.',
            'data' => ['type' => 'daily', 'screen' => 'MarketplaceScreen', 'category' => 'marketplace'],
        ],
        [
            'category' => 'ai',
            'title' => 'Let AI help you finish faster',
            'body' => 'Ask Hafrik AI to rewrite a post, explain a product, or plan your next step.',
            'data' => ['type' => 'daily', 'screen' => 'AIChat', 'category' => 'ai', 'fresh' => 1],
        ],
    ],
];
