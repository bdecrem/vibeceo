# Admin (Form) WTAF API Endpoints Documentation

## Overview

What we have been referring to as "Admin WTAF apps" really just means apps that use forms.

Admin WTAF apps use a **2-endpoint + action_type pattern** for all data operations. This design follows the same architectural principles as ZAD apps, keeping the API simple for Builder GPT while supporting full CRUD functionality.

## Architecture Philosophy

### **Unified Action Pattern**
- **2 endpoints only**: `/api/admin/save` and `/api/admin/load`
- **Action-based operations**: Use `action_type` parameter for different operations
- **Simple for AI**: Builder GPT only needs to remember 2 endpoints across all app types
- **Consistent with ZAD**: Same mental model as ZAD apps

### **Data Flow**
```
WTAF Apps → API Endpoints → wtaf_submissions table → Database
```

## API Endpoints

### **1. `/api/admin/load` (GET) - Read Operations**

**Purpose:** Load submission data from `wtaf_submissions` table

#### **Query Parameters:**
- `app_id` (UUID) - For regular admin apps  
- `origin_app_slug` (string) - For stackdb apps

#### **Usage Examples:**

```javascript
// Regular admin app (queries by app UUID)
const response = await fetch('/api/admin/load?app_id=a19f9f07-27b1-4d6e-b325-65157e90ccb7');

// Stackdb app (queries by origin app slug)  
const response = await fetch('/api/admin/load?origin_app_slug=my-contact-form');
```

#### **Response Format:**
```json
[
  {
    "id": 123,
    "app_id": "a19f9f07-27b1-4d6e-b325-65157e90ccb7",
    "submission_data": {
      "name": "John Doe",
      "email": "john@example.com", 
      "message": "Hello world"
    },
    "created_at": "2025-07-18T17:30:27.000Z",
    "origin_app_slug": "my-contact-form"
  }
]
```

### **2. `/api/admin/save` (POST) - Write Operations**

**Purpose:** Handle all write operations (create, update, delete) via `action_type` parameter

#### **Operation Types:**

## **Create Operation (Default)**
**Use case:** Submit new form data

```javascript
const response = await fetch('/api/admin/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    app_id: 'a19f9f07-27b1-4d6e-b325-65157e90ccb7',
    submission_data: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      message: 'Contact form submission'
    }
  })
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 124,
    "app_id": "a19f9f07-27b1-4d6e-b325-65157e90ccb7",
    "submission_data": { "name": "Jane Smith", ... },
    "created_at": "2025-07-18T17:35:00.000Z"
  }
}
```

## **Update Operation**  
**Use case:** Edit existing submission (stackdb moderation)

```javascript
const response = await fetch('/api/admin/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action_type: 'update',
    record_id: 123,
    submission_data: {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Updated message content'
    }
  })
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "submission_data": { "message": "Updated message content", ... },
    "updated_at": "2025-07-18T17:36:00.000Z"
  },
  "message": "Record updated successfully"
}
```

## **Delete Operation**
**Use case:** Remove inappropriate submissions (stackdb moderation)

```javascript
const response = await fetch('/api/admin/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action_type: 'delete',
    record_id: 123
  })
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "app_id": "a19f9f07-27b1-4d6e-b325-65157e90ccb7",
    "submission_data": { ... },
    "created_at": "2025-07-18T17:30:27.000Z"
  },
  "message": "Record deleted successfully"
}
```

## Use Cases

### **1. Regular Admin Apps**
- **Form submissions**: Users fill out forms, data goes to `wtaf_submissions`
- **Admin dashboards**: Show all submissions in a table with export features
- **Query method**: Use `app_id` (UUID of the app)

### **2. Stackdb Apps (Moderation Tools)**
- **Data visualization**: Transform submission data into galleries, feeds, etc.
- **Content moderation**: Edit or delete inappropriate submissions
- **Cross-app access**: Access data from apps you own via `origin_app_slug`
- **Security**: Can only access data from apps you own

## Security Model

### **Ownership Verification**
- **Regular apps**: Automatic via `app_id` (users can only access their app's data)
- **Stackdb apps**: Verified at creation time (can only stackdb from apps you own)

### **Data Access Rules**
1. **Users can ONLY access data from their own apps**
2. **If it's their app, they can do ANYTHING** (perfect for moderation tools)

## Builder GPT Integration

### **Prompt Templates**
The stackdb prompt (`stackdb-gpt-prompt.txt`) includes complete examples:

```javascript
// Data loading
async function loadSubmissions() {
  const response = await fetch('/api/admin/load?origin_app_slug=ORIGIN_APP_SLUG');
  const submissions = await response.json();
  // Display submissions...
}

// Update record  
async function updateRecord(recordId, newData) {
  const response = await fetch('/api/admin/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action_type: 'update',
      record_id: recordId,
      submission_data: newData
    })
  });
}

// Delete record
async function deleteRecord(recordId) {
  const response = await fetch('/api/admin/save', {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action_type: 'delete',
      record_id: recordId
    })
  });
}
```

## Database Schema

### **wtaf_submissions Table**
```sql
CREATE TABLE wtaf_submissions (
  id BIGSERIAL PRIMARY KEY,
  app_id UUID NOT NULL,                    -- Links to wtaf_content.id  
  submission_data JSONB NOT NULL,          -- Flexible form data
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  origin_app_slug TEXT                     -- App slug for stackdb queries
);
```

### **Key Fields:**
- **id**: Primary key for update/delete operations
- **app_id**: UUID linking to the app (used by regular admin apps)
- **origin_app_slug**: App slug (used by stackdb apps for cross-app queries)
- **submission_data**: JSONB containing form fields (name, email, message, etc.)

## Comparison with ZAD Apps

| Feature | Admin Apps | ZAD Apps |
|---------|------------|----------|
| **Endpoints** | `/api/admin/save` + `/api/admin/load` | `/api/zad/save` + `/api/zad/load` |
| **Data Table** | `wtaf_submissions` | `wtaf_zero_admin_collaborative` |
| **Query Method** | `app_id` or `origin_app_slug` | `app_id` + `action_type` |
| **Operations** | `action_type`: create/update/delete | `action_type`: create/update/delete/search/etc |
| **Use Case** | Form submissions + moderation | Collaborative multi-user apps |
| **Security** | Owner-only access | Participant-based access |

## Error Handling

### **Common Error Responses:**

```json
// Missing required fields
{
  "error": "Missing required fields: app_id and submission_data are required",
  "status": 400
}

// Update without record_id
{
  "success": false,
  "error": "Missing record_id for update operation",
  "status": 400
}

// Database error
{
  "success": false, 
  "error": "Failed to update record: Record not found",
  "status": 500
}
```

### **Client-Side Handling:**
```javascript
try {
  const response = await fetch('/api/admin/save', {...});
  if (!response.ok) throw new Error('API call failed');
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  // Success handling...
} catch (error) {
  console.error('Error:', error);
  document.getElementById('error-message').textContent = 'Operation failed';
}
```

## Migration from Old Pattern

### **Before (Separate Endpoints):**
```javascript
// ❌ Old way (no longer supported)
fetch('/api/admin/update', { method: 'POST', ... });
fetch('/api/admin/delete', { method: 'POST', ... });
```

### **After (Unified Pattern):**
```javascript  
// ✅ New way (current implementation)
fetch('/api/admin/save', { 
  method: 'POST', 
  body: JSON.stringify({ action_type: 'update', ... })
});
```

## Benefits of This Architecture

1. **✅ Consistency**: Same pattern as ZAD apps
2. **✅ Simplicity**: Only 2 endpoints for Builder GPT to remember  
3. **✅ Extensibility**: Easy to add new operations via action_type
4. **✅ Maintainability**: Single place for all write logic
5. **✅ Security**: Clear ownership model with proper verification

---

**Last Updated:** July 18, 2025  
**Version:** 1.0 (Unified Action_Type Implementation) 