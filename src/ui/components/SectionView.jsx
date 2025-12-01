import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LockIcon from '@mui/icons-material/Lock';
import DeleteIcon from '@mui/icons-material/Delete';
import ProviderSettingsEditor from './ProviderSettingsEditor.jsx';
import { DESIGN_SYSTEM } from '../theme/designSystem.js';

// Helper to convert content type to title case
function toTitleCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function SectionView({ 
  sectionData,
  actor,
  contentType,
  voices,
  loadingVoices,
  contentPrompt,
  contentCueId,
  creatingContent,
  onContentPromptChange,
  onContentCueIdChange,
  onCreateContent,
  onUpdateSectionName,
  onUpdateProviderSettings,
  sectionComplete,
  onToggleSectionComplete,
  onDeleteSection,
  error
}) {
  const [editingSectionName, setEditingSectionName] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [suffix, setSuffix] = useState(sectionData?.suffix || contentType);

  const currentSectionName = sectionData?.name || toTitleCase(contentType);
  
  // Build the base filename: actor_base_filename + suffix
  const baseFilename = `${actor.base_filename}_${suffix}`;
  // Settings are now per-section, not per-actor
  const providerSettings = sectionData?.provider_settings || { provider: 'inherit' };

  const handleSaveSectionName = () => {
    const newName = sectionName || currentSectionName;
    if (newName !== currentSectionName) {
      onUpdateSectionName(sectionData.id, newName, currentSectionName);
    }
    setEditingSectionName(false);
    setSectionName('');
  };

  const handleCancelEditSectionName = () => {
    setEditingSectionName(false);
    setSectionName('');
  };

  const handleStartEditSectionName = () => {
    setEditingSectionName(true);
    setSectionName(currentSectionName);
  };

  return (
    <Box sx={{ flexGrow: 1, overflow: 'auto', p: DESIGN_SYSTEM.spacing.containerPadding, minWidth: 0 }}>
      {/* Editable Section Name Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        {editingSectionName ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <TextField
              size="small"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder={currentSectionName}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSaveSectionName();
                }
              }}
              sx={DESIGN_SYSTEM.components.formControl}
            />
            <Button
              size="small"
              variant="contained"
              onClick={handleSaveSectionName}
            >
              Save
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={handleCancelEditSectionName}
            >
              Cancel
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={DESIGN_SYSTEM.typography.pageTitle}>
              {currentSectionName}
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={handleStartEditSectionName}
              sx={DESIGN_SYSTEM.typography.small}
            >
              Edit Name
            </Button>
          </Box>
        )}
        <IconButton
          size="small"
          color="error"
          onClick={() => setConfirmDeleteOpen(true)}
          title="Delete section"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={DESIGN_SYSTEM.typography.body}>
          Actor: {actor.display_name} • Type: {toTitleCase(contentType)}
        </Typography>
        <Tooltip 
          title={sectionComplete ? "Mark section as incomplete" : "Mark this section as complete"}
          arrow
          placement="left"
        >
          <span>
            <Button
              variant={sectionComplete ? 'outlined' : 'contained'}
              size="small"
              color={sectionComplete ? 'success' : 'primary'}
              onClick={() => onToggleSectionComplete && onToggleSectionComplete(sectionData.id, !sectionComplete)}
              sx={{ ...DESIGN_SYSTEM.typography.small }}
            >
              {sectionComplete ? 'Completed ✓' : 'Mark Section As Completed'}
            </Button>
          </span>
        </Tooltip>
      </Box>


      {/* Settings - collapsible with Provider and Filename subgroups */}
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Box 
          sx={{ 
            p: 1, 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            '&:hover': { bgcolor: 'action.hover' }
          }}
          onClick={() => setSettingsExpanded(!settingsExpanded)}
        >
          <Typography variant="body2" sx={{ fontSize: '1rem', fontWeight: 400 }}>
            Settings
          </Typography>
          {settingsExpanded ? <ExpandLess sx={{ fontSize: '1rem' }} /> : <ExpandMore sx={{ fontSize: '1rem' }} />}
        </Box>
        
        <Collapse in={settingsExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ p: 2, pt: 0 }}>
            {/* Provider subgroup */}
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, mt: 1 }}>
              Provider
            </Typography>
            <Box sx={{ pl: 1, mb: 2 }}>
              <ProviderSettingsEditor
                contentType={contentType}
                settings={providerSettings}
                voices={voices}
                loadingVoices={loadingVoices}
                onSettingsChange={(newSettings) => {
                  onUpdateProviderSettings(sectionData.id, newSettings);
                }}
                allowInherit={true}
              />
            </Box>

            {/* Filename subgroup */}
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
              Filename
            </Typography>
            <Box sx={{ pl: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  size="small"
                  label="Suffix"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  sx={{ width: 150, ...DESIGN_SYSTEM.components.formControl }}
                />
                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                  Base: <strong>{baseFilename}</strong>
                </Typography>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* Add content section */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom sx={DESIGN_SYSTEM.typography.sectionTitle}>
          Add New {toTitleCase(contentType)} Content
        </Typography>
        <TextField
          fullWidth
          size="small"
          label="Cue IDs (comma-separated)"
          placeholder="Hi, Yes, No, My name is"
          value={contentCueId}
          onChange={onContentCueIdChange}
          required
          sx={{ mb: DESIGN_SYSTEM.spacing.tightGap, ...DESIGN_SYSTEM.components.formControl }}
        />
        <TextField
          fullWidth
          size="small"
          multiline
          rows={3}
          label={`${toTitleCase(contentType)} Prompt (optional)`}
          placeholder={`${contentType} prompt or description`}
          value={contentPrompt}
          onChange={onContentPromptChange}
          sx={{ mb: DESIGN_SYSTEM.spacing.elementGap, ...DESIGN_SYSTEM.components.formControl }}
        />
        <Button
          variant="contained"
          size="small"
          disabled={!contentCueId.trim() || creatingContent}
          onClick={() => onCreateContent(sectionData.actor_id, sectionData.content_type, sectionData.id)}
        >
          {creatingContent ? 'Creating…' : `Add ${toTitleCase(contentType)} Content`}
        </Button>
      </Box>

      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}

      {/* Delete Section Confirmation Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle>Delete section?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will remove this section and all of its content and takes. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>
            Cancel
          </Button>
          <Button 
            color="error" 
            onClick={() => {
              setConfirmDeleteOpen(false);
              onDeleteSection && onDeleteSection();
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
