// Game setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const pauseMenu = document.getElementById('pauseMenu');
const newGameBtn = document.getElementById('newGame');
const continueGameBtn = document.getElementById('continueGame');
const saveGameBtn = document.getElementById('saveGame');
const exitGameBtn = document.getElementById('exitGame');

// Fixed game area with CSS scaling
const baseWidth = 800;
const baseHeight = 600;
function resizeCanvas() {
    // Set canvas to fixed logical size
    canvas.width = baseWidth;
    canvas.height = baseHeight;
    
    // Calculate scale to fit in viewport while maintaining aspect ratio
    const aspectRatio = baseWidth / baseHeight;
    let displayWidth = window.innerWidth * 0.9; // Use 90% of window width
    let displayHeight = window.innerHeight * 0.9; // Use 90% of window height
    
    if (displayWidth / displayHeight > aspectRatio) {
        displayWidth = displayHeight * aspectRatio;
    } else {
        displayHeight = displayWidth / aspectRatio;
    }
    
    // Apply CSS scaling
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Load sprites
const dogSprite = new Image(); dogSprite.src = 'dog.png';
const rabbitSprite = new Image(); rabbitSprite.src = 'rabbit.png';
const birdSprite = new Image(); birdSprite.src = 'bird.png';
const squirrelSprite = new Image(); squirrelSprite.src = 'squirrel.png';
const pigSprite = new Image(); pigSprite.src = 'pig.png';
const pooSprite = new Image(); pooSprite.src = 'poo.png';
const boneSprite = new Image(); boneSprite.src = 'bone.png';
const treatSprite = new Image(); treatSprite.src = 'treat.png';

// Game state
let gameState = {
    score: 0,
    bones: 0,
    treats: 0,
    level: 1,
    dog: { x: baseWidth / 2, y: baseHeight / 2, speed: 5, multiplier: 1 },
    enemies: [],
    collectibles: [],
    powerUpTimer: 0,
    isPaused: false,
    sprintCooldown: 0,
    sprintDuration: 0,
    maxSprintDuration: 2000,
    maxSprintCooldown: 5000,
    sicknessTimer: 0,
    orbitAngle: 0,
    levelUpFlashTimer: 0
};

// Track pressed keys
const keys = { w: false, a: false, s: false, d: false, shift: false };

// Check for saved game
if (localStorage.getItem('dogHunterSave')) {
    continueGameBtn.style.display = 'block';
}

// Start new game
newGameBtn.addEventListener('click', () => {
    startGame(true);
});

// Continue saved game
continueGameBtn.addEventListener('click', () => {
    startGame(false);
});

// Pause menu controls
saveGameBtn.addEventListener('click', () => {
    localStorage.setItem('dogHunterSave', JSON.stringify(gameState));
    gameState.isPaused = false;
    pauseMenu.style.display = 'none';
    gameLoop(lastTime); // Resume game
});

exitGameBtn.addEventListener('click', () => {
    gameState.isPaused = false;
    pauseMenu.style.display = 'none';
    canvas.style.display = 'none';
    menu.style.display = 'block';
    localStorage.setItem('dogHunterSave', JSON.stringify(gameState)); // Auto-save on exit
});

function startGame(isNew) {
    menu.style.display = 'none';
    canvas.style.display = 'block';
    if (!isNew) {
        gameState = JSON.parse(localStorage.getItem('dogHunterSave'));
    }
    gameLoop();
}

// Enemy types
const enemyTypes = [
    { type: 'rabbit', baseSpeed: 1.5, color: 'brown', moves: true },
    { type: 'bird', baseSpeed: 4, color: 'gray', moves: true },
    { type: 'squirrel', baseSpeed: 3, color: 'orange', moves: true },
    { type: 'pig', baseSpeed: 2, color: 'pink', moves: true, rarity: 15 }
];

function spawnEnemy() {
    if (gameState.enemies.length >= 10) return;
    let enemyType;
    if (Math.random() < 1 / 9) { // Changed from 1/15 to 1/9 to match original spec
        enemyType = enemyTypes.find(e => e.type === 'pig');
    } else {
        const commonTypes = enemyTypes.filter(e => e.type !== 'pig');
        enemyType = commonTypes[Math.floor(Math.random() * commonTypes.length)];
    }
    const enemy = {
        x: Math.random() * baseWidth,
        y: Math.random() * baseHeight,
        type: enemyType.type,
        speed: enemyType.baseSpeed + (gameState.level - 1) * 0.2,
        color: enemyType.color,
        moves: enemyType.moves,
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2
    };
    gameState.enemies.push(enemy);
}

function spawnCollectible(x, y, type) {
    gameState.collectibles.push({
        x: x,
        y: y,
        type: type,
        timer: 10000 // 10 seconds before disappearing
    });
}

// Game loop
let lastTime = 0;
function gameLoop(timestamp) {
    if (gameState.isPaused) return;

    const delta = timestamp - lastTime;
    lastTime = timestamp;

    update(delta);
    draw();

    if (Math.floor(timestamp / 1000) % 1 === 0) {
        localStorage.setItem('dogHunterSave', JSON.stringify(gameState));
    }

    requestAnimationFrame(gameLoop);
}

function update(delta) {
    if (Math.random() < 0.02) spawnEnemy();

    // Key press handling
    document.onkeydown = (e) => {
        const key = e.key.toLowerCase();
        if (key === 'escape') {
            gameState.isPaused = !gameState.isPaused;
            pauseMenu.style.display = gameState.isPaused ? 'block' : 'none';
            if (!gameState.isPaused) gameLoop(lastTime);
        } else if (!gameState.isPaused) {
            if (key === 'w') keys.w = true;
            if (key === 'a') keys.a = true;
            if (key === 's') keys.s = true;
            if (key === 'd') keys.d = true;
            if (key === 'shift') keys.shift = true;
        }
    };

    document.onkeyup = (e) => {
        const key = e.key.toLowerCase();
        if (key === 'w') keys.w = false;
        if (key === 'a') keys.a = false;
        if (key === 's') keys.s = false;
        if (key === 'd') keys.d = false;
        if (key === 'shift') keys.shift = false;
    };

    // Movement and sprint/sickness
    let moveX = 0, moveY = 0;
    let currentSpeed = gameState.dog.speed;

    if (gameState.sicknessTimer > 0) {
        currentSpeed = 1;
        gameState.sicknessTimer -= delta;
        if (gameState.sicknessTimer <= 0) gameState.sicknessTimer = 0;
        const centerX = gameState.dog.x - moveX;
        const centerY = gameState.dog.y - moveY;
        const dx = gameState.dog.x + moveX - centerX;
        const dy = gameState.dog.y + moveY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 50) {
            moveX = (dx / distance) * 50 - (gameState.dog.x - centerX);
            moveY = (dy / distance) * 50 - (gameState.dog.y - centerY);
        }
    } else {
        if (keys.shift && gameState.sprintCooldown <= 0 && gameState.sprintDuration <= 0) {
            gameState.sprintDuration = gameState.maxSprintDuration;
        }
        if (gameState.sprintDuration > 0) {
            currentSpeed = gameState.dog.speed + gameState.level * 2;
            gameState.sprintDuration -= delta;
            if (gameState.sprintDuration <= 0) {
                gameState.sprintDuration = 0;
                gameState.sprintCooldown = gameState.maxSprintCooldown;
            }
        } else if (gameState.sprintCooldown > 0) {
            gameState.sprintCooldown -= delta;
            if (gameState.sprintCooldown < 0) gameState.sprintCooldown = 0;
        }
    }

    if (keys.w) moveY -= currentSpeed;
    if (keys.s) moveY += currentSpeed;
    if (keys.a) moveX -= currentSpeed;
    if (keys.d) moveX += currentSpeed;

    if (moveX !== 0 && moveY !== 0) {
        const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX = (moveX / magnitude) * currentSpeed;
        moveY = (moveY / magnitude) * currentSpeed;
    }

    gameState.dog.x += moveX;
    gameState.dog.y += moveY;
    gameState.dog.x = Math.max(0, Math.min(baseWidth, gameState.dog.x));
    gameState.dog.y = Math.max(0, Math.min(baseHeight, gameState.dog.y));

    // Enemy movement
    gameState.enemies.forEach(enemy => {
        if (enemy.moves) {
            const dx = gameState.dog.x - enemy.x;
            const dy = gameState.dog.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const avoidanceDistance = 100 + (gameState.level - 1) * 5;
            if (distance < avoidanceDistance) {
                enemy.dx = -dx / distance * enemy.speed;
                enemy.dy = -dy / distance * enemy.speed;
            }
            enemy.x += enemy.dx;
            enemy.y += enemy.dy;
            if (enemy.x < 0 || enemy.x > baseWidth) enemy.dx *= -1;
            if (enemy.y < 0 || enemy.y > baseHeight) enemy.dy *= -1;
            enemy.x = Math.max(0, Math.min(baseWidth, enemy.x));
            enemy.y = Math.max(0, Math.min(baseHeight, enemy.y));
        }
    });

    // Collectibles update
    gameState.collectibles = gameState.collectibles.filter(c => {
        c.timer -= delta;
        if (c.timer <= 0) return false;
        const dx = gameState.dog.x - c.x;
        const dy = gameState.dog.y - c.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 40) {
            if (c.type === 'bone') gameState.bones++;
            if (c.type === 'treat') {
                gameState.treats++;
                gameState.dog.speed = 8;
                gameState.powerUpTimer = 5000;
            }
            return false;
        }
        return true;
    });

    // Collision and level progression
    gameState.enemies = gameState.enemies.filter(enemy => {
        const dx = gameState.dog.x - enemy.x;
        const dy = gameState.dog.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 40) {
            if (enemy.type === 'pig') {
                if (Math.random() < 1 / 3) {
                    gameState.sicknessTimer = 15000; // Changed from 10000 to 15000 (15 seconds) to match original spec
                } else {
                    gameState.score += 20 * gameState.dog.multiplier;
                    if (Math.random() < 0.3) spawnCollectible(enemy.x, enemy.y, 'bone');
                    if (Math.random() < 0.1) spawnCollectible(enemy.x, enemy.y, 'treat');
                }
            } else {
                gameState.score += 10 * gameState.dog.multiplier;
                if (Math.random() < 0.3) spawnCollectible(enemy.x, enemy.y, 'bone');
                if (Math.random() < 0.1) spawnCollectible(enemy.x, enemy.y, 'treat');
            }
            return false;
        }
        return true;
    });

    const levelThreshold = 500 + (gameState.level - 1) * 50;
    if (gameState.score >= levelThreshold) {
        gameState.level += 1;
        gameState.score = 0;
        gameState.enemies = [];
        gameState.levelUpFlashTimer = 2000;
    }

    if (gameState.powerUpTimer > 0) {
        gameState.powerUpTimer -= delta;
        if (gameState.powerUpTimer <= 0) {
            gameState.dog.speed = 5;
        }
    }

    if (gameState.levelUpFlashTimer > 0) {
        gameState.levelUpFlashTimer -= delta;
        if (gameState.levelUpFlashTimer < 0) gameState.levelUpFlashTimer = 0;
    }

    if (gameState.sicknessTimer > 0) {
        gameState.orbitAngle += delta * 0.005;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Since we've fixed the canvas size to baseWidth and baseHeight,
    // we don't need to scale positions anymore
    const scaleX = 1;
    const scaleY = 1;

    // Draw dog
    if (dogSprite.complete && dogSprite.naturalWidth !== 0) {
        ctx.drawImage(dogSprite, gameState.dog.x * scaleX - 20 * scaleX, gameState.dog.y * scaleY - 20 * scaleY, 40 * scaleX, 40 * scaleY);
    } else {
        ctx.fillStyle = 'blue';
        ctx.fillRect(gameState.dog.x * scaleX - 20 * scaleX, gameState.dog.y * scaleY - 20 * scaleY, 40 * scaleX, 40 * scaleY);
        ctx.fillStyle = 'white';
        ctx.fillRect(gameState.dog.x * scaleX - 8 * scaleX, gameState.dog.y * scaleY - 14 * scaleY, 6 * scaleX, 6 * scaleY);
        ctx.fillRect(gameState.dog.x * scaleX + 2 * scaleX, gameState.dog.y * scaleY - 14 * scaleY, 6 * scaleX, 6 * scaleY);
    }

    // Draw enemies
    gameState.enemies.forEach(enemy => {
        const sprite = enemy.type === 'rabbit' ? rabbitSprite :
                      enemy.type === 'bird' ? birdSprite :
                      enemy.type === 'squirrel' ? squirrelSprite :
                      pigSprite;
        if (sprite.complete && sprite.naturalWidth !== 0) {
            ctx.drawImage(sprite, enemy.x * scaleX - 15 * scaleX, enemy.y * scaleY - 15 * scaleY, 30 * scaleX, 30 * scaleY);
        } else {
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x * scaleX - 15 * scaleX, enemy.y * scaleY - 15 * scaleY, 30 * scaleX, 30 * scaleY);
            ctx.fillStyle = 'white';
            if (enemy.type === 'rabbit') {
                ctx.fillRect(enemy.x * scaleX - 3 * scaleX, enemy.y * scaleY - 18 * scaleY, 6 * scaleX, 9 * scaleY);
            } else if (enemy.type === 'bird') {
                ctx.fillRect(enemy.x * scaleX - 18 * scaleX, enemy.y * scaleY - 3 * scaleY, 6 * scaleX, 6 * scaleY);
            } else if (enemy.type === 'squirrel') {
                ctx.fillRect(enemy.x * scaleX + 15 * scaleX, enemy.y * scaleY + 3 * scaleY, 9 * scaleX, 6 * scaleY);
            }
        }
    });

    // Draw collectibles
    gameState.collectibles.forEach(c => {
        const sprite = c.type === 'bone' ? boneSprite : treatSprite;
        if (sprite.complete && sprite.naturalWidth !== 0) {
            ctx.drawImage(sprite, c.x * scaleX - 15 * scaleX, c.y * scaleY - 15 * scaleY, 30 * scaleX, 30 * scaleY);
        } else {
            ctx.fillStyle = c.type === 'bone' ? 'white' : 'yellow';
            ctx.fillRect(c.x * scaleX - 15 * scaleX, c.y * scaleY - 15 * scaleY, 30 * scaleX, 30 * scaleY);
        }
    });

    // Draw orbiting poo
    if (gameState.sicknessTimer > 0 && pooSprite.complete && pooSprite.naturalWidth !== 0) {
        const radius = 50 * scaleX;
        for (let i = 0; i < 4; i++) {
            const angle = gameState.orbitAngle + (i * Math.PI / 2);
            const pooX = gameState.dog.x * scaleX + radius * Math.cos(angle) - 15 * scaleX;
            const pooY = gameState.dog.y * scaleY + radius * Math.sin(angle) - 15 * scaleY;
            ctx.drawImage(pooSprite, pooX, pooY, 30 * scaleX, 30 * scaleY);
        }
    } else if (gameState.sicknessTimer > 0) {
        const radius = 50 * scaleX;
        for (let i = 0; i < 4; i++) {
            const angle = gameState.orbitAngle + (i * Math.PI / 2);
            const pooX = gameState.dog.x * scaleX + radius * Math.cos(angle) - 10 * scaleX;
            const pooY = gameState.dog.y * scaleY + radius * Math.sin(angle) - 10 * scaleY;
            ctx.fillStyle = 'brown';
            ctx.fillRect(pooX, pooY, 20 * scaleX, 20 * scaleY);
        }
    }

    // Draw HUD (top-right, left-aligned, spaced out)
    const hudY = 20 * scaleY;
    const hudStartX = canvas.width - 600 * scaleX; // Start 600px from right edge, adjusted for scaling
    const hudSpacing = 120 * scaleX; // Increased spacing for clarity
    ctx.fillStyle = 'black';
    ctx.font = `${16 * scaleX}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText(`Level: ${gameState.level}`, hudStartX, hudY);
    ctx.fillText(`Bones: ${gameState.bones}`, hudStartX + hudSpacing, hudY);
    ctx.fillText(`Treats: ${gameState.treats}`, hudStartX + hudSpacing * 2, hudY);
    ctx.fillText(`Score: ${gameState.score}`, hudStartX + hudSpacing * 3, hudY);

    // Sprint gauge
    const sprintReady = gameState.sprintCooldown <= 0;
    ctx.fillStyle = sprintReady ? 'green' : 'red';
    const gaugeWidth = 100 * scaleX * (sprintReady ? 1 : 1 - gameState.sprintCooldown / gameState.maxSprintCooldown);
    ctx.fillRect(hudStartX + hudSpacing * 4, hudY - 10 * scaleY, gaugeWidth, 10 * scaleY);
    ctx.strokeStyle = 'black';
    ctx.strokeRect(hudStartX + hudSpacing * 4, hudY - 10 * scaleY, 100 * scaleX, 10 * scaleY);

    // Level-up notification
    if (gameState.levelUpFlashTimer > 0) {
        ctx.fillStyle = `rgba(255, 215, 0, ${Math.sin(Date.now() * 0.01) * 0.5 + 0.5})`;
        ctx.font = `${20 * scaleX}px Arial`;
        ctx.fillText(`Level ${gameState.level}!`, canvas.width - 20 * scaleX, hudY + 30 * scaleY);
    }
}
