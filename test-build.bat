@echo off
echo ==========================================
echo   Testando Admin pedifacil - Build
echo ==========================================
echo.

if not exist "release\0.0.0\win-unpacked\Admin pedifacil.exe" (
    echo ERRO: Aplicacao nao encontrada!
    echo Execute primeiro: npm run build
    pause
    exit /b 1
)

echo Iniciando aplicacao buildada...
echo Verifique se aparece algum erro no console.
echo.
echo Pressione Ctrl+C para parar
echo.

start "" "release\0.0.0\win-unpacked\Admin pedifacil.exe"

echo Aplicacao iniciada!
echo.
echo Se a tela ficar branca, verifique:
echo 1. Arquivo .env com variaveis do Firebase
echo 2. Console de erro (F12 na aplicacao)
echo.
pause 