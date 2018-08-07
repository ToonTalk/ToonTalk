cd C:\Users\Ken\Documents\GitHub\ToonTalk
rem ADVANCED_OPTIMIZATIONS caused the Fibonacci test to fail by doing nothing
rem caused errors:  --js libraries\jquery.ui.touch-punch.min.js -- need to test again
rem java -jar c:\bin\closure\closure-compiler-v20161201.jar --compilation_level ADVANCED_OPTIMIZATIONS ^
java -jar c:\bin\closure\closure-compiler-v20170626.jar ^
 --language_in ECMASCRIPT5_STRICT ^
 --language_in=ECMASCRIPT6 ^
 --create_source_map compile/toontalk-source.map ^
 --js libraries\rationaljs.js ^
 --js libraries/DataTables-1.10.13/media/js/jquery.dataTables.js ^
 --js libraries/jquery-ui-1.12.1.custom/jquery-ui.js ^
 --js libraries\jquery.ui.touch-punch.min.js ^
 --js support\initial.js ^
 --js support\functions.js ^
 --js primitives\widget.js ^
 --js primitives\backside.js ^
 --js primitives\frontside.js ^
 --js primitives\number.js ^
 --js primitives\box.js ^
 --js primitives\bird.js ^
 --js primitives/scale.js ^
 --js primitives\robot.js ^
 --js primitives\element.js ^
 --js primitives\sensor.js ^
 --js tools/tool.js ^
 --js tools/vacuum.js ^
 --js tools/wand.js ^
 --js support\settings.js ^
 --js support\display_updates.js ^
 --js support\robot_actions.js ^
 --js support\robot_action.js ^
 --js support\run_queue.js ^
 --js support\path.js ^
 --js support\publish.js ^
 --js support\google_drive.js ^
 --js support\utilities.js --compilation_level=SIMPLE_OPTIMIZATIONS --externs  compile\externs.js ^
 --js_output_file=compile/compiled_toontalk.js
cd compile
