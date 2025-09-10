// components/common/Sidebar/SidebarProfile.js
import React from 'react';
import { Box, Avatar, Typography, IconButton } from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';

const SidebarProfile = ({ isCompact }) => {
    const { user } = useAuth();
    const theme = useTheme();

    return (
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar
                src={user?.avatar}
                sx={{
                    width: isCompact ? 40 : 48,
                    height: isCompact ? 40 : 48,
                    mr: isCompact ? 0 : 1.5,
                    border: `2px solid ${theme.palette.primary.main}`
                }}
            >
                {user?.name?.charAt(0) || 'U'}
            </Avatar>

            {!isCompact && (
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    style={{ flexGrow: 1, overflow: 'hidden' }}
                >
                    <Typography variant="body2" noWrap fontWeight="medium">
                        {user?.name || 'Utilizador'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                        {user?.email || ''}
                    </Typography>
                </motion.div>
            )}

            {!isCompact && (
                <IconButton size="small" sx={{ ml: 1 }}>
                    <EditIcon fontSize="small" />
                </IconButton>
            )}
        </Box>
    );
};

export default SidebarProfile;