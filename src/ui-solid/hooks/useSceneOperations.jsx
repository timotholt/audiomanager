import { createSignal } from 'solid-js';
import { createScene, updateScene, deleteScene } from '../api/client.js';

export function useSceneOperations(props) {
    const [creating, setCreating] = createSignal(false);
    const [deleting, setDeleting] = createSignal(false);
    const [error, setError] = createSignal(null);

    const createSceneWithExpansion = async (sceneData) => {
        try {
            setCreating(true);
            setError(null);

            const result = await createScene(sceneData);

            if (result && result.scene && props.onSceneCreated) {
                props.onSceneCreated(result.scene);

                // Auto-expand Scenes to show the new scene
                if (props.expandNode) {
                    props.expandNode('scenes');
                }
            }

            return result;
        } catch (err) {
            setError(err.message || String(err));
            throw err;
        } finally {
            setCreating(false);
        }
    };

    const updateSceneData = async (sceneId, updates) => {
        try {
            setError(null);
            const result = await updateScene(sceneId, updates);
            if (result.scene && props.onSceneUpdated) {
                props.onSceneUpdated(result.scene);
            }
            return result;
        } catch (err) {
            setError(err.message || String(err));
            throw err;
        }
    };

    const deleteSceneById = async (sceneId, sceneName) => {
        try {
            setDeleting(true);
            setError(null);

            await deleteScene(sceneId);
            if (props.onSceneDeleted) {
                props.onSceneDeleted(sceneId);
            }
        } catch (err) {
            setError(err.message || String(err));
            throw err;
        } finally {
            setDeleting(false);
        }
    };

    return {
        creating,
        deleting,
        error,
        setError,
        createScene: createSceneWithExpansion,
        updateScene: updateSceneData,
        deleteScene: deleteSceneById
    };
}
