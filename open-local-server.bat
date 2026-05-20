@echo off
cd /d "%~dp0"
echo Starting Kitty Learn at http://localhost:5173 ...
echo Open alphabet.html or index.html from the file list.
npx --yes http-server . -p 5173 -c-1 -o
pause
