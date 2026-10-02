/*
Torus geometry parameters:
TORUS_R: major radius (distance from center of donut hole to center of tube)
TORUS_r: minor radius (radius of the tube)
NODE_RADIUS: physical radius of a snake pellet on the torus surface
*/
const TORUS_R = 1.0;
const TORUS_r = 0.5;
const NODE_RADIUS = 0.054;

// This is the number of positions stored in the node queue.
// This determines the velocity.
var NODE_QUEUE_SIZE = 8;

var STARTING_DIRECTION = (Math.sqrt(5) - 1) / 2;
var PAUSED = false;

var cnv, ctx, width, height, centerX, centerY, points, stopped;

var clock; // Absolute time since last update.
var accumulatedDelta = 0; // How much delta time is built up.

// An array of snake nodes.
var snake;
var snake_head_size = 8;  //total including head (pos=0) and tail (pos=7)

// Point representing the pellet to eat.
var pellet;

var snakeVelocity;

// Straight 3D distance required to have two nodes colliding.
var collisionDistance = 1.9 * NODE_RADIUS;

// The angle of the current snake direction on the torus tangent plane in radians.
// 0 = East (+u, along major circle), PI/2 = South (+v, along minor tube circle)
var direction = STARTING_DIRECTION;

var focalLength = 550;
var cameraDistance = 3.2;

var leftDown, rightDown;
var slowDown;

var score = 0;

const btnMoveLeft = document.querySelector("#move_left");
function setLeft(val) {
    if (val) {
        leftDown = true;
        btnMoveLeft.classList.add("down");
    } else {
        leftDown = false;
        btnMoveLeft.classList.remove("down");   
    }
}

const btnMoveRight = document.querySelector("#move_right");
function setRight(val) {
    if (val) {
        rightDown = true;
        btnMoveRight.classList.add("down");
    } else {
        rightDown = false;
        btnMoveRight.classList.remove("down");   
    }
}

const btnMoveUp = document.querySelector("#move_forwards");
function setTurbo(turbo) {
    if (turbo) btnMoveUp.classList.add("down");
    else btnMoveUp.classList.remove("down");
    snakeVelocity = NODE_RADIUS * 2 / (NODE_QUEUE_SIZE + 1) * (turbo ? 1.75 : 1.0);
}

const btnToggleDir = document.querySelector("#toggle_direction");
function setSlow(val) {
    slowDown = val;
    if (slowDown) {
        document.getElementById("fixDir").click();
        // btnToggleDir.classList.add("down");
    } else {
        // btnToggleDir.classList.remove("down");
    }
}

function togglePause() {
    if (PAUSED) {
        PAUSED = false;
        document.getElementById('paused').style = 'display:none';
        window.requestAnimationFrame(update);
    } else {
        PAUSED = true;
        document.getElementById('paused').style = 'display:block';
    }
}
function handlePAUSE(e) {
    e.preventDefault();
    if (e.code == "Space") togglePause();
}
window.addEventListener('keydown', handlePAUSE);


function doPowerUP(e) {
    if (PAUSED || stopped) return;
    let count = 50;
    const interval = setInterval(() => {
            incrementScore();
            addSnakeNode();
            if (--count <= 0) clearInterval(interval);
        }, 50);

    // set and unset disabled
    this.disabled = true;
    setInterval(() => {
        this.disabled=false
    }, 2250)
    e.preventDefault();
}
document.querySelector("#PUP").addEventListener("click", doPowerUP);

/* "toggle direction button" stuff */
let orDir = direction;
let toggledTheDir = document.getElementById("fixDir").checked; //interface controls the visual-default
function toggleDir() {
    if (toggledTheDir) {
        orDir = direction;
        direction = 0;  //East
    } else {
        direction = orDir;
    }

    document.getElementById("show-dir1").innerText = orDir.toFixed(1);
    document.getElementById("show-dir4").innerText = orDir.toFixed(4);
}
document.querySelector("#fixDir").addEventListener("input", function (e) {
    toggledTheDir = this.checked;
    toggleDir();
})


window.addEventListener('keydown', function(e) {
    if (e.key == "ArrowLeft"  || e.code == "KeyA") setLeft(true);
    if (e.key == "ArrowRight" || e.code == "KeyD") setRight(true);
    if (e.key == "ArrowUp" || e.code == "KeyW") setTurbo(true);
    if (e.key == "ArrowDown" || e.code == "KeyS") {
        if (e.repeat) setSlow(true);
        else document.getElementById("fixDir").click();
        btnToggleDir.classList.add("down");
    }

    if (e.code == "KeyQ") {
        if (toggledTheDir)
            direction = 0 - Math.PI / 2;
        else
            direction -= Math.PI / 2;
    }
    if (e.code == "KeyE") {
        if (toggledTheDir)
            direction = 0 + Math.PI / 2;
        else
            direction += Math.PI / 2;
    }
});

window.addEventListener('keyup', function(e) {
    if (e.key == "ArrowLeft"  || e.code == "KeyA") setLeft(false);
    if (e.key == "ArrowRight" || e.code == "KeyD") setRight(false);
    if (e.key == "ArrowUp" || e.code == "KeyW") setTurbo(false);
    if (e.key == "ArrowDown" || e.code == "KeyS") {
        setSlow(false);
        btnToggleDir.classList.remove("down");
    }

    if (e.code == "KeyT" && (!e.repeat)) document.getElementById("fixDir").click();
    /*
    // TODO: mirror of "E" toggle zero (east) direction functionalty. with a
    // self-determined not-east; details TBD....

    just the UI consequences give me a headache (make my head spin)
    */

});

btnMoveLeft.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    setLeft(true);
});
btnMoveLeft.addEventListener("pointerleave", function (e) {
    e.preventDefault();
    setLeft(false);
});
btnMoveLeft.addEventListener("pointerup", function (e) {
    e.preventDefault();
    setLeft(false);
});
btnMoveLeft.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});

btnMoveRight.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    setRight(true);
});
btnMoveRight.addEventListener("pointerleave", function (e) {
    e.preventDefault();
    setRight(false);
});
btnMoveRight.addEventListener("pointerup", function (e) {
    e.preventDefault();
    setRight(false);
});
btnMoveRight.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});

btnToggleDir.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    slowDown = true;
});
btnToggleDir.addEventListener("pointerleave", function (e) {
    e.preventDefault();
    slowDown = false;
});
btnToggleDir.addEventListener("pointerup", function (e) {
    e.preventDefault();
    slowDown = false;
});
btnToggleDir.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});

btnMoveUp.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    setTurbo(true);
});
btnMoveUp.addEventListener("pointerleave", function (e) {
    e.preventDefault();
    setTurbo(false);
});
btnMoveUp.addEventListener("pointerup", function (e) {
    e.preventDefault();
    setTurbo(false);
});
btnMoveUp.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});

function restartGame (e) {
    e.preventDefault();
    window.location.reload(true);
}
document.querySelector("#refresh").addEventListener("click", restartGame)


function regeneratePellet() {
    // Rejection sampling for uniform surface area distribution on torus: dA = r * (R + r * cos(v)) du dv
    var u, v;
    while (true) {
        u = Math.random() * Math.PI * 2;
        v = Math.random() * Math.PI * 2;
        var maxDensity = TORUS_R + TORUS_r;
        var density = TORUS_R + TORUS_r * Math.cos(v);
        if (Math.random() * maxDensity <= density) {
            break;
        }
    }
    pellet = { u: u, v: v };
}

// Local 3D point on torus for given toroidal coordinates (u, v)
function torusPoint(u, v) {
    var cosV = Math.cos(v);
    var sinV = Math.sin(v);
    var cosU = Math.cos(u);
    var sinU = Math.sin(u);
    return {
        x: (TORUS_R + TORUS_r * cosV) * cosU,
        y: (TORUS_R + TORUS_r * cosV) * sinU,
        z: TORUS_r * sinV
    };
}

// Outward unit normal vector on torus at (u, v)
function torusNormal(u, v) {
    var cosV = Math.cos(v);
    var sinV = Math.sin(v);
    var cosU = Math.cos(u);
    var sinU = Math.sin(u);
    return {
        x: cosV * cosU,
        y: cosV * sinU,
        z: sinV
    };
}

// Orthonormal Darboux frame {Tu, Tv, N} on torus at (u, v)
// Tu: unit tangent along major circle (East / +u)
// Tv: unit tangent along minor circle (South / +v)
// N: outward unit normal (Tu x Tv = N)
function torusFrame(u, v) {
    var cosV = Math.cos(v);
    var sinV = Math.sin(v);
    var cosU = Math.cos(u);
    var sinU = Math.sin(u);
    var Tu = { x: -sinU, y: cosU, z: 0 };
    var Tv = { x: -sinV * cosU, y: -sinV * sinU, z: cosV };
    var N = { x: cosV * cosU, y: cosV * sinU, z: sinV };
    return { Tu: Tu, Tv: Tv, N: N };
}

function dot3D(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

// Project point (u, v) to camera space using Darboux frame at head
function projectTorusPoint(u, v, headPos, headFrame) {
    var p = torusPoint(u, v);
    var np = torusNormal(u, v);
    var dp = {
        x: p.x - headPos.x,
        y: p.y - headPos.y,
        z: p.z - headPos.z
    };
    var xcam = dot3D(dp, headFrame.Tu);
    var ycam = dot3D(dp, headFrame.Tv);
    var zcam = -dot3D(dp, headFrame.N); // into screen
    var depth = zcam + cameraDistance;

    // Normal dot product with head normal: > 0 means front-facing surface
    var dotNorm = dot3D(np, headFrame.N);

    var sx = centerX + focalLength * (xcam / depth);
    var sy = centerY + focalLength * (ycam / depth);

    return {
        sx: sx,
        sy: sy,
        depth: depth,
        dotNorm: dotNorm,
        p: p
    };
}

function addSnakeNode() {
    var last = snake[snake.length - 1];
    var lastPos = last.posQueue[NODE_QUEUE_SIZE - 1];
    var newNode = {
        u: lastPos.u,
        v: lastPos.v,
        posQueue: []
    };
    for (var i = 0; i < NODE_QUEUE_SIZE; i++) {
        newNode.posQueue.push({ u: lastPos.u, v: lastPos.v });
    }
    snake.push(newNode);
}

function incrementScore() {
    score += 1;
    document.querySelector("#score").innerHTML = "Score: " + score;
}

function init() {
    cnv = document.getElementsByTagName('canvas')[0];
    ctx = cnv.getContext('2d');
    width = cnv.width;
    height = cnv.height;
    centerX = width / 2;
    centerY = height / 2;
    points = [];
    clock = Date.now();
    leftDown = false;
    rightDown = false;

    toggledTheDir = false;
    document.getElementById("fixDir").checked = toggledTheDir;

    snakeVelocity = (NODE_RADIUS * 2) / (NODE_QUEUE_SIZE + 1);

    // Generate grid dots covering the 3D torus
    var nU = 60;
    var nV = 32;
    for (var i = 0; i < nU; i++) {
        for (var j = 0; j < nV; j++) {
            points.push({
                u: (i / nU) * Math.PI * 2,
                v: (j / nV) * Math.PI * 2
            });
        }
    }

    // Initialize head at outer equator
    var u0 = 0;
    var v0 = 0;

    // Generate backward history for initial snake nodes
    var history = [{ u: u0, v: v0 }];
    var currU = u0, currV = v0;
    var dirBack = STARTING_DIRECTION + Math.PI;
    var cosB = Math.cos(dirBack), sinB = Math.sin(dirBack);
    var totalSteps = snake_head_size * (NODE_QUEUE_SIZE + 1);
    for (var s = 0; s < totalSteps; s++) {
        var du = (snakeVelocity * cosB) / (TORUS_R + TORUS_r * Math.cos(currV));
        var dv = (snakeVelocity * sinB) / TORUS_r;
        currU = (currU + du) % (Math.PI * 2);
        if (currU < 0) currU += Math.PI * 2;
        currV = (currV + dv) % (Math.PI * 2);
        if (currV < 0) currV += Math.PI * 2;
        history.push({ u: currU, v: currV });
    }

    snake = [];
    for (var i = 0; i < snake_head_size; i++) {
        var idx = i * (NODE_QUEUE_SIZE + 1);
        var pos = history[idx];
        var q = [];
        for (var k = 0; k < NODE_QUEUE_SIZE; k++) {
            q.push(history[idx + 1 + k]);
        }
        snake.push({
            u: pos.u,
            v: pos.v,
            posQueue: q
        });
    }

    regeneratePellet();

    window.requestAnimationFrame(update);
}

function update() {
    if (stopped) return;
    var curr = Date.now();
    var delta = curr - clock;
    clock = curr;

    accumulatedDelta += delta;
    var targetDelta = 15;
    if (accumulatedDelta > targetDelta * 4) {
        // Cap the accumulated delta. Avoid an unbounded number of updates. Slow down game.
        accumulatedDelta = targetDelta * 4;
    }

    while (accumulatedDelta >= targetDelta) {
        accumulatedDelta -= targetDelta;
        checkCollisions();
        
        if (leftDown) direction -= .08;
        if (rightDown) direction += .08;
        document.getElementById("showDir").value = direction;

        applySnakeRotation();
    }
    render();
    if (PAUSED) {
        //block the animationframe
        return;
    } else {
        window.requestAnimationFrame(update);
    }
}

function drawNodePoint(proj, radius, red, blue, alphaMultiplier=1.0) {
    var r = Math.max(1.0, focalLength * (radius / proj.depth));
    var depthColor = Math.floor(Math.max(40, 255 - (proj.depth / 6.0) * 200));
    var alpha = Math.min(1.0, Math.max(0.1, (1 - (proj.depth - cameraDistance) / 4.0) * alphaMultiplier));
    ctx.fillStyle = "rgba(" + red + ", " + blue + ", " + depthColor + ", " + alpha + ")";
    ctx.beginPath();
    ctx.arc(proj.sx, proj.sy, r, 0, Math.PI * 2);
    ctx.fill();
}

function renderAngleDir(direction_, strokeStyle="#FFF") {
    // `green` means "are we drawing the toggle stored angle at `orDir` or not?"
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    var r = (NODE_RADIUS * focalLength / cameraDistance) * 2.2;
    ctx.lineTo(centerX + Math.cos(direction_) * r,
        centerY + Math.sin(direction_) * r);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 3;
    ctx.stroke();
}

function render() {
    ctx.clearRect(0, 0, width, height);

    var head = snake[0];
    var headPos = torusPoint(head.u, head.v);
    var headFrame = torusFrame(head.u, head.v);

    // Project background grid dots
    var farDots = [];
    var nearDots = [];
    for (var i = 0; i < points.length; i++) {
        var pt = points[i];
        var proj = projectTorusPoint(pt.u, pt.v, headPos, headFrame);
        if (proj.dotNorm > 0) nearDots.push(proj);
        else farDots.push(proj);
    }

    // 1. Draw far background dots
    for (var i = 0; i < farDots.length; i++) {
        var d = farDots[i];
        var alpha = Math.max(0.06, 0.28 - d.depth / 9.0);
        var r = Math.max(0.6, focalLength * (0.0035 / d.depth));
        ctx.fillStyle = "rgba(120, 140, 160, " + alpha + ")";
        ctx.beginPath();
        ctx.arc(d.sx, d.sy, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Prepare snake nodes projection
    var snakeDrawList = [];
    for (var i = 0; i < snake.length; i++) {
        var proj = projectTorusPoint(snake[i].u, snake[i].v, headPos, headFrame);
        /* the first 6 andor 7 nodes don't self-collide.
        this fixes the instakills caused by the toggle-fix toggle control.
        this 7 (strict less than) pellets get a blue hue.
        and the last one ("the neck") gets marked specially */
        let blue;
        if (i < snake_head_size - 1) blue = 80;
        else if (i == snake_head_size - 1) blue = 180;
        else blue = 0;
        snakeDrawList.push({
            index: i,
            proj: proj,
            blue: blue,
            red: 120
        });
    }

    // Pellet projection
    var pelletProj = projectTorusPoint(pellet.u, pellet.v, headPos, headFrame);

    // 2. Draw far snake nodes and far pellet
    for (var i = 0; i < snakeDrawList.length; i++) {
        var item = snakeDrawList[i];
        if (item.proj.dotNorm <= 0) {
            drawNodePoint(item.proj, NODE_RADIUS, item.red, item.blue, 0.45);
        }
    }
    if (pelletProj.dotNorm <= 0) {
        drawNodePoint(pelletProj, NODE_RADIUS, 0, 0, 0.45);
    }

    // 3. Draw near background dots
    for (var i = 0; i < nearDots.length; i++) {
        var d = nearDots[i];
        var alpha = Math.max(0.18, 0.85 - d.depth / 7.0);
        var r = Math.max(1.0, focalLength * (0.0045 / d.depth));
        var depthColor = Math.floor(Math.max(20, 200 - (d.depth / 6.0) * 180));
        ctx.fillStyle = "rgba(" + depthColor + ", " + depthColor + ", " + (depthColor + 30) + ", " + alpha + ")";
        ctx.beginPath();
        ctx.arc(d.sx, d.sy, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // 4. Draw near snake nodes sorted by depth (furthest near-side first, head last)
    var nearSnake = [];
    for (var i = 0; i < snakeDrawList.length; i++) {
        if (snakeDrawList[i].proj.dotNorm > 0) nearSnake.push(snakeDrawList[i]);
    }
    nearSnake.sort(function(a, b) { return b.proj.depth - a.proj.depth; });
    for (var i = 0; i < nearSnake.length; i++) {
        var item = nearSnake[i];
        drawNodePoint(item.proj, NODE_RADIUS, item.red, item.blue, 1.0);
    }

    // 5. Draw near pellet
    if (pelletProj.dotNorm > 0) {
        drawNodePoint(pelletProj, NODE_RADIUS, 0, 0, 1.0);
    }

    // 6. Draw angle & direction arrows
    renderAngleDir(direction);
    // draw "next" toggle/untoggle original-Direction angle
    if (toggledTheDir) {
        var color = "#48E56C"; //green
        renderAngleDir(orDir, color);
        var r = (NODE_RADIUS * focalLength / cameraDistance) * 2.2;
        ctx.beginPath();
        ctx.arc(
            centerX + Math.cos(direction) * r,
            centerY + Math.sin(direction) * r,
            10, 0, Math.PI, false);  //with `false` the + green direction looks forwards ->
        ctx.fillStyle = color;
        ctx.lineWidth = 1;
        ctx.fill();
    } else {
        var color = "#FF7851"; //red
        renderAngleDir(orDir, color);
        var r = (NODE_RADIUS * focalLength / cameraDistance) * 2.2;
        ctx.beginPath();
        ctx.arc(
            centerX + Math.cos(orDir) * r,
            centerY + Math.sin(orDir) * r,
            20, direction, direction+Math.PI, true);
        ctx.fillStyle = color;
        ctx.lineWidth = 1;
        ctx.fill();
    }
}

function applySnakeRotation() {
    var head = snake[0];
    var cosD = Math.cos(direction);
    var sinD = Math.sin(direction);

    // Torus metric: ds^2 = (R + r*cos(v))^2 du^2 + r^2 dv^2
    var du = (snakeVelocity * cosD) / (TORUS_R + TORUS_r * Math.cos(head.v));
    var dv = (snakeVelocity * sinD) / TORUS_r;

    var newU = (head.u + du) % (Math.PI * 2);
    if (newU < 0) newU += Math.PI * 2;
    var newV = (head.v + dv) % (Math.PI * 2);
    if (newV < 0) newV += Math.PI * 2;

    var nextPos = null;
    for (var i = 0; i < snake.length; i++) {
        var oldPos = { u: snake[i].u, v: snake[i].v };
        if (i === 0) {
            snake[0].u = newU;
            snake[0].v = newV;
        } else if (nextPos !== null) {
            snake[i].u = nextPos.u;
            snake[i].v = nextPos.v;
        }

        snake[i].posQueue.unshift(oldPos);
        nextPos = snake[i].posQueue.pop();
    }
}

function collision(a, b) {
    var pA = torusPoint(a.u, a.v);
    var pB = torusPoint(b.u, b.v);
    var dist = Math.sqrt(
        Math.pow(pA.x - pB.x, 2) +
        Math.pow(pA.y - pB.y, 2) +
        Math.pow(pA.z - pB.z, 2)
    );
    return dist < collisionDistance;
}

function checkCollisions(skip = 6) {
    for (var i = 2 + (snake_head_size - 2 /*why -2? so it (=8) equals `skip=6`*/); i < snake.length; i++) {
         if (collision(snake[0], snake[i])) {
             snakeCrash(i);
             // leaderboard.setScore(score);
             return;
         }
    }
    if (collision(snake[0], pellet)) {
        regeneratePellet();
        addSnakeNode();
        incrementScore();
    }
}
function snakeCrash(pelletNum) {
    /* a Score must be computed.
    a Crash splits the snake into closed-loop side and the other side with the tail. */
    // all pelletNum go with +1 viceversa from all snake.length-1 ; ignore head node.
    const collision = pelletNum+1; // i.e. "left-over" snake
    let remainder = snake.length-collision;

    let parity = snake.length-1 - snake_head_size % 2;
    let snake_half = Math.trunc((snake.length-1 - snake_head_size) / 2);

    console.log("collision@", collision);
    console.log("snake:", snake.length, snake);
    // console.log("parity", parity?'odd':'even');
    console.log("snake_half", snake_half);
    console.log("remainder. tail:", remainder);

    console.log("VEREDICT", collision > (snake.length-1-remainder) ? "lives":"dies" );
    showEnd();
}

function autoRun() {
    // disable controls
    // loop the rotations remaking the snake

}

function showEnd() {
    // document.getElementsByTagName('body')[0].style = 'background: #E8E8E8';
    document.getElementById('gg').style = 'display:block';
    stopped = true;
    window.removeEventListener('keydown', handlePAUSE);
}

init();
