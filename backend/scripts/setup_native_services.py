import os
import sys
import time
import zipfile
import shutil
import urllib.request
import subprocess
import socket

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TOOLS_DIR = os.path.join(ROOT_DIR, "tools")
DOWNLOADS_DIR = os.path.join(TOOLS_DIR, "downloads")

SERVICES = {
    "redis": {
        "url": "https://github.com/taizod1024/redis-windows-fork/releases/download/8.10.1/Redis-8.10.1-Windows-x64-msys2.zip",
        "zip_name": "redis.zip",
        "target_dir": os.path.join(TOOLS_DIR, "redis")
    },
    "postgres": {
        "url": "https://get.enterprisedb.com/postgresql/postgresql-15.19-3-windows-x64-binaries.zip",
        "zip_name": "postgres.zip",
        "target_dir": os.path.join(TOOLS_DIR, "postgres")
    },
    "jdk": {
        "url": "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.6%2B7/OpenJDK21U-jdk_x64_windows_hotspot_21.0.6_7.zip",
        "zip_name": "jdk.zip",
        "target_dir": os.path.join(TOOLS_DIR, "jdk")
    },
    "neo4j": {
        "url": "https://dist.neo4j.org/neo4j-community-5.26.0-windows.zip",
        "zip_name": "neo4j.zip",
        "target_dir": os.path.join(TOOLS_DIR, "neo4j")
    }
}

def is_port_open(port: int, host="127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex((host, port)) == 0

def download_file(url: str, dest_path: str):
    if os.path.exists(dest_path):
        size_mb = os.path.getsize(dest_path) / (1024 * 1024)
        print(f"  [CACHE] {os.path.basename(dest_path)} exists ({size_mb:.1f} MB). Skipping download.")
        return

    print(f"  [DOWNLOADING] {url} -> {dest_path}")
    headers = {"User-Agent": "Mozilla/5.0"}
    req = urllib.request.Request(url, headers=headers)
    
    with urllib.request.urlopen(req) as resp, open(dest_path, "wb") as out_file:
        total = int(resp.headers.get("Content-Length", 0))
        downloaded = 0
        block_size = 1024 * 1024
        start_time = time.time()

        while True:
            buffer = resp.read(block_size)
            if not buffer:
                break
            downloaded += len(buffer)
            out_file.write(buffer)
            if total > 0:
                percent = (downloaded / total) * 100
                mb = downloaded / (1024 * 1024)
                total_mb = total / (1024 * 1024)
                speed = mb / (time.time() - start_time + 0.001)
                print(f"\r    Progress: {percent:5.1f}% ({mb:.1f}/{total_mb:.1f} MB) - {speed:.1f} MB/s", end="", flush=True)
        print()

def extract_zip(zip_path: str, extract_to: str):
    print(f"  [EXTRACTING] {zip_path} -> {extract_to}")
    os.makedirs(extract_to, exist_ok=True)
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)
    print("  [EXTRACTED] Complete.")

def find_binary(search_root: str, binary_name: str) -> str:
    for root, dirs, files in os.walk(search_root):
        if binary_name.lower() in [f.lower() for f in files]:
            return os.path.join(root, binary_name)
    return ""

def find_dir_containing(search_root: str, target_name: str) -> str:
    for root, dirs, files in os.walk(search_root):
        if target_name.lower() in [d.lower() for d in dirs]:
            return os.path.join(root, target_name)
    return ""

def setup_postgres():
    print("\n=== Configuring PostgreSQL 15 ===")
    pg_dir = SERVICES["postgres"]["target_dir"]
    initdb_exe = find_binary(pg_dir, "initdb.exe")
    pg_ctl_exe = find_binary(pg_dir, "pg_ctl.exe")
    psql_exe = find_binary(pg_dir, "psql.exe")

    if not initdb_exe or not pg_ctl_exe:
        print(f"  [ERROR] PostgreSQL binaries not found in {pg_dir}")
        return False

    data_dir = os.path.join(pg_dir, "data")
    log_file = os.path.join(pg_dir, "pg.log")

    if not os.path.exists(data_dir):
        print("  Initializing database cluster (data directory)...")
        cmd = [initdb_exe, "-D", data_dir, "-U", "clinicalkg", "-E", "UTF8", "--no-locale", "-A", "trust"]
        subprocess.run(cmd, check=True)

    # Check if already running on 5432
    if not is_port_open(5432):
        print("  Starting PostgreSQL daemon...")
        start_cmd = [pg_ctl_exe, "-D", data_dir, "-l", log_file, "start"]
        subprocess.run(start_cmd, check=True)
        time.sleep(2)

    # Configure user password and create clinicalkg database
    try:
        print("  Setting password for user 'clinicalkg'...")
        subprocess.run([psql_exe, "-U", "clinicalkg", "-c", "ALTER USER clinicalkg WITH PASSWORD 'clinicalkg_password';"], check=False)
        print("  Creating database 'clinicalkg' if not exists...")
        subprocess.run([psql_exe, "-U", "clinicalkg", "-c", "CREATE DATABASE clinicalkg;"], check=False)
    except Exception as e:
        print(f"  [WARNING] DB user/create step: {e}")

    print(f"  PostgreSQL ready on port 5432: {is_port_open(5432)}")
    return True

def setup_redis():
    print("\n=== Configuring Redis ===")
    redis_dir = SERVICES["redis"]["target_dir"]
    redis_server = find_binary(redis_dir, "redis-server.exe")

    if not redis_server:
        print(f"  [ERROR] redis-server.exe not found in {redis_dir}")
        return False

    if is_port_open(6379):
        print("  Redis is already running on port 6379.")
        return True

    print("  Starting Redis server...")
    subprocess.Popen([redis_server], cwd=os.path.dirname(redis_server), creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
    time.sleep(1)
    print(f"  Redis ready on port 6379: {is_port_open(6379)}")
    return True

def setup_neo4j():
    print("\n=== Configuring Neo4j 5 ===")
    jdk_dir = SERVICES["jdk"]["target_dir"]
    neo4j_dir = SERVICES["neo4j"]["target_dir"]

    # Find JAVA_HOME (directory containing bin/java.exe)
    java_exe = find_binary(jdk_dir, "java.exe")
    if not java_exe:
        print(f"  [ERROR] java.exe not found in {jdk_dir}")
        return False

    java_home = os.path.dirname(os.path.dirname(java_exe))
    print(f"  Found JAVA_HOME: {java_home}")

    neo4j_admin = find_binary(neo4j_dir, "neo4j-admin.bat")
    neo4j_bat = find_binary(neo4j_dir, "neo4j.bat")

    if not neo4j_bat:
        print(f"  [ERROR] neo4j.bat not found in {neo4j_dir}")
        return False

    env = os.environ.copy()
    env["JAVA_HOME"] = java_home
    env["PATH"] = f"{os.path.dirname(java_exe)};{env.get('PATH', '')}"

    # Set initial password
    print("  Setting initial Neo4j password to 'clinicalkg_password'...")
    try:
        subprocess.run(
            [neo4j_admin, "dbms", "set-initial-password", "clinicalkg_password"],
            env=env,
            check=False
        )
    except Exception as e:
        print(f"  Note: {e}")

    if is_port_open(7687):
        print("  Neo4j is already running on port 7687.")
        return True

    print("  Starting Neo4j server...")
    subprocess.run([neo4j_bat, "start"], env=env, check=False)
    
    # Wait for Neo4j to listen on 7687
    for _ in range(25):
        if is_port_open(7687):
            break
        time.sleep(1)

    print(f"  Neo4j ready on port 7687 (bolt): {is_port_open(7687)}")
    return True

def generate_helper_scripts():
    print("\n=== Generating Service Control Scripts ===")
    pg_dir = SERVICES["postgres"]["target_dir"]
    pg_ctl = find_binary(pg_dir, "pg_ctl.exe")
    data_dir = os.path.join(pg_dir, "data")
    log_file = os.path.join(pg_dir, "pg.log")

    redis_dir = SERVICES["redis"]["target_dir"]
    redis_server = find_binary(redis_dir, "redis-server.exe")

    jdk_dir = SERVICES["jdk"]["target_dir"]
    java_exe = find_binary(jdk_dir, "java.exe")
    java_home = os.path.dirname(os.path.dirname(java_exe)) if java_exe else ""

    neo4j_dir = SERVICES["neo4j"]["target_dir"]
    neo4j_bat = find_binary(neo4j_dir, "neo4j.bat")

    start_script = f"""@echo off
echo Starting Native Services for ClinicalKG...
if not "{pg_ctl}"=="" (
    echo [1/3] Starting PostgreSQL...
    "{pg_ctl}" -D "{data_dir}" -l "{log_file}" start
)
if not "{redis_server}"=="" (
    echo [2/3] Starting Redis...
    start /B "" "{redis_server}"
)
if not "{neo4j_bat}"=="" (
    echo [3/3] Starting Neo4j...
    set "JAVA_HOME={java_home}"
    "{neo4j_bat}" start
)
echo All services started!
"""
    with open(os.path.join(ROOT_DIR, "start_services.bat"), "w") as f:
        f.write(start_script)

    stop_script = f"""@echo off
echo Stopping Native Services for ClinicalKG...
if not "{pg_ctl}"=="" (
    echo [1/3] Stopping PostgreSQL...
    "{pg_ctl}" -D "{data_dir}" stop
)
if not "{redis_server}"=="" (
    echo [2/3] Stopping Redis...
    taskkill /F /IM redis-server.exe >nul 2>&1
)
if not "{neo4j_bat}"=="" (
    echo [3/3] Stopping Neo4j...
    set "JAVA_HOME={java_home}"
    "{neo4j_bat}" stop
)
echo All services stopped!
"""
    with open(os.path.join(ROOT_DIR, "stop_services.bat"), "w") as f:
        f.write(stop_script)

    print("  Generated start_services.bat and stop_services.bat")

def main():
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)

    print("==================================================")
    print("ClinicalKG — Native Windows Services Installer")
    print("==================================================")

    # Step 1: Download all
    for name, svc in SERVICES.items():
        zip_path = os.path.join(DOWNLOADS_DIR, svc["zip_name"])
        print(f"\nStep: Checking {name.upper()}...")
        download_file(svc["url"], zip_path)

    # Step 2: Extract all
    for name, svc in SERVICES.items():
        zip_path = os.path.join(DOWNLOADS_DIR, svc["zip_name"])
        target_dir = svc["target_dir"]
        if not os.path.exists(target_dir) or len(os.listdir(target_dir)) == 0:
            extract_zip(zip_path, target_dir)
        else:
            print(f"  [CACHE] {target_dir} already extracted.")

    # Step 3: Configure and start each
    setup_postgres()
    setup_redis()
    setup_neo4j()
    generate_helper_scripts()

    print("\n==================================================")
    print("Service Status:")
    print(f"  PostgreSQL (Port 5432): {'ONLINE' if is_port_open(5432) else 'OFFLINE'}")
    print(f"  Redis (Port 6379):      {'ONLINE' if is_port_open(6379) else 'OFFLINE'}")
    print(f"  Neo4j (Port 7687):      {'ONLINE' if is_port_open(7687) else 'OFFLINE'}")
    print("==================================================")

if __name__ == "__main__":
    main()
