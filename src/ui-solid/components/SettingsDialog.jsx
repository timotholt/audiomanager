import { createSignal, Show } from 'solid-js';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
    Typography, FormControl, InputLabel, Select, MenuItem, ButtonGroup
} from '@suid/material';
import { DESIGN_SYSTEM } from '../theme/designSystem.js';

export default function SettingsDialog(props) {
    const [activeTab, setActiveTab] = createSignal('theme');

    return (
        <Dialog
            open={props.open}
            onClose={props.onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: { maxHeight: '90vh' }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>Settings</DialogTitle>
            <DialogContent sx={{ overflowY: 'scroll' }}>
                {/* Tab Buttons */}
                <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <ButtonGroup variant="text" fullWidth>
                        <Button
                            onClick={() => setActiveTab('theme')}
                            sx={{
                                borderBottom: activeTab() === 'theme' ? 2 : 0,
                                borderColor: 'primary.main',
                                borderRadius: 0
                            }}
                        >
                            Theme
                        </Button>
                        <Button
                            onClick={() => setActiveTab('filename')}
                            sx={{
                                borderBottom: activeTab() === 'filename' ? 2 : 0,
                                borderColor: 'primary.main',
                                borderRadius: 0
                            }}
                        >
                            Filename
                        </Button>
                    </ButtonGroup>
                </Box>

                {/* Theme Tab */}
                <Show when={activeTab() === 'theme'}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl size="small" fullWidth sx={DESIGN_SYSTEM.components.formControl}>
                            <InputLabel>Theme Mode</InputLabel>
                            <Select
                                value={props.themeMode}
                                label="Theme Mode"
                                onChange={(e) => props.onThemeModeChange(e.target.value)}
                            >
                                <MenuItem value="light">Light</MenuItem>
                                <MenuItem value="dark">Dark</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" fullWidth sx={DESIGN_SYSTEM.components.formControl}>
                            <InputLabel>Font Size</InputLabel>
                            <Select
                                value={props.fontSize}
                                label="Font Size"
                                onChange={(e) => props.onFontSizeChange(e.target.value)}
                            >
                                <MenuItem value="small">Small</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="large">Large</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Show>

                {/* Filename Tab */}
                <Show when={activeTab() === 'filename'}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl size="small" fullWidth sx={DESIGN_SYSTEM.components.formControl}>
                            <InputLabel>Blank Space Conversion</InputLabel>
                            <Select
                                value={props.blankSpaceConversion || 'underscore'}
                                label="Blank Space Conversion"
                                onChange={(e) => props.onBlankSpaceConversionChange(e.target.value)}
                            >
                                <MenuItem value="underscore">Convert blank spaces to underscores (recommended)</MenuItem>
                                <MenuItem value="delete">Delete blank spaces from filenames</MenuItem>
                                <MenuItem value="keep">Leave blank spaces</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" fullWidth sx={DESIGN_SYSTEM.components.formControl}>
                            <InputLabel>Capitalization Conversion</InputLabel>
                            <Select
                                value={props.capitalizationConversion || 'lowercase'}
                                label="Capitalization Conversion"
                                onChange={(e) => props.onCapitalizationConversionChange(e.target.value)}
                            >
                                <MenuItem value="lowercase">Convert to lower case (recommended)</MenuItem>
                                <MenuItem value="keep">Leave capitals as is</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Show>
            </DialogContent>
            <DialogActions>
                <Button onClick={props.onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
