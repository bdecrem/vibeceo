# Project: Directory Setup

## Context
Create the TB-303 directory structure and establish symlinks to reuse TR-909 core infrastructure.

## Tasks
- [ ] Create `web/public/303/` directory structure
- [ ] Create `dist/machines/tb303/` folder
- [ ] Create `dist/machines/tb303/voices/` folder
- [ ] Create `ui/tb303/` folder
- [ ] Symlink `dist/core/` → `../909/dist/core/`
- [ ] Create `index.html` entry point (redirect to ui/tb303/)
- [ ] Verify imports from core/ work correctly

## Completion Criteria
- [ ] Directory structure matches PLAN.md
- [ ] Core imports resolve correctly
- [ ] Basic HTML loads without errors

## Files
```
web/public/303/
├── index.html
├── dist/
│   ├── core/ → symlink
│   └── machines/tb303/
│       └── voices/
└── ui/tb303/
    └── index.html
```

## Notes
The symlink approach allows both 909 and 303 to share the same core classes without duplication. If symlinks cause issues, we can copy the files instead.
