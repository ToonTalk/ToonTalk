cd C:\Users\Ken\Documents\GitHub\ToonTalk
rem ADVANCED_OPTIMIZATIONS caused an error
rem later add back --js libraries\jquery.ui.touch-punch.min.js
rem min.js versions of JQuery UI caused errors
rem --js libraries/jquery-ui-1.11.2.custom/jquery-ui.js caused error in tooltips:
rem Uncaught TypeError: Cannot assign to read only property 'complete' of true
java -jar c:\bin\closure\compiler.jar --language_in ECMASCRIPT5_STRICT --js libraries\rationaljs.js --js libraries/jquery.dataTables.min.js --js support\initial.js --js support\functions.js --js primitives\widget.js --js primitives\backside.js --js primitives\frontside.js --js primitives\number.js --js primitives\box.js --js primitives\bird.js --js primitives/scale.js --js primitives\robot.js --js primitives\element.js --js primitives\sensor.js --js tools/tool.js --js tools/vacuum.js --js tools/wand.js --js support\settings.js --js support\display_updates.js --js support\robot_actions.js --js support\robot_action.js --js support\run_queue.js --js support\path.js --js support\publish.js --js support\google_drive.js --js support\utilities.js --compilation_level=SIMPLE_OPTIMIZATIONS --externs  compile\externs.js --js_output_file=compile/toontalk.js
cd compile
