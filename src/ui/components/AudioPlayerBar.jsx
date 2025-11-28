import React, { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import WaveSurfer from 'wavesurfer.js';

// Debug flag for this module
const DEBUG_AUDIO_PLAYER = false;

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function AudioPlayerBar({ 
  currentTake, 
  audioUrl,
  isPlaying,
  onPlayingChange
}) {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Use ref for callback to prevent effect re-runs
  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;

  // Track previous audioUrl to detect changes
  const prevAudioUrlRef = useRef(audioUrl);

  // Cleanup previous WaveSurfer BEFORE render commits (useLayoutEffect runs synchronously)
  useLayoutEffect(() => {
    if (DEBUG_AUDIO_PLAYER) {
      console.log('[AudioPlayerBar] useLayoutEffect - prevUrl:', prevAudioUrlRef.current, 'newUrl:', audioUrl, 'hasWs:', !!wavesurferRef.current);
    }
    if (prevAudioUrlRef.current !== audioUrl && wavesurferRef.current) {
      if (DEBUG_AUDIO_PLAYER) {
        console.log('[AudioPlayerBar] Cleaning up previous WaveSurfer');
      }
      // Unsubscribe events first to prevent callbacks during cleanup
      wavesurferRef.current.unAll();
      wavesurferRef.current.stop();
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    prevAudioUrlRef.current = audioUrl;
  }, [audioUrl]);

  // Initialize WaveSurfer
  useEffect(() => {
    // Reset state
    setIsReady(false);
    setDuration(0);
    setCurrentTime(0);

    if (!containerRef.current || !audioUrl) {
      return;
    }

    if (DEBUG_AUDIO_PLAYER) {
      console.log('[AudioPlayerBar] Initializing WaveSurfer with URL:', audioUrl);
    }

    // Clear container before creating new instance
    containerRef.current.innerHTML = '';

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#666',
      progressColor: '#1976d2',
      cursorColor: '#1976d2',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 32,
      normalize: true,
    });

    wavesurfer.load(audioUrl);

    wavesurfer.on('ready', () => {
      if (DEBUG_AUDIO_PLAYER) {
        console.log('[AudioPlayerBar] WaveSurfer ready, duration:', wavesurfer.getDuration());
        // Check audio context state
        const backend = wavesurfer.getMediaElement?.() || wavesurfer.backend?.ac;
        if (backend?.state) {
          console.log('[AudioPlayerBar] Audio context state:', backend.state);
        }
      }
      setDuration(wavesurfer.getDuration());
      setIsReady(true);
      // Auto-play when loaded
      wavesurfer.play().then(() => {
        if (DEBUG_AUDIO_PLAYER) {
          console.log('[AudioPlayerBar] Play started successfully, isPlaying:', wavesurfer.isPlaying());
        }
      }).catch(err => {
        console.error('[AudioPlayerBar] Play failed:', err);
      });
      if (onPlayingChangeRef.current) onPlayingChangeRef.current(true);
    });

    wavesurfer.on('audioprocess', () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on('seeking', () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on('play', () => {
      if (onPlayingChangeRef.current) onPlayingChangeRef.current(true);
    });

    wavesurfer.on('pause', () => {
      if (onPlayingChangeRef.current) onPlayingChangeRef.current(false);
    });

    wavesurfer.on('finish', () => {
      if (DEBUG_AUDIO_PLAYER) {
        console.log('[AudioPlayerBar] Playback finished');
      }
      if (onPlayingChangeRef.current) onPlayingChangeRef.current(false);
    });

    wavesurfer.on('error', (err) => {
      // Only log if debug is enabled - media errors are common during project switching
      if (DEBUG_AUDIO_PLAYER) {
        console.error('[AudioPlayerBar] WaveSurfer error:', err);
      }
      setIsReady(false);
    });

    wavesurferRef.current = wavesurfer;

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl]);

  // Sync playback state with parent's isPlaying prop
  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return;
    
    const ws = wavesurferRef.current;
    const wsIsPlaying = ws.isPlaying();
    
    if (isPlaying && !wsIsPlaying) {
      // Parent wants to play, but we're paused - start playing
      ws.play();
    } else if (!isPlaying && wsIsPlaying) {
      // Parent wants to pause, but we're playing - pause
      ws.pause();
    }
  }, [isPlaying, isReady]);

  // Handle volume changes
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  const handlePlayPause = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  }, []);

  const handleStop = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
      setCurrentTime(0);
      if (onPlayingChangeRef.current) onPlayingChangeRef.current(false);
    }
  }, []);

  const handleVolumeChange = useCallback((event, newValue) => {
    setVolume(newValue);
    setIsMuted(newValue === 0);
  }, []);

  const handleMuteToggle = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Determine background color based on take status
  const getStatusBgColor = () => {
    if (!currentTake) return 'background.paper';
    switch (currentTake.status) {
      case 'approved':
        return 'success.dark';
      case 'rejected':
        return 'error.dark';
      default: // 'new' or other
        return 'background.paper';
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: '1.75rem',
        left: 0,
        right: 0,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        px: 1,
        py: 0.5,
        zIndex: 1300,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
      }}
    >
      {/* Top row: Waveform */}
      <Box 
        sx={{ 
          width: '100%',
          height: 32,
          position: 'relative',
        }} 
      >
        {/* WaveSurfer renders here */}
        <Box 
          ref={containerRef} 
          sx={{ 
            width: '100%',
            height: '100%',
            cursor: audioUrl ? 'pointer' : 'default',
            display: audioUrl ? 'block' : 'none',
          }} 
        />
        {/* Empty state placeholder */}
        {!audioUrl && (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" color="text.disabled">
              Select a take to play
            </Typography>
          </Box>
        )}
      </Box>

      {/* Bottom row: Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
        {/* Play/Pause/Stop */}
        <IconButton onClick={handlePlayPause} size="small" color="primary" disabled={!audioUrl} sx={{ p: 0.5 }}>
          {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
        </IconButton>
        <IconButton onClick={handleStop} size="small" disabled={!audioUrl} sx={{ p: 0.5 }}>
          <StopIcon fontSize="small" />
        </IconButton>

        {/* Time display */}
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: audioUrl ? 'text.primary' : 'text.disabled' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Typography>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Track info with status color */}
        <Box 
          sx={{ 
            overflow: 'hidden',
            bgcolor: getStatusBgColor(),
            px: 1,
            py: 0.25,
            borderRadius: 0.5,
            transition: 'background-color 0.3s ease',
            maxWidth: { xs: 120, sm: 200 },
          }}
        >
          <Typography 
            variant="caption" 
            noWrap 
            sx={{ fontWeight: 500, fontSize: '0.7rem', display: 'block' }}
            title={currentTake?.filename || ''}
          >
            {currentTake?.filename || 'No track'}
          </Typography>
        </Box>

        {/* Volume */}
        <IconButton onClick={handleMuteToggle} size="small" disabled={!audioUrl} sx={{ p: 0.5 }}>
          {isMuted || volume === 0 ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
        </IconButton>
        <Slider
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          min={0}
          max={1}
          step={0.01}
          size="small"
          disabled={!audioUrl}
          sx={{ width: 60 }}
        />
      </Box>
    </Box>
  );
}
