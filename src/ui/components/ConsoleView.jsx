import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { DESIGN_SYSTEM } from '../theme/designSystem.js';
import { LogType, EntryType } from '../commands/types.js';

function formatTime(isoString) {
  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function LogIcon({ type, entryType }) {
  const iconSx = { fontSize: '0.875rem' };
  
  // Special icons for undo/redo entries
  if (entryType === EntryType.UNDO) {
    return <UndoIcon sx={{ ...iconSx, color: 'text.secondary' }} />;
  }
  if (entryType === EntryType.REDO) {
    return <RedoIcon sx={{ ...iconSx, color: 'text.secondary' }} />;
  }
  
  switch (type) {
    case LogType.SUCCESS:
      return <CheckCircleIcon sx={{ ...iconSx, color: 'success.main' }} />;
    case LogType.ERROR:
      return <ErrorIcon sx={{ ...iconSx, color: 'error.main' }} />;
    case LogType.WARNING:
      return <WarningIcon sx={{ ...iconSx, color: 'warning.main' }} />;
    case LogType.INFO:
    default:
      return <InfoIcon sx={{ ...iconSx, color: 'info.main' }} />;
  }
}

function LogEntry({ entry, onUndo, onRedo }) {
  const [expanded, setExpanded] = React.useState(false);
  
  // Determine if this entry can be undone/redone
  const isUndoable = entry.entryType === EntryType.OPERATION && entry.command && !entry.undone;
  const isRedoable = entry.entryType === EntryType.OPERATION && entry.command && entry.undone;
  const isUndone = entry.undone;

  return (
    <Box
      sx={{
        py: 0.5,
        px: 1,
        borderBottom: 1,
        borderColor: 'divider',
        '&:hover': { bgcolor: 'action.hover' },
        cursor: entry.details ? 'pointer' : 'default',
        opacity: isUndone ? 0.5 : 1,
        textDecoration: isUndone ? 'line-through' : 'none',
      }}
      onClick={() => entry.details && setExpanded(!expanded)}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <LogIcon type={entry.type} entryType={entry.entryType} />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontFamily: 'monospace', fontSize: '0.7rem', flexShrink: 0 }}
        >
          {formatTime(entry.timestamp)}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.75rem',
            wordBreak: 'break-word',
            flexGrow: 1,
            color: entry.type === LogType.ERROR ? 'error.main' : 'text.primary',
          }}
        >
          {entry.message}
        </Typography>
        {isUndoable && (
          <Button
            size="small"
            variant="text"
            onClick={(e) => { e.stopPropagation(); onUndo(entry.id); }}
            sx={{ minWidth: 'auto', px: 1, py: 0, fontSize: '0.65rem' }}
          >
            Undo
          </Button>
        )}
        {isRedoable && (
          <Button
            size="small"
            variant="text"
            onClick={(e) => { e.stopPropagation(); onRedo(entry.id); }}
            sx={{ minWidth: 'auto', px: 1, py: 0, fontSize: '0.65rem' }}
          >
            Redo
          </Button>
        )}
      </Box>
      {expanded && entry.details && (
        <Box
          sx={{
            mt: 0.5,
            ml: 3,
            p: 1,
            bgcolor: 'action.hover',
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.7rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {typeof entry.details === 'string'
            ? entry.details
            : JSON.stringify(entry.details, null, 2)}
        </Box>
      )}
    </Box>
  );
}

export default function ConsoleView({ history, onUndo, onRedo, loading }) {
  return (
    <Box sx={{ flexGrow: 1, overflow: 'auto', p: DESIGN_SYSTEM.spacing.containerPadding, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant="h6" sx={{ ...DESIGN_SYSTEM.typography.pageTitle, flexGrow: 1 }}>
          Console
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ ...DESIGN_SYSTEM.typography.body, mb: 0.5 }}>
        Operation history with undo/redo support
      </Typography>

      <Box
        sx={{
          mt: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          maxHeight: 'calc(100vh - 200px)',
          overflow: 'auto',
          bgcolor: 'background.paper',
        }}
      >
        {loading ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              Loading history...
            </Typography>
          </Box>
        ) : history.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              No history yet. Operations will appear here.
            </Typography>
          </Box>
        ) : (
          history.map((entry) => (
            <LogEntry 
              key={entry.id} 
              entry={entry} 
              onUndo={onUndo}
              onRedo={onRedo}
            />
          ))
        )}
      </Box>
    </Box>
  );
}
