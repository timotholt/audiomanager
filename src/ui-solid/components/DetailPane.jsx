import { Show, Switch, Match, createMemo } from 'solid-js';
import { Box, Typography, Paper } from '@suid/material';
import { useApp } from '../contexts/AppContext.jsx';

export default function DetailPane(props) {
    const app = useApp();

    const selectedData = createMemo(() => {
        if (!props.selectedNode) return null;

        const { type, id } = props.selectedNode;

        switch (type) {
            case 'actor':
                return { type, data: props.actors.find(a => a.id === id) };
            case 'content':
                return { type, data: props.content.find(c => c.id === id) };
            case 'dialogue-section':
            case 'music-section':
            case 'sfx-section':
                return { type: 'section', data: props.sections.find(s => s.id === id) };
            case 'console':
                return { type: 'console', data: props.consoleEntries };
            case 'history':
                return { type: 'history', data: props.logs };
            case 'provider-default':
                return { type: 'provider-default', contentType: id };
            case 'defaults':
                return { type: 'defaults', data: null };
            case 'root':
                return { type: 'root', data: null };
            default:
                return null;
        }
    });

    return (
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, minWidth: 0 }}>
            <Show
                when={selectedData()}
                fallback={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography color="text.secondary">
                            Select an item from the tree to view details.
                        </Typography>
                    </Box>
                }
            >
                <Switch>
                    <Match when={selectedData().type === 'actor'}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h5" gutterBottom>
                                Actor: {selectedData().data?.display_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                ID: {selectedData().data?.id}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Base Filename:</strong> {selectedData().data?.base_filename || 'N/A'}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Voice ID:</strong> {selectedData().data?.voice_id || 'N/A'}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Complete:</strong> {selectedData().data?.actor_complete ? 'Yes' : 'No'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                Full actor editing UI will be added in next iteration
                            </Typography>
                        </Paper>
                    </Match>

                    <Match when={selectedData().type === 'section'}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h5" gutterBottom>
                                Section: {selectedData().data?.name || selectedData().data?.content_type}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Type: {selectedData().data?.content_type}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Actor ID:</strong> {selectedData().data?.actor_id}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Complete:</strong> {selectedData().data?.section_complete ? 'Yes' : 'No'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                Full section editing UI will be added in next iteration
                            </Typography>
                        </Paper>
                    </Match>

                    <Match when={selectedData().type === 'content'}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h5" gutterBottom>
                                Content: {selectedData().data?.cue_id}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Type: {selectedData().data?.content_type}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                <strong>Text:</strong> {selectedData().data?.text || 'N/A'}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>All Approved:</strong> {selectedData().data?.all_approved ? 'Yes' : 'No'}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                <strong>Takes:</strong> {props.takes.filter(t => t.content_id === selectedData().data?.id).length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                Full content editing and take management UI will be added in next iteration
                            </Typography>
                        </Paper>
                    </Match>

                    <Match when={selectedData().type === 'console'}>
                        <Paper sx={{ p: 2, maxHeight: '80vh', overflow: 'auto' }}>
                            <Typography variant="h5" gutterBottom>
                                Browser Console
                            </Typography>
                            <Box component="pre" sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                <Show
                                    when={props.consoleEntries && props.consoleEntries.length > 0}
                                    fallback={<Typography color="text.secondary">No console entries</Typography>}
                                >
                                    {props.consoleEntries.map((entry, i) => (
                                        <Box key={i} sx={{ mb: 0.5, color: entry.level === 'error' ? 'error.main' : entry.level === 'warn' ? 'warning.main' : 'text.primary' }}>
                                            [{entry.level}] {entry.message}
                                        </Box>
                                    ))}
                                </Show>
                            </Box>
                        </Paper>
                    </Match>

                    <Match when={selectedData().type === 'history'}>
                        <Paper sx={{ p: 2, maxHeight: '80vh', overflow: 'auto' }}>
                            <Typography variant="h5" gutterBottom>
                                History
                            </Typography>
                            <Box sx={{ fontSize: '0.875rem' }}>
                                <Show
                                    when={props.logs && props.logs.length > 0}
                                    fallback={<Typography color="text.secondary">No history entries</Typography>}
                                >
                                    {props.logs.map((log, i) => (
                                        <Box key={i} sx={{ mb: 1, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: log.type === 'error' ? 'error.main' : log.type === 'success' ? 'success.main' : 'text.primary' }}>
                                                {log.message}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Show>
                            </Box>
                        </Paper>
                    </Match>

                    <Match when={selectedData().type === 'provider-default'}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h5" gutterBottom>
                                Provider Defaults: {selectedData().contentType}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Configure default settings for {selectedData().contentType} content type.
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                Provider defaults UI will be added in next iteration
                            </Typography>
                        </Paper>
                    </Match>

                    <Match when={selectedData().type === 'defaults'}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h5" gutterBottom>
                                Defaults
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Configure default provider settings for all content types.
                            </Typography>
                        </Paper>
                    </Match>

                    <Match when={selectedData().type === 'root'}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h5" gutterBottom>
                                Project Overview
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                <strong>Actors:</strong> {props.actors.length}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                <strong>Sections:</strong> {props.sections.length}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                <strong>Content Items:</strong> {props.content.length}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                <strong>Takes:</strong> {props.takes.length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                Actor creation and project management UI will be added in next iteration
                            </Typography>
                        </Paper>
                    </Match>
                </Switch>
            </Show>
        </Box>
    );
}
