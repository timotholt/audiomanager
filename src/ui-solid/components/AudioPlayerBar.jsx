import { Show } from 'solid-js';
import { Box, Typography } from '@suid/material';

export default function AudioPlayerBar(props) {
    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: 24, // Above StatusBar
                left: 0,
                right: 0,
                p: 1,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                zIndex: (theme) => theme.zIndex.drawer + 1,
                minHeight: 60
            }}
        >
            <Show
                when={props.currentTake}
                fallback={
                    <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', display: 'block' }}>
                        No audio loaded
                    </Typography>
                }
            >
                <Typography variant="caption">
                    Playing: {props.currentTake?.filename || 'Unknown'}
                </Typography>
            </Show>
        </Box>
    );
}
