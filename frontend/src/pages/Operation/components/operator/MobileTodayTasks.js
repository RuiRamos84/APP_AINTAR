// components/operator/MobileTodayTasks.js
import React from 'react';
import { Box, Typography, LinearProgress, Chip, Stack } from '@mui/material';
import { CheckCircle, Schedule, TrendingUp } from '@mui/icons-material';

const MobileTodayTasks = ({ tasks = [], completedTasks = [] }) => {
    const total = tasks.length;
    const completed = completedTasks.length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    const pending = total - completed;

    return (
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <TrendingUp color="primary" />
                Resumo do Dia
            </Typography>

            <Stack direction="row" spacing={1} mb={2}>
                <Chip
                    icon={<CheckCircle />}
                    label={`${completed} Concluídas`}
                    color="success"
                    size="small"
                />
                <Chip
                    icon={<Schedule />}
                    label={`${pending} Pendentes`}
                    color={pending > 0 ? "warning" : "default"}
                    size="small"
                />
            </Stack>

            <Box sx={{ mb: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="body2" color="text.secondary">
                        Progresso
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                        {Math.round(progress)}%
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                            bgcolor: progress === 100 ? 'success.main' : 'primary.main'
                        }
                    }}
                />
            </Box>
        </Box>
    );
};

export default MobileTodayTasks;