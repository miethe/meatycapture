---
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, LS
argument-hint: <skill-path> | --analyze | --all
description: Optimize skill for progressive disclosure - break large SKILL.md into modular files for token efficiency
---

# Skill Optimization Command

Optimize a Claude Code skill for progressive disclosure and token efficiency: **$ARGUMENTS**

## Current Context

- Skill path: $ARGUMENTS
- Target SKILL.md: ~200-300 lines (max 500)
- Supporting files: ~300-500 lines each (max 800)

## Optimization Process

### Phase 1: Analysis

1. **Read the skill structure**
   ```bash
   find <skill-path> -name "*.md" -exec wc -l {} \;
   ```

2. **Identify SKILL.md line count**
   - Under 300 lines: Minor optimization needed
   - 300-500 lines: Consider breaking out verbose sections
   - Over 500 lines: **Requires optimization**

3. **Identify content categories**:
   - Core guidance (keep in SKILL.md)
   - Workflows (break into `./workflows/`)
   - Examples (break into `./references/workflow-examples.md`)
   - Best practices (break into `./references/best-practices.md`)
   - Detailed references (keep in `./references/`)

### Phase 2: Structure Planning

**Target Structure**:
```
skill-name/
├── SKILL.md                    # Core guidance only (200-300 lines)
├── workflows/                  # Detailed workflow files
│   ├── workflow-1-name.md      # Individual workflow (50-150 lines each)
│   ├── workflow-2-name.md
│   └── ...
├── references/                 # Reference documentation
│   ├── best-practices.md       # Guidelines and tips
│   ├── workflow-examples.md    # Detailed usage examples
│   └── [domain-specific].md    # Domain-specific references
├── templates/                  # Document/output templates
└── scripts/                    # Automation scripts (Node.js)
```

**SKILL.md Should Contain**:
- YAML frontmatter (description is critical)
- Purpose/overview (2-3 sentences)
- Quick start examples (brief)
- Workflow table with links
- Reference table with links
- Related skills/agents
- Version history

**SKILL.md Should NOT Contain**:
- Detailed step-by-step workflow instructions
- Lengthy examples
- Comprehensive best practices
- Domain reference material

### Phase 3: Execute Optimization

1. **Create directories** if needed:
   ```bash
   mkdir -p <skill-path>/workflows
   mkdir -p <skill-path>/references
   ```

2. **Extract workflows** to individual files:
   - Use intention-revealing names: `create-prd.md`, `optimize-existing-plans.md`
   - Include "Return to parent" link at bottom
   - Keep each under 150 lines

3. **Extract examples** to `./references/workflow-examples.md`:
   - Detailed usage examples
   - Input/output demonstrations
   - Multi-step example flows

4. **Extract best practices** to `./references/best-practices.md`:
   - Naming conventions
   - File organization
   - Token efficiency tips
   - Anti-patterns to avoid

5. **Rewrite SKILL.md**:
   - Keep only essential guidance
   - Add workflow table with links
   - Add reference table with links
   - Target 200-300 lines

6. **Add cross-links**:
   - Parent → child links in tables
   - Child → parent "Return to" links

### Phase 4: Validation

**Checklist**:
- [ ] SKILL.md under 300 lines (ideal) or 500 lines (max)
- [ ] All supporting files under 500 lines
- [ ] Workflows broken into individual files
- [ ] Examples moved to references
- [ ] Best practices extracted
- [ ] All cross-links working
- [ ] No content lost
- [ ] Intention-revealing file names used

**Verify Structure**:
```bash
find <skill-path> -name "*.md" -exec wc -l {} \; | sort -n
```

## Token Efficiency Targets

| File Type | Target Lines | Max Lines |
|-----------|-------------|-----------|
| SKILL.md | 200-300 | 500 |
| Workflow file | 50-150 | 200 |
| Reference file | 100-300 | 500 |
| Template file | varies | 400 |

**Progressive Disclosure Benefit**:
- Before: Load 800+ line SKILL.md for any query
- After: Load 200-300 line SKILL.md + specific workflow (100-150) = 50-70% reduction

## Output

After optimization:
1. Report original vs new line counts
2. Show new file structure
3. Confirm token efficiency improvement
4. List any content that couldn't be extracted

## Examples

### Analyze a skill
```
/skills:optimize-skill .claude/skills/planning --analyze
```

### Optimize a specific skill
```
/skills:optimize-skill .claude/skills/planning
```

### Optimize all skills in a directory
```
/skills:optimize-skill .claude/skills --all
```

## Related

- **skill-builder skill**: Creating and editing skills
- **Skill Optimization Patterns**: `./skill-builder/skill-optimization-patterns.md`
