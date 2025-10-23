# Migration Guide: Base44 to Supabase

This document outlines the migration from Base44 to Supabase authentication and database system.

## Overview

The application has been successfully migrated to use Supabase for:
- Email/password authentication
- User profile management
- Role-based access control (Super Admin, Admin, User)
- Database operations for all entities

## Database Schema

The following tables were created with Row Level Security (RLS) enabled:

### Core Tables

1. **profiles** - User profiles linked to auth.users
   - Contains user role, company assignment, and site assignment
   - Roles: `super_admin`, `admin`, `user`

2. **companies** - Organizations managing multiple sites
   - Has max_sites limit for capacity planning
   - Contact information for each company

3. **sites** - Physical venue locations
   - Linked to companies
   - Has timezone and location data

4. **channels** - TV channels for sports content
   - Company-specific channels

5. **sports_events** - Calendar events
   - Linked to companies and channels
   - Contains team and league information

6. **site_events** - Junction table linking events to sites
   - Controls which events appear at which sites

7. **brand_schemes** - Branding configurations
   - Company-specific branding

8. **site_brand_schemes** - Links branding to specific sites

## Authentication Flow

### New Components Created

1. **src/contexts/AuthContext.jsx** - Authentication context provider
   - Manages user session
   - Provides auth methods (signIn, signUp, signOut, etc.)
   - Tracks user profile and role

2. **src/pages/Login.jsx** - Login page
3. **src/pages/Signup.jsx** - Registration page
4. **src/pages/ForgotPassword.jsx** - Password reset page

5. **src/components/ProtectedRoute.jsx** - Route wrapper for authentication
   - Redirects unauthenticated users to /login
   - Supports role-based route protection

### Updated Files

1. **src/App.jsx**
   - Wrapped with AuthProvider and QueryClientProvider
   - Implemented React Router with protected routes
   - All admin routes require authentication
   - Super admin routes require super_admin role

2. **src/pages/Layout.jsx**
   - Now uses AuthContext instead of Base44
   - Updated to use Supabase services for company data

## Database Services

### New Service Layer

**src/services/database.js** - Comprehensive database operations

Services provided:
- `profilesService` - User profile operations
- `companiesService` - Company CRUD operations
- `sitesService` - Site management
- `channelsService` - Channel management
- `sportsEventsService` - Sports event operations
- `siteEventsService` - Event-to-site assignments
- `brandSchemesService` - Branding operations

## Pages Updated

The following pages have been updated to use Supabase:

1. **SuperAdminDashboard.jsx**
   - Uses companiesService, sitesService, profilesService
   - All queries migrated from Base44

2. **Users.jsx**
   - Uses profilesService and sitesService
   - Uses AuthContext for current user

## Remaining Pages to Update

The following pages still reference Base44 and need migration:

- AdminDashboard.jsx
- Channels.jsx
- Sites.jsx
- SportsCalendar.jsx
- SiteView.jsx
- Settings.jsx
- BrandSchemes.jsx
- SiteDisplay.jsx

### Migration Pattern for Remaining Pages

For each page, follow this pattern:

```javascript
// Before
import { base44 } from "@/api/base44Client";

const { data: items } = useQuery({
  queryKey: ['items'],
  queryFn: () => base44.entities.Item.list(),
});

// After
import { itemsService } from "@/services/database";

const { data: items } = useQuery({
  queryKey: ['items'],
  queryFn: () => itemsService.getAll(),
});
```

## User Roles and Access Control

### Super Admin
- Full access to all companies
- Can create/edit/delete companies
- Can view and manage all data across companies
- Access to /SuperAdminDashboard

### Admin
- Full access to their company's data
- Can manage sites, channels, events, users
- Cannot access other companies' data
- Access to admin pages: Dashboard, Sites, Channels, Calendar, Users, Brand Schemes

### User
- Limited to viewing their assigned site's schedule
- Cannot edit or manage data
- Access to /SiteView only

## Row Level Security (RLS)

All tables have restrictive RLS policies:
- Users can only access data they're authorized to see
- Super admins have elevated privileges across all data
- Admins can manage data within their company
- Regular users can only view data for their assigned site

## Environment Variables

Required variables in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## First Steps After Migration

1. **Create a Super Admin User**
   - Sign up through /signup
   - Manually update the profile in Supabase dashboard:
     ```sql
     UPDATE profiles
     SET is_super_admin = true, role = 'super_admin'
     WHERE email = 'your_email@example.com';
     ```

2. **Create Companies**
   - Log in as super admin
   - Navigate to /SuperAdminDashboard
   - Add companies

3. **Invite Admins**
   - Have admins sign up
   - Assign them to companies and set role to 'admin'

4. **Create Sites**
   - Admins can create sites for their companies

5. **Invite Users**
   - Users sign up
   - Admins assign them to sites

## Key Differences from Base44

1. **Authentication**
   - Base44: Custom auth with base44.auth.me()
   - Supabase: Standard OAuth flow with useAuth() hook

2. **Data Fetching**
   - Base44: base44.entities.Model.list/filter/create/update
   - Supabase: Dedicated service functions (modelService.getAll/create/update)

3. **User Profile**
   - Base44: Included in auth response
   - Supabase: Separate profiles table joined with auth.users

4. **Role Management**
   - Base44: Single field role
   - Supabase: role field + is_super_admin boolean for flexibility

## Security Best Practices Implemented

1. All tables have RLS enabled
2. Policies check user authentication and ownership
3. Super admin checks use is_super_admin field
4. Foreign keys with appropriate CASCADE/SET NULL
5. Updated_at triggers for audit trails
6. Profile creation trigger for new auth.users

## Testing the Migration

1. Build succeeds: ✓
2. Authentication pages load: Test manually
3. Protected routes redirect: Test manually
4. Super admin can access all companies: Test manually
5. Admins can only see their company: Test manually
6. Users can only see their site: Test manually

## Support

For issues:
1. Check Supabase dashboard for RLS policy errors
2. Verify user roles in profiles table
3. Check browser console for authentication errors
4. Review network tab for failed API calls
