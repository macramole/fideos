// Socket.io
var socket = io();
var id = Math.round($.now() * Math.random());

// El DOM termina de cargar.
$(document).ready(function() {

    var doc = $(document);
    var win = $(window);
    var connections = $('#connections');
    var clients = {};
    var pointers = {};
    var prev = {};
    var lastEmit = $.now();

    // Selector de color
    $("#pallete .color").click(function(){
        currColor = STROKE_COLORS[$(this).index()];
    })

    /*

    connectionHandler()

    Muestra la cantidad de usuarios conectados en el DOM.

    */

    function connectionHandler(data) {
        $("#connected_users").text(data.connections);
    }

    /*

    externalMoveHandler()

    Maneja el movimiento de los punteros externos.

    */

    function externalMoveHandler(data) {

        // Si este Id no esta en los clientes actuales.
        if(!(data.id in clients)){
            // Asignamos un nodo único
            pointers[data.id] = $('<i class="pointer fa fa-mouse-pointer"></i>').appendTo('#pointers');
        }

        // Situamos el cursor externo
        pointers[data.id].css({
            'left' : data.x,
            'top' : data.y
        });

        // Actualizamos el array local de cientes
        clients[data.id] = data;
        clients[data.id].updated = $.now();

    }

    /*

    mouseMoveHandler()

    Cuando el mouse local se mueve.

    */

    function mouseMoveHandler(e) {

        // Chequeamos cuando fue el lastEmit para no emitir mensajes de mas
        if ($.now() - lastEmit > 20) {
            var movement = {
                'x': e.pageX,
                'y': e.pageY,
                'id': id
            }
            socket.emit("mousemove", movement);
            lastEmit = $.now();
        }

    }

    /*

    Capturamos los eventos del mouse

    */

    doc.on('mousemove', mouseMoveHandler);

    /*

    Socket.io events

    */

    socket.on('move', externalMoveHandler);
    socket.on('connections', connectionHandler);
    socket.on('user_disconnected',connectionHandler);

    // Borramos las conexiones viejas
    setInterval(function() {
        for (var i in clients) {
            if ($.now() - clients[i].updated > 5000) {
                pointers[i].remove();
                delete clients[i];
                delete pointers[i];
            }
        }
    }, 5000);


});// End ready


/*

mousePressed() - P5.js

Captura el mousePressed dentro del canvas de P5.js.

*/

function mousePressed() {

    var startGestureTime = 0;
    var t0 = startGestureTime = millis();

    // Creamos el currGesture (este es el que se dibuja desde p5.js)
    currGesture = new StrokeGesture(t0, dissapearing, fixed, lastGesture);

    // Creamos el nuevo ribbon
    ribbon = new Ribbon();
    ribbon.init();

    // Agregamos el punto al ribbon
    ribbon.addPoint(currGesture, currColor, currAlpha, mouseX, mouseY);

    // Objeto que se emite
    var movement = {
        'e': "PRESS",
        'x': mouseX,
        'y': mouseY,
        'color': currColor,
        'id': id
    }
    // Emitimos el evento a los demas clientes.
    socket.emit("externalMouseEvent", movement);

}

/*

mouseDragged() - P5.js

Captura el mouseDragged dentro del canvas de P5.js

*/

function mouseDragged() {
    if (currGesture) {
        var movement = {
            'e': "DRAGGED",
            'x': mouseX,
            'y': mouseY,
            'color': currColor,
            'id': id
        }
        socket.emit("externalMouseEvent", movement);

        ribbon.addPoint(currGesture, currColor, currAlpha, mouseX, mouseY);
    }
}

/*

mouseReleased() - P5.js

Captura el mouseReleased dentro del canvas de P5.js

*/

function mouseReleased() {
    if (currGesture) {

        // Agregamos el último punto
        ribbon.addPoint(currGesture, currColor, currAlpha, mouseX, mouseY);
        currGesture.setLooping(looping);
        currGesture.setEndTime(millis());

        // Pusheamos el gesture a la capa
        if (currGesture.visible) {
            layers[currLayer].push(currGesture);
        }

        var movement = {
            'e': "RELEASED",
            'x': mouseX,
            'y': mouseY,
            'color': currColor,
            'id': id
        }
        socket.emit("externalMouseEvent", movement);

        lastGesture = currGesture;
        currGesture = null;
    }
}


/*

socket.on -> "externalMouseEvent"

*/

socket.on('externalMouseEvent', function(data){

    /*
    MOUSE PRESS
    */

    if (data.e === "PRESS") {

        // Variables
        var startGestureTime = 0;
        var t0 = startGestureTime = millis();
        var lastGesture = null;
        var grouping = true;

        // Agregamos este gesture a la lista de gestures
        otherGestures.put(data.id,new StrokeGesture(t0, dissapearing, fixed, lastGesture));
        // Agregamos un ribbon
        otherRibbons.put(data.id,new Ribbon());
        // Inicializamos el ribbon
        otherRibbons.get(data.id).init();
        // Le agregamos este punto
        otherRibbons.get(data.id).addPoint(otherGestures.get(data.id), data.color, currAlpha, data.x, data.y);

    }

    /*
    MOUSE DRAGGED
    */

    if (data.e === "DRAGGED") {
        // Agregamos el punto
        otherRibbons.get(data.id).addPoint(otherGestures.get(data.id), data.color, currAlpha, data.x, data.y);
    }

    /*
    MOUSE RELEASED
    */

    if (data.e === "RELEASED"){

        // Seteamos el ultimo punto
        otherRibbons.get(data.id).addPoint(otherGestures.get(data.id), data.color, currAlpha, data.x, data.y);
        // Seteamos el looping
        otherGestures.get(data.id).setLooping(true);
        otherGestures.get(data.id).setEndTime(millis());
        // Lo agregamos a la capa local
        layers[currLayer].push(otherGestures.get(data.id));
        // Borramos este gesture
        otherGestures.remove(data.id);

    }


});