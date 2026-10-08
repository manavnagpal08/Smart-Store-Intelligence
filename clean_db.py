import sqlite3

def clean():
    conn = sqlite3.connect('smart_store.db')
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events WHERE event_type = 'FIGHT_ALTERCATION'")
    conn.commit()
    count = cursor.execute("SELECT COUNT(*) FROM events").fetchone()[0]
    print(f"Cleaned old fight events. Remaining events in DB: {count}")
    conn.close()

if __name__ == "__main__":
    clean()
