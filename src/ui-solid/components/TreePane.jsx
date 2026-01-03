import { createSignal, createEffect, For, Show } from 'solid-js';
import {
    Box, Typography, List, ListItemButton, ListItemText, ListItemIcon
} from '@suid/material';
import ExpandLessIcon from '@suid/icons-material/ExpandLess';
import ExpandMoreIcon from '@suid/icons-material/ExpandMore';
import PersonIcon from '@suid/icons-material/Person';
import SettingsIcon from '@suid/icons-material/Settings';
import RecordVoiceOverIcon from '@suid/icons-material/RecordVoiceOver';
import MusicNoteIcon from '@suid/icons-material/MusicNote';
import GraphicEqIcon from '@suid/icons-material/GraphicEq';
import TerminalIcon from '@suid/icons-material/Terminal';
import HistoryIcon from '@suid/icons-material/History';
import ViewListIcon from '@suid/icons-material/ViewList';
import { DESIGN_SYSTEM } from '../theme/designSystem.js';

function nodeKey(type, id) {
    return `${type}:${id}`;
}

// Status priority: red (3) > yellow (2) > gray (1) > green (0)
const STATUS_PRIORITY = { green: 0, gray: 1, yellow: 2, red: 3 };

// Get CSS class name for status color
function getStatusClass(color) {
    const classMap = {
        'success.main': 'status-green',
        'error.main': 'status-red',
        'warning.main': 'status-yellow',
        'text.disabled': 'status-gray',
        'text.secondary': 'status-white',
    };
    return classMap[color] || 'status-default';
}

function getContentStatus(content, takes = []) {
    const contentTakes = takes.filter(t => t.content_id === content.id);
    const approvedCount = contentTakes.filter(t => t.status === 'approved').length;
    const hasTakes = contentTakes.length > 0;

    // GREEN: all_approved flag is set
    if (content.all_approved) {
        return { status: 'green', color: 'success.main', approvedCount };
    }

    // GRAY: No takes generated yet
    if (!hasTakes) {
        return { status: 'gray', color: 'text.disabled', approvedCount };
    }

    // RED: Has takes but none approved
    if (approvedCount === 0) {
        return { status: 'red', color: 'error.main', approvedCount };
    }

    // YELLOW: Has some approved but not complete
    return { status: 'yellow', color: 'warning.main', approvedCount };
}

function getSectionStatus(sectionItem, content, takes) {
    if (sectionItem.section_complete) {
        return { status: 'green', color: 'success.main' };
    }

    const sectionContent = content.filter(
        c =>
            c.actor_id === sectionItem.actor_id &&
            c.content_type === sectionItem.content_type &&
            c.section_id === sectionItem.id
    );

    if (sectionContent.length === 0) {
        return { status: 'gray', color: 'text.disabled' };
    }

    let hasRed = false;
    let hasYellow = false;
    let hasAnyProgress = false;

    for (const c of sectionContent) {
        const status = getContentStatus(c, takes);
        if (status.status === 'red') hasRed = true;
        else if (status.status === 'yellow') hasYellow = true;
        else if (status.status === 'green') hasYellow = true;

        if (status.status !== 'gray') hasAnyProgress = true;
    }

    if (hasRed) return { status: 'red', color: 'error.main' };
    if (hasYellow) return { status: 'yellow', color: 'warning.main' };
    if (hasAnyProgress) return { status: 'yellow', color: 'warning.main' };
    return { status: 'gray', color: 'text.disabled' };
}

function getActorStatus(actor, sections, content, takes) {
    if (actor.actor_complete) {
        return { status: 'green', color: 'success.main' };
    }

    const actorSections = sections.filter(s => s.actor_id === actor.id);

    if (actorSections.length === 0) {
        return { status: 'gray', color: 'text.disabled' };
    }

    let worstPriority = -1;
    let worstStatus = { status: 'gray', color: 'text.disabled' };

    for (const s of actorSections) {
        const status = getSectionStatus(s, content, takes);
        const priority = STATUS_PRIORITY[status.status];
        if (priority > worstPriority) {
            worstPriority = priority;
            worstStatus = status;
        }
    }

    if (worstStatus.status === 'green') {
        return { status: 'yellow', color: 'warning.main' };
    }

    return worstStatus;
}

export default function TreePane(props) {
    const selectedId = () => props.selectedNode ? nodeKey(props.selectedNode.type, props.selectedNode.id) : null;

    // Load expanded state from localStorage
    const loadExpandedState = () => {
        try {
            const saved = localStorage.getItem('audiomanager-tree-expanded');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load tree state from localStorage:', e);
        }
        return {
            actors: false,
            defaults: false,
            console: false,
            history: false,
        };
    };

    const [expanded, setExpanded] = createSignal(loadExpandedState());

    const handleSelect = (type, id) => {
        props.onSelect({ type, id });
    };

    const handleToggle = (key) => {
        setExpanded(prev => {
            const newState = { ...prev, [key]: !prev[key] };
            try {
                localStorage.setItem('audiomanager-tree-expanded', JSON.stringify(newState));
            } catch (e) {
                console.warn('Failed to save tree state to localStorage:', e);
            }
            return newState;
        });
    };

    const expandNode = (key) => {
        setExpanded(prev => {
            const newState = { ...prev, [key]: true };
            try {
                localStorage.setItem('audiomanager-tree-expanded', JSON.stringify(newState));
            } catch (e) {
                console.warn('Failed to save tree state to localStorage:', e);
            }
            return newState;
        });
    };

    // Expose expandNode to parent
    createEffect(() => {
        if (props.onExpandNode) {
            props.onExpandNode(expandNode);
        }
    });

    return (
        <Box
            sx={{
                width: props.width || 300,
                flexShrink: 0,
                borderRight: 1,
                borderColor: 'divider',
                height: '100%',
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <List dense disablePadding sx={{ px: '0.3125rem', py: '0.625rem', flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {/* Actors Section */}
                <ListItemButton
                    class="status-gray"
                    sx={{
                        py: '0.125rem',
                        pl: '0.5rem',
                        pr: 0,
                        minHeight: '1.125rem',
                        '& .MuiListItemText-root': { margin: 0 },
                        '& .MuiListItemIcon-root': { minWidth: 'auto' },
                        ...DESIGN_SYSTEM.treeItem
                    }}
                    selected={selectedId() === nodeKey('root', 'project')}
                    onClick={() => handleSelect('root', 'project')}
                >
                    <ListItemIcon sx={{ minWidth: 'auto', mr: '0.25rem' }}>
                        <PersonIcon sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary="actors"
                        primaryTypographyProps={{
                            fontSize: '0.9rem',
                            lineHeight: '1rem',
                        }}
                    />
                    <Box onClick={(e) => { e.stopPropagation(); handleToggle('actors'); }} sx={{ display: 'flex', alignItems: 'center', p: 0, m: 0 }}>
                        {expanded().actors ? <ExpandLessIcon sx={{ fontSize: '0.75rem' }} /> : <ExpandMoreIcon sx={{ fontSize: '0.75rem' }} />}
                    </Box>
                </ListItemButton>

                {/* Actors Children */}
                <Show when={expanded().actors}>
                    <List component="div" disablePadding>
                        <For each={props.actors}>
                            {(actor) => {
                                const actorKey = `actor-${actor.id}`;
                                const actorStatus = () => getActorStatus(actor, props.sections, props.content, props.takes);

                                return (
                                    <Box>
                                        <ListItemButton
                                            class={getStatusClass(actorStatus().color)}
                                            sx={{
                                                pl: '1.5rem',
                                                py: 0,
                                                pr: 0,
                                                minHeight: '1.125rem',
                                                '& .MuiListItemText-root': { margin: 0 },
                                                '& .MuiListItemIcon-root': { minWidth: 'auto' },
                                                ...DESIGN_SYSTEM.treeItem,
                                            }}
                                            selected={selectedId() === nodeKey('actor', actor.id)}
                                            onClick={() => handleSelect('actor', actor.id)}
                                        >
                                            <ListItemIcon sx={{ minWidth: 'auto', mr: '0.25rem' }}>
                                                <PersonIcon sx={{ fontSize: '0.75rem' }} />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={actor.display_name}
                                                primaryTypographyProps={{
                                                    fontSize: '0.9rem',
                                                    lineHeight: '1rem',
                                                    fontWeight: 400,
                                                }}
                                            />
                                            <Box onClick={(e) => { e.stopPropagation(); handleToggle(actorKey); }} sx={{ display: 'flex', alignItems: 'center', p: 0, m: 0 }}>
                                                {expanded()[actorKey] ? <ExpandLessIcon sx={{ fontSize: '0.75rem' }} /> : <ExpandMoreIcon sx={{ fontSize: '0.75rem' }} />}
                                            </Box>
                                        </ListItemButton>

                                        {/* Actor Sections */}
                                        <Show when={expanded()[actorKey]}>
                                            <List component="div" disablePadding>
                                                <For each={props.sections.filter(s => s.actor_id === actor.id)}>
                                                    {(sectionItem) => {
                                                        const sectionType = sectionItem.content_type;
                                                        const sectionStatus = () => getSectionStatus(sectionItem, props.content, props.takes);
                                                        const sectionIcon = sectionType === 'dialogue' ? <RecordVoiceOverIcon sx={{ fontSize: '0.75rem' }} /> :
                                                            sectionType === 'music' ? <MusicNoteIcon sx={{ fontSize: '0.75rem' }} /> : <GraphicEqIcon sx={{ fontSize: '0.75rem' }} />;
                                                        const sectionKey = `section-${sectionItem.id}`;
                                                        const displayName = sectionItem?.name || sectionType;

                                                        return (
                                                            <Box>
                                                                <ListItemButton
                                                                    class={getStatusClass(sectionStatus().color)}
                                                                    sx={{
                                                                        pl: '2.5rem',
                                                                        py: 0,
                                                                        pr: 0,
                                                                        minHeight: '1.125rem',
                                                                        '& .MuiListItemText-root': { margin: 0 },
                                                                        '& .MuiListItemIcon-root': { minWidth: 'auto' },
                                                                        ...DESIGN_SYSTEM.treeItem,
                                                                    }}
                                                                    selected={selectedId() === nodeKey(`${sectionType}-section`, sectionItem.id)}
                                                                    onClick={() => handleSelect(`${sectionType}-section`, sectionItem.id)}
                                                                >
                                                                    <ListItemIcon sx={{ minWidth: 'auto', mr: '0.25rem' }}>
                                                                        {sectionIcon}
                                                                    </ListItemIcon>
                                                                    <ListItemText primary={displayName} primaryTypographyProps={{ fontSize: '0.9rem', lineHeight: '1rem', fontWeight: 400 }} />
                                                                    <Box onClick={(e) => { e.stopPropagation(); handleToggle(sectionKey); }} sx={{ display: 'flex', alignItems: 'center', p: 0, m: 0 }}>
                                                                        {expanded()[sectionKey] ? <ExpandLessIcon sx={{ fontSize: '0.75rem' }} /> : <ExpandMoreIcon sx={{ fontSize: '0.75rem' }} />}
                                                                    </Box>
                                                                </ListItemButton>

                                                                {/* Section Content */}
                                                                <Show when={expanded()[sectionKey]}>
                                                                    <List component="div" disablePadding>
                                                                        <For each={props.content.filter(c => c.actor_id === actor.id && c.content_type === sectionType && c.section_id === sectionItem.id)}>
                                                                            {(c) => {
                                                                                const contentStatus = () => getContentStatus(c, props.takes);
                                                                                const contentTakes = () => props.takes.filter(t => t.content_id === c.id);
                                                                                const newCount = () => contentTakes().filter(t => t.status === 'new' && !props.playedTakes[t.id]).length;

                                                                                const displayText = () => {
                                                                                    let text = contentStatus().approvedCount > 0
                                                                                        ? `${c.cue_id || c.id} (${contentStatus().approvedCount})`
                                                                                        : (c.cue_id || c.id);
                                                                                    if (newCount() > 0) {
                                                                                        text += ` (${newCount()} new)`;
                                                                                    }
                                                                                    return text;
                                                                                };

                                                                                const isPlaying = () => contentTakes().some(t => t.id === props.playingTakeId);

                                                                                const contentIcon = sectionType === 'dialogue'
                                                                                    ? <RecordVoiceOverIcon sx={{ fontSize: '0.625rem' }} />
                                                                                    : sectionType === 'music'
                                                                                        ? <MusicNoteIcon sx={{ fontSize: '0.625rem' }} />
                                                                                        : <GraphicEqIcon sx={{ fontSize: '0.625rem' }} />;

                                                                                return (
                                                                                    <ListItemButton
                                                                                        class={isPlaying() ? 'status-white' : getStatusClass(contentStatus().color)}
                                                                                        sx={{
                                                                                            pl: '3.5rem',
                                                                                            py: 0,
                                                                                            pr: 0,
                                                                                            minHeight: '1.125rem',
                                                                                            '& .MuiListItemText-root': { margin: 0 },
                                                                                            '& .MuiListItemIcon-root': { minWidth: 'auto' },
                                                                                            ...DESIGN_SYSTEM.treeItem,
                                                                                        }}
                                                                                        selected={selectedId() === nodeKey('content', c.id)}
                                                                                        onClick={() => handleSelect('content', c.id)}
                                                                                    >
                                                                                        <ListItemIcon sx={{ minWidth: 'auto', mr: '0.25rem' }}>
                                                                                            {contentIcon}
                                                                                        </ListItemIcon>
                                                                                        <ListItemText
                                                                                            primary={displayText()}
                                                                                            primaryTypographyProps={{
                                                                                                fontSize: '0.9rem',
                                                                                                lineHeight: '1rem',
                                                                                                fontWeight: 400,
                                                                                            }}
                                                                                        />
                                                                                    </ListItemButton>
                                                                                );
                                                                            }}
                                                                        </For>
                                                                    </List>
                                                                </Show>
                                                            </Box>
                                                        );
                                                    }}
                                                </For>
                                            </List>
                                        </Show>
                                    </Box>
                                );
                            }}
                        </For>
                    </List>
                </Show>

                {/* Console Section */}
                <ListItemButton
                    class="status-gray"
                    sx={{
                        py: '0.125rem',
                        pl: '0.5rem',
                        pr: 0,
                        minHeight: '1.125rem',
                        '& .MuiListItemText-root': { margin: 0 },
                        '& .MuiListItemIcon-root': { minWidth: 'auto' },
                        ...DESIGN_SYSTEM.treeItem
                    }}
                    selected={selectedId() === nodeKey('console', 'console')}
                    onClick={() => handleSelect('console', 'console')}
                >
                    <ListItemIcon sx={{ minWidth: 'auto', mr: '0.25rem' }}>
                        <TerminalIcon sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary="console"
                        primaryTypographyProps={{
                            fontSize: '0.9rem',
                            lineHeight: '1rem',
                        }}
                    />
                </ListItemButton>

                {/* History Section */}
                <ListItemButton
                    class="status-gray"
                    sx={{
                        py: '0.125rem',
                        pl: '0.5rem',
                        pr: 0,
                        minHeight: '1.125rem',
                        '& .MuiListItemText-root': { margin: 0 },
                        '& .MuiListItemIcon-root': { minWidth: 'auto' },
                        ...DESIGN_SYSTEM.treeItem
                    }}
                    selected={selectedId() === nodeKey('history', 'logs')}
                    onClick={() => handleSelect('history', 'logs')}
                >
                    <ListItemIcon sx={{ minWidth: 'auto', mr: '0.25rem' }}>
                        <HistoryIcon sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary="history"
                        primaryTypographyProps={{
                            fontSize: '0.9rem',
                            lineHeight: '1rem',
                        }}
                    />
                </ListItemButton>

                {/* Defaults Section */}
                <ListItemButton
                    class="status-gray"
                    sx={{
                        py: '0.125rem',
                        pl: '0.5rem',
                        pr: 0,
                        minHeight: '1.125rem',
                        '& .MuiListItemText-root': { margin: 0 },
                        '& .MuiListItemIcon-root': { minWidth: 'auto' },
                        ...DESIGN_SYSTEM.treeItem
                    }}
                    selected={selectedId() === nodeKey('defaults', 'providers')}
                    onClick={() => handleSelect('defaults', 'providers')}
                >
                    <ListItemIcon sx={{ minWidth: 'auto', mr: '0.25rem' }}>
                        <SettingsIcon sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary="defaults"
                        primaryTypographyProps={{
                            fontSize: '0.9rem',
                            lineHeight: '1rem',
                        }}
                    />
                    <Box onClick={(e) => { e.stopPropagation(); handleToggle('defaults'); }} sx={{ display: 'flex', alignItems: 'center', p: 0, m: 0 }}>
                        {expanded().defaults ? <ExpandLessIcon sx={{ fontSize: '0.75rem' }} /> : <ExpandMoreIcon sx={{ fontSize: '0.75rem' }} />}
                    </Box>
                </ListItemButton>

                {/* Defaults Children */}
                <Show when={expanded().defaults}>
                    <List component="div" disablePadding>
                        <For each={['dialogue', 'music', 'sfx']}>
                            {(type) => {
                                const icon = type === 'dialogue' ? <RecordVoiceOverIcon sx={{ fontSize: '0.75rem', color: 'text.secondary' }} /> :
                                    type === 'music' ? <MusicNoteIcon sx={{ fontSize: '0.75rem', color: 'text.secondary' }} /> :
                                        <GraphicEqIcon sx={{ fontSize: '0.75rem', color: 'text.secondary' }} />;

                                return (
                                    <ListItemButton
                                        class="status-gray"
                                        sx={{
                                            pl: '1.5rem',
                                            py: 0,
                                            pr: 0,
                                            minHeight: '1.125rem',
                                            '& .MuiListItemText-root': { margin: 0 },
                                            '& .MuiListItemIcon-root': { minWidth: 'auto' },
                                            ...DESIGN_SYSTEM.treeItem
                                        }}
                                        selected={selectedId() === nodeKey('provider-default', type)}
                                        onClick={() => handleSelect('provider-default', type)}
                                    >
                                        <ListItemIcon sx={{ minWidth: 'auto', mr: '0.25rem' }}>
                                            {icon}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={`${type} (elevenlabs)`}
                                            primaryTypographyProps={{
                                                fontSize: '0.9rem',
                                                lineHeight: '1rem',
                                            }}
                                        />
                                    </ListItemButton>
                                );
                            }}
                        </For>
                    </List>
                </Show>
            </List>

            {/* Color Legend */}
            <Box sx={{ px: '1rem', py: '0.375rem', color: 'text.secondary', borderTop: 1, borderColor: 'divider', flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.125rem 0.5rem' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Box sx={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', bgcolor: 'success.main' }} />
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1.1 }}>Complete</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Box sx={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', bgcolor: 'warning.main' }} />
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1.1 }}>In Progress</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Box sx={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', bgcolor: 'error.main' }} />
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1.1 }}>No Approvals</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Box sx={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', bgcolor: 'text.disabled' }} />
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1.1 }}>Not Started</Typography>
                </Box>
            </Box>
        </Box>
    );
}
