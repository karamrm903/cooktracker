# Nutrily Supabase Configuration

This directory manages the Supabase project configuration and database migrations.

## Structure

- `migrations/`: Contains SQL files defining tables, views, Row Level Security (RLS) policies, and storage buckets. Each migration file is timestamped and executed sequentially.
- `config.toml`: Supabase CLI configuration file.

## Key Schemas & Tables

The 20 migrations handle:
- **Users & Profiles**: Realtime user data and settings.
- **Recipes**: Storing user-generated and AI-generated recipes with macronutrients and image URLs.
- **Food Items**: Searchable nutrition and food database.
- **Images Bucket**: Public storage bucket for recipe photography and user avatars.
- **AI Recipe Cache**: Caching AI extractions to optimize latency and API cost.
- **Subscriptions**: Usage tracking and premium subscription states.

## Database Deployment (No Docker Required)

Instead of running a heavy local Docker container stack, connect directly to a free cloud project on [supabase.com](https://supabase.com).

### 1. Install Supabase CLI
```bash
brew install supabase/tap/supabase
```

### 2. Link Remote Project
```bash
supabase link --project-ref your-project-ref
```

### 3. Apply Migrations to Remote Project
```bash
supabase db push
```

*(Alternatively: You can copy and execute any SQL file in `migrations/` directly in the Supabase Dashboard SQL Editor).*

### 4. Create a New Migration
When making schema changes:
```bash
supabase migration new migration_name
```
Edit the generated `.sql` file in `migrations/`, then run `supabase db push`.
