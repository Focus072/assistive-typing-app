# SEO, Meta & PWA

## Metadata Configuration

### Root Layout (`app/layout.tsx`)

- **Title**: "typingisboring - Natural typing for Google Docs"
- **Description**: "Paste your text, pick a document, and watch it type itself with natural pacing. Automate typing into Google Docs with human-like rhythm."
- **Theme Color**: `#000000` (black, matching app aesthetic)
- **Viewport**: Optimized for mobile devices

### Landing Page (`app/page.tsx`)

- **Title**: "typingisboring - Natural typing for Google Docs"
- **Description**: Optimized for search engines and social sharing
- **Open Graph**: Configured with title, description, and image
- **Twitter Card**: Large image card for better social sharing

### Dashboard (`app/dashboard/metadata.ts`)

- **Title**: "Dashboard"
- **Description**: "Manage your typing jobs, view history, and configure settings."
- **Robots**: `noindex, nofollow` (private page, shouldn't be indexed)

## Open Graph Tags

### Configuration

- **Type**: `website`
- **Locale**: `en_US`
- **Site Name**: "typingisboring"
- **Image**: `/og-image.png` (1200x630px recommended)
- **URL**: Uses `NEXT_PUBLIC_BASE_URL` environment variable

### Required Image

Create `/public/og-image.png` with:
- Dimensions: 1200x630px
- Format: PNG
- Content: App logo/branding with tagline
- Alt text: "typingisboring - Natural typing for Google Docs"

## Twitter Card Tags

### Configuration

- **Card Type**: `summary_large_image`
- **Title**: Matches Open Graph title
- **Description**: Matches Open Graph description
- **Image**: `/og-image.png`

## Manifest (PWA)

### Configuration (`app/manifest.ts`)

- **Name**: "typingisboring - Natural typing for Google Docs"
- **Short Name**: "typingisboring"
- **Description**: "Paste your text, pick a document, and watch it type itself with natural pacing."
- **Start URL**: `/dashboard`
- **Display**: `standalone` (full-screen app experience)
- **Background Color**: `#000000` (black)
- **Theme Color**: `#000000` (black)
- **Icons**: 
  - 192x192px (`/icon-192.png`)
  - 512x512px (`/icon-512.png`)
- **Categories**: `["productivity", "utilities"]`
- **Orientation**: `any`

### Icon Requirements

#### Required Icons

1. **icon-192.png** (192x192px)
   - Purpose: `any maskable`
   - Used for: Android home screen, Chrome install prompt

2. **icon-512.png** (512x512px)
   - Purpose: `any maskable`
   - Used for: Splash screens, high-res displays

#### Icon Design Guidelines

- **Background**: Black (`#000000`) or transparent
- **Foreground**: White or light color for contrast
- **Content**: App logo or recognizable symbol
- **Maskable**: Icons should work with Android adaptive icons (safe zone: 80% of canvas)

### PWA Installability

#### Current Status

- **Manifest**: ✅ Configured
- **HTTPS**: Required for PWA (production only)
- **Service Worker**: Not implemented (optional)
- **Offline Support**: Not implemented (optional)

#### Installability Checklist

- [x] Valid manifest.json
- [x] Icons provided (192x192, 512x512)
- [x] Start URL configured
- [x] Display mode set to "standalone"
- [ ] Service worker (optional, for offline support)
- [ ] HTTPS (required in production)

#### Testing PWA Install

1. **Chrome/Edge Desktop**:
   - Visit site
   - Click install icon in address bar
   - Verify app opens in standalone window

2. **Chrome Android**:
   - Visit site
   - Tap menu → "Add to Home screen"
   - Verify icon appears on home screen
   - Tap icon → verify opens in standalone mode

3. **Safari iOS**:
   - Visit site
   - Tap Share → "Add to Home Screen"
   - Verify icon appears on home screen
   - Tap icon → verify opens in standalone mode

## Environment Variables

### Required

- `NEXT_PUBLIC_BASE_URL`: Base URL for Open Graph tags (e.g., `https://typingisboring.com`)

### Example `.env.local`

```env
NEXT_PUBLIC_BASE_URL=https://typingisboring.com
```

## SEO Best Practices

### Implemented

- ✅ Semantic HTML structure
- ✅ Descriptive page titles
- ✅ Meta descriptions
- ✅ Open Graph tags
- ✅ Twitter Card tags
- ✅ Robots meta tags
- ✅ Canonical URLs (via Next.js)
- ✅ Mobile-friendly viewport

### Recommendations

1. **Create OG Image**: Design and add `/public/og-image.png`
2. **Create Icon-512**: Ensure `/public/icon-512.png` exists
3. **Sitemap**: Consider adding `app/sitemap.ts` for better indexing
4. **Robots.txt**: Consider adding `app/robots.ts` for crawl control
5. **Structured Data**: Consider adding JSON-LD for rich snippets

## Social Sharing Preview

When sharing links, platforms will show:
- **Title**: "typingisboring - Natural typing for Google Docs"
- **Description**: "Paste your text, pick a document, and watch it type itself with natural pacing."
- **Image**: `/og-image.png` (if created)
- **URL**: Current page URL

## Next Steps

1. **Create OG Image**: Design 1200x630px image for social sharing
2. **Create Icon-512**: Ensure 512x512px icon exists
3. **Test PWA Install**: Test on Chrome, Edge, Safari iOS
4. **Set Base URL**: Configure `NEXT_PUBLIC_BASE_URL` in production
5. **Verify Meta Tags**: Use tools like:
   - [Open Graph Debugger](https://developers.facebook.com/tools/debug/)
   - [Twitter Card Validator](https://cards-dev.twitter.com/validator)
   - [Google Rich Results Test](https://search.google.com/test/rich-results)







