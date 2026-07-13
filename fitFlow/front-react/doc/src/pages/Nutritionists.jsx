import { Container, Typography, Grid, Card, CardContent, Chip } from '@mui/material';
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Nutritionists() {
  const [nutritionists, setNutritionists] = useState([]);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    fetch("http://localhost:8000/auth/nutritionists", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setNutritionists);
  }, [token]);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Lista de Nutricionistas
      </Typography>
      <Grid container spacing={2}>
        {nutritionists.map(n => (
          <Grid size={{ xs: 12, md: 4 }} key={n.user_id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{n.first_name} {n.last_name}</Typography>
                <Typography>Cédula: {n.cedula}</Typography>
                <Typography>Email: {n.email}</Typography>
                <Chip label={n.role} sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
