import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { DESIGN_SYSTEM } from '../../theme/designSystem.js';

export default function RootView({ actorOps, error }) {
  const [actorName, setActorName] = useState('');

  return (
    <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, minWidth: 0 }}>
      <Typography variant="h6" sx={{ ...DESIGN_SYSTEM.typography.pageTitle, mb: 0.5 }}>
        Actors
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ ...DESIGN_SYSTEM.typography.body, mb: 0.5 }}>
        Manage voice actors and their content.
      </Typography>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Add New Actor
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Actor name"
          value={actorName}
          onChange={(e) => setActorName(e.target.value)}
          sx={{ mb: 2 }}
        />
        
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button
            variant="contained"
            size="small"
            disabled={!actorName.trim() || actorOps.creating}
            onClick={() => actorOps.createActor({ display_name: actorName || 'New Actor' }).then(() => setActorName(''))}
          >
            {actorOps.creating ? 'Creating…' : 'Add Actors'}
          </Button>
        </Stack>
      </Box>

      {(error || actorOps.error) && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error || actorOps.error}
        </Typography>
      )}
    </Box>
  );
}
