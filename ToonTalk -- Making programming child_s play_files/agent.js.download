// JScript source code in common between ToonTalk dialogs used to provide MS Agent help
// last modified 13 04 2005 by Ken Kahn

var noMSAgentMessage = "Sorry, Peedy can only appear in Microsoft's Internet Explorer.";

var debugMessages = null;

function debug(message) {
	debugMessages = debugMessages + "\n" + message;
}

var breakFlag = true;

function breakHere(messages) {
   if (breakFlag) {
		reallyBreakHere();
   };
}

function agentEnd() {
// breakHere(debugMessages);
	if (Agent1 != null) {
		Agent1.Stop();
		Agent1.Hide();
	};
}

var Agent1 = null; // The main agent -- current default is Peedy
var mainLoopID = -1;
var explanationID = -1;
var mainLoopEvery = 1000;
var mouseOverWait = 1000; // wait a second before explaining what the mouse has hovered over
var interrupted = false;
var INITIALIZING = 0; // const
var currentState = INITIALIZING;
var stateStarted = INITIALIZING;
var nextStateWhenIdle = true;
var clickCount = 0;

var lastThingSaid = null; // but maybe not finished
var lastThingSaidCompletely = null; // went idle so must have finished

// actions obtained from http://agent.microsoft.com/agent2/sdk/samples/html/charview.htm 
var idleActionsList = "Idle2_1 Idle2_2 Idle3_1 Idle3_2 Idle1_1"; 
var idleActions = null;

var runningLocally = true;

function agentStart() {
   if (!useAgents) return; // turned off
   if (AgentControl.Characters == null) { // new on 130405 to run on browsers without MS Agent
	   alert(noMSAgentMessage);
	   return;
	};
   if (Agent1 != null) {
		// already started but might be hidden
		Agent1.Show();
		changeState(0); // start over
		clickCount = 0;
		return;
	};
	AgentControl.Connected = true;	// temp patch for IE4 PP1 -- really needed?
	     
   AgentControl.RaiseRequestErrors = false;
   var loadRequest = AgentControl.Characters.Load("Peedy", "Peedy.acs");
//   alert(loadRequest.Status);
   if (loadRequest.Status == 1) { // failed
   	// not installed so try the net
		loadRequest = AgentControl.Characters.Load("Peedy", "http://agent.microsoft.com/agent2/chars/peedy/peedy.acf");
		if (loadRequest.Status == 1) { // failed
		   useAgents = false;
			alert("Something went wrong trying to load Peedy. Sorry.");	 // changed from window.status to alert on 130405
			return;
		};
		if (loadRequest.Status != 0) { // new on 110906	 -- if not successful don't wait even if pending
		   useAgents = false;
		   alert("Loading Microsoft Agent characters from the Microsoft web site is currently not working. Sorry.");
		   alert("You can download Peedy from http://www.microsoft.com/msagent/downloads/user.asp#character instead.");
		   return;
		};
		runningLocally = false;		
	};
//	alert(loadRequest.Status);
//	alert(loadRequest.Status);
//	alert(loadRequest.Status);
	// Note that JScript strings require 2 slashes for every single slash in a string
	Agent1 = AgentControl.Characters.Character("Peedy");
	// Note that use of the Character method, which is optional in VBScript, is required in JScript
 //  alert(loadRequest.Status);
	Agent1.LanguageID = languageCode; // set in strings.js
	if (!runningLocally) {
		Agent1.Get("State", "Showing, Speaking, Gesturing, Hiding, Moving, Idling");
	};
//	if (startObjectID != null) { // this didn't make things look better and is just a hassle
//	    var startObject = document.getElementById(startObjectID);
//	    Agent1.MoveTo(offsetLeft(startObject)+window.screenLeft,offsetTop(startObject)+window.screenTop,0); // instantly
////	    startObject.visibility = false;
//	};
	Agent1.Show();
//	Agent1.Play("Greet");
	idleActions = idleActionsList.split(" ");

	changeState(1); // start at the beginning
	resumeMainLoop();
}

var paragraphs = null;
var index = -1; // is incremented before use

function mainLoop() {
	// default mainLoop is to read each paragraph -- over-ridden on specific dialog pages
   if (Agent1 == null) return; 
//   Agent1.Play("Read");
	if (paragraphs == null) {
		paragraphs = document.getElementsByTagName("p");
	};
	if (currentState == 0) { // initialized or re-initialized
		index = -1; // is incremented before use
		nextState();
	};
	var stop = paragraphs.length; 
//breakhere();
	if (enterState(currentState)) {
		index++;
		if (index >= stop) {
			say(bye);
			agentEnd();
			return; // done them all 
		};
	   while (paragraphs[index].innerText == "" || paragraphs[index].id == "DontRead") {
			index++;
			if (index >= stop) {
				say(bye);
				agentEnd();
				return; // no more
			};
		};
//		debug("currentState is " + currentState + " and index is " + index + " and about to explain " + paragraphs[index].innerText);
		explainObject(paragraphs[index].innerText,paragraphs[index]);
   };
}

function resumeMainLoop() {
	mainLoop(); // do it now and make sure will keep doing it
	if (mainLoopID < 0) {
		mainLoopID = setInterval("mainLoop()",mainLoopEvery);
	};
}

function interrupt() {
//	debug("Interrupted. ");
   interrupted = true;
   stateStarted = INITIALIZING; // since it wasn't finished
   Agent1.stop();
}

function interruptOver() {
   if (!interrupted || Agent1 == null) return;
	interrupted = false;
//	if (previousState != INITIALIZING) {
//		currentState = previousState; // resume what we were doing before the interrupt
// };
}

function offsetLeft(object) {
	var i=0;
	while(object.offsetParent != null){
		i += object.offsetLeft;
		object = object.offsetParent;
	};
	return i+object.offsetLeft;
}

function offsetTop(object) {
	var i=0;
	while(object.offsetParent != null){
		i += object.offsetTop;
		object = object.offsetParent;
	};
	return i+object.offsetTop;
}

var savedID = -1;
var savedDescription = null;

function explainNow(description, ID) {
	if (Agent1 == null) return;
	if (description == lastThingSaid) return; // just said this already
	if (ID == savedID) return; // just had this interrupt
	if (currentState == INITIALIZING) return; // maybe cursor just happens to be over some button on start up -- not clear if it helps much
   savedID = ID;
   savedDescription = description;
//   if (explanationID != 0) { // already planning on an interrupt so skip the old one
//      clearTimeout(explanationID);
//   };
	explanationID = setTimeout("reallyExplain()",mouseOverWait);
}
	
function reallyExplain() {
   interrupt();
	explain(savedDescription, savedID);
}

var lastDescriptionExplained = null;
var lastIDExplained = null;

function explain(description, ID) {
   if (description == lastDescriptionExplained && lastIDExplained == ID) return; // already did or doing this
   lastDescriptionExplained = description;
   lastIDExplained = ID;
	explainObject(description, document.getElementById(ID));
}

function explainObject(description, object) {
	var x = 100; // defaults in case name is wrong -- better to signal an error?
	var y = 100;
	var left = 0;
	var top = 0;
	var moveToX = x;
	var moveToY = y;
	if (object != null) {
	   left = offsetLeft(object)+window.screenLeft;
		top = offsetTop(object)+window.screenTop;
		x = left+object.offsetWidth/2; // center
		y = top+object.offsetHeight/2;	
		moveToX = x-2*(Agent1.width/3); // 2/3 looks better than 1/2
		moveToY = top-Agent1.height;			
		if (moveToX < 0) { // partially off screen
			moveToX = left+object.offsetWidth; // move to other side
		};
		if (moveToY < 0) { // partially off top
			moveToY = top+object.offsetHeight; // move under it
			moveToX = moveToX+50; // not sure why but works better
		};
	};
   Agent1.MoveTo(moveToX,moveToY); 
   Agent1.GestureAt(x,y);
   say(description);
//   debug("Just moved to " + moveToX + "," + moveToY + " and gestured at " + x + "," + y + " and said " + description);
}

function stopExplaining() { // e.g. mouse moved out
	if (Agent1 == null) return;
   clearTimeout(explanationID);
   explanationID = -1;
   interruptOver();
}

function reactToAgentClicked(characterID, button, shift, x, y) {
	if (button != 1) return;
   interrupt();   
   clickCount++;
   if (clickCount == 1) {
		Agent1.Play("Surprised");
		say(clickedFirstReactions);
	} else if (clickCount == 2) {
	   Agent1.Play("Sad");
	   say(clickedFinalReactions);
	} else {
	   say(bye);
	   agentEnd();
	};
}

function idleAgent(characterID) {
	if (Agent1 == null) return;
	lastThingSaidCompletely = lastThingSaid;
	if (interrupted) {
//      interrupted = false;
//		debug("Idle, so interrupt over.");
      interruptOver();
   };
	if (nextStateWhenIdle) {
	   nextState();
//	   debug("Idle, so going to state " + currentState);
	   resumeMainLoop();	
   } else {
		var action = idleActions[Math.round(Math.random()*(idleActions.length-1))];
//		debug("Idle so about to " + action);
		if (action != "undefined") {
			Agent1.Play(action);
		};
	};
}

function finishedSaying(message) {
   return(message = lastThingSaidCompletely);
};

function changeState(newState) {
   if (currentState == newState) return; // nothing to do
// 	debug("State changed to " + newState);
//   previousState = currentState;
	currentState = newState;
	stateStarted = INITIALIZING;
}

function nextState() {
   changeState(currentState+1);
}

function say(something) {
   if (Agent1 != null && lastThingSaid != something) {
      Agent1.Speak(something);
      lastThingSaid = something;
   };
}

function enterState(state) { // OK to enter this state since not already in it
  if (currentState == state && stateStarted != state && !interrupted) {
     stateStarted = state;
     return(true);
  } else {
     return(false);
  };
}

function moveDown(amount) {
   if (Agent1 != null) {
      Agent1.MoveTo(Agent1.left,Agent1.top+amount);
   };
}
