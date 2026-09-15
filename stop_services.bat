@echo off
echo Stopping Native Services for ClinicalKG...
if not "C:\Users\nithi\Desktop\Projects\ClinicKg\tools\postgres\pgsql\bin\pg_ctl.exe"=="" (
    echo [1/3] Stopping PostgreSQL...
    "C:\Users\nithi\Desktop\Projects\ClinicKg\tools\postgres\pgsql\bin\pg_ctl.exe" -D "C:\Users\nithi\Desktop\Projects\ClinicKg\tools\postgres\data" stop
)
if not "C:\Users\nithi\Desktop\Projects\ClinicKg\tools\redis\Redis-8.10.1-Windows-x64-msys2\redis-server.exe"=="" (
    echo [2/3] Stopping Redis...
    taskkill /F /IM redis-server.exe >nul 2>&1
)
if not "C:\Users\nithi\Desktop\Projects\ClinicKg\tools\neo4j\neo4j-community-5.26.0\bin\neo4j.bat"=="" (
    echo [3/3] Stopping Neo4j...
    set "JAVA_HOME=C:\Users\nithi\Desktop\Projects\ClinicKg\tools\jdk\jdk-21.0.6+7"
    "C:\Users\nithi\Desktop\Projects\ClinicKg\tools\neo4j\neo4j-community-5.26.0\bin\neo4j.bat" stop
)
echo All services stopped!
