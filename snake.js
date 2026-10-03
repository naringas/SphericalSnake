/*
Spherical & Torus Snake
Supports playing on:
1. Sphere (Classic S^2 topology)
2. Torus (3D Donut T^2 topology)
*/

// Common game parameters
var NODE_QUEUE_SIZE = 8;
var snake_head_size = 8; // total including head (pos=0) and neck/tail (pos=7)
var STARTING_DIRECTION;
var PAUSED = false;
var stopped = false;
var gameStarted = false;
var isStageSelectOpen = true;
var currentStage = null; // 'sphere' or 'torus'

var cnv, ctx, width, height, centerX, centerY, points;
var clock; // Absolute time since last update.
var accumulatedDelta = 0; // How much delta time is built up.
var animFrameId = null;

// Minimap variables
var minimapCnv, minimapCtx;
const MINI_W = 240;
const MINI_H = 240;
var sphereWorldMatrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];

// 3D Matrix and Vector helpers for fixed-world tracking on S^2
function mat3Mul(A, B) {
    var C = new Array(9);
    for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 3; c++) {
            var s = 0;
            for (var k = 0; k < 3; k++) {
                s += A[r * 3 + k] * B[k * 3 + c];
            }
            C[r * 3 + c] = s;
        }
    }
    return C;
}

function mat3Vec(M, v) {
    return {
        x: M[0] * v.x + M[1] * v.y + M[2] * v.z,
        y: M[3] * v.x + M[4] * v.y + M[5] * v.z,
        z: M[6] * v.x + M[7] * v.y + M[8] * v.z
    };
}

function rotZMat(a) {
    var cosA = Math.cos(a), sinA = Math.sin(a);
    return [
        cosA, -sinA, 0,
        sinA,  cosA, 0,
           0,     0, 1
    ];
}

function rotYMat(a) {
    var cosA = Math.cos(a), sinA = Math.sin(a);
    return [
        cosA, 0, sinA,
           0, 1,    0,
       -sinA, 0, cosA
    ];
}

function orthonormalizeMat3(M) {
    var len0 = Math.hypot(M[0], M[1], M[2]) || 1;
    M[0] /= len0; M[1] /= len0; M[2] /= len0;

    var dot01 = M[0] * M[3] + M[1] * M[4] + M[2] * M[5];
    M[3] -= dot01 * M[0];
    M[4] -= dot01 * M[1];
    M[5] -= dot01 * M[2];
    var len1 = Math.hypot(M[3], M[4], M[5]) || 1;
    M[3] /= len1; M[4] /= len1; M[5] /= len1;

    M[6] = M[1] * M[5] - M[2] * M[4];
    M[7] = M[2] * M[3] - M[0] * M[5];
    M[8] = M[0] * M[4] - M[1] * M[3];
}

function updateSphereWorldMatrix(dir, vel) {
    // World rotates in camera space by R_step = Rz(dir) * Ry(-vel) * Rz(-dir)
    // Inverse transformation from camera to fixed world is R_step_inv = Rz(dir) * Ry(vel) * Rz(-dir)
    var rz = rotZMat(dir);
    var ry = rotYMat(vel);
    var rzNeg = rotZMat(-dir);
    var stepInv = mat3Mul(rz, mat3Mul(ry, rzNeg));
    sphereWorldMatrix = mat3Mul(sphereWorldMatrix, stepInv);
    orthonormalizeMat3(sphereWorldMatrix);
}

function sphereToUV(v) {
    var len = Math.hypot(v.x, v.y, v.z) || 1;
    var z = Math.max(-1, Math.min(1, v.z / len));
    var phi = Math.acos(z); // [0, pi], 0 = North Pole, pi = South Pole
    var theta = Math.atan2(v.y, v.x); // [-pi, pi]
    if (theta < 0) theta += Math.PI * 2; // [0, 2*pi)
    return { theta: theta, phi: phi };
}

// Sphere geometry parameters (from classic Sphere version)
const SPHERE_GAME_SIZE = 70;
const SPHERE_NODE_ANGLE = Math.PI / SPHERE_GAME_SIZE;
const SPHERE_COLLISION_DISTANCE = 1.999999900005 * Math.sin(SPHERE_NODE_ANGLE);
const SPHERE_FOCAL_LENGTH = 500;

// Torus geometry parameters (from 3D Torus version)
const TORUS_R = 1.1;
const TORUS_r = 0.8;
const TORUS_NODE_RADIUS = 0.056;
const TORUS_COLLISION_DISTANCE = 1.9 * TORUS_NODE_RADIUS;
const TORUS_FOCAL_LENGTH = 550;
const TORUS_CAMERA_DISTANCE = 3.2;
const TORUS_STARTING_DIRECTION = (Math.sqrt(5) - 1) / 2;

// Active runtime parameters (set on stage start)
var focalLength = SPHERE_FOCAL_LENGTH;
var cameraDistance = TORUS_CAMERA_DISTANCE;
var collisionDistance = SPHERE_COLLISION_DISTANCE;
var snakeVelocity;

// Snake & Pellet state
var snake = [];
var pellet;
var direction = 0;
var score = 0;

var leftDown = false;
var rightDown = false;
var slowDown = false;

// DOM elements
const btnMoveLeft = document.querySelector("#move_left");
const btnMoveRight = document.querySelector("#move_right");
const btnMoveUp = document.querySelector("#move_forwards");
const btnToggleDir = document.querySelector("#toggle_direction");
const stageSelectOverlay = document.getElementById("stage_select_overlay");

function setLeft(val) {
    if (val) {
        leftDown = true;
        btnMoveLeft.classList.add("down");
    } else {
        leftDown = false;
        btnMoveLeft.classList.remove("down");
    }
}

function setRight(val) {
    if (val) {
        rightDown = true;
        btnMoveRight.classList.add("down");
    } else {
        rightDown = false;
        btnMoveRight.classList.remove("down");
    }
}

function setTurbo(turbo) {
    if (turbo) btnMoveUp.classList.add("down");
    else btnMoveUp.classList.remove("down");

    if (currentStage === 'sphere') {
        snakeVelocity = SPHERE_NODE_ANGLE * 2 / (NODE_QUEUE_SIZE + 1) * (turbo ? 1.75 : 1.0);
    } else {
        snakeVelocity = TORUS_NODE_RADIUS * 2 / (NODE_QUEUE_SIZE + 1) * (turbo ? 1.75 : 1.0);
    }
}

function setSlow(val) {
    slowDown = val;
    if (slowDown) {
        document.getElementById("fixDir").click();
    }
}

function togglePause() {
    if (stopped || isStageSelectOpen || !gameStarted) return;
    if (PAUSED) {
        PAUSED = false;
        document.getElementById('paused').style.display = 'none';
        clock = Date.now();
        animFrameId = window.requestAnimationFrame(update);
    } else {
        PAUSED = true;
        document.getElementById('paused').style.display = 'block';
    }
}

function handlePAUSE(e) {
    if (e.code === "Space") {
        e.preventDefault();
        togglePause();
    }
}
window.addEventListener('keydown', handlePAUSE);

function doPowerUP(e) {
    if (PAUSED || stopped || !gameStarted || isStageSelectOpen) return;
    let count = 50;
    const btn = document.querySelector("#PUP");
    const interval = setInterval(() => {
        if (stopped || PAUSED || isStageSelectOpen) {
            clearInterval(interval);
            return;
        }
        incrementScore();
        addSnakeNode();
        if (--count <= 0) clearInterval(interval);
    }, 50);

    btn.disabled = true;
    setTimeout(() => {
        btn.disabled = false;
    }, 2250);
    if (e) e.preventDefault();
}
document.querySelector("#PUP").addEventListener("click", doPowerUP);

/* "toggle direction button" stuff */
let orDir = direction;
let toggledTheDir = document.getElementById("fixDir").checked;
function toggleDir() {
    if (toggledTheDir) {
        orDir = direction;
        direction = 0; // East
    } else {
        direction = orDir;
    }

    document.getElementById("show-dir1").innerText = orDir.toFixed(1);
    document.getElementById("show-dir4").innerText = orDir.toFixed(4);
}
document.querySelector("#fixDir").addEventListener("input", function () {
    toggledTheDir = this.checked;
    toggleDir();
});

// User keyboard inputs
window.addEventListener('keydown', function(e) {
    if (isStageSelectOpen) {
        if (e.key === "1" || e.code === "Digit1" || e.code === "Numpad1") {
            e.preventDefault();
            startGame('sphere');
            return;
        }
        if (e.key === "2" || e.code === "Digit2" || e.code === "Numpad2") {
            e.preventDefault();
            startGame('torus');
            return;
        }
        return;
    }

    if (e.key === "ArrowLeft" || e.code === "KeyA") setLeft(true);
    if (e.key === "ArrowRight" || e.code === "KeyD") setRight(true);
    if (e.key === "ArrowUp" || e.code === "KeyW") setTurbo(true);
    if (e.key === "ArrowDown" || e.code === "KeyS") {
        if (e.repeat) setSlow(true);
        else document.getElementById("fixDir").click();
        btnToggleDir.classList.add("down");
    }

    if (e.code === "KeyQ") {
        if (toggledTheDir) direction = 0 - Math.PI / 2;
        else direction -= Math.PI / 2;
    }
    if (e.code === "KeyE") {
        if (toggledTheDir) direction = 0 + Math.PI / 2;
        else direction += Math.PI / 2;
    }
});

window.addEventListener('keyup', function(e) {
    if (isStageSelectOpen) return;

    if (e.key === "ArrowLeft" || e.code === "KeyA") setLeft(false);
    if (e.key === "ArrowRight" || e.code === "KeyD") setRight(false);
    if (e.key === "ArrowUp" || e.code === "KeyW") setTurbo(false);
    if (e.key === "ArrowDown" || e.code === "KeyS") {
        setSlow(false);
        btnToggleDir.classList.remove("down");
    }

    if (e.code === "KeyT" && (!e.repeat)) document.getElementById("fixDir").click();
});

// Mobile button event listeners
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

// Restart & stage selection handlers
function restartGame(e) {
    if (e) e.preventDefault();
    if (currentStage) {
        startGame(currentStage);
    } else {
        openStageSelect();
    }
}
document.querySelector("#refresh").addEventListener("click", restartGame);
document.getElementById("btn_switch_stage").addEventListener("click", function(e) {
    e.preventDefault();
    openStageSelect();
});
document.getElementById("select_stage_link").addEventListener("click", function(e) {
    e.preventDefault();
    openStageSelect();
});

document.getElementById("select_sphere").addEventListener("click", function() {
    startGame('sphere');
});
document.getElementById("select_sphere").addEventListener("keydown", function(e) {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        startGame('sphere');
    }
});

document.getElementById("select_torus").addEventListener("click", function() {
    startGame('torus');
});
document.getElementById("select_torus").addEventListener("keydown", function(e) {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        startGame('torus');
    }
});

function openStageSelect() {
    stopped = true;
    isStageSelectOpen = true;
    PAUSED = false;
    if (animFrameId) {
        window.cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
    stageSelectOverlay.style.display = 'flex';
    document.getElementById('gg').style.display = 'none';
    document.getElementById('paused').style.display = 'none';
    renderMinimap();
}

function updateScoreDisplay() {
    var stageLabel = currentStage === 'sphere' ? 'Sphere' : (currentStage === 'torus' ? 'Torus' : '');
    var stageText = stageLabel ? ' &nbsp;|&nbsp; Stage: ' + stageLabel : '';
    document.querySelector("#score").innerHTML = "Score: " + score + stageText;
}

function incrementScore() {
    score += 1;
    updateScoreDisplay();
}

// ==========================================
// SPHERE MATHEMATICS & LOGIC (Classic Mode)
// ==========================================

function pointFromSpherical(theta, phi) {
    var sinPhi = Math.sin(phi);
    return {
        x: Math.cos(theta) * sinPhi,
        y: Math.sin(theta) * sinPhi,
        z: Math.cos(phi)
    };
}

function copyPoint(src, dest) {
    if (!dest) dest = {};
    dest.x = src.x;
    dest.y = src.y;
    dest.z = src.z;
    return dest;
}

function allPointsSphere() {
    var all = [pellet].concat(points).concat(snake);
    for (var i = 0; i < snake.length; i++) {
        all = all.concat(snake[i].posQueue);
    }
    return all;
}

function rotateZ(a, pt) {
    var cosA = Math.cos(a), sinA = Math.sin(a);
    var inPoints = pt ? [pt] : allPointsSphere();
    for (var i = 0; i < inPoints.length; i++) {
        if (!inPoints[i]) continue;
        var x = inPoints[i].x, y = inPoints[i].y;
        inPoints[i].x = cosA * x - sinA * y;
        inPoints[i].y = sinA * x + cosA * y;
    }
}

function rotateY(a, pt) {
    var cosA = Math.cos(a), sinA = Math.sin(a);
    var inPoints = pt ? [pt] : allPointsSphere();
    for (var i = 0; i < inPoints.length; i++) {
        if (!inPoints[i]) continue;
        var x = inPoints[i].x, z = inPoints[i].z;
        inPoints[i].x = cosA * x + sinA * z;
        inPoints[i].z = -sinA * x + cosA * z;
    }
}

function regeneratePelletSphere() {
    pellet = pointFromSpherical(Math.random() * Math.PI * 2, Math.random() * Math.PI);
}

function addSnakeNodeSphere() {
    var snakeNode = {
        x: 0, y: 0, z: -1, posQueue: []
    };
    for (var i = 0; i < NODE_QUEUE_SIZE; i++) snakeNode.posQueue.push(null);
    if (snake.length > 0) {
        var last = snake[snake.length - 1];
        var lastPos = last.posQueue[NODE_QUEUE_SIZE - 1];
        if (lastPos === null) {
            copyPoint(last, snakeNode);
            rotateZ(-STARTING_DIRECTION, snakeNode);
            rotateY(-SPHERE_NODE_ANGLE * 2, snakeNode);
            rotateZ(STARTING_DIRECTION, snakeNode);
        } else {
            copyPoint(lastPos, snakeNode);
        }
    }
    snake.push(snakeNode);
}

function applySnakeRotationSphere() {
    var nextPosition = null;
    for (var i = 0; i < snake.length; i++) {
        var oldPosition = copyPoint(snake[i]);
        if (i === 0) {
            rotateZ(-direction, snake[i]);
            rotateY(snakeVelocity, snake[i]);
            rotateZ(direction, snake[i]);
        } else if (nextPosition === null) {
            rotateZ(-STARTING_DIRECTION, snake[i]);
            rotateY(snakeVelocity, snake[i]);
            rotateZ(STARTING_DIRECTION, snake[i]);
        } else {
            copyPoint(nextPosition, snake[i]);
        }
        snake[i].posQueue.unshift(oldPosition);
        nextPosition = snake[i].posQueue.pop();
    }
}

function collisionSphere(a, b) {
    var dist = Math.sqrt(
        Math.pow(a.x - b.x, 2) +
        Math.pow(a.y - b.y, 2) +
        Math.pow(a.z - b.z, 2)
    );
    return dist < collisionDistance;
}

function drawPointSphere(point, radius, red, blue = 0) {
    var p = copyPoint(point);
    p.z += 2;
    p.x *= -1 * focalLength / p.z;
    p.y *= -1 * focalLength / p.z;
    radius *= focalLength / p.z;
    p.x += centerX;
    p.y += centerY;

    ctx.beginPath();
    var alpha = 1 - (p.z - 1) / 2;
    var depthColor = 255 - Math.floor((p.z - 1) / 2 * 255);
    ctx.fillStyle = "rgba(" + red + ", " + blue + ", " + depthColor + ", " + alpha + ")";
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function renderSphere() {
    ctx.clearRect(0, 0, width, height);
    for (var i = 0; i < points.length; i++) {
        drawPointSphere(points[i], 1 / 360, 0);
    }
    for (var i = 0; i < snake.length; i++) {
        let blue;
        if (i < snake_head_size - 1) blue = 80;
        else if (i === snake_head_size - 1) blue = 180;
        else blue = 0;
        drawPointSphere(snake[i], SPHERE_NODE_ANGLE, 120, blue);
    }
    drawPointSphere(pellet, SPHERE_NODE_ANGLE, 0);

    // Draw angle & direction arrows
    renderAngleDir(direction);
    var r = SPHERE_NODE_ANGLE / 2 * focalLength * 2.2;
    if (toggledTheDir) {
        var color = "#48E56C"; // green
        renderAngleDir(orDir, color);
        ctx.beginPath();
        ctx.arc(
            centerX + Math.cos(direction) * r,
            centerY + Math.sin(direction) * r,
            10, 0, Math.PI, false);
        ctx.fillStyle = color;
        ctx.lineWidth = 1;
        ctx.fill();
    } else {
        var color = "#FF7851"; // red
        renderAngleDir(orDir, color);
        ctx.beginPath();
        ctx.arc(
            centerX + Math.cos(orDir) * r,
            centerY + Math.sin(orDir) * r,
            20, direction, direction + Math.PI, true);
        ctx.fillStyle = color;
        ctx.lineWidth = 1;
        ctx.fill();
    }

    ctx.lineWidth = 1;
    // Draw horizon circle.
    ctx.beginPath();
    ctx.strokeStyle = "rgb(10,10, 10)";
    ctx.arc(centerX, centerY, .548 * focalLength, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#AAA";
    ctx.beginPath();
    ctx.setLineDash([1, 7]);
    ctx.arc(centerX, centerY, .6000007 * focalLength, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
}

// ==========================================
// TORUS MATHEMATICS & LOGIC (3D Donut Mode)
// ==========================================

function regeneratePelletTorus() {
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
    var zcam = -dot3D(dp, headFrame.N);
    var depth = zcam + cameraDistance;
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

function addSnakeNodeTorus() {
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

function applySnakeRotationTorus() {
    var head = snake[0];
    var cosD = Math.cos(direction);
    var sinD = Math.sin(direction);

    // Torus Riemannian metric: ds^2 = (R + r*cos(v))^2 du^2 + r^2 dv^2
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

function collisionTorus(a, b) {
    var pA = torusPoint(a.u, a.v);
    var pB = torusPoint(b.u, b.v);
    var dist = Math.sqrt(
        Math.pow(pA.x - pB.x, 2) +
        Math.pow(pA.y - pB.y, 2) +
        Math.pow(pA.z - pB.z, 2)
    );
    return dist < collisionDistance;
}

function drawNodePointTorus(proj, radius, red, blue, alphaMultiplier = 1.0) {
    var r = Math.max(1.0, focalLength * (radius / proj.depth));
    var depthColor = Math.floor(Math.max(40, 255 - (proj.depth / 6.0) * 200));
    var alpha = Math.min(1.0, Math.max(0.1, (1 - (proj.depth - cameraDistance) / 4.0) * alphaMultiplier));
    ctx.fillStyle = "rgba(" + red + ", " + blue + ", " + depthColor + ", " + alpha + ")";
    ctx.beginPath();
    ctx.arc(proj.sx, proj.sy, r, 0, Math.PI * 2);
    ctx.fill();
}

function renderTorus() {
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

    // 1. Far background dots
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
        let blue;
        if (i < snake_head_size - 1) blue = 80;
        else if (i === snake_head_size - 1) blue = 180;
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

    // 2. Far snake nodes and far pellet
    for (var i = 0; i < snakeDrawList.length; i++) {
        var item = snakeDrawList[i];
        if (item.proj.dotNorm <= 0) {
            drawNodePointTorus(item.proj, TORUS_NODE_RADIUS, item.red, item.blue, 0.45);
        }
    }
    if (pelletProj.dotNorm <= 0) {
        drawNodePointTorus(pelletProj, TORUS_NODE_RADIUS, 0, 0, 0.45);
    }

    // 3. Near background dots
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

    // 4. Near snake nodes sorted by depth
    var nearSnake = [];
    for (var i = 0; i < snakeDrawList.length; i++) {
        if (snakeDrawList[i].proj.dotNorm > 0) nearSnake.push(snakeDrawList[i]);
    }
    nearSnake.sort(function(a, b) { return b.proj.depth - a.proj.depth; });
    for (var i = 0; i < nearSnake.length; i++) {
        var item = nearSnake[i];
        drawNodePointTorus(item.proj, TORUS_NODE_RADIUS, item.red, item.blue, 1.0);
    }

    // 5. Near pellet
    if (pelletProj.dotNorm > 0) {
        drawNodePointTorus(pelletProj, TORUS_NODE_RADIUS, 0, 0, 1.0);
    }

    // 6. Angle & direction arrows
    renderAngleDir(direction);
    var r = (TORUS_NODE_RADIUS * focalLength / cameraDistance) * 2.2;
    if (toggledTheDir) {
        var color = "#48E56C"; // green
        renderAngleDir(orDir, color);
        ctx.beginPath();
        ctx.arc(
            centerX + Math.cos(direction) * r,
            centerY + Math.sin(direction) * r,
            10, 0, Math.PI, false);
        ctx.fillStyle = color;
        ctx.lineWidth = 1;
        ctx.fill();
    } else {
        var color = "#FF7851"; // red
        renderAngleDir(orDir, color);
        ctx.beginPath();
        ctx.arc(
            centerX + Math.cos(orDir) * r,
            centerY + Math.sin(orDir) * r,
            20, direction, direction + Math.PI, true);
        ctx.fillStyle = color;
        ctx.lineWidth = 1;
        ctx.fill();
    }
}

// ==========================================
// SHARED GAME ROUTINES
// ==========================================

function addSnakeNode() {
    if (currentStage === 'sphere') addSnakeNodeSphere();
    else addSnakeNodeTorus();
}

function regeneratePellet() {
    if (currentStage === 'sphere') regeneratePelletSphere();
    else regeneratePelletTorus();
}

function collision(a, b) {
    if (currentStage === 'sphere') return collisionSphere(a, b);
    return collisionTorus(a, b);
}

function renderAngleDir(direction_, strokeStyle="#FFF") {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    var r = (currentStage === 'sphere')
        ? (SPHERE_NODE_ANGLE / 2 * focalLength * 2.2)
        : ((TORUS_NODE_RADIUS * focalLength / cameraDistance) * 2.2);
    ctx.lineTo(
        centerX + Math.cos(direction_) * r,
        centerY + Math.sin(direction_) * r
    );
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 3;
    ctx.stroke();
}

function renderMinimap() {
    if (!minimapCtx) return;

    // 1. Clear background
    minimapCtx.fillStyle = "#090e17";
    minimapCtx.fillRect(0, 0, MINI_W, MINI_H);

    // 2. Reference coordinate axes (Equator / Prime Meridian or Torus u/v centerlines)
    minimapCtx.strokeStyle = "rgba(56, 189, 248, 0.14)";
    minimapCtx.lineWidth = 1;
    minimapCtx.beginPath();
    minimapCtx.moveTo(0, MINI_H / 2);
    minimapCtx.lineTo(MINI_W, MINI_H / 2);
    minimapCtx.moveTo(MINI_W / 2, 0);
    minimapCtx.lineTo(MINI_W / 2, MINI_H);
    minimapCtx.stroke();

    // 3. Fixed World Dotted Grid
    if (currentStage === 'sphere') {
        var n = 52;
        minimapCtx.fillStyle = "rgba(148, 163, 184, 0.32)";
        for (var i = 0; i < n; i++) {
            var gx = (i / n) * MINI_W;
            for (var j = 1; j < n; j++) {
                var gy = (j / n) * MINI_H;
                minimapCtx.fillRect(gx - 0.75, gy - 0.75, 1.5, 1.5);
            }
        }
    } else if (currentStage === 'torus') {
        var nU = 60, nV = 32;
        minimapCtx.fillStyle = "rgba(148, 163, 184, 0.32)";
        for (var i = 0; i < nU; i++) {
            var gx = (i / nU) * MINI_W;
            for (var j = 0; j < nV; j++) {
                var gy = (j / nV) * MINI_H;
                minimapCtx.fillRect(gx - 0.75, gy - 0.75, 1.5, 1.5);
            }
        }
    } else {
        // Idle preview grid
        minimapCtx.fillStyle = "rgba(148, 163, 184, 0.2)";
        for (var i = 0; i <= 20; i++) {
            for (var j = 0; j <= 20; j++) {
                minimapCtx.fillRect((i / 20) * MINI_W - 0.75, (j / 20) * MINI_H - 0.75, 1.5, 1.5);
            }
        }
        return;
    }

    // 4. Fixed World Pellet / Bead
    if (pellet) {
        var px, py;
        if (currentStage === 'sphere') {
            var pw = mat3Vec(sphereWorldMatrix, pellet);
            var puv = sphereToUV(pw);
            px = (puv.theta / (Math.PI * 2)) * MINI_W;
            py = (puv.phi / Math.PI) * MINI_H;
        } else {
            var pu = ((pellet.u % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            var pv = ((pellet.v % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            px = (pu / (Math.PI * 2)) * MINI_W;
            py = (pv / (Math.PI * 2)) * MINI_H;
        }

        // Pellet glow & bead
        minimapCtx.fillStyle = "rgba(251, 191, 36, 0.35)";
        minimapCtx.beginPath();
        minimapCtx.arc(px, py, 6, 0, Math.PI * 2);
        minimapCtx.fill();

        minimapCtx.fillStyle = "#fbbf24";
        minimapCtx.beginPath();
        minimapCtx.arc(px, py, 3.5, 0, Math.PI * 2);
        minimapCtx.fill();

        minimapCtx.fillStyle = "#ffffff";
        minimapCtx.beginPath();
        minimapCtx.arc(px, py, 1.5, 0, Math.PI * 2);
        minimapCtx.fill();
    }

    // 5. Moving Snake on the fixed surface
    if (snake && snake.length > 0) {
        var nodeCoords = [];
        for (var k = 0; k < snake.length; k++) {
            var nx, ny;
            if (currentStage === 'sphere') {
                var sw = mat3Vec(sphereWorldMatrix, snake[k]);
                var suv = sphereToUV(sw);
                nx = (suv.theta / (Math.PI * 2)) * MINI_W;
                ny = (suv.phi / Math.PI) * MINI_H;
            } else {
                var su = ((snake[k].u % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                var sv = ((snake[k].v % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                nx = (su / (Math.PI * 2)) * MINI_W;
                ny = (sv / (Math.PI * 2)) * MINI_H;
            }
            nodeCoords.push({ x: nx, y: ny });
        }

        // Connecting segments (only if not wrapping across boundary)
        minimapCtx.strokeStyle = "rgba(239, 68, 68, 0.55)";
        minimapCtx.lineWidth = 2.2;
        minimapCtx.beginPath();
        for (var k = nodeCoords.length - 1; k >= 1; k--) {
            var a = nodeCoords[k];
            var b = nodeCoords[k - 1];
            if (Math.abs(a.x - b.x) < MINI_W * 0.4 && Math.abs(a.y - b.y) < MINI_H * 0.4) {
                minimapCtx.moveTo(a.x, a.y);
                minimapCtx.lineTo(b.x, b.y);
            }
        }
        minimapCtx.stroke();

        // Draw snake body nodes
        for (var k = nodeCoords.length - 1; k >= 1; k--) {
            var pt = nodeCoords[k];
            var color, r;
            if (k === snake_head_size - 1) {
                color = "#06b6d4"; // Cyan neck pellet
                r = 3.2;
            } else if (k < snake_head_size - 1) {
                color = "#60a5fa"; // Light blue head nodes
                r = 2.8;
            } else {
                color = "#ef4444"; // Red body nodes
                r = 2.4;
            }
            minimapCtx.fillStyle = color;
            minimapCtx.beginPath();
            minimapCtx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
            minimapCtx.fill();
        }

        // Draw Snake Head (node 0)
        var headPt = nodeCoords[0];
        minimapCtx.fillStyle = "rgba(56, 189, 248, 0.35)";
        minimapCtx.beginPath();
        minimapCtx.arc(headPt.x, headPt.y, 7.5, 0, Math.PI * 2);
        minimapCtx.fill();

        minimapCtx.fillStyle = "#38bdf8";
        minimapCtx.beginPath();
        minimapCtx.arc(headPt.x, headPt.y, 4.5, 0, Math.PI * 2);
        minimapCtx.fill();

        minimapCtx.fillStyle = "#ffffff";
        minimapCtx.beginPath();
        minimapCtx.arc(headPt.x, headPt.y, 2, 0, Math.PI * 2);
        minimapCtx.fill();

        // Head heading vector
        var dirX = 0, dirY = 0;
        if (currentStage === 'torus') {
            var headNode = snake[0];
            var du = Math.cos(direction) / (TORUS_R + TORUS_r * Math.cos(headNode.v));
            var dv = Math.sin(direction) / TORUS_r;
            var ddx = (du / (Math.PI * 2)) * MINI_W;
            var ddy = (dv / (Math.PI * 2)) * MINI_H;
            var dlen = Math.hypot(ddx, ddy) || 1;
            dirX = ddx / dlen;
            dirY = ddy / dlen;
        } else {
            // Sphere heading: project forward step
            var forwardCam = {
                x: Math.cos(direction) * Math.sin(snakeVelocity * 2),
                y: -Math.sin(direction) * Math.sin(snakeVelocity * 2),
                z: -Math.cos(snakeVelocity * 2)
            };
            var forwardWorld = mat3Vec(sphereWorldMatrix, forwardCam);
            var fUV = sphereToUV(forwardWorld);
            var fx = (fUV.theta / (Math.PI * 2)) * MINI_W;
            var fy = (fUV.phi / Math.PI) * MINI_H;
            var ddx = fx - headPt.x;
            var ddy = fy - headPt.y;
            if (ddx > MINI_W / 2) ddx -= MINI_W;
            if (ddx < -MINI_W / 2) ddx += MINI_W;
            if (ddy > MINI_H / 2) ddy -= MINI_H;
            if (ddy < -MINI_H / 2) ddy += MINI_H;
            var dlen = Math.hypot(ddx, ddy) || 1;
            dirX = ddx / dlen;
            dirY = ddy / dlen;
        }

        minimapCtx.strokeStyle = "#38bdf8";
        minimapCtx.lineWidth = 2.2;
        minimapCtx.beginPath();
        minimapCtx.moveTo(headPt.x, headPt.y);
        minimapCtx.lineTo(headPt.x + dirX * 9, headPt.y + dirY * 9);
        minimapCtx.stroke();

        // Update minimap coordinates HUD
        var coordsEl = document.getElementById("minimap_coords");
        if (coordsEl) {
            if (currentStage === 'sphere') {
                var swHead = mat3Vec(sphereWorldMatrix, snake[0]);
                var suvHead = sphereToUV(swHead);
                var degTheta = (suvHead.theta * 180 / Math.PI).toFixed(0);
                var degPhi = (suvHead.phi * 180 / Math.PI).toFixed(0);
                coordsEl.innerText = "Head: θ " + degTheta + "°, φ " + degPhi + "°";
            } else {
                var uVal = snake[0].u.toFixed(2);
                var vVal = snake[0].v.toFixed(2);
                coordsEl.innerText = "Head: u " + uVal + ", v " + vVal;
            }
        }
    }
}

function render() {
    if (currentStage === 'sphere') renderSphere();
    else if (currentStage === 'torus') renderTorus();
    renderMinimap();
}

function checkCollisions(skip = 6) {
    for (var i = 2 + (snake_head_size - 2); i < snake.length; i++) {
        if (collision(snake[0], snake[i])) {
            snakeCrash(i);
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
    const collisionPt = pelletNum + 1;
    let remainder = snake.length - collisionPt;
    let snake_half = Math.trunc((snake.length - 1 - snake_head_size) / 2);

    console.log("collision@", collisionPt);
    console.log("snake:", snake.length, snake);
    console.log("snake_half", snake_half);
    console.log("remainder. tail:", remainder);
    console.log("VERDICT", collisionPt > (snake.length - 1 - remainder) ? "lives" : "dies");

    showEnd();
}

function showEnd() {
    document.getElementById('gg').style.display = 'block';
    stopped = true;
    window.removeEventListener('keydown', handlePAUSE);
}

function update() {
    if (stopped || !gameStarted || isStageSelectOpen) return;
    var curr = Date.now();
    var delta = curr - clock;
    clock = curr;

    accumulatedDelta += delta;
    var targetDelta = 15;
    if (accumulatedDelta > targetDelta * 4) {
        accumulatedDelta = targetDelta * 4;
    }

    while (accumulatedDelta >= targetDelta) {
        accumulatedDelta -= targetDelta;
        checkCollisions();
        if (stopped) break;

        if (leftDown) direction -= .08;
        if (rightDown) direction += .08;
        document.getElementById("showDir").value = direction;

        if (currentStage === 'sphere') {
            applySnakeRotationSphere();
            rotateZ(-direction);
            rotateY(-snakeVelocity);
            rotateZ(direction);
            updateSphereWorldMatrix(direction, snakeVelocity);
        } else {
            applySnakeRotationTorus();
        }
    }

    render();

    if (PAUSED) {
        return;
    } else if (!stopped) {
        animFrameId = window.requestAnimationFrame(update);
    }
}

// Stage Initialization
function startGame(stage) {
    currentStage = stage;
    gameStarted = true;
    isStageSelectOpen = false;
    stopped = false;
    PAUSED = false;
    score = 0;
    accumulatedDelta = 0;
    clock = Date.now();

    stageSelectOverlay.style.display = 'none';
    document.getElementById('gg').style.display = 'none';
    document.getElementById('paused').style.display = 'none';

    leftDown = false;
    rightDown = false;
    slowDown = false;
    btnMoveLeft.classList.remove("down");
    btnMoveRight.classList.remove("down");
    btnMoveUp.classList.remove("down");
    btnToggleDir.classList.remove("down");

    toggledTheDir = false;
    document.getElementById("fixDir").checked = toggledTheDir;

    window.removeEventListener('keydown', handlePAUSE);
    window.addEventListener('keydown', handlePAUSE);

    sphereWorldMatrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    var badge = document.getElementById("minimap_badge");
    if (badge) {
        badge.innerText = (stage === 'sphere') ? "🌐 S² SPHERE" : "🍩 T² TORUS";
    }

    if (currentStage === 'sphere') {
        focalLength = SPHERE_FOCAL_LENGTH;
        collisionDistance = SPHERE_COLLISION_DISTANCE;
        STARTING_DIRECTION = 4 * Math.random();
        direction = STARTING_DIRECTION;
        orDir = direction;
        snakeVelocity = SPHERE_NODE_ANGLE * 2 / (NODE_QUEUE_SIZE + 1);

        // Generate sphere grid dots
        points = [];
        var n = 52;
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < n; j++) {
                points.push(
                    pointFromSpherical(i / n * Math.PI * 2, j / n * Math.PI)
                );
            }
        }

        // Initialize sphere snake
        snake = [];
        for (var i = 0; i < snake_head_size; i++) {
            addSnakeNodeSphere();
        }

        regeneratePelletSphere();
    } else {
        // Torus stage
        focalLength = TORUS_FOCAL_LENGTH;
        cameraDistance = TORUS_CAMERA_DISTANCE;
        collisionDistance = TORUS_COLLISION_DISTANCE;
        STARTING_DIRECTION = TORUS_STARTING_DIRECTION;
        direction = STARTING_DIRECTION;
        orDir = direction;
        snakeVelocity = TORUS_NODE_RADIUS * 2 / (NODE_QUEUE_SIZE + 1);

        // Generate torus grid dots
        points = [];
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

        // Initialize torus snake with backward history
        var u0 = 0;
        var v0 = 0;
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

        regeneratePelletTorus();
    }

    updateScoreDisplay();
    document.getElementById("showDir").value = direction;
    document.getElementById("show-dir1").innerText = orDir.toFixed(1);
    document.getElementById("show-dir4").innerText = orDir.toFixed(4);

    if (animFrameId) {
        window.cancelAnimationFrame(animFrameId);
    }
    animFrameId = window.requestAnimationFrame(update);
}

// Initial page setup: ready canvas and show stage select screen
function init() {
    cnv = document.getElementById('main_canvas') || document.getElementsByTagName('canvas')[0];
    ctx = cnv.getContext('2d');
    width = cnv.width;
    height = cnv.height;
    centerX = width / 2;
    centerY = height / 2;

    minimapCnv = document.getElementById('minimap_canvas');
    if (minimapCnv) {
        minimapCtx = minimapCnv.getContext('2d');
    }

    // Draw idle aesthetic background on canvas
    ctx.fillStyle = "#0c1524";
    ctx.fillRect(0, 0, width, height);

    openStageSelect();
}

init();
