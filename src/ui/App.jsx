import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import AppBarShell from './components/AppBarShell.jsx';
import ProjectShell from './components/ProjectShell.jsx';

export default function App() {
  return (
    <>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <AppBarShell />
        <ProjectShell />
      </Box>
    </>
  );
}
