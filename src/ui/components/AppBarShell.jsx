import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

export default function AppBarShell() {
  return (
    <AppBar position="fixed" color="default" elevation={1} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }} noWrap>
          VO Foundry
        </Typography>
        {/* TODO: project menu, global actions */}
      </Toolbar>
    </AppBar>
  );
}
