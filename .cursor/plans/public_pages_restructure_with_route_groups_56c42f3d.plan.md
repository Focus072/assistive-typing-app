---
name: Public Pages Restructure with Route Groups
overview: "Restructure the app to: 1) Make waitlist the root page, 2) Organize public pages in a (public) route group, 3) Add safety net protection for admin/test pages, and 4) Remove all redirect logic from public pages."
todos: []
---

# Public Pages Restructure with Route Groups

## Overview

Restructure the application to improve SEO, organization, and security by consolidating the waitlist as the root page, organizing public pages in a route group, and adding safety nets for protected pages.

## Current State Analysis

- Root (`/`) redirects to `/waitlist` in production
- `/waitlist` contains the actual waitlist content
- Public pages (`/how-it-works`, `/pricing`, `/launch`, `/updates`) all redirect to waitlist in production
- Admin pages (`/admin/*`) have no layout-level protection
- Test page (`/testhomepage`) only has page-level redirect check

## Implementation Plan

### Phase 1: Consolidate Waitlist as Root

**1.1 Update Root Page** [`app/page.tsx`](app/page.tsx)

- Replace current redirect logic with the waitlist content
- Copy the content from [`app/waitlist/page.tsx`](app/waitlist/page.tsx)
- Update metadata to reflect it's the home page
- Remove redirect imports

**1.2 Update Waitlist Route** [`app/waitlist/page.tsx`](app/waitlist/page.tsx)

- Option A: Redirect to root (`/`) to maintain backward compatibility
- Option B: Remove the route entirely (if no external links point to `/waitlist`)
- Recommendation: Keep it as a redirect for backward compatibility

### Phase 2: Create Public Route Group

**2.1 Create Route Group Structure**

Create new directory: `app/(public)/`

**2.2 Move Public Pages**

Move these directories into `app/(public)/`:

- `app/how-it-works/` → `app/(public)/how-it-works/`
- `app/pricing/` → `app/(public)/pricing/`
- `app/launch/` → `app/(public)/launch/`
- `app/updates/` → `app/(public)/updates/`

**2.3 Remove Redirect Logic from Public Pages**

For each moved page, remove:

- `import { redirect } from "next/navigation"`
- `import { isLocalDevelopment } from "@/lib/page-access"`
- The redirect check block:
  ```typescript
  if (!isLocalDevelopment()) {
    redirect("/waitlist")
  }
  ```


Files to update:

- `app/(public)/how-it-works/page.tsx`
- `app/(public)/pricing/page.tsx`
- `app/(public)/launch/page.tsx`
- `app/(public)/updates/page.tsx`

**2.4 Optional: Create Public Layout** [`app/(public)/layout.tsx`](app/\\\\\(public\)/layout.tsx)

- Create a shared layout for public pages if needed
- Could include shared navigation or styling
- This is optional but recommended for consistency

### Phase 3: Add Safety Net for Admin/Test Pages

**3.1 Create Admin Layout** [`app/admin/layout.tsx`](app/admin/layout.tsx)

- Add server-side check using `isLocalDevelopment()` or environment variable
- Redirect to `/` if not in development mode
- This provides a fail-safe even if individual pages forget their checks
- Use Next.js server component pattern

**IMPORTANT NOTE**: Layouts in Next.js do not re-run on every navigation when moving between pages within the same folder. Since we're using a redirect for "Local Dev" only, this is acceptable for the current use case. However, for true "Admin" security in the future (e.g., role-based access control), consider implementing:

- **Middleware** (`middleware.ts` at root) - Runs on every request and can check authentication/authorization before rendering
- **Higher Order Component (HOC)** - Wraps admin pages with authentication checks that run on each page load
- The current layout approach is fine for development-only protection, but middleware or HOC would be better for production admin security

**3.2 Protect Test Homepage**

- Keep existing redirect in [`app/testhomepage/page.tsx`](app/testhomepage/page.tsx)
- Consider moving to a route group like `(dev)/` or `(test)/` if you have multiple test pages
- Add a layout.tsx in that group for additional protection

**3.3 Update Page Access Utility** [`lib/page-access.ts`](lib/page-access.ts)

- Review and update `isPageAccessible()` function if needed
- Ensure it accounts for the new route group structure
- May need to update allowed paths list

### Phase 4: Update Navigation References

**4.1 Update "N" Logo Link** [`components/ui/mobile-nav.tsx`](components/ui/mobile-nav.tsx)

- **CRITICAL**: Update the "N" logo link from `/waitlist` to `/` (line 28)
- Change: `href="/waitlist"` → `href="/"`
- This ensures the logo always links to the home page

**4.2 Update Active State Checks** [`components/ui/mobile-nav.tsx`](components/ui/mobile-nav.tsx)

- Update active state logic that references `/waitlist` (lines 38 and 95)
- Change: `(currentPath === "/" && link.href === "/waitlist")` → `(currentPath === "/" && link.href === "/")`
- Update any navigation links that use `/waitlist` to use `/` instead

**4.3 Update Navigation Links in Components**

Search for and update any hardcoded `/waitlist` links that should point to `/`:

- Check `components/ui/waitlist-landing-page-with-countdown-timer.tsx` (lines 296, 302)
  - Update `features` array: `{ name: "Home", href: "/waitlist" }` → `{ name: "Home", href: "/" }`
  - Update `mobileFeatures` array: `{ name: "Home", href: "/waitlist" }` → `{ name: "Home", href: "/" }`
  - Update `currentPath` prop: `currentPath="/waitlist"` → `currentPath="/"`
- Check other navigation components for `/waitlist` references
- Update internal links to use `/` instead of `/waitlist` where appropriate

**4.4 Keep Backward Compatibility**

- Maintain `/waitlist` route that redirects to `/` for any external links
- Update sitemap/robots.txt if they exist

## File Structure After Changes

```
app/
├── (public)/
│   ├── layout.tsx (optional)
│   ├── how-it-works/
│   │   └── page.tsx (no redirect)
│   ├── pricing/
│   │   └── page.tsx (no redirect)
│   ├── launch/
│   │   └── page.tsx (no redirect)
│   └── updates/
│       └── page.tsx (no redirect)
├── admin/
│   ├── layout.tsx (NEW - safety net)
│   └── ... (existing admin pages)
├── testhomepage/
│   └── page.tsx (keep existing redirect)
├── waitlist/
│   └── page.tsx (redirect to /)
├── page.tsx (waitlist content)
└── layout.tsx (root layout)
```

## Implementation Order

1. Create `(public)` directory structure
2. Move public pages to route group
3. Remove redirect logic from public pages
4. Update root page with waitlist content
5. Update waitlist route to redirect to root
6. Create admin layout safety net
7. **Update "N" logo link** from `/waitlist` to `/` in mobile-nav.tsx
8. Update navigation references and active state checks
9. Test all routes

## Benefits

- **SEO**: Root domain serves actual content instead of redirect
- **Organization**: Public pages clearly grouped in route group
- **Safety**: Admin/test pages have layout-level protection
- **Maintainability**: Clear separation between public and protected pages
- **Flexibility**: Easy to add shared layout/styling for public pages