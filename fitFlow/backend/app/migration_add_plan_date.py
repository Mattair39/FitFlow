import os
import sqlite3
from datetime import date, timedelta


def run_migration(db_path="fitflow.db"):
    """Ejecuta la migración para agregar plan_date"""

    # Verificar si el archivo de BD existe
    if not os.path.exists(db_path):
        print(f"❌ Error: No se encontró la base de datos en {db_path}")
        return False

    # Crear respaldo
    backup_path = f"{db_path}.backup_{date.today().strftime('%Y%m%d')}"
    try:
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"✅ Respaldo creado: {backup_path}")
    except Exception as e:
        print(f"⚠️ No se pudo crear respaldo: {e}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Verificar si la columna ya existe
        cursor.execute("PRAGMA table_info(nutrition_plans)")
        columns = [column[1] for column in cursor.fetchall()]

        if 'plan_date' in columns:
            print("✅ La columna plan_date ya existe")
            return True

        print("🔄 Agregando columna plan_date...")

        # Agregar la columna plan_date
        cursor.execute("""
            ALTER TABLE nutrition_plans 
            ADD COLUMN plan_date DATE DEFAULT '2025-06-03'
        """)

        # Obtener todos los planes existentes
        cursor.execute("""
            SELECT plan_id, user_id, created_at 
            FROM nutrition_plans 
            ORDER BY user_id, created_at
        """)
        plans = cursor.fetchall()

        print(f"📋 Actualizando {len(plans)} planes existentes...")

        # Actualizar fechas de planes existentes para evitar conflictos
        # Asignar fechas escalonadas por usuario
        user_plan_count = {}

        for plan_id, user_id, _created_at in plans:
            if user_id not in user_plan_count:
                user_plan_count[user_id] = 0

            # Calcular fecha basada en created_at + offset para evitar duplicados
            base_date = date.today()
            offset_days = user_plan_count[user_id]
            plan_date = base_date + timedelta(days=offset_days)

            cursor.execute("""
                UPDATE nutrition_plans 
                SET plan_date = ? 
                WHERE plan_id = ?
            """, (plan_date.isoformat(), plan_id))

            user_plan_count[user_id] += 1

        # Crear índice único para user_id + nutritionist_id + plan_date
        print("🔄 Creando índice único...")
        cursor.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_user_nutritionist_date 
            ON nutrition_plans(user_id, nutritionist_id, plan_date)
        """)

        conn.commit()

        # Verificar la migración
        cursor.execute("SELECT COUNT(*) FROM nutrition_plans WHERE plan_date IS NOT NULL")
        updated_count = cursor.fetchone()[0]

        print("✅ Migración completada exitosamente!")
        print(f"📊 {updated_count} planes actualizados con fechas")
        print("🔒 Índice único creado para prevenir duplicados por día")

        # Mostrar algunos ejemplos
        cursor.execute("""
            SELECT plan_id, name, plan_date, user_id 
            FROM nutrition_plans 
            ORDER BY plan_date DESC 
            LIMIT 5
        """)
        samples = cursor.fetchall()

        print("\n📋 Muestra de planes actualizados:")
        for plan_id, name, plan_date, user_id in samples:
            print(f"  Plan {plan_id}: {name} → {plan_date} (Usuario {user_id})")

        return True

    except Exception as e:
        conn.rollback()
        print(f"❌ Error durante la migración: {e}")
        return False

    finally:
        conn.close()


if __name__ == "__main__":
    print("🚀 Iniciando migración de nutrition_plans...")

    # Intentar diferentes ubicaciones de la BD
    possible_paths = [
        "fitflow.db",
        "database.db",
        "app.db",
        "backend/fitflow.db",
        "fitFlow/backend/fitflow.db"
    ]

    db_found = False
    for path in possible_paths:
        if os.path.exists(path):
            print(f"📁 Base de datos encontrada: {path}")
            success = run_migration(path)
            db_found = True
            break

    if not db_found:
        print("❌ No se encontró la base de datos en las ubicaciones comunes.")
        print("💡 Ejecuta este script desde la carpeta que contiene tu archivo .db")
        print("   O especifica la ruta: python migration_add_plan_date.py tu_base_datos.db")

        import sys

        if len(sys.argv) > 1:
            custom_path = sys.argv[1]
            if os.path.exists(custom_path):
                run_migration(custom_path)
            else:
                print(f"❌ Archivo no encontrado: {custom_path}")

print("\n🏁 Migración finalizada")
