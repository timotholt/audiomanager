import React from 'react';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { DESIGN_SYSTEM } from '../theme/designSystem.js';

/**
 * Reusable complete/incomplete toggle button with consistent styling and tooltip
 * @param {boolean} isComplete - Whether the item is marked complete
 * @param {function} onToggle - Callback when button is clicked
 * @param {boolean} disabled - Whether the button is disabled
 * @param {string} itemType - Type of item (e.g., "section", "actor", "cue")
 * @param {number} approvedCount - For cues, the number of approved takes (optional)
 */
export default function CompleteButton({ 
  isComplete, 
  onToggle, 
  disabled = false,
  itemType = 'item',
  approvedCount = null,
  disabledReason = null,
}) {
  // For cues, require at least one approved take before marking complete
  const canMarkComplete = approvedCount === null || approvedCount > 0;
  const isDisabled = disabled || (!isComplete && !canMarkComplete);

  const getTooltipText = () => {
    if (isComplete) {
      return `Mark ${itemType} as incomplete`;
    }
    // If caller provided a specific reason for disabling, surface it
    if (!isComplete && disabledReason && isDisabled && canMarkComplete) {
      return disabledReason;
    }
    if (!canMarkComplete) {
      return 'At least one take must be approved before marking this cue complete';
    }
    return `Mark this ${itemType} as complete`;
  };

  return (
    <Tooltip 
      title={getTooltipText()}
      arrow
      placement="left"
    >
      <span>
        <Button
          variant={isComplete ? 'contained' : 'outlined'}
          size="small"
          color="success"
          disabled={isDisabled}
          onClick={onToggle}
          sx={{ 
            ...DESIGN_SYSTEM.typography.small,
            textTransform: 'none',
            fontWeight: 500,
            // Completed: solid green background, bright white text (like approved take)
            ...(isComplete && {
              color: 'common.white',
            }),
          }}
        >
          {isComplete ? 'completed ✓' : `mark ${itemType} as completed`}
        </Button>
      </span>
    </Tooltip>
  );
}
