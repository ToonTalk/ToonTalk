cd C:\Users\Ken\Documents\GitHub\ToonTalk
rem ADVANCED_OPTIMIZATIONS caused an error
java -jar c:\closure\compiler.jar --language_in ECMASCRIPT5_STRICT --js actions\copy.js --js actions\copy_constant.js --js actions\drop.js --js actions\pick_up.js --js actions\pick_up_constant.js --js primitives\widget.js --js primitives\backside.js --js primitives\condition.js --js primitives\frontside.js --js primitives\number.js --js primitives\box.js --js primitives\robot.js --js support\display_updates.js --js support\robot_actions.js --js support\run_queue.js --js support\path_to_entire_context.js --js support\utilities.js --js tests\tests.js --js compile\index.js --js=libraries\rationaljs.js --compilation_level=SIMPLE_OPTIMIZATIONS --js_output_file=compile/toontalk.js
cd compile
