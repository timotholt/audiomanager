import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Divider from '@mui/material/Divider';
import { DESIGN_SYSTEM } from '../theme/designSystem.js';

/**
 * Unified header component for all detail panes
 * 
 * Layout:
 * - Line 1: Title (large) with Edit/Delete buttons on the right
 * - Line 2: Subtitle (tiny, tight spacing) - e.g., "actor: may • type: dialog"
 * - Horizontal divider
 */
export default function DetailHeader({
  title,
  subtitle,
  onEdit,
  onDelete,
  editDisabled = false,
  deleteDisabled = false,
  editTooltip = 'Edit',
  deleteTooltip = 'Delete',
  rightActions = null, // Additional actions (like CompleteButton) to show before delete
}) {
  return (
    <Box sx={{ mb: 2 }}>
      {/* Title row with action buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              ...DESIGN_SYSTEM.typography.pageTitle,
              fontSize: '1.25rem',
              fontWeight: 500,
              lineHeight: 1.2,
              color: 'common.white',
            }}
          >
            {title}
          </Typography>
          {onEdit && (
            <IconButton
              size="small"
              onClick={onEdit}
              disabled={editDisabled}
              title={editTooltip}
              sx={{ 
                p: 0.25,
                color: 'text.disabled',
                '&:hover': {
                  color: 'text.secondary',
                }
              }}
            >
              <EditIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {rightActions}
          {onDelete && (
            <IconButton
              size="small"
              color="error"
              onClick={onDelete}
              disabled={deleteDisabled}
              title={deleteTooltip}
              sx={{ p: 0.5 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Subtitle row - tight spacing */}
      {subtitle && (
        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{ 
            fontSize: '0.7rem',
            lineHeight: 1.0,
            display: 'block',
            mb: 1,
          }}
        >
          {subtitle}
        </Typography>
      )}

      {/* Divider */}
      <Divider sx={{ mt: 1 }} />
    </Box>
  );
}
