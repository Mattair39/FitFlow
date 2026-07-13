import { Box, Container, Paper, Typography, TextField, Button, Snackbar, Alert } from '@mui/material';
import { useState } from 'react';

export default function RegisterAdmin() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    cedula: "",
    email: "",
    password: "",
    birth_date: "",
    sex: "",
    department: "",
    phone_number: ""
  });
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'error'
  });

  const validate = () => {
  let e = {};

  // Validar la cédula (10 dígitos)
  if (!/^\d{10}$/.test(form.cedula)) e.cedula = "La cédula debe tener 10 dígitos";

  // Validar campos obligatorios
  ["first_name", "last_name", "cedula", "email", "password", "birth_date", "sex", "department", "phone_number"].forEach(f => {
    if (!form[f]?.trim()) e[f] = "Requerido";
  });

  // Validar formato de email si no está vacío
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    e.email = "Email no válido";
  }

  return e;
};


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: null });
  };

  const onSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      setSnackbar({
        open: true,
        message: 'Hay errores en el formulario. Por favor revisa los campos resaltados.',
        severity: 'error'
      });
      return;
    }

    // ✅ Limpiar/preparar los datos antes de enviar
    const preparedData = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      cedula: form.cedula.trim(),
      email: form.email.trim(),
      password: form.password.trim(),
      birth_date: form.birth_date,  // en formato yyyy-mm-dd (React DateField ya lo da bien)
      sex: form.sex.trim(),
      department: form.department.trim(),
      phone_number: form.phone_number.trim()
    };

    try {
      const res = await fetch("http://localhost:8000/register/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preparedData)
      });

      if (res.ok) {
        setSnackbar({
          open: true,
          message: '¡Administrador registrado exitosamente!',
          severity: 'success'
        });
        // Reset form después del éxito
        setForm({
          first_name: "",
          last_name: "",
          cedula: "",
          email: "",
          password: "",
          birth_date: "",
          sex: "",
          department: "",
          phone_number: ""
        });
      } else {
        const data = await res.json();
        let errorMessage = 'Error al registrar. Intenta nuevamente.';

        if (data.detail) {
          if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map(err => `${err.loc.join('.')} - ${err.msg}`).join(' | ');
          } else if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          }
        }

        setSnackbar({
          open: true,
          message: errorMessage,
          severity: 'error'
        });
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Error de conexión con el servidor.',
        severity: 'error'
      });
    }
  };

  return (
    <Box sx={{ bgcolor: "white", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" align="center">Registro de Administrador</Typography>
          {[
            { name: "cedula", label: "Cédula" },
            { name: "first_name", label: "Nombre" },
            { name: "last_name", label: "Apellido" },
            { name: "email", label: "Email" },
            { name: "password", label: "Contraseña", type: "password" },
            { name: "birth_date", label: "Fecha Nacimiento", type: "date" },
            { name: "sex", label: "Sexo" },
            { name: "department", label: "Departamento" },
            { name: "phone_number", label: "Teléfono" }
          ].map(f => (
            <TextField
              key={f.name}
              name={f.name}
              label={f.label}
              type={f.type || "text"}
              value={form[f.name]}
              onChange={handleChange}
              error={!!errors[f.name]}
              helperText={errors[f.name]}
              fullWidth
              sx={{ mb: 2 }}
              slotProps={f.type === 'date' ? { inputLabel: { shrink: true } } : {}}
            />
          ))}
          <Button variant="contained" color="primary" fullWidth onClick={onSubmit}>
            Registrar
          </Button>
        </Paper>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
