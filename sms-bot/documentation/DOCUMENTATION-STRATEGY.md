# Documentation Strategy for Rapid Development

## Automated Documentation Sync

### 1. **Build-Time Generation**
- `npm run docs:generate` - Auto-generates documentation sections
- Runs automatically before each build (`prebuild` script)
- Extracts module exports, commands, and structure

### 2. **Validation Tests**
- `npm run docs:validate` - Checks if docs match code
- Can be added to CI/CD pipeline
- Fails build if documentation is stale

### 3. **Git Hooks**
```bash
# Enable git hooks
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

### 4. **Living Documentation Patterns**

#### In Code Files:
```typescript
/**
 * @module storage-manager
 * @description Handles ALL database operations - no Supabase calls elsewhere
 * @responsibility Database CRUD, File operations, Transaction management
 */

/**
 * @command --admin
 * @description Force admin dual-page generation (bypasses classifier)
 * @example wtaf --admin create a survey form
 */
```

#### In CLAUDE.md:
- Static sections: Architecture rules, principles
- Auto-generated sections: Module list, command reference
- Linked references: Points to detailed docs in /documentation

### 5. **Documentation as Code**
```typescript
// In module files
export const MODULE_RESPONSIBILITIES = {
    'storage-manager': ['database ops', 'file ops', 'transactions'],
    'controller': ['orchestration', 'routing', 'business logic']
};

// Can be imported by doc generator
```

### 6. **Rapid Update Workflow**

1. **Developer makes changes**
   - Adds new command/feature
   - Updates module

2. **Pre-commit hook runs**
   - Validates documentation
   - Auto-generates if needed
   - Prompts to review

3. **Build process**
   - Regenerates docs
   - Validates accuracy
   - Fails if mismatch

4. **CI/CD**
   - Runs validation tests
   - Ensures docs deployed with code

### 7. **Key Principles**

- **Single Source of Truth**: Code is the truth, docs follow
- **Fail Fast**: Break builds on stale docs
- **Automate**: Generate what can be generated
- **Validate**: Test documentation like code
- **Version Together**: Docs commit with code changes

### 8. **What to Document Manually vs Auto**

**Auto-Generate:**
- Module exports and functions
- Available commands and flags
- Database tables in use
- File structure
- Dependencies

**Manual Documentation:**
- Architecture principles
- Business logic explanations
- Why decisions were made
- Complex workflows
- Integration patterns

### 9. **Monitoring Documentation Health**

```bash
# Add to package.json
"scripts": {
    "docs:health": "npm run docs:validate && npm run docs:coverage",
    "docs:coverage": "node scripts/check-doc-coverage.js"
}
```

### 10. **Documentation Lifecycle**

```
Code Change → Auto-Generate → Validate → Commit → Deploy
     ↑                                         |
     └─────────── Fail if outdated ←──────────┘
```

This ensures documentation evolves with your codebase automatically!