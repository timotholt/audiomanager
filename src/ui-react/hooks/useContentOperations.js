import { useState, useCallback } from 'react';
import { createContent } from '../api/client.js';

/**
 * Hook for content/cue creation operations
 */
export function useContentOperations({ expandNode, onContentCreated }) {
  const [contentPrompt, setContentPrompt] = useState('');
  const [contentCueId, setContentCueId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const createContentItem = useCallback(async (actorId, contentType, sectionId) => {
    try {
      setCreating(true);
      setError(null);
      
      const result = await createContent({
        actor_id: actorId,
        content_type: contentType,
        section_id: sectionId,
        cue_id: contentCueId,
        prompt: contentPrompt || undefined,
      });

      if (result && result.content && onContentCreated) {
        if (Array.isArray(result.content)) {
          result.content.forEach(item => onContentCreated(item));
        } else {
          onContentCreated(result.content);
        }
        
        // Auto-expand to show the new content
        if (expandNode) {
          expandNode('actors');
          expandNode(`actor-${actorId}`);
          if (sectionId) {
            expandNode(`section-${sectionId}`);
          }
        }
        
        if (result.message) {
          setError(result.message);
        }
      }
      
      setContentPrompt('');
      setContentCueId('');
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setCreating(false);
    }
  }, [contentPrompt, contentCueId, expandNode, onContentCreated]);

  return {
    contentPrompt,
    contentCueId,
    creating,
    error,
    setContentPrompt,
    setContentCueId,
    setError,
    createContent: createContentItem,
  };
}
