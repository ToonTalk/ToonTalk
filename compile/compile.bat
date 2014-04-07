cd C:\Users\Ken\Documents\GitHub\ToonTalk
rem ADVANCED_OPTIMIZATIONS caused an error
rem later add back --js libraries\jquery.ui.touch-punch.min.js
java -jar c:\closure\compiler.jar --language_in ECMASCRIPT5_STRICT --js libraries\rationaljs.js --js libraries/jquery-2.1.0.js --js libraries/jquery-ui-1.10.4.custom/js/jquery-ui-1.10.4.custom.js  --js support\initial.js --js primitives\widget.js --js primitives\backside.js --js primitives\condition.js --js primitives\frontside.js --js primitives\number.js --js primitives\box.js --js primitives\robot.js --js support\display_updates.js --js support\robot_actions.js --js support\robot_action.js --js support\run_queue.js --js support\path.js --js support\utilities.js --compilation_level=SIMPLE_OPTIMIZATIONS --js_output_file=compile/toontalk.js
cd compile
