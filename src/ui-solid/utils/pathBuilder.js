/**
 * Utility for building hierarchical display paths for logging
 * e.g., "actor → Tim → Dialogue → hello"
 */

/**
 * Build a display path for an owner (Actor, Scene, or Global)
 */
export function buildOwnerPath(ownerType, ownerName) {
  if (ownerType === 'global') return 'global';
  return `${ownerType} → ${ownerName || 'unknown'}`;
}

/**
 * Build a display path for a section
 */
export function buildSectionPath(ownerType, ownerName, sectionName) {
  return `${buildOwnerPath(ownerType, ownerName)} → ${sectionName}`;
}

/**
 * Build a display path for content/cue
 */
export function buildContentPath(ownerType, ownerName, sectionName, contentName) {
  return `${buildSectionPath(ownerType, ownerName, sectionName)} → ${contentName}`;
}

/**
 * Lookup owner name by ID and Type
 */
export function getOwnerName(ownerType, ownerId, actors, scenes) {
  if (ownerType === 'global') return 'Global';
  if (ownerType === 'actor') {
    return actors?.find(a => a.id === ownerId)?.display_name || 'Unknown';
  }
  if (ownerType === 'scene') {
    return scenes?.find(s => s.id === ownerId)?.name || 'Unknown';
  }
  return 'Unknown';
}

/**
 * Lookup section name by ID
 */
export function getSectionName(sectionId, sections) {
  const section = sections?.find(s => s.id === sectionId);
  return section?.name || section?.content_type || 'Unknown';
}
