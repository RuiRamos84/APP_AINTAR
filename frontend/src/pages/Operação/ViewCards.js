import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';

const ViewCards = ({ views, selectedView, onViewClick }) => {
    return (
        <Grid container spacing={2}>
            {views.map(([key, value]) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={key}>
                    <Card
                        onClick={() => onViewClick(key)}
                        sx={{
                            cursor: "pointer",
                            transition: "all 0.3s",
                            "&:hover": {
                                transform: "scale(1.05)",
                                boxShadow: 3,
                            },
                            bgcolor: selectedView === key ? "primary.light" : "background.paper",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                        }}
                    >
                        <CardContent>
                            <Typography variant="h6" gutterBottom noWrap>
                                {value.name}
                            </Typography>
                            <Typography variant="h4">{value.total}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
};

export default ViewCards;