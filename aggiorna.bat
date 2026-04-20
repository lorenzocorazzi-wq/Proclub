@echo off
echo Aggiornamento dati Billocchi Club...
node scripts/fetch-ea-data.js
if %errorlevel% neq 0 (
  echo ERRORE: fetch fallito. Controlla la connessione.
  pause
  exit /b 1
)
git add data/
git commit -m "Update dati EA"
git push
echo.
echo Fatto! Il sito si aggiornera' in ~30 secondi.
pause
