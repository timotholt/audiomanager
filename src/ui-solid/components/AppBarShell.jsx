import { createSignal } from 'solid-js';
import { AppBar, Toolbar, Typography, Box, Button, IconButton } from '@suid/material';
import SettingsIcon from '@suid/icons-material/Settings';
import AutoFixHighIcon from '@suid/icons-material/AutoFixHigh';
import SettingsDialog from './SettingsDialog.jsx';
import ProjectSelector from './ProjectSelector.jsx';

export default function AppBarShell(props) {
    const [settingsOpen, setSettingsOpen] = createSignal(false);

    return (
        <>
            <AppBar position="fixed" color="default" elevation={1} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar variant="dense" sx={{ minHeight: 40, py: 0.25 }}>
                    <Typography
                        variant="body1"
                        sx={{ fontWeight: 500, fontSize: '0.9rem', mr: 2, color: 'text.secondary' }}
                        noWrap
                    >
                        VO Foundry
                    </Typography>
                    <ProjectSelector
                        currentProject={props.currentProject}
                        onProjectChange={props.onProjectChange}
                    />
                    <Box sx={{ flexGrow: 1 }} />
                    {props.currentProject && (
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AutoFixHighIcon />}
                            onClick={props.onBackfillAll}
                            disabled={props.backfillRunning}
                            sx={{ mr: 1, fontSize: '0.75rem', py: 0.25 }}
                            title="Generate takes for all incomplete cues"
                        >
                            {props.backfillRunning ? 'Backfilling...' : 'Backfill All'}
                        </Button>
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
                open={settingsOpen()}
                onClose={() => setSettingsOpen(false)}
                themeMode={props.themeMode}
                onThemeModeChange={props.onThemeModeChange}
                fontSize={props.fontSize}
                onFontSizeChange={props.onFontSizeChange}
                blankSpaceConversion={props.blankSpaceConversion}
                onBlankSpaceConversionChange={props.onBlankSpaceConversionChange}
                capitalizationConversion={props.capitalizationConversion}
                onCapitalizationConversionChange={props.onCapitalizationConversionChange}
            />
        </>
    );
}
