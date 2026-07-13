import { Container, Typography, Grid, Card, CardContent, Chip, IconButton, Tooltip } from '@mui/material';
import Delete from '@mui/icons-material/Delete';
import Visibility from '@mui/icons-material/Visibility';
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Users() {
  const [users, setUsers] = useState([]);
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:8000/auth/users", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setUsers);
  }, [token]);

  const handleDelete = async (userId) => {
    if (!window.confirm("Â¿Seguro que deseas eliminar este usuario?")) return;
    const res = await fetch(`http://localhost:8000/auth/users/${userId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` }
  });

    if (res.ok) {
      setUsers(users.filter(u => u.user_id !== userId));
      alert("Usuario eliminado.");
    } else {
      alert("Error al eliminar.");
    }
  };

  const handleView = (userId) => {
    navigate(`/profile/${userId}`);
  };


  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        GestiÃ³n de Usuarios
      </Typography>
      <Grid container spacing={2}>
        {users.map(u => (
          <Grid size={{ xs: 12, md: 4 }} key={u.user_id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{u.first_name} {u.last_name}</Typography>
                <Typography>CÃ©dula: {u.cedula}</Typography>
                <Typography>Email: {u.email}</Typography>
                <Chip label={u.role} sx={{ mt: 1 }} />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Tooltip title="Ver Perfil">
                    <IconButton color="primary" onClick={() => handleView(u.user_id)}>
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton color="error" onClick={() => handleDelete(u.user_id)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
