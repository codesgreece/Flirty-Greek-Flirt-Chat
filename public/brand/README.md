# Official brand assets

This directory holds **official** third-party brand assets. FLIRTY does not
draw, approximate, or CSS-fake Google, Apple, or other platform marks.

## Present

| File | Source | Use |
| --- | --- | --- |
| `google-play-badge.png` | Official Google Play badge (`play.google.com/intl/en_us/badges`) | Landing / install CTAs |
| `app-store-badge.svg` | Official Apple "Download on the App Store" badge (`tools.applemediaservices.com`) | Landing / install CTAs |

## If an official asset is missing

Do **not** generate a substitute logo. Add the licensed file here and reference
it from `src/components/brand/StoreBadges.tsx`.

Required if you add Google or Apple sign-in later (not enabled by default):

- Google "G" logo — https://developers.google.com/identity/branding-guidelines
- Apple logo — https://developer.apple.com/design/human-interface-guidelines/marketing-icons

Store those files as:

- `/public/brand/google-g-logo.svg`
- `/public/brand/apple-logo.svg`
