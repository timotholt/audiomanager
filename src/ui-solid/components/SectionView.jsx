import { createSignal, Show } from 'solid-js';
import {
    Box, Typography, TextField, Stack, Button,
    Paper, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@suid/material';
import ExpandMore from '@suid/icons-material/ExpandMore';
import ExpandLess from '@suid/icons-material/ExpandLess';
import Collapse from './Collapse.jsx';
import DetailHeader from './DetailHeader.jsx';
import CompleteButton from './CompleteButton.jsx';
import ProviderSettingsEditor from './ProviderSettingsEditor.jsx';

export default function SectionView(props) {
    // props: sectionData, owner, contentType, operations (useDataOperations result)

    const [editingName, setEditingName] = createSignal(false);
    const [tempName, setTempName] = createSignal('');
    const [deleteDialogOpen, setDeleteDialogOpen] = createSignal(false);
    const [settingsExpanded, setSettingsExpanded] = createSignal(false);

    // Content creation state
    const [contentPrompt, setContentPrompt] = createSignal('');
    const [contentName, setContentName] = createSignal('');

    const handleStartEdit = () => {
        setTempName(props.sectionData.name || props.sectionData.content_type);
        setEditingName(true);
    };

    const handleSaveName = async () => {
        if (tempName() && tempName() !== props.sectionData.name) {
            await props.operations.updateSectionName(props.sectionData.id, tempName(), props.sectionData.name);
        }
        setEditingName(false);
    };

    const handleDeleteClick = () => {
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        setDeleteDialogOpen(false);
        if (props.operations.deleteSection) {
            await props.operations.deleteSection(props.sectionData.id);
        }
    };

    const handleToggleComplete = async () => {
        const newStatus = !props.sectionData.section_complete;
        await props.operations.toggleSectionComplete(props.sectionData.id, newStatus);
    };

    const handleCreateContent = async (e) => {
        e.preventDefault();
        if (!contentName()) return;

        props.operations.setContentName(contentName());
        props.operations.setContentPrompt(contentPrompt());

        await props.operations.createContent(
            props.sectionData.owner_id,
            props.sectionData.owner_type,
            props.contentType,
            props.sectionData.id
        );

        // Clear local form
        setContentName('');
        setContentPrompt('');
    };

    return (
        <Box>
            <DetailHeader
                title={props.sectionData.name || `${props.contentType} Section`}
                subtitle={`Section ID: ${props.sectionData.id}`}
                onEdit={handleStartEdit}
                onDelete={handleDeleteClick}
                rightActions={
                    <CompleteButton
                        isComplete={props.sectionData.section_complete}
                        onToggle={handleToggleComplete}
                        itemType="section"
                    />
                }
            />

            <Show when={editingName()}>
                <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>Rename Section</Typography>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            size="small"
                            fullWidth
                            value={tempName()}
                            onChange={(e) => setTempName(e.target.value)}
                            autoFocus
                        />
                        <Button variant="contained" onClick={handleSaveName}>Save</Button>
                        <Button onClick={() => setEditingName(false)}>Cancel</Button>
                    </Stack>
                </Box>
            </Show>

            <Stack spacing={3}>
                {/* Parent Owner Link */}
                <Box>
                    <Typography variant="overline" color="text.secondary">Parent {props.sectionData.owner_type}</Typography>
                    <Typography variant="body1">
                        {props.owner ? (props.owner.display_name || props.owner.name) : 'Global'}
                    </Typography>
                </Box>

                {/* Collapsible Provider Settings */}
                <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                    <Box
                        sx={{
                            p: 2,
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            bgcolor: 'action.hover'
                        }}
                        onClick={() => setSettingsExpanded(!settingsExpanded())}
                    >
                        <Typography variant="subtitle2">Provider Settings</Typography>
                        {settingsExpanded() ? <ExpandLess /> : <ExpandMore />}
                    </Box>
                    <Collapse in={settingsExpanded()}>
                        <Box sx={{ p: 2 }}>
                            <ProviderSettingsEditor
                                contentType={props.contentType}
                                settings={props.sectionData.default_blocks?.[props.contentType]}
                                voices={props.operations.voices()}
                                loadingVoices={props.operations.loadingVoices()}
                                allowInherit={true}
                                onSettingsChange={(settings) => props.operations.updateProviderSettings(props.sectionData.id, props.contentType, settings)}
                                error={props.operations.error()}
                            />
                        </Box>
                    </Collapse>
                </Paper>

                {/* Add Content Form */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Add Content to Section</Typography>
                    <Stack spacing={2} component="form" onSubmit={handleCreateContent}>
                        <TextField
                            label="Name (e.g., CUE_001)"
                            size="small"
                            fullWidth
                            value={contentName()}
                            onChange={(e) => setContentName(e.target.value)}
                            required
                        />
                        <TextField
                            label="Prompt/Text"
                            size="small"
                            fullWidth
                            multiline
                            rows={2}
                            value={contentPrompt()}
                            onChange={(e) => setContentPrompt(e.target.value)}
                        />
                        <Button
                            variant="contained"
                            type="submit"
                            disabled={props.operations.creatingContent() || !contentName()}
                        >
                            {props.operations.creatingContent() ? 'Creating...' : 'Add Content'}
                        </Button>
                    </Stack>
                </Paper>
            </Stack>

            <Dialog
                open={deleteDialogOpen()}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Delete Section?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this section?
                        This will delete all content and takes within this section.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
