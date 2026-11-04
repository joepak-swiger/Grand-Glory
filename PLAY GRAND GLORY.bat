@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 (
  echo Could not open the GRAND GLORY project folder.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on PATH.
  echo Install the project's supported Node.js version, or repair your existing Node manager setup.
  echo If NVM reports NVM4306, review and resolve its trust warning using your normal NVM instructions.
  echo This launcher will not bypass NVM trust checks.
  pause
  popd
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found on PATH. Repair the existing Node.js/npm installation and try again.
  echo If NVM reports NVM4306, resolve its trust warning yourself; this launcher will not bypass it.
  pause
  popd
  exit /b 1
)

node --version
if errorlevel 1 goto :node_error
call npm --version
if errorlevel 1 goto :npm_error

if not exist "node_modules\vite\bin\vite.js" (
  goto :install_deps
)
if not exist "node_modules\pixi.js" (
  goto :install_deps
)
goto :dependencies_ready

:install_deps
  echo GRAND GLORY dependencies are missing. Running npm ci...
  call npm ci
  if errorlevel 1 goto :install_error

:dependencies_ready

node "scripts\play-grand-glory.mjs"
if errorlevel 1 (
  echo.
  echo GRAND GLORY could not start. Review the message above and correct the reported issue.
  pause
)
popd
exit /b 0

:node_error
echo Node.js failed to start. Check your installation and PATH.
echo If NVM reports NVM4306, resolve its trust warning through your normal NVM process; this launcher will not bypass it.
pause
popd
exit /b 1
:npm_error
echo npm failed to start. Check your installation and PATH.
echo If you see NVM4306, do not bypass its trust warning.
pause
popd
exit /b 1
:install_error
echo Dependency installation failed. No trust checks or security protections were bypassed.
pause
popd
exit /b 1
