export interface ProjectSettings {
    media_root: string;
    sample_rate: 44100 | 48000;
    bit_depth: 16 | 24;
    channels: 1 | 2;
    lufs_target: number;
    peak_ceiling_db: number;
    lra_max: number;
}

export interface Project {
    id: string;
    name: string;
    schema_version: '1.0.0';
    created_at: string;
    updated_at: string;
    settings: ProjectSettings;
}

export interface Actor {
    id: string;
    display_name: string;
    aliases: string[];
    notes: string;
    created_at: string;
    updated_at: string;
}

export interface Dialogue {
    id: string;
    scene: string;
    line_number: string;
    character: string;
    text: string;
    context: string;
    direction: string;
    tags: string[];
    created_at: string;
    updated_at: string;
}

export type PairState = 'Planned' | 'Recording' | 'Review' | 'OnHold' | 'Done';

export interface Pair {
    id: string;
    actor_id: string;
    dialogue_id: string;
    state: PairState;
    complete: boolean;
    notes: string;
    approved_take_ids: string[];
    created_at: string;
    updated_at: string;
}

export interface Take {
    id: string;
    pair_id: string;
    path: string;
    hash_sha256: string;
    duration_sec: number;
    format: 'wav' | 'flac' | 'aiff';
    sample_rate: 44100 | 48000;
    bit_depth: 16 | 24;
    channels: 1 | 2;
    lufs_integrated: number;
    peak_dbfs: number;
    transform_chain: TransformJob[];
    created_at: string;
    updated_at: string;
}

export interface TransformJob {
    job_id: string;
    name: string;
    params: Record<string, unknown>;
}

export interface Review {
    id: string;
    entity: 'take' | 'pair';
    entity_id: string;
    action: 'approve_take' | 'reject_take' | 'unapprove_take' | 'mark_complete' | 'unmark_complete' | 'note';
    note?: string;
    at: string;
}
