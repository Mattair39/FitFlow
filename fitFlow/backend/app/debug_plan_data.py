# debug_plan_data.py
"""
Script para verificar los datos del plan y comidas
"""

import os
import sqlite3


def debug_plan_data(db_path=None):
    """Verificar los datos del plan específico"""

    # Buscar la base de datos
    possible_paths = [
        "fitflow.db",
        "database.db",
        "app.db",
        "backend/fitflow.db",
        "fitFlow/backend/fitflow.db"
    ]

    if db_path:
        actual_path = db_path
    else:
        actual_path = None
        for path in possible_paths:
            if os.path.exists(path):
                actual_path = path
                break

    if not actual_path:
        print("❌ No se encontró ninguna base de datos")
        return False

    print(f"📁 Analizando base de datos: {actual_path}")

    conn = sqlite3.connect(actual_path)
    cursor = conn.cursor()

    try:
        # Verificar el plan específico que está causando problemas
        print("\n🔍 PLANES RECIENTES:")
        cursor.execute("""
            SELECT p.plan_id, p.name, p.plan_date, p.created_at, p.user_id
            FROM nutrition_plans p
            ORDER BY p.created_at DESC
            LIMIT 5
        """)
        recent_plans = cursor.fetchall()

        for plan in recent_plans:
            plan_id, name, plan_date, created_at, user_id = plan
            print(f"Plan {plan_id}: {name} (Fecha: {plan_date or 'NULL'}, Usuario: {user_id})")

        if not recent_plans:
            print("❌ No se encontraron planes")
            return False

        # Verificar las comidas del plan más reciente
        most_recent_plan_id = recent_plans[0][0]
        most_recent_plan_name = recent_plans[0][1]

        print(f"\n🍽️ COMIDAS DEL PLAN '{most_recent_plan_name}' (ID: {most_recent_plan_id}):")
        cursor.execute("""
            SELECT npm.id, npm.meal_type, npm.portion_size, f.name as food_name, f.food_id
            FROM nutrition_plan_meals npm
            JOIN foods f ON npm.food_id = f.food_id
            WHERE npm.plan_id = ?
            ORDER BY npm.meal_type
        """, (most_recent_plan_id,))

        plan_meals = cursor.fetchall()

        if not plan_meals:
            print("❌ No se encontraron comidas para este plan")
            return False

        print(f"Total de comidas: {len(plan_meals)}")
        for meal in plan_meals:
            meal_id, meal_type, portion_size, food_name, food_id = meal
            print(f"  - {meal_type}: {food_name} (Porción: {portion_size}, Food ID: {food_id})")

        # Verificar registros de food_logs para el plan
        print("\n📝 REGISTROS DE COMIDAS PARA FECHA 2025-06-03:")
        cursor.execute("""
            SELECT fl.log_id, fl.meal_type, fl.portion_size, fl.date, f.name as food_name, f.food_id
            FROM food_logs fl
            JOIN foods f ON fl.food_id = f.food_id
            WHERE fl.date = '2025-06-03'
            ORDER BY fl.meal_type, f.name
        """)

        food_logs = cursor.fetchall()

        if food_logs:
            print(f"Total de registros: {len(food_logs)}")
            for log in food_logs:
                log_id, meal_type, portion_size, date, food_name, food_id = log
                print(f"  - {meal_type}: {food_name} (Consumido: {portion_size}, Food ID: {food_id})")
        else:
            print("❌ No hay registros de comidas para 2025-06-03")

        # Verificar si hay problemas de duplicados o inconsistencias
        print("\n🔍 ANÁLISIS DE CONSISTENCIA:")

        # Verificar duplicados en nutrition_plan_meals
        cursor.execute("""
            SELECT plan_id, meal_type, food_id, COUNT(*) as count
            FROM nutrition_plan_meals
            GROUP BY plan_id, meal_type, food_id
            HAVING COUNT(*) > 1
        """)
        duplicates = cursor.fetchall()

        if duplicates:
            print("⚠️ Comidas duplicadas encontradas:")
            for dup in duplicates:
                print(f"  Plan {dup[0]}, {dup[1]}, Food {dup[2]}: {dup[3]} veces")
        else:
            print("✅ No hay duplicados en comidas planificadas")

        # Verificar si todas las comidas del plan tienen alimentos válidos
        cursor.execute("""
            SELECT npm.id, npm.meal_type, npm.food_id
            FROM nutrition_plan_meals npm
            LEFT JOIN foods f ON npm.food_id = f.food_id
            WHERE f.food_id IS NULL
        """)
        orphaned_meals = cursor.fetchall()

        if orphaned_meals:
            print("⚠️ Comidas con alimentos inexistentes:")
            for orphan in orphaned_meals:
                print(f"  Meal ID {orphan[0]}: {orphan[1]}, Food ID {orphan[2]}")
        else:
            print("✅ Todas las comidas tienen alimentos válidos")

        # Sugerir una consulta de prueba
        print("\n💡 CONSULTA DE PRUEBA:")
        print("Para reproducir el problema manualmente, ejecuta:")
        print(f"SELECT COUNT(*) FROM nutrition_plan_meals WHERE plan_id = {most_recent_plan_id};")

        return True

    except Exception as e:
        print(f"❌ Error al analizar datos: {e}")
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    print("🔍 DEBUGGEANDO DATOS DEL PLAN")
    print("=" * 50)

    import sys

    db_path = sys.argv[1] if len(sys.argv) > 1 else None

    success = debug_plan_data(db_path)

    if success:
        print("\n💡 POSIBLES CAUSAS DEL PROBLEMA:")
        print("1. Las comidas no se están guardando correctamente en nutrition_plan_meals")
        print("2. Hay un problema en el joinedload que no carga todas las comidas")
        print("3. Existe una condición en el query que filtra comidas")
        print("4. Los food_logs no coinciden exactamente con meal_type + food_id")
        print("\n🔧 SIGUIENTE PASO:")
        print("1. Actualiza el endpoint con el debug habilitado")
        print("2. Accede al Food Log en el frontend")
        print("3. Revisa los logs del servidor para ver qué se imprime")