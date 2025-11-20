# Version Update Guide

## Overview

The application includes an automatic version update notification system that alerts users when a new version has been deployed. This provides a better user experience by keeping them informed about new features and improvements.

## How It Works

1. **Version Tracking**: The current version is stored in `components/VersionUpdateNotification.tsx`
2. **Detection**: When a user visits the app, their last known version (stored in localStorage) is compared with the current version
3. **Notification**: If the versions don't match, a beautiful popup appears showing what's new
4. **Storage**: After viewing (or dismissing), the new version is saved to their localStorage

## Updating the Version Number

When deploying a new version, follow these steps:

### 1. Update the Version Constant

Edit the file: `components/VersionUpdateNotification.tsx`

```typescript
// Update this version number when deploying new versions
const CURRENT_VERSION = '1.0.1'; // Change this to your new version
```

**Version Numbering Convention:**
- Major updates: `2.0.0` (breaking changes or major new features)
- Minor updates: `1.1.0` (new features, improvements)
- Patches: `1.0.1` (bug fixes, small improvements)

### 2. Update the "What's New" Section

In the same file, update the features list to reflect the changes:

```tsx
<ul className="space-y-2 text-sm text-gray-600">
  <li className="flex items-start gap-2">
    <span className="text-green-500 mt-0.5">✓</span>
    <span>Your new feature description here</span>
  </li>
  {/* Add more items as needed */}
</ul>
```

### 3. Deploy the Application

After updating the version and features:

```bash
# Build and deploy
npm run build
# or
./deploy-prod.sh
```

## Customization

### Changing the Notification Design

The notification component uses TailwindCSS and Lucide icons. You can customize:

- **Colors**: Modify the gradient classes (currently purple-pink-red)
- **Animation**: Adjust animation classes or timing
- **Content**: Update the text, icons, or layout
- **Illustration**: The Sparkles icon can be replaced with any Lucide icon

### Disabling Version Notifications

To temporarily disable version notifications, you can:

1. Comment out the component in `app/layout.tsx`:
```tsx
{/* <VersionUpdateNotification /> */}
```

2. Or add a feature flag to the component

## User Experience

### First Visit
- Version is stored in localStorage
- No notification is shown (this is the baseline version)

### Subsequent Visits (Same Version)
- No notification shown
- User continues working normally

### After Deployment (New Version)
- Popup appears with animation
- Shows version number and new features
- User can:
  - Click "Refresh Now" → Reloads the page immediately
  - Click "Later" or X → Dismisses the popup but version is recorded

### Important Notes

- **Automatic Saving**: The user's work is automatically saved, so refreshing is safe
- **One-time Notification**: Each version update notification is shown only once per user
- **Non-intrusive**: Users can dismiss and continue working
- **Mobile Friendly**: Responsive design works on all devices

## Troubleshooting

### Notification Not Appearing

1. **Check the version number**: Ensure `CURRENT_VERSION` was actually changed
2. **Clear localStorage**: Test by clearing localStorage in browser DevTools
3. **Check browser console**: Look for any JavaScript errors
4. **Verify deployment**: Ensure the new code was deployed successfully

### Notification Appearing Too Often

- Check that you're not accidentally changing the version string format
- Verify localStorage is working properly in the user's browser

### Testing Locally

To test the notification without deploying:

1. Change `CURRENT_VERSION` to a new value
2. Open browser DevTools → Application → Local Storage
3. Delete or change the `app-version` key
4. Refresh the page
5. The notification should appear

## Example Deployment Workflow

```bash
# 1. Update version in VersionUpdateNotification.tsx
#    CURRENT_VERSION = '1.0.1' → '1.1.0'

# 2. Update features list in the same file

# 3. Test locally
npm run dev
# Clear localStorage and test the notification

# 4. Commit changes
git add .
git commit -m "chore: Bump version to 1.1.0 with new features"

# 5. Deploy to production
./deploy-prod.sh

# 6. Verify on production
# Users will see the notification on their next visit
```

## Additional Features

### PWA Install Prompt

The app also includes a PWA install prompt that:
- Appears 3 seconds after page load
- Can be dismissed for 10 days
- Provides installation instructions for iOS users
- Shows a native install prompt for Android/Desktop

Both components work together to provide a complete user onboarding experience.

## Files Reference

- **Version Notification**: `components/VersionUpdateNotification.tsx`
- **PWA Installer**: `components/PWAInstaller.tsx`
- **Root Layout**: `app/layout.tsx`
- **Animations**: `tailwind.config.ts`

---

**Last Updated**: January 2025
