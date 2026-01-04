import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import SettingsIcon from '@mui/icons-material/Settings';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SettingsDialog from './SettingsDialog.jsx';
import ProjectSelector from './ProjectSelector.jsx';

export default function AppBarShell({
  themeMode,
  onThemeModeChange,
  fontSize,
  onFontSizeChange,
  blankSpaceConversion,
  onBlankSpaceConversionChange,
  capitalizationConversion,
  onCapitalizationConversionChange,
  currentProject,
  onProjectChange,
  onBackfillAll,
  backfillRunning
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <AppBar position="fixed" color="default" elevation={1} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar variant="dense" sx={{ minHeight: 40, py: 0.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Typography
              variant="body1"
              sx={{ fontWeight: 600, fontSize: '1rem', mr: 0.5, color: 'primary.main', display: 'flex', alignItems: 'center' }}
              noWrap
            >
              <span style={{ marginRight: '8px', fontSize: '1.2rem' }}>🐮</span>
              MOO
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontWeight: 400, fontSize: '0.7rem', color: 'text.disabled', mt: 0.5 }}
              noWrap
            >
              Media Output Organizer
            </Typography>
          </Box>
          <ProjectSelector
            currentProject={currentProject}
            onProjectChange={onProjectChange}
          />
          <Box sx={{ flexGrow: 1 }} />
          {/* Batch Operations */}
          {currentProject && (
            <Tooltip title="Generate takes for all incomplete cues to meet minimum candidates">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AutoFixHighIcon />}
                  onClick={onBackfillAll}
                  disabled={backfillRunning}
                  sx={{ mr: 1, fontSize: '0.75rem', py: 0.25 }}
                >
                  {backfillRunning ? 'Backfilling...' : 'Backfill All'}
                </Button>
              </span>
            </Tooltip>
          )}
          <IconButton
            size="small"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            sx={{ p: 0.5 }}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Toolbar>
      </AppBar>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        themeMode={themeMode}
        onThemeModeChange={onThemeModeChange}
        fontSize={fontSize}
        onFontSizeChange={onFontSizeChange}
        blankSpaceConversion={blankSpaceConversion}
        onBlankSpaceConversionChange={onBlankSpaceConversionChange}
        capitalizationConversion={capitalizationConversion}
        onCapitalizationConversionChange={onCapitalizationConversionChange}
      />
    </>
  );
}
