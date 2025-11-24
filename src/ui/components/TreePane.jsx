import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';

function nodeKey(type, id) {
  return `${type}:${id}`;
}

export default function TreePane({ actors, content, sections, selectedNode, onSelect }) {
  const selectedId = selectedNode ? nodeKey(selectedNode.type, selectedNode.id) : null;

  const handleSelect = (type, id) => {
    onSelect({ type, id });
  };

  return (
    <Box
      sx={{
        width: { xs: 260, md: 300 },
        flexShrink: 0,
        borderRight: 1,
        borderColor: 'divider',
        overflow: 'auto',
        pt: 1,
      }}
    >
      <Typography variant="subtitle2" sx={{ px: 2, pb: 1 }}>
        Project
      </Typography>
      <List dense disablePadding sx={{ px: 1, pb: 2 }}>
        <ListItemButton
          selected={selectedId === nodeKey('root', 'project')}
          onClick={() => handleSelect('root', 'project')}
        >
          <ListItemText primary="Actors" />
        </ListItemButton>

        <Box sx={{ pl: 2 }}>
          <ListItemButton
            selected={selectedId === nodeKey('defaults', 'providers')}
            onClick={() => handleSelect('defaults', 'providers')}
          >
            <ListItemText primary="Defaults" />
          </ListItemButton>
          <Box sx={{ pl: 2 }}>
            {['dialogue', 'music', 'sfx'].map((type) => (
              <ListItemButton
                key={type}
                selected={selectedId === nodeKey('provider-default', type)}
                onClick={() => handleSelect('provider-default', type)}
              >
                <ListItemText primary={`${type.charAt(0).toUpperCase() + type.slice(1)} (ElevenLabs)`} />
              </ListItemButton>
            ))}
          </Box>
        </Box>

        {actors.map((actor) => (
          <Box key={actor.id} sx={{ pl: 2 }}>
            <ListItemButton
              selected={selectedId === nodeKey('actor', actor.id)}
              onClick={() => handleSelect('actor', actor.id)}
            >
              <ListItemText primary={actor.display_name} />
            </ListItemButton>

            {['dialogue', 'music', 'sfx'].map((section) => {
              const hasSection = sections.some(
                (s) => s.actor_id === actor.id && s.content_type === section
              );
              // Always show sections if they exist, or if there's content for them
              const hasContent = content.some(
                (c) => c.actor_id === actor.id && c.content_type === section
              );
              
              if (!hasSection && !hasContent) return null;

              const sectionId = nodeKey(`${section}-section`, actor.id);
              return (
                <Box key={sectionId} sx={{ pl: 2 }}>
                  <ListItemButton
                    selected={selectedId === sectionId}
                    onClick={() => handleSelect(`${section}-section`, actor.id)}
                  >
                    <ListItemText primary={section.toUpperCase()} />
                  </ListItemButton>

                  {content
                    .filter(
                      (c) => c.actor_id === actor.id && c.content_type === section
                    )
                    .map((c) => {
                      const contentId = nodeKey('content', c.id);
                      return (
                        <ListItemButton
                          key={contentId}
                          sx={{ pl: 4 }}
                          selected={selectedId === contentId}
                          onClick={() => handleSelect('content', c.id)}
                        >
                          <ListItemText primary={c.item_id || c.id} />
                        </ListItemButton>
                      );
                    })}
                </Box>
              );
            })}
          </Box>
        ))}
      </List>
    </Box>
  );
}
