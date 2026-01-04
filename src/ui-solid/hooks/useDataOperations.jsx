import { createSignal } from 'solid-js';
import { updateActor, updateScene } from '../api/client.js';
import { useVoices } from './useVoices.jsx';
import { useSectionOperations } from './useSectionOperations.jsx';
import { useContentOperations } from './useContentOperations.jsx';

/**
 * Composite hook for data operations
 * Combines voices, section, and content operations into a single interface
 */
export function useDataOperations(props) {
    const [actorError, setActorError] = createSignal(null);

    // Compose smaller hooks
    const voiceOps = useVoices(props);

    const sectionOps = useSectionOperations(props);

    const contentOps = useContentOperations(props);

    // Actor-specific operations
    const updateActorField = async (actorId, fields) => {
        try {
            const result = await updateActor(actorId, fields);
            if (result && result.actor && props.onActorUpdated) {
                props.onActorUpdated(result.actor);
            }
        } catch (err) {
            setActorError(err.message || String(err));
        }
    };

    // Scene-specific operations
    const updateSceneField = async (sceneId, fields) => {
        try {
            const result = await updateScene(sceneId, fields);
            if (result && result.scene && props.onSceneUpdated) {
                props.onSceneUpdated(result.scene);
            }
        } catch (err) {
            setActorError(err.message || String(err));
        }
    };

    // Combine errors from all sources
    const error = () => actorError() || sectionOps.error() || contentOps.error() || voiceOps.voiceError();

    const setError = (err) => {
        setActorError(err);
        sectionOps.setError(err);
        contentOps.setError(err);
    };

    return {
        // State
        contentPrompt: contentOps.contentPrompt,
        contentName: contentOps.contentName,
        creatingContent: () => contentOps.creating() || sectionOps.creating(),
        voices: voiceOps.voices,
        loadingVoices: voiceOps.loadingVoices,
        error,
        setError,

        // Handlers
        setContentPrompt: contentOps.setContentPrompt,
        setContentName: contentOps.setContentName,
        createContent: contentOps.createContent,
        createSection: sectionOps.createSection,
        updateProviderSettings: sectionOps.updateProviderSettings,
        updateSectionName: sectionOps.updateSectionName,
        updateActorField,
        updateSceneField,
        toggleSectionComplete: sectionOps.toggleSectionComplete,
        deleteSection: sectionOps.deleteSection,
        deleteActor: props.deleteActor || (() => { }),
        deleteScene: props.deleteScene || (() => { }),

        // Expose voice loader for refresh if needed
        loadVoices: voiceOps.loadVoices
    };
}
