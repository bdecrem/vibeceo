# STACKOBJECTIFY Command Documentation

## Overview

The `--stackobjectify` command is an OPERATOR-only feature that transforms ZAD (Zero Admin Data) apps into objectified versions where each data record becomes a publicly accessible page with its own URL.

## Purpose

This command enables deep linking to specific data objects and public sharing of individual items from a ZAD app. Perfect for:
- Creating public portfolios from private ZAD apps
- Making blog posts individually shareable
- Building product catalogs with direct links
- Publishing event listings with detail pages

## Syntax

```
--stackobjectify [zad-app-slug] [request description]
```

or

```
wtaf --stackobjectify [zad-app-slug] [request description]
```

## Requirements

1. **OPERATOR Role**: Only users with OPERATOR role or higher can use this command
2. **ZAD App Ownership**: You must own the source ZAD app
3. **Existing Data**: The ZAD app should have data to objectify

## How It Works

1. **Data Extraction**: Reads all data from your ZAD app's `wtaf_zero_admin_collaborative` table
2. **Structure Analysis**: Analyzes the data structure to understand object types and fields
3. **Page Generation**: Creates:
   - An INDEX page listing all objects
   - Individual OBJECT pages for each record
4. **Public Access**: All pages are publicly accessible without authentication

## URL Structure

- **Index Page**: `/{user_slug}/{app_slug}-index`
- **Object Pages**: `/{user_slug}/{app_slug}-index?id=[object-id]`

## Example Usage

### Blog Objectification
```
--stackobjectify my-blog "Create a public blog with individual post pages"
```
Creates:
- Index showing all blog posts
- Individual pages for each blog post

### Portfolio Objectification
```
--stackobjectify my-projects "Make a portfolio site where each project has its own page"
```
Creates:
- Gallery index of all projects
- Detailed pages for each project

### Recipe Collection
```
--stackobjectify recipe-book "Turn my recipes into a searchable cookbook"
```
Creates:
- Recipe index with search/filter
- Full recipe pages with ingredients and instructions

## Features

- **Automatic Data Mapping**: LLM intelligently interprets your data structure
- **Responsive Design**: Works on all devices
- **SEO Friendly**: Proper meta tags for sharing
- **Visual Consistency**: Maintains style from source ZAD app
- **Client-Side Routing**: Fast navigation between pages

## Technical Details

- Uses the source ZAD app's APP_ID for data access
- Implements client-side routing with URL parameters
- Loads data directly from Supabase
- No server-side processing required
- Generates complete single-page application

## Best Practices

1. **Clear Descriptions**: Be specific about how you want objects displayed
2. **Data Quality**: Ensure your ZAD app has well-structured data
3. **Test First**: Try with a small dataset before large collections
4. **Consider Privacy**: Remember all data becomes publicly accessible

## Limitations

- Cannot objectify non-ZAD apps
- Requires OPERATOR role
- All data becomes public (no selective publishing)
- URL structure is fixed to the pattern shown above

## Related Commands

- `--stackzad`: Create ZAD apps with shared data
- `--stackpublic`: Create apps using PUBLIC ZAD data
- `--stack`: Use HTML templates for new apps