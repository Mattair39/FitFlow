import re


def validate_ecuadorian_cedula(cedula: str) -> str:
    """
    Valida cédula ecuatoriana:
    - 10 dígitos
    - los dos primeros entre 01 y 24
    - tercer dígito menor que 6
    - dígito verificador correctamente calculado
    """
    if not re.fullmatch(r"\d{10}", cedula):
        raise ValueError("La cédula debe tener exactamente 10 dígitos numéricos")

    province = int(cedula[0:2])
    if not (1 <= province <= 24):
        raise ValueError("Código de provincia inválido en la cédula")

    third = int(cedula[2])
    if third > 5:
        raise ValueError("Tercer dígito inválido para cédula ecuatoriana")

    # algoritmo de verificación
    total = 0
    for i, d in enumerate(cedula[:9]):
        n = int(d)
        if (i + 1) % 2 != 0:    # posiciones impares
            n *= 2
            if n > 9:
                n -= 9
        total += n
    modulo = total % 10
    check = 0 if modulo == 0 else 10 - modulo

    if check != int(cedula[9]):
        raise ValueError("Dígito verificador de la cédula no es válido")

    return cedula
