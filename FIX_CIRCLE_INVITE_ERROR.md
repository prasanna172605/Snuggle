**Issue:** Getting "Function where() called with invalid data. Unsupported field value: undefined" when clicking circle buttons in the modal.

**Root Cause:** The `user` or `currentUser` object exists but their `id` property is undefined.

**Fix Required in `pages/Profile.tsx`:**

Change line 85 from:
```typescript
if (!currentUser || !user) return;
```

To:
```typescript
if (!currentUser?.id || !user?.id) {
    console.error('Missing user IDs:', { currentUser, user });
    alert('Error: User information not loaded properly');
    return;
}
```

This will:
1. Check that both objects AND their id properties exist
2. Log the actual values if they're missing
3. Show a better error message to the user

**Alternative Quick Fix:**
If the issue persists, it might be that `user.id` is set differently. Check if it should be `user.uid` instead of `user.id`.
