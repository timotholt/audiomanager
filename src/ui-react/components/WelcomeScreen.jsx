import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AddIcon from '@mui/icons-material/Add';
import { getProjects, createProject, switchProject } from '../api/client.js';

export default function WelcomeScreen({ onProjectChange }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  // Load available projects
  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        const data = await getProjects();
        setProjects(data.projects || []);
      } catch (err) {
        console.error('Failed to load projects:', err);
        setError('Failed to load projects');
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  const handleSelectProject = async (project) => {
    try {
      setError(null);
      await switchProject(project.name);
      // Save to localStorage for next session
      localStorage.setItem('audiomanager-last-project', project.name);
      onProjectChange(project);
    } catch (err) {
      setError(`Failed to open project: ${err.message}`);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      setCreating(true);
      setError(null);
      const data = await createProject(newProjectName.trim());
      if (data.project) {
        // Switch to the new project
        await switchProject(data.project.name);
        localStorage.setItem('audiomanager-last-project', data.project.name);
        onProjectChange(data.project);
      }
    } catch (err) {
      setError(`Failed to create project: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box 
      component="main" 
      sx={{ 
        flexGrow: 1, 
        pt: 8, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        p: 4,
      }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          maxWidth: 500, 
          width: '100%',
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" gutterBottom>
          Welcome to Audio Manager
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Select an existing project or create a new one to get started.
        </Typography>

        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {/* Existing Projects */}
        {!loading && projects.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ textAlign: 'left', mb: 1 }}>
              Recent Projects
            </Typography>
            <List sx={{ mb: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              {projects.map((project) => (
                <ListItemButton 
                  key={project.name} 
                  onClick={() => handleSelectProject(project)}
                >
                  <FolderOpenIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <ListItemText 
                    primary={project.displayName || project.name} 
                    secondary={project.path}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}

        {loading && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Loading projects...
          </Typography>
        )}

        <Divider sx={{ my: 2 }}>
          <Typography variant="caption" color="text.secondary">
            OR
          </Typography>
        </Divider>

        {/* Create New Project */}
        <Typography variant="subtitle2" sx={{ textAlign: 'left', mb: 1 }}>
          Create New Project
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateProject();
            }}
            disabled={creating}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateProject}
            disabled={!newProjectName.trim() || creating}
          >
            Create
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
