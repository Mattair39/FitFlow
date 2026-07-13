import {
  Container, Typography, Grid, Card, CardContent, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Foods() {
  const { token } = useContext(AuthContext);
  const [foods, setFoods] = useState([]);
  const [open, setOpen] = useState(false);
  const [editFood, setEditFood] = useState(null);
  const [form, setForm] = useState({
    name: "", description: "", calories_per_portion: "", protein_per_portion: "",
    fat_per_portion: "", carbs_per_portion: "", portion_unit: ""
  });

  const fetchFoods = useCallback(() => {
    fetch("http://localhost:8000/foods", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setFoods);
  }, [token]);

  useEffect(() => { fetchFoods(); }, [fetchFoods]);

  const handleOpen = (food = null) => {
    if (food) setForm(food);
    else setForm({
      name: "", description: "", calories_per_portion: "", protein_per_portion: "",
      fat_per_portion: "", carbs_per_portion: "", portion_unit: ""
    });
    setEditFood(food);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditFood(null);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const method = editFood ? "PUT" : "POST";
    const url = editFood
      ? `http://localhost:8000/foods/${editFood.food_id}`
      : `http://localhost:8000/foods`;

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      fetchFoods();
      handleClose();
    } else {
      alert("Error al guardar.");
    }
  };

  const handleDelete = async (food_id) => {
    if (!window.confirm("¿Eliminar este alimento?")) return;
    const res = await fetch(`http://localhost:8000/foods/${food_id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setFoods(foods.filter(f => f.food_id !== food_id));
    } else {
      alert("Error al eliminar.");
    }
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Gestión de Alimentos
      </Typography>

      <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} sx={{ mb: 2 }}>
        Añadir Alimento
      </Button>

      <Grid container spacing={2}>
        {foods.map(f => (
          <Grid size={{ xs: 12, md: 4 }} key={f.food_id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{f.name}</Typography>
                <Typography variant="body2">{f.description}</Typography>
                <Typography sx={{ mt: 1 }}>
                  {f.calories_per_portion} kcal ({f.portion_unit})
                </Typography>
                <Typography variant="body2">
                  Proteínas: {f.protein_per_portion}g | Grasas: {f.fat_per_portion}g | Carbs: {f.carbs_per_portion}g
                </Typography>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Tooltip title="Editar">
                    <IconButton onClick={() => handleOpen(f)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton onClick={() => handleDelete(f.food_id)} color="error">
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} fullWidth>
        <DialogTitle>{editFood ? "Editar Alimento" : "Nuevo Alimento"}</DialogTitle>
        <DialogContent>
          {/* Campos normales */}
          {[
            { name: "name", label: "Nombre" },
            { name: "description", label: "Descripción" },
            { name: "calories_per_portion", label: "Calorías por porción (kcal)", type: "number" },
            { name: "protein_per_portion", label: "Proteínas por porción (g)", type: "number" },
            { name: "fat_per_portion", label: "Grasas por porción (g)", type: "number" },
            { name: "carbs_per_portion", label: "Carbohidratos por porción (g)", type: "number" }
          ].map(f => (
            <TextField
              key={f.name}
              name={f.name}
              label={f.label}
              type={f.type || "text"}
              value={form[f.name]}
              onChange={handleChange}
              fullWidth sx={{ mb: 2 }}
            />
          ))}

          {/* Dropdown para Unidad de Porción */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Unidad de Porción</InputLabel>
            <Select
              name="portion_unit"
              value={form.portion_unit}
              label="Unidad de Porción"
              onChange={handleChange}
            >
              <MenuItem value="g">Gramos (g)</MenuItem>
              <MenuItem value="ml">Mililitros (ml)</MenuItem>
              <MenuItem value="porcion">Porción</MenuItem>
              <MenuItem value="unidad">Unidad</MenuItem>
              <MenuItem value="taza">Taza</MenuItem>
              <MenuItem value="cucharada">Cucharada</MenuItem>
              <MenuItem value="cucharadita">Cucharadita</MenuItem>
              <MenuItem value="pieza">Pieza</MenuItem>
              <MenuItem value="rebanada">Rebanada</MenuItem>
              {/* Puedes agregar más si necesitas */}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editFood ? "Guardar cambios" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
