import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';

export default function ProviderSettingsEditor({ 
  contentType,
  settings,
  voices,
  loadingVoices,
  onSettingsChange,
  isDefault = false,
  error 
}) {
  const handleChange = (key, value) => {
    if (onSettingsChange) {
      onSettingsChange({ ...settings, [key]: value });
    }
  };

  const currentSettings = settings || {
    provider: 'elevenlabs',
    batch_generate: 1,
    approval_count_default: 1,
    stability: contentType === 'dialogue' ? 0.5 : undefined,
    similarity_boost: contentType === 'dialogue' ? 0.75 : undefined
  };

  return (
    <Stack spacing={2}>
      {/* Provider Selection */}
      <FormControl size="small" fullWidth>
        <InputLabel>{isDefault ? 'Default Provider' : 'Provider'}</InputLabel>
        <Select
          value={currentSettings.provider || 'elevenlabs'}
          label={isDefault ? 'Default Provider' : 'Provider'}
          onChange={(e) => handleChange('provider', e.target.value)}
        >
          <MenuItem value="elevenlabs">ElevenLabs</MenuItem>
          <MenuItem value="manual">Manual</MenuItem>
        </Select>
      </FormControl>

      {/* ElevenLabs Settings */}
      {currentSettings.provider === 'elevenlabs' && (
        <>
          {/* Voice selection only for dialogue */}
          {contentType === 'dialogue' && (
            <FormControl size="small" fullWidth>
              <InputLabel>{isDefault ? 'Default Voice' : 'Voice'}</InputLabel>
              <Select
                value={currentSettings.voice_id || ''}
                label={isDefault ? 'Default Voice' : 'Voice'}
                onChange={(e) => handleChange('voice_id', e.target.value)}
                disabled={loadingVoices}
              >
                {voices.map((voice) => (
                  <MenuItem key={voice.voice_id} value={voice.voice_id}>
                    {voice.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            size="small"
            label={isDefault ? 'Default Batch Generate' : 'Batch Generate'}
            type="number"
            value={currentSettings.batch_generate || 1}
            onChange={(e) => handleChange('batch_generate', parseInt(e.target.value) || 1)}
            inputProps={{ min: 1, max: 10 }}
            sx={{ width: isDefault ? 200 : 120 }}
          />

          <TextField
            size="small"
            label={isDefault ? 'Default Approval Count' : 'Approval Count'}
            type="number"
            value={currentSettings.approval_count_default || 1}
            onChange={(e) => handleChange('approval_count_default', parseInt(e.target.value) || 1)}
            inputProps={{ min: 1, max: 5 }}
            sx={{ width: isDefault ? 200 : 120 }}
          />

          {/* Dialogue-specific settings */}
          {contentType === 'dialogue' && (
            <>
              <Box>
                <Typography variant="body2" gutterBottom>
                  {isDefault ? 'Default Stability' : 'Stability'}: {currentSettings.stability || 0.5}
                </Typography>
                <Slider
                  value={currentSettings.stability || 0.5}
                  onChange={(e, value) => handleChange('stability', value)}
                  min={0}
                  max={1}
                  step={0.1}
                  size="small"
                />
              </Box>
              
              <Box>
                <Typography variant="body2" gutterBottom>
                  {isDefault ? 'Default Similarity Boost' : 'Similarity Boost'}: {currentSettings.similarity_boost || 0.75}
                </Typography>
                <Slider
                  value={currentSettings.similarity_boost || 0.75}
                  onChange={(e, value) => handleChange('similarity_boost', value)}
                  min={0}
                  max={1}
                  step={0.05}
                  size="small"
                />
              </Box>
            </>
          )}
        </>
      )}

      {error && (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      )}
    </Stack>
  );
}
