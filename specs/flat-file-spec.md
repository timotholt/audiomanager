# Flat File Architecture Spec v2

## Executive Summary

Add **embedded metadata to audio files** as a portable backup layer. JSONL remains the primary read source (fast). Files become self-describing and can rebuild the catalog if JSONL is lost. Views become dynamic—user chooses how to group/sort the hierarchy.

---

## Architecture: Dual-Write with JSONL Cache

```
┌─────────────────┐     ┌──────────────────┐
│   JSONL Files   │◄────│   Read (fast)    │
│  (primary cache)│     └──────────────────┘
└────────┬────────┘
         │
    ┌────▼────┐
    │  Write  │──────────────────────────────┐
    └────┬────┘                              │
         │                                   ▼
┌────────▼────────┐                 ┌────────────────┐
│   Audio Files   │                 │  FFmpeg Tags   │
│ (source of truth│◄────────────────│  (embedded)    │
│   for recovery) │                 └────────────────┘
└─────────────────┘
```

### Key Principles
1. **Read from JSONL** — fast, no scanning required
2. **Write to BOTH** — JSONL + embedded file metadata
3. **Files are portable** — move/rename freely, metadata travels with them
4. **Recovery mode** — scan files to rebuild JSONL if damaged/lost
5. **Lazy validation** — check file exists on playback, mark missing then

---

## Data Flow

### Normal Operation
```
Generate Take → Write audio file → Embed metadata → Append to takes.jsonl
Update Status → Update takes.jsonl → Update file metadata
Delete Take   → Remove from takes.jsonl → Delete file
```

### Recovery (JSONL lost/corrupted)
```
Scan media folder → Read metadata from each file → Rebuild takes.jsonl
```

### File Moved/Renamed Outside App
```
Playback requested → File not found at stored path → Mark as "missing" in UI
User can: relocate manually, or run reconciliation scan
```

---

## Embedded Metadata Tags

Written via ffmpeg to each audio file:

| Tag | Purpose |
|-----|---------|
| `VOFOUNDRY_ID` | Unique take ID (UUID) |
| `VOFOUNDRY_CONTENT_ID` | Parent content/cue ID |
| `VOFOUNDRY_ACTOR_ID` | Actor ID |
| `VOFOUNDRY_SECTION_ID` | Section ID |
| `VOFOUNDRY_CONTENT_TYPE` | dialogue \| music \| sfx |
| `VOFOUNDRY_CUE_ID` | Cue identifier string |
| `VOFOUNDRY_TAKE_NUMBER` | Take number (1, 2, 3...) |
| `VOFOUNDRY_STATUS` | new \| approved \| rejected \| hidden |
| `VOFOUNDRY_PROMPT` | Generation prompt text |
| `VOFOUNDRY_GENERATED_BY` | elevenlabs \| manual \| null |
| `VOFOUNDRY_VOICE_ID` | Voice ID (if applicable) |
| `VOFOUNDRY_MODEL_ID` | Model ID (if applicable) |
| `VOFOUNDRY_CREATED_AT` | ISO timestamp |
| `VOFOUNDRY_UPDATED_AT` | ISO timestamp |

---

## Views Layer

### Current (Fixed Hierarchy)
```
Actor → Section → Content → Takes
```

### Proposed (Dynamic Views)
User selects grouping order from available dimensions:

| Dimension | Source |
|-----------|--------|
| `actor` | Actor.display_name |
| `content_type` | dialogue / music / sfx |
| `section` | Section.name or content_type |
| `cue` | Content.cue_id |
| `status` | Take.status |
| `tag:*` | Content.tags array |

### Example Views
```javascript
const views = {
  'default': {
    groupBy: ['actor', 'section', 'cue'],
    sortWithin: 'take_number'
  },
  'type-first': {
    groupBy: ['content_type', 'actor', 'cue'],
    sortWithin: 'take_number'
  },
  'flat': {
    groupBy: [],  // no grouping
    sortBy: ['actor', 'cue', 'take_number']
  },
  'by-status': {
    groupBy: ['status', 'actor', 'cue'],
    sortWithin: 'take_number'
  }
};
```

### Implementation Phases

**Phase 1** (with flat-file work): Simple pivots on existing fields
- Add view selector dropdown to TreePane
- Implement 3-4 preset views (default, type-first, flat, by-status)
- ~200 lines

**Phase 2** (later): Tag-based grouping
- Group by presence of specific tags
- ~400 lines

**Phase 3** (later): Custom view builder
- UI to define custom groupings
- ~800+ lines

---

## Impact Assessment

### New Service
| File | Purpose |
|------|---------|
| `src/services/metadata.ts` | Read/write ffmpeg metadata tags |

### Modified Files

| File | Change | Scope |
|------|--------|-------|
| `src/server/routes/content.ts` | Dual-write: embed metadata after generation | Medium |
| `src/server/routes/takes.ts` | Dual-write: update file metadata on status change | Medium |
| `src/ui/components/TreePane.jsx` | Add view selector, dynamic groupBy | Medium |
| `src/types/index.ts` | Add View types | Small |
| `src/utils/paths.ts` | Optional: flat media path helpers | Small |

### New Tools (can be CLI or routes)
| Tool | Purpose |
|------|---------|
| `recover-from-files` | Scan media, rebuild takes.jsonl |
| `verify-metadata` | Check JSONL ↔ file metadata consistency |

---

## Rough LOC Estimate (Revised)

| Category | Lines |
|----------|-------|
| metadata.ts service | ~150 |
| Route dual-write changes | ~100 |
| TreePane view selector | ~200 |
| Types/schemas | ~50 |
| Recovery tool | ~150 |
| Tests | ~200 |
| **Total** | **~850 lines** |

---

## Technical: FFmpeg Commands

### Format Support

| Format | Custom Tags | Approach |
|--------|-------------|----------|
| **FLAC** | ✅ Native | Use `VOFOUNDRY_*` tags directly |
| **WAV** | ❌ Limited | Pack JSON into `comment` field via BWF |
| **MP3** | ✅ ID3 | Use `VOFOUNDRY_*` tags (untested) |
| **AIFF** | ⚠️ Varies | Needs testing |

**Note**: We tested the `wavefile` npm library for WAV metadata, but it has a bug
where adding bext chunks to existing files corrupts the chunk order (puts bext
before fmt, making the file unreadable). Using ffmpeg `-write_bext 1` instead.

### Read Metadata
```bash
ffprobe -v quiet -print_format json -show_format input.flac
# Returns: { format: { tags: { VOFOUNDRY_ID: "...", ... } } }
```

### Write Metadata (FLAC - native tags)
```bash
ffmpeg -i input.wav -c:a flac \
  -metadata VOFOUNDRY_ID="abc123" \
  -metadata VOFOUNDRY_STATUS="new" \
  output.flac
```

### Write Metadata (WAV - JSON in comment)
```bash
ffmpeg -i input.wav -c copy -write_bext 1 \
  -metadata comment='VOFOUNDRY:{"id":"abc123","status":"new"}' \
  output.wav
```

### Update Metadata (in-place)
```bash
ffmpeg -i input.wav -c copy -write_bext 1 -metadata comment='...' temp.wav
mv temp.wav input.wav
```

Note: `-c copy` means no re-encoding—fast and lossless.

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| File missing | Show "missing" badge in UI; lazy detection on playback |
| File moved | JSONL path stale; user can relocate or run reconciliation |
| Corrupt metadata | Recovery scan skips file; log warning |
| Non-VOFOUNDRY file | Recovery scan ignores; doesn't appear in catalog |
| Duplicate IDs | Recovery uses newest file (by mtime); log conflict |

---

## Migration Strategy

### Incremental (Test-as-you-go)
1. **Add metadata.ts** — write tags, verify with ffprobe
2. **Add dual-write to generation** — new takes get embedded metadata
3. **Add dual-write to status updates** — status changes update file metadata
4. **Test**: Generate takes, approve/reject, verify metadata persists
5. **Add recovery tool** — scan files, rebuild JSONL
6. **Test**: Delete takes.jsonl, run recovery, verify data restored
7. **Add view selector** — Phase 1 preset views
8. **Optionally**: Flatten media paths (move files to `media/` root)

No backward compatibility needed—final state is the only state.

---

## Pros & Cons (Revised)

### Pros
- **No startup scan** — JSONL is still the fast read path
- **Portable files** — metadata travels with the file
- **Recoverable** — rebuild catalog from files if JSONL lost
- **Incremental** — add features without breaking existing flow
- **Flexible views** — user organizes however they want

### Cons
- **Dual-write overhead** — every write touches file + JSONL
- **FFmpeg dependency** — already have it, but more usage
- **Temp file dance** — in-place updates need temp file + rename
