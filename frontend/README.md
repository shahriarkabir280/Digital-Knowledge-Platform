---
{
  "id": "file_411bp60u",
  "filetype": "document",
  "filename": "README",
  "created_at": "2026-04-09T16:07:49.826Z",
  "updated_at": "2026-04-09T16:07:49.826Z",
  "meta": {
    "location": "/",
    "tags": [],
    "categories": [],
    "description": "",
    "source": "markdown"
  }
}
---
# Frontend Bootstrap

React + Vite frontend scaffold for the Digital Knowledge Platform.

## Run

```bash
npm install
npm run dev
```

Build and lint:

```bash
npm run lint
npm run build
```

## Implemented Structure

- Routing skeleton with protected layout and route guards
- Navbar + Sidebar app shell
- Role-based navigation and admin-only route guard
- Theme tokens and responsive page layout
- Placeholder screens for Home, Dashboard, Repository, Library, Search, Viewer, Admin
- API-ready UI states for repository/library/search: idle, loading, empty, error, success

## Route Map

- `/login` public login screen
- `/` home screen (protected)
- `/dashboard` protected
- `/repository` protected
- `/library` protected
- `/search` protected
- `/viewer/:docId?` protected
- `/admin` protected + admin-only
- `/403` unauthorized
- `*` not found

## Role Policy (Current)

- `MEMBER`: Home, Dashboard, Repository, Library, Search, Viewer
- `LIBRARIAN`: Home, Dashboard, Repository, Library, Search, Viewer
- `ADMIN`: all routes including Admin

Roles are centralized in `src/app/rbac.js` and aligned to shared backend-style enum values.

## Next Integration Steps

- Replace module mock loaders with backend API calls through `src/services/api/client.js`
- Connect login with backend auth endpoint and token storage
- Implement real viewer pane and repository document open flow
- Add test coverage for route guards and role-based navigation
