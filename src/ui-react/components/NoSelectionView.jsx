import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { DESIGN_SYSTEM } from '../theme/designSystem.js';

export default function NoSelectionView({ error }) {
  return (
    <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, minWidth: 0 }}>
      <Typography variant="h6" sx={{ ...DESIGN_SYSTEM.typography.pageTitle, mb: 0.5 }}>
        Welcome to Audio Manager
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ ...DESIGN_SYSTEM.typography.body, mb: 0.5 }}>
        Select an item from the tree on the left to get started:
      </Typography>
      
      <Box sx={{ ml: 2, mb: 2 }}>
        <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
          • Defaults - Configure global provider settings
        </Typography>
        <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
          • Actors - View and manage individual actors
        </Typography>
      </Box>
      
      <Typography variant="body2" color="text.secondary">
        To create new actors or sections, first select "Actors" from the tree, then choose an existing actor to add sections to it.
      </Typography>
      
      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
