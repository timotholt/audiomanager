import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import SettingsDialog from './SettingsDialog.jsx';

export default function AppBarShell({ 
  themeMode, 
  onThemeModeChange, 
  fontSize, 
  onFontSizeChange,
  blankSpaceConversion,
  onBlankSpaceConversionChange,
  capitalizationConversion,
  onCapitalizationConversionChange
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <AppBar position="fixed" color="default" elevation={1} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar variant="dense" sx={{ minHeight: 40, py: 0.25 }}>
          <Typography variant="body1" sx={{ flexGrow: 1, fontWeight: 500, fontSize: '0.9rem' }} noWrap>
            VO Foundry
          </Typography>
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
