/**
 * View Engine - Generic grouping and view rendering for asset trees
 */

import { ASSET_TYPES, getAssetTypeForContent, getFileIcon } from './assetTypes.js';

// Available dimensions for custom views
export const DIMENSIONS = [
  { id: 'owner_id', name: 'Owner', icon: 'person', displayField: 'owner_name' },
  { id: 'owner_type', name: 'Owner Type', icon: 'folder', labelMap: { actor: 'Actors', scene: 'Scenes', global: 'Global' } },
  { id: 'scene_id', name: 'Scene', icon: 'folder', displayField: 'scene_name' },
  { id: 'actor_id', name: 'Actor', icon: 'person', displayField: 'actor_name' },
  { id: 'section_id', name: 'Section', icon: 'folder', displayField: 'section_name' },
  { id: 'content_type', name: 'Type', icon: 'type', labelMap: { dialogue: 'Dialogue', music: 'Music', sfx: 'SFX', image: 'Image', video: 'Video' } },
  { id: 'status', name: 'Status', icon: 'status' },
  { id: 'content_id', name: 'Content', icon: 'content', displayField: 'name', isTerminal: true },
];

export function getStickyName(view) {
  if (view.name && view.name.trim() !== '') return view.name;
  if (!view.levels || view.levels.length === 0) return 'new view';
  const firstLevel = view.levels[0];
  const dim = DIMENSIONS.find(d => d.id === firstLevel.field);
  return `by ${dim ? dim.name.toLowerCase() : firstLevel.field}`;
}

// ============================================================================
// Preset View Definitions (Now serving as initial templates)
// ============================================================================

export const PRESET_VIEWS = {
  'by-actor': {
    id: 'by-actor',
    name: '', // Sticky: by actor
    category: 'view',
    levels: [
      { field: 'owner_type', labelMap: { actor: 'Actors', scene: 'Scenes', global: 'Global' }, icon: 'folder' },
      { field: 'owner_id', displayField: 'owner_name', icon: 'person' },
      { field: 'section_id', displayField: 'section_name', icon: 'folder' },
      { field: 'content_id', displayField: 'name', icon: 'content', isTerminal: true },
    ]
  },
  'by-scene': {
    id: 'by-scene',
    name: '', // Sticky: by scene
    category: 'view',
    levels: [
      { field: 'scene_id', displayField: 'scene_name', icon: 'folder' },
      { field: 'owner_id', displayField: 'owner_name', icon: 'person' },
      { field: 'section_id', displayField: 'section_name', icon: 'folder' },
      { field: 'content_id', displayField: 'name', icon: 'content', isTerminal: true },
    ]
  },
  'unapproved': {
    id: 'unapproved',
    name: 'unapproved',
    category: 'summary',
    filter: (asset) => asset.status !== 'approved',
    levels: [
      { field: 'status', icon: 'status', labelMap: {
        'new': 'New',
        'rejected': 'Rejected',
        'hidden': 'Hidden',
        '__none__': 'No Takes'
      }},
      { field: 'owner_id', displayField: 'owner_name', icon: 'person' },
      { field: 'content_id', displayField: 'name', icon: 'content', isTerminal: true },
    ]
  }
};

// ============================================================================
// Asset Index Builder
// ============================================================================

export function buildAssetIndex(actors, sections, content, takes, scenes = []) {
  const actorsById = new Map(actors.map(a => [a.id, a]));
  const sectionsById = new Map(sections.map(s => [s.id, s]));
  const scenesById = new Map(scenes.map(sc => [sc.id, sc]));
  
  const takesByContentId = new Map();
  for (const take of takes) {
    if (!takesByContentId.has(take.content_id)) takesByContentId.set(take.content_id, []);
    takesByContentId.get(take.content_id).push(take);
  }

  const index = [];

  for (const c of content) {
    const s = sectionsById.get(c.section_id);
    
    // Resolve owner details
    let ownerName = 'Global';
    let actorId = null;
    let actorName = null;
    let sceneId = null;
    let sceneName = null;

    if (c.owner_type === 'actor') {
        const a = actorsById.get(c.owner_id);
        ownerName = a?.display_name || 'Unknown Actor';
        actorId = c.owner_id;
        actorName = ownerName;
    } else if (c.owner_type === 'scene') {
        const sc = scenesById.get(c.owner_id);
        ownerName = sc?.name || 'Unknown Scene';
        sceneId = c.owner_id;
        sceneName = ownerName;
    }

    // Secondary Scene lookup (if section has scene_id, though in V2 owner_id is primary)
    // For now, let's keep compatibility with section-level scene_id if it exists
    if (!sceneId && s?.scene_id) {
        const sc = scenesById.get(s.scene_id);
        sceneId = s.scene_id;
        sceneName = sc?.name || 'Unknown Scene';
    }

    const contentTakes = takesByContentId.get(c.id) || [];

    const baseRecord = {
      content_id: c.id,
      name: c.name || 'untitled',
      prompt: c.prompt,
      content_type: c.content_type || 'unknown',
      section_id: c.section_id,
      section_name: s?.name || 'Unknown Section',
      owner_type: c.owner_type,
      owner_id: c.owner_id,
      owner_name: ownerName,
      scene_id: sceneId,
      scene_name: sceneName,
      actor_id: actorId,
      actor_name: actorName,
      asset_type: getAssetTypeForContent(c.content_type)?.id || 'audio',
      leaf_type: getAssetTypeForContent(c.content_type)?.leafType || 'take',
      _content: c,
      _section: s,
    };

    if (contentTakes.length === 0) {
      index.push({
        ...baseRecord,
        id: `content-${c.id}`,
        take_id: null,
        status: '__none__',
      });
    } else {
      for (const take of contentTakes) {
        index.push({
          ...baseRecord,
          id: take.id,
          take_id: take.id,
          take_number: take.take_number,
          status: take.status || 'new',
          filename: take.filename,
          path: take.path,
          duration_sec: take.duration_sec,
          _take: take,
        });
      }
    }
  }
  
  return index;
}

// ============================================================================
// Grouping Engine
// ============================================================================

export function groupByLevels(items, levels, depth = 0, parentPath = '') {
  if (!items || items.length === 0) return [];
  
  if (depth >= levels.length) {
    return items.map(item => {
      const assetType = ASSET_TYPES[item.asset_type] || ASSET_TYPES.audio;
      let label = item.filename;
      if (!label) {
        if (item.take_id) label = `${assetType.leafType} ${item.take_number || item.id}`;
        else label = `(no ${assetType.leafType}s)`;
      }
      return {
        type: 'leaf',
        id: `${parentPath}/leaf:${item.id}`,
        label,
        leafType: item.leaf_type || 'take',
        assetType: item.asset_type || 'audio',
        fileIcon: getFileIcon(item.filename || ''),
        data: item,
      };
    });
  }
  
  const level = levels[depth];
  const groups = new Map();
  const UNASSIGNED_KEY = '__unassigned__';
  
  for (const item of items) {
    const rawValue = item[level.field];
    const key = (rawValue === null || rawValue === undefined || rawValue === '') ? UNASSIGNED_KEY : String(rawValue);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  
  const nodes = [];
  for (const [key, children] of groups) {
    let label = key;
    if (key === UNASSIGNED_KEY) label = `Unknown ${level.field.replace('_id', '')}`;
    else if (level.labelMap && level.labelMap[key]) label = level.labelMap[key];
    else if (level.displayField && children[0]) label = children[0][level.displayField] || key;
    
    const currentId = `${level.field}:${key}`;
    const fullId = parentPath ? `${parentPath}/${currentId}` : currentId;
    
    const childNodes = groupByLevels(children, levels, depth + 1, fullId);
    const statuses = children.map(c => c.status).filter(s => s !== '__none__');
    let groupStatus = 'gray';
    
    if (statuses.length > 0) {
      const hasApproved = statuses.includes('approved');
      const hasNew = statuses.includes('new');
      const hasRejected = statuses.includes('rejected');
      
      if (hasRejected || (hasNew && !hasApproved)) groupStatus = 'red';
      else if (hasNew && hasApproved) groupStatus = 'yellow';
      else if (hasApproved) groupStatus = 'green';
    }
    
    nodes.push({
      type: 'group',
      id: fullId,
      field: level.field,
      fieldValue: key,
      label,
      icon: level.icon,
      status: groupStatus,
      count: children.filter(c => c.take_id).length || null,
      children: childNodes,
      depth,
    });
  }
  
  nodes.sort((a, b) => {
    if (level.field === 'owner_type') {
        const order = { global: 0, actor: 1, scene: 2 };
        return (order[a.fieldValue] ?? 99) - (order[b.fieldValue] ?? 99);
    }
    if (level.field === 'status') {
      const order = { approved: 0, new: 1, rejected: 2, hidden: 3 };
      return (order[a.fieldValue] ?? 99) - (order[b.fieldValue] ?? 99);
    }
    return String(a.label).localeCompare(String(b.label));
  });
  
  return nodes;
}

// utility to get view by id
export function getViewById(viewId, customViews = []) {
  return customViews.find(v => v.id === viewId) || PRESET_VIEWS[viewId] || null;
}

export function getAllViews(customViews = []) {
  const seenIds = new Set(customViews.map(v => v.id));
  const combined = [...customViews];
  for (const p of Object.values(PRESET_VIEWS)) {
    if (!seenIds.has(p.id)) combined.push(p);
  }
  return combined;
}

export function buildViewTree(viewId, data, customViews = []) {
  const view = getViewById(viewId, customViews);
  if (!view) return [];
  const { actors = [], sections = [], content = [], takes = [], scenes = [] } = data;
  let assets = buildAssetIndex(actors, sections, content, takes, scenes);
  if (view.filter && typeof view.filter === 'function') assets = assets.filter(view.filter);
  return groupByLevels(assets, view.levels);
}
