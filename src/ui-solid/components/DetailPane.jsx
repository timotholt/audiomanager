import { createMemo, Show, Switch, Match } from 'solid-js';
import { Box, Typography } from '@suid/material';
import NoSelectionView from './NoSelectionView.jsx';
import SectionView from './SectionView.jsx';
import ContentView from './ContentView.jsx';
import ProviderDefaultsView from './ProviderDefaultsView.jsx';
import ActorView from './views/ActorView.jsx';
import SceneView from './views/SceneView.jsx';
import RootView from './views/RootView.jsx';
import DefaultsView from './views/DefaultsView.jsx';
import HistoryView from './HistoryView.jsx';
import BrowserConsoleView from './BrowserConsoleView.jsx';
import ViewConfigView from './ViewConfigView.jsx';
import GroupView from './views/GroupView.jsx';
import { PRESET_VIEWS } from '../utils/viewEngine.js';
import { useActorOperations } from '../hooks/useActorOperations.jsx';
import { useSceneOperations } from '../hooks/useSceneOperations.jsx';
import { useDataOperations } from '../hooks/useDataOperations.jsx';

export default function DetailPane(props) {
    const actorOps = useActorOperations({
        onActorCreated: props.onRefresh,
        onActorUpdated: props.onRefresh,
        onActorDeleted: props.onRefresh,
        expandNode: props.onExpandNode
    });

    const sceneOps = useSceneOperations({
        onSceneCreated: props.onRefresh,
        onSceneUpdated: props.onRefresh,
        onSceneDeleted: props.onRefresh,
        expandNode: props.onExpandNode
    });

    const dataOps = useDataOperations({
        actors: props.actors,
        sections: props.sections,
        scenes: props.scenes,
        selectedNode: props.selectedNode,
        expandNode: props.onExpandNode,
        onContentCreated: props.onRefresh,
        onSectionCreated: props.onRefresh,
        onActorUpdated: props.onRefresh,
        onSectionUpdated: props.onRefresh,
        onSectionDeleted: props.onRefresh,
        onSceneUpdated: props.onRefresh,
        deleteActor: actorOps.deleteActor,
        deleteScene: sceneOps.deleteScene
    });

    const viewData = createMemo(() => {
        if (!props.selectedNode) return { view: 'welcome' };

        const { type, id } = props.selectedNode;

        switch (type) {
            case 'root':
                return { view: 'root' };
            case 'defaults':
                return { view: 'defaults' };
            case 'provider-default':
                return { view: 'provider-default', contentType: id };
            case 'console':
                return { view: 'console' };
            case 'history':
                return { view: 'history' };
            case 'actor': {
                const actor = props.actors.find(a => a.id === id);
                return { view: 'actor', actor };
            }
            case 'scene': {
                const scene = props.scenes.find(s => s.id === id);
                return { view: 'scene', scene };
            }
            case 'section': {
                const section = props.sections.find(s => s.id === id);
                let owner = null;
                if (section?.owner_type === 'actor') owner = props.actors.find(a => a.id === section.owner_id);
                else if (section?.owner_type === 'scene') owner = props.scenes.find(s => s.id === section.owner_id);
                return { view: 'section', section, owner, contentType: section?.content_type };
            }
            case 'content': {
                const item = props.content.find(c => c.id === id);
                let owner = null;
                if (item?.owner_type === 'actor') owner = props.actors.find(a => a.id === item.owner_id);
                else if (item?.owner_type === 'scene') owner = props.scenes.find(s => s.id === item.owner_id);
                return { view: 'content', item, owner };
            }
            case 'take': {
                const take = props.takes.find(t => t.id === id);
                const item = props.content.find(c => c.id === take?.content_id);
                let owner = null;
                if (item?.owner_type === 'actor') owner = props.actors.find(a => a.id === item.owner_id);
                else if (item?.owner_type === 'scene') owner = props.scenes.find(s => s.id === item.owner_id);
                return { view: 'content', item, owner };
            }
            case 'view-config': {
                const view = props.customViews.find(v => v.id === id) || PRESET_VIEWS[id];
                return { view: 'view-config', viewData: view };
            }
            case 'view-group': {
                // If it's a known entity group, redirect to that entity's view
                if (props.selectedNode.field === 'owner_id' || props.selectedNode.field === 'actor_id') {
                    const actor = props.actors.find(a => a.id === props.selectedNode.fieldValue);
                    if (actor) return { view: 'actor', actor };
                    const scene = props.scenes.find(s => s.id === props.selectedNode.fieldValue);
                    if (scene) return { view: 'scene', scene };
                }
                if (props.selectedNode.field === 'scene_id') {
                    const scene = props.scenes.find(s => s.id === props.selectedNode.fieldValue);
                    if (scene) return { view: 'scene', scene };
                }
                if (props.selectedNode.field === 'section_id') {
                    const section = props.sections.find(s => s.id === props.selectedNode.fieldValue);
                    if (section) {
                        let owner = null;
                        if (section.owner_type === 'actor') owner = props.actors.find(a => a.id === section.owner_id);
                        else if (section.owner_type === 'scene') owner = props.scenes.find(s => s.id === section.owner_id);
                        return { view: 'section', section, owner, contentType: section.content_type };
                    }
                }
                return { view: 'view-group', id };
            }
            default:
                return { view: 'welcome' };
        }
    });

    const commonError = () => dataOps.error() || actorOps.error() || sceneOps.error();

    return (
        <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
            <Switch fallback={
                <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography color="text.secondary">Select an item to view details.</Typography>
                </Box>
            }>
                <Match when={viewData().view === 'welcome'}>
                    <NoSelectionView error={commonError()} />
                </Match>

                <Match when={viewData().view === 'root'}>
                    <RootView actorOps={actorOps} sceneOps={sceneOps} error={commonError()} />
                </Match>

                <Match when={viewData().view === 'defaults'}>
                    <DefaultsView />
                </Match>

                <Match when={viewData().view === 'console'}>
                    <BrowserConsoleView
                        entries={props.consoleEntries}
                        onClear={props.onClearConsole}
                    />
                </Match>

                <Match when={viewData().view === 'history'}>
                    <HistoryView
                        logs={props.logs}
                        undoRedo={props.undoRedo}
                        onClearLogs={props.onClearLogs}
                    />
                </Match>

                <Match when={viewData().view === 'provider-default'}>
                    <ProviderDefaultsView
                        contentType={viewData().contentType}
                        voices={dataOps.voices}
                        loadingVoices={dataOps.loadingVoices}
                        error={commonError()}
                    />
                </Match>

                <Match when={viewData().view === 'actor'}>
                    <ActorView
                        actor={viewData().actor}
                        sections={props.sections}
                        operations={dataOps}
                    />
                </Match>

                <Match when={viewData().view === 'scene'}>
                    <SceneView
                        scene={viewData().scene}
                        sections={props.sections}
                        operations={dataOps}
                    />
                </Match>

                <Match when={viewData().view === 'section'}>
                    <SectionView
                        sectionData={viewData().section}
                        owner={viewData().owner}
                        contentType={viewData().contentType}
                        operations={dataOps}
                    />
                </Match>

                <Match when={viewData().view === 'content'}>
                    <ContentView
                        item={viewData().item}
                        owner={viewData().owner}
                        sections={props.sections}
                        allTakes={props.takes}
                        onContentUpdated={props.onRefresh}
                        onSectionUpdated={props.onRefresh}
                        onActorUpdated={props.onRefresh}
                        onContentDeleted={props.onRefresh}
                        onTakesGenerated={props.onRefresh}
                        onTakeUpdated={props.onRefresh}
                        blankSpaceConversion={props.blankSpaceConversion}
                        capitalizationConversion={props.capitalizationConversion}
                        operations={dataOps}
                        error={commonError()}
                    />
                </Match>
                <Match when={viewData().view === 'view-config'}>
                    <ViewConfigView
                        view={viewData().viewData}
                        onUpdate={(updated) => {
                            const next = props.customViews.some(v => v.id === updated.id)
                                ? props.customViews.map(v => v.id === updated.id ? updated : v)
                                : [...props.customViews, updated];
                            props.onCustomViewsChange(next);
                        }}
                        onDelete={() => {
                            const next = props.customViews.filter(v => v.id !== viewData().viewData.id);
                            props.onCustomViewsChange(next);
                        }}
                    />
                </Match>
                <Match when={viewData().view === 'view-group'}>
                    <GroupView
                        groupNode={props.selectedNode}
                        data={{
                            actors: props.actors,
                            sections: props.sections,
                            scenes: props.scenes || [],
                            content: props.content,
                            takes: props.takes
                        }}
                        operations={dataOps}
                    />
                </Match>
            </Switch>
        </Box>
    );
}
