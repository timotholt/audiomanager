import { createSignal, Show } from 'solid-js';
import {
    Box, Typography, TextField, Stack,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button
} from '@suid/material';
import DetailHeader from '../DetailHeader.jsx';
import CompleteButton from '../CompleteButton.jsx';
import SectionManagement from '../SectionManagement.jsx';
import ProviderSettingsEditor from '../ProviderSettingsEditor.jsx';

export default function SceneView(props) {
    // props: scene, sections, operations (useDataOperations result)

    const [editingName, setEditingName] = createSignal(false);
    const [tempName, setTempName] = createSignal('');
    const [deleteDialogOpen, setDeleteDialogOpen] = createSignal(false);

    const handleStartEdit = () => {
        setTempName(props.scene.name);
        setEditingName(true);
    };

    const handleSaveName = async () => {
        if (tempName() && tempName() !== props.scene.name) {
            await props.operations.updateSceneField(props.scene.id, { name: tempName() });
        }
        setEditingName(false);
    };

    const handleCancelEdit = () => {
        setEditingName(false);
    };

    const handleDeleteClick = () => {
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        setDeleteDialogOpen(false);
        await props.operations.deleteScene(props.scene.id, props.scene.name);
    };

    const handleToggleComplete = async () => {
        const newStatus = !props.scene.scene_complete;
        await props.operations.updateSceneField(props.scene.id, { scene_complete: newStatus });
    };

    return (
        <Box>
            <DetailHeader
                title={props.scene.name}
                subtitle={`Scene ID: ${props.scene.id}`}
                onEdit={handleStartEdit}
                onDelete={handleDeleteClick}
                rightActions={
                    <CompleteButton
                        isComplete={props.scene.scene_complete}
                        onToggle={handleToggleComplete}
                        itemType="scene"
                    />
                }
            />

            {/* Inline Name Edit */}
            <Show when={editingName()}>
                <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>Rename Scene</Typography>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            size="small"
                            fullWidth
                            value={tempName()}
                            onChange={(e) => setTempName(e.target.value)}
                            autoFocus
                        />
                        <Button variant="contained" onClick={handleSaveName}>Save</Button>
                        <Button onClick={handleCancelEdit}>Cancel</Button>
                    </Stack>
                </Box>
            </Show>

            <Stack spacing={3}>
                {/* Default Blocks */}
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                    <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                        <Typography variant="subtitle2">Default Settings</Typography>
                    </Box>
                    <Box sx={{ p: 2 }}>
                        <ProviderSettingsEditor
                            contentType="music" // Scenes often have music or sfx defaults
                            settings={props.scene.default_blocks?.music}
                            voices={props.operations.voices()}
                            loadingVoices={props.operations.loadingVoices()}
                            allowInherit={true}
                            onSettingsChange={(settings) => {
                                const current = props.scene.default_blocks || {};
                                props.operations.updateSceneField(props.scene.id, {
                                    default_blocks: { ...current, music: settings }
                                });
                            }}
                        />
                    </Box>
                </Box>

                {/* Section Management */}
                <SectionManagement
                    owner={props.scene}
                    ownerType="scene"
                    sections={props.sections}
                    onCreateSection={props.operations.createSection}
                    creatingContent={props.operations.creatingContent()}
                />
            </Stack>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen()}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Delete Scene?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete <strong>{props.scene.name}</strong>?
                        This will delete all sections, content, and takes associated with this scene.
                        This action cannot be undone.
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
