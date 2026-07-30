; Al desinstalar, borra tambien la config del operador (grs-desktop.json), que
; vive fuera del directorio de instalacion y sobrevivia a un reinstall: por eso
; reinstalar no arreglaba una URL vieja apuntando a localhost.
; La ruta es el identifier de tauri.conf.json — si cambia alla, cambia aca.
; No corre en la actualizacion automatica (el updater ejecuta el instalador
; nuevo, no el desinstalador), asi que actualizar no te borra los ajustes.
!macro NSIS_HOOK_POSTUNINSTALL
  RMDir /r "$APPDATA\com.leona.grs-integration"
!macroend
