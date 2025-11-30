import React, { useEffect, useState, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TreePane from './TreePane.jsx';
import DetailPane from './DetailPane.jsx';
import { getActors, getContent, getSections, getTakes, deleteSection } from '../api/client.js';
import { useAppLog } from '../hooks/useAppLog.js';
import { useCommandHistory } from '../hooks/useCommandHistory.js';
import { CommandType } from '../commands/types.js';

export default function ProjectShell({ blankSpaceConversion, capitalizationConversion, onStatusChange, onCreditsRefresh, onPlayTake, onStopPlayback, currentPlayingTakeId }) {
  const [actors, setActors] = useState([]);
  const [content, setContent] = useState([]);
  const [sections, setSections] = useState([]); // Track sections separately from content
  const [takes, setTakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [expandNode, setExpandNode] = useState(null);
  const [playedTakes, setPlayedTakes] = useState(() => {
    try {
      const saved = localStorage.getItem('audiomanager-played-takes');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Failed to load played takes from localStorage:', e);
      return {};
    }
  });

  // Resizable tree pane width
  const [treePaneWidth, setTreePaneWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('audiomanager-tree-pane-width');
      return saved ? parseInt(saved, 10) : 300;
    } catch (e) {
      return 300;
    }
  });
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  // Application logging (legacy - still used for non-command operations)
  const { logs, logInfo, logSuccess, logError, logWarning, clearLogs } = useAppLog();

  // Handle state changes from command execution
  const handleCommandStateChange = useCallback((commandType, result) => {
    switch (commandType) {
      case CommandType.CREATE_ACTOR:
        // Handle batch creation (actors array) or single creation (actor)
        if (result.actors && result.actors.length > 0) {
          setActors(prev => [...prev, ...result.actors]);
        } else if (result.actor) {
          setActors(prev => [...prev, result.actor]);
        }
        break;
      case CommandType.DELETE_ACTOR:
      case `UNDO_${CommandType.CREATE_ACTOR}`:
        // Handle batch undo (actorIds array) or single undo (actorId)
        if (result.actorIds && result.actorIds.length > 0) {
          const idsToRemove = new Set(result.actorIds);
          setActors(prev => prev.filter(a => !idsToRemove.has(a.id)));
          setContent(prev => prev.filter(c => !idsToRemove.has(c.actor_id)));
          setSections(prev => prev.filter(s => !idsToRemove.has(s.actor_id)));
        } else if (result.actorId) {
          setActors(prev => prev.filter(a => a.id !== result.actorId));
          setContent(prev => prev.filter(c => c.actor_id !== result.actorId));
          setSections(prev => prev.filter(s => s.actor_id !== result.actorId));
        }
        break;
      case `UNDO_${CommandType.DELETE_ACTOR}`:
        // Restore actor, sections, and content
        if (result.actor) {
          setActors(prev => [...prev, result.actor]);
        }
        if (result.sections) {
          setSections(prev => [...prev, ...result.sections]);
        }
        if (result.content) {
          setContent(prev => [...prev, ...result.content]);
        }
        break;
      default:
        break;
    }
  }, []);

  // Command history with undo/redo
  const commandHistory = useCommandHistory({
    actors,
    sections,
    content,
    onStateChange: handleCommandStateChange,
  });

  // Memoize the callback to prevent unnecessary re-renders
  const handleExpandNode = useCallback((expandNodeFunction) => {
    setExpandNode(() => expandNodeFunction);
  }, []);

  const handlePlayTakeGlobal = useCallback((contentId, take) => {
    // Mark as played and delegate to global player
    setPlayedTakes((prev) => ({ ...prev, [take.id]: true }));
    if (onPlayTake) {
      onPlayTake(take);
    }
  }, [onPlayTake]);

  useEffect(() => {
    try {
      localStorage.setItem('audiomanager-played-takes', JSON.stringify(playedTakes));
    } catch (e) {
      console.warn('Failed to save played takes to localStorage:', e);
    }
  }, [playedTakes]);

  // Save tree pane width to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('audiomanager-tree-pane-width', String(treePaneWidth));
    } catch (e) {
      console.warn('Failed to save tree pane width:', e);
    }
  }, [treePaneWidth]);

  // Handle resize drag
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      // Clamp between 200 and 500 pixels
      setTreePaneWidth(Math.max(200, Math.min(500, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [actorsRes, contentRes, sectionsRes, takesRes] = await Promise.all([
          getActors(), 
          getContent(), 
          getSections(),
          getTakes()
        ]);
        if (cancelled) return;
        setActors(actorsRes.actors || []);
        setContent(contentRes.content || []);
        setSections(sectionsRes.sections || []);
        setTakes(takesRes.takes || []);
        setError(null);
        // Reload command history after project data loads
        commandHistory.reloadHistory();
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Box component="main" sx={{ flexGrow: 1, pt: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1">Loading project data…</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box component="main" sx={{ flexGrow: 1, pt: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="error">Error loading data: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box ref={containerRef} component="main" sx={{ flexGrow: 1, pt: 6, pb: '6rem', display: 'flex', minWidth: 0, userSelect: isResizing ? 'none' : 'auto' }}>
      <TreePane
        width={treePaneWidth}
        actors={actors}
        content={content}
        sections={sections}
        takes={takes}
        selectedNode={selectedNode}
        onSelect={setSelectedNode}
        onExpandNode={handleExpandNode}
        playingTakeId={currentPlayingTakeId}
        playedTakes={playedTakes}
      />
      {/* Resizable divider */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          width: '6px',
          cursor: 'col-resize',
          backgroundColor: isResizing ? 'primary.main' : 'transparent',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          flexShrink: 0,
          zIndex: 1,
        }}
      />
      <DetailPane
        actors={actors}
        content={content}
        sections={sections}
        selectedNode={selectedNode}
        expandNode={expandNode}
        onActorCreated={(actor) => {
          setActors((prev) => [...prev, actor]);
          logInfo(`Actor created: ${actor.display_name}`);
        }}
        onContentCreated={(item) => {
          setContent((prev) => [...prev, item]);
          logInfo(`Content created: ${item.cue_id} (${item.content_type})`);
        }}
        onSectionCreated={(section) => {
          setSections((prev) => [...prev, section]);
          logInfo(`Section created: ${section.name || section.content_type}`);
        }}
        onActorUpdated={(updatedActor) => {
          setActors((prev) => prev.map(a => a.id === updatedActor.id ? updatedActor : a));
        }}
        onSectionUpdated={(updatedSection) => {
          setSections((prev) => prev.map(s => s.id === updatedSection.id ? updatedSection : s));
        }}
        onActorDeleted={(id) => {
          const actor = actors.find(a => a.id === id);
          setActors((prev) => prev.filter((a) => a.id !== id));
          setContent((prev) => prev.filter((c) => c.actor_id !== id));
          setSections((prev) => prev.filter((s) => s.actor_id !== id));
          setSelectedNode(null);
          logInfo(`Actor deleted: ${actor?.display_name || id}`);
        }}
        onContentDeleted={(id) => {
          const item = content.find(c => c.id === id);
          setContent((prev) => prev.filter((c) => c.id !== id));
          setSelectedNode(null);
          logInfo(`Content deleted: ${item?.cue_id || id}`);
        }}
        onContentUpdated={(updatedContent) => {
          setContent((prev) => prev.map(c => c.id === updatedContent.id ? updatedContent : c));
        }}
        onTakesGenerated={(newTakes) => {
          setTakes((prev) => [...prev, ...newTakes]);
          if (newTakes.length > 0) {
            const take = newTakes[0];
            logSuccess(`Generated ${newTakes.length} take(s)`, { filename: take.filename, content_id: take.content_id });
          }
        }}
        onTakeUpdated={(updatedTake) => {
          setTakes((prev) => prev.map(t => t.id === updatedTake.id ? updatedTake : t));
        }}
        onSectionDeleted={async (sectionId) => {
          try {
            const section = sections.find(s => s.id === sectionId);
            await deleteSection(sectionId);
            setSections((prev) => prev.filter((s) => s.id !== sectionId));
            // Only delete content belonging to THIS specific section
            setContent((prev) => prev.filter((c) => c.section_id !== sectionId));
            if (selectedNode?.id === sectionId) setSelectedNode(null);
            logInfo(`Section deleted: ${section?.name || sectionId}`);
          } catch (err) {
            setError(err.message || String(err));
            logError(`Failed to delete section: ${err.message || err}`);
          }
        }}
        blankSpaceConversion={blankSpaceConversion}
        capitalizationConversion={capitalizationConversion}
        onStatusChange={onStatusChange}
        playingTakeId={currentPlayingTakeId}
        onPlayRequest={handlePlayTakeGlobal}
        onStopRequest={onStopPlayback}
        playedTakes={playedTakes}
        onTakePlayed={(takeId) => setPlayedTakes((prev) => ({ ...prev, [takeId]: true }))}
        onCreditsRefresh={onCreditsRefresh}
        logs={logs}
        onClearLogs={clearLogs}
        onLogError={logError}
        onLogInfo={logInfo}
        history={commandHistory.history}
        historyLoading={commandHistory.loading}
        onUndo={commandHistory.undo}
        onRedo={commandHistory.redo}
        dispatch={commandHistory.dispatch}
      />
    </Box>
  );
}
