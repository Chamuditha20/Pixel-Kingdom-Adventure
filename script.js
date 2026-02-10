window.addEventListener('load', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = 800;
    canvas.height = 500;

    // Game variables
    let lastTime = 0;
    let score = 0;
    let gameOver = false;

    // Sound Effects
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playSound(type) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'jump') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start();
            osc.stop(now + 0.1);
        } else if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start();
            osc.stop(now + 0.1);
        } else if (type === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start();
            osc.stop(now + 0.2);
        } else if (type === 'gameover') {
             osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(100, now + 1);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 1);
            osc.start();
            osc.stop(now + 1);
        }
    }

    // --- SPRITE DATA (Pixel Art) ---
    // 0 = transparent, 1 = main color, 2 = secondary color, 3 = skin/details
    const SPRITE_SCALE = 4; // Each "pixel" in the map is 4x4 on screen
    
    // Mario-ish Idle (12x16 grid approx)
    const PLAYER_IDLE = [
        [0,0,0,1,1,1,1,1,0,0,0,0], // Hat
        [0,0,1,1,1,1,1,1,1,1,1,0],
        [0,0,3,3,3,2,2,3,2,0,0,0], // Face
        [0,3,2,3,3,3,2,3,3,3,0,0],
        [0,3,3,3,3,2,2,2,2,3,0,0],
        [0,0,3,3,3,3,3,3,3,0,0,0],
        [0,0,0,1,2,1,1,2,1,0,0,0], // Body/Overalls
        [0,0,1,1,2,1,1,2,1,1,0,0],
        [0,1,1,1,2,2,2,2,1,1,1,0],
        [1,1,1,1,2,2,2,2,1,1,1,1],
        [3,3,1,2,4,2,2,4,2,1,3,3], // Hands/Buttons(4)
        [3,3,3,2,2,2,2,2,2,3,3,3],
        [0,0,2,2,2,0,0,2,2,2,0,0],
        [0,2,2,2,0,0,0,0,2,2,2,0], // Legs
        [1,1,1,0,0,0,0,0,0,1,1,1], // Shoes
        [1,1,1,1,0,0,0,0,1,1,1,1]
    ];

    // Goomba-ish (12x12 approx)
    const ENEMY_WALK = [
        [0,0,0,0,2,2,2,2,0,0,0,0],
        [0,0,0,2,2,2,2,2,2,0,0,0],
        [0,0,2,2,2,2,2,2,2,2,0,0],
        [0,2,2,2,2,2,2,2,2,2,2,0],
        [2,2,2,1,1,2,2,1,1,2,2,2], // Eyes (1=white/black mix handled in logic ideally, but simplified)
        [2,2,2,1,1,2,2,1,1,2,2,2],
        [2,2,2,2,2,2,2,2,2,2,2,2],
        [0,2,2,2,2,2,2,2,2,2,2,0],
        [0,0,2,2,2,2,2,2,2,2,0,0],
        [0,0,0,0,1,1,1,1,0,0,0,0], // Stem
        [0,0,0,1,1,1,1,1,1,0,0,0], // Feet
        [0,0,1,1,0,0,0,0,1,1,0,0]
    ];

    function drawSprite(ctx, map, x, y, size, colors, flip = false) {
        const rows = map.length;
        const cols = map[0].length;
         for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const pixel = map[row][col];
                if (pixel > 0) {
                    ctx.fillStyle = colors[pixel];
                    // Flip horizontally if needed
                    const drawX = flip ? x + (cols - 1 - col) * size : x + col * size;
                    ctx.fillRect(drawX, y + row * size, size, size);
                }
            }
        }
    }

    class InputHandler {
        constructor() {
            this.keys = [];
            window.addEventListener('keydown', e => {
                if ((e.key === 'ArrowDown' || 
                     e.key === 'ArrowUp' || 
                     e.key === 'ArrowLeft' || 
                     e.key === 'ArrowRight' || 
                     e.key === ' ' || // Space
                     e.key === 'w' ||
                     e.key === 'a' ||
                     e.key === 's' ||
                     e.key === 'd'
                    ) && this.keys.indexOf(e.key) === -1) {
                    this.keys.push(e.key);
                }
                // Restart key
                if (e.key === 'r' || e.key === 'R') {
                    if (gameOver) restartGame();
                }
            });
            window.addEventListener('keyup', e => {
                 if (e.key === 'ArrowDown' || 
                     e.key === 'ArrowUp' || 
                     e.key === 'ArrowLeft' || 
                     e.key === 'ArrowRight' || 
                     e.key === ' ' ||
                     e.key === 'w' ||
                     e.key === 'a' ||
                     e.key === 's' ||
                     e.key === 'd') {
                    this.keys.splice(this.keys.indexOf(e.key), 1);
                }
            });
        }
    }

    class Platform {
        constructor(x, y, width, height, type = 'grass') {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.type = type;
        }

        draw(context) {
            // Draw Ground Pattern
            const blockSize = 40;
            const cols = Math.ceil(this.width / blockSize);
            const rows = Math.ceil(this.height / blockSize);

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const bx = this.x + c * blockSize;
                    const by = this.y + r * blockSize;
                    
                    // Don't draw outside width
                    if (bx + blockSize > this.x + this.width) continue; 

                    if (this.type === 'grass') {
                        // Top Layer Grass
                        if (r === 0) {
                            context.fillStyle = '#FFB347'; // Base dirt
                            context.fillRect(bx, by, blockSize, blockSize);
                            // Highlight
                            context.fillStyle = '#FFDAB9'; 
                            context.fillRect(bx+5, by+5, 5, 5);

                            // Grass Top
                            context.fillStyle = '#32CD32'; // Green
                            context.fillRect(bx, by, blockSize, 10);
                            context.fillStyle = '#228B22'; // Dark Green border
                            context.fillRect(bx, by+10, blockSize, 4);
                        } else {
                            // Deep Dirt
                            context.fillStyle = '#8B4513';
                            context.fillRect(bx, by, blockSize, blockSize);
                            // Detail pebbles
                             context.fillStyle = '#654321';
                             context.fillRect(bx + 10, by + 10, 8, 5);
                             context.fillRect(bx + 25, by + 25, 6, 6);
                        }
                    } else if(this.type === 'brick') {
                        context.fillStyle = '#B22222';
                        context.fillRect(bx, by, blockSize, blockSize);
                        context.fillStyle = 'black'; // mortar
                        context.strokeRect(bx, by, blockSize, blockSize);
                        context.fillRect(bx, by+blockSize/2, blockSize, 2);
                        context.fillRect(bx+blockSize/2, by, 2, blockSize/2);
                        context.fillRect(bx+blockSize/4, by+blockSize/2, 2, blockSize/2);
                    }
                }
            }
        }
    }

    class Decoration {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.type = type;
        }
        draw(ctx) {
            if (this.type === 'cloud') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, 30, 0, Math.PI * 2);
                ctx.arc(this.x + 40, this.y - 10, 40, 0, Math.PI * 2);
                ctx.arc(this.x + 80, this.y, 30, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.type === 'bush') {
                ctx.fillStyle = '#228B22';
                ctx.beginPath();
                ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
                ctx.arc(this.x + 30, this.y - 10, 25, 0, Math.PI * 2);
                ctx.arc(this.x + 60, this.y, 20, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.type === 'hill') {
                 ctx.fillStyle = '#3CB371';
                 ctx.beginPath();
                 ctx.moveTo(this.x, this.y);
                 ctx.quadraticCurveTo(this.x + 100, this.y - 150, this.x + 200, this.y);
                 ctx.fill();
                 // Border
                 ctx.strokeStyle = '#006400';
                 ctx.lineWidth = 4;
                 ctx.stroke();
            } else if (this.type === 'pipe') {
                // Classic Green Pipe
                const w = 60, h = 80;
                // Stem
                ctx.fillStyle = '#00A800'; // Main green
                ctx.fillRect(this.x + 4, this.y, w - 8, h);
                ctx.fillStyle = '#006400'; // Dark shade
                ctx.fillRect(this.x + 10, this.y, 5, h);
                ctx.fillRect(this.x + w - 15, this.y, 5, h); // Highlight
                ctx.fillStyle = '#8FBC8F';
                ctx.fillRect(this.x + 8, this.y, 4, h); 
                
                // Head
                ctx.fillStyle = '#00A800';
                ctx.fillRect(this.x, this.y, w, 30);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x, this.y, w, 30);
            }
        }
    }

    class Player {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = 44; // 11 * 4
            this.height = 64; // 16 * 4
            this.x = 100;
            this.y = this.gameHeight - this.height - 100;
            this.speed = 0;
            this.vy = 0;
            this.weight = 1; 
            this.jumpPower = 20; 
            this.maxSpeed = 7;
            this.direction = 1; // 1 Right, -1 Left
        }

        draw(context) {
            // Pixel Art Player
            // Colors: 1=Red, 2=Blue, 3=Skin, 4=Yellow
            const colors = {
                1: '#FF0000',
                2: '#0000FF',
                3: '#FFCC99',
                4: '#FFFF00'
            };
            drawSprite(context, PLAYER_IDLE, this.x, this.y, SPRITE_SCALE, colors, this.direction === -1);
        }

        update(input, platforms) {
            // Horizontal Movement
            if (input.keys.includes('ArrowRight') || input.keys.includes('d')) {
                this.speed = this.maxSpeed;
                this.direction = 1;
            } else if (input.keys.includes('ArrowLeft') || input.keys.includes('a')) {
                this.speed = -this.maxSpeed;
                this.direction = -1;
            } else {
                this.speed = 0;
            }
            
            this.x += this.speed;

            // Boundaries
            if (this.x < 0) this.x = 0;

            // Vertical Movement (Jumping)
            if ((input.keys.includes('ArrowUp') || input.keys.includes('w') || input.keys.includes(' ')) && this.onGround(platforms)) {
                this.vy -= this.jumpPower;
                playSound('jump');
            }

            // Apply Gravity
            this.y += this.vy;
            
            // Collision detection with platforms (Vertical)
            let onPlatform = false;
            // Floor fallback
            if (this.y < this.gameHeight - this.height) {
                this.vy += this.weight;
            } else {
                this.vy = 0;
                this.y = this.gameHeight - this.height;
                onPlatform = true;
            }

            // Platform Collisions
            platforms.forEach(platform => {
                if (this.y + this.height <= platform.y && 
                    this.y + this.height + this.vy >= platform.y &&
                    this.x + this.width > platform.x && 
                    this.x < platform.x + platform.width) {
                        this.vy = 0;
                        this.y = platform.y - this.height;
                        onPlatform = true;
                }
            });
        }

        onGround(platforms) {
            if (this.y >= this.gameHeight - this.height) return true;
             for (let platform of platforms) {
                if (this.y + this.height === platform.y &&
                    this.x + this.width > platform.x &&
                    this.x < platform.x + platform.width) {
                    return true;
                }
            }
            return false;
        }
    }

    class Enemy {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.width = 48; // 12 * 4
            this.height = 48;
            this.speed = Math.random() * 2 + 1;
            this.direction = -1; 
            this.markedForDeletion = false;
        }

        update(platforms) {
            this.x += this.speed * this.direction;
            
            // Simple bounce
             if (!this.startX) this.startX = this.x;
             if (this.x > this.startX + 100 || this.x < this.startX - 100) this.direction *= -1;
        }

        draw(context) {
            // Colors: 1=Black/White, 2=Brown
            const colors = {
                1: '#000000', // Feet/Eyes
                2: '#8B4513'  // Body
            };
            drawSprite(context, ENEMY_WALK, this.x, this.y, SPRITE_SCALE, colors, false);
        }
    }

    class Coin {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.width = 30;
            this.height = 30;
            this.markedForDeletion = false;
            this.frameTimer = 0;
        }

        draw(context) {
            // Pulsing effect
            this.frameTimer++;
            const scale = 1 + Math.sin(this.frameTimer * 0.1) * 0.1;
            
            const cx = this.x + this.width/2;
            const cy = this.y + this.height/2;

            context.save();
            context.translate(cx, cy);
            context.scale(scale, 1);
            
            context.fillStyle = '#FFD700'; // Gold
            context.beginPath();
            context.ellipse(0, 0, this.width/2, this.height/2, 0, 0, Math.PI * 2);
            context.fill();
            
            context.fillStyle = '#FFA500'; // Inner Shine
            context.beginPath();
            context.ellipse(0, 0, this.width/4, this.height/2 - 4, 0, 0, Math.PI * 2);
            context.fill();

            context.strokeStyle = 'black';
            context.lineWidth = 2;
            context.stroke();

            context.restore();
        }
    }

    // Level Generation
    let platforms = [];
    let enemies = [];
    let coins = [];
    let decorations = [];
    let victoryRect = {};
    let lives = 3;
    
    function createLevel() {
        platforms = [];
        enemies = [];
        coins = [];
        decorations = [];
        
        // Ground floor (Tiled grass)
        platforms.push(new Platform(0, canvas.height - 40, 3000, 40)); 
        
        // Background Scenery
        for(let i=0; i<3000; i+= Math.random() * 300 + 100) {
            decorations.push(new Decoration(i, canvas.height - 40, 'hill'));
            decorations.push(new Decoration(i + 150, canvas.height - 40, 'bush'));
        }
        for(let i=0; i<3000; i+= Math.random() * 400 + 200) {
            decorations.push(new Decoration(i, Math.random() * 200 + 50, 'cloud'));
        }

        // Platforms & Obstacles
        const platformData = [
            {x: 400, y: 350, w: 200},
            {x: 700, y: 220, w: 200},
            {x: 1000, y: 350, w: 120},
            {x: 1300, y: 200, w: 160},
            {x: 1600, y: 350, w: 200},
            {x: 2000, y: 250, w: 200},
            {x: 2300, y: 350, w: 120}
        ];

        // Pipes
        decorations.push(new Decoration(600, canvas.height - 40 - 80, 'pipe'));
        decorations.push(new Decoration(1800, canvas.height - 40 - 80, 'pipe'));

        platformData.forEach(p => {
            platforms.push(new Platform(p.x, p.y, p.w, 40, 'brick')); // Use generic block height
            // Coins
            if (Math.random() > 0.3) coins.push(new Coin(p.x + p.w/2 - 15, p.y - 45));
            // Enemies
            if (Math.random() > 0.4) {
                let enemy = new Enemy(p.x + 20, p.y - 48);
                enemy.minX = p.x;
                enemy.maxX = p.x + p.w - 48;
                enemies.push(enemy);
            }
        });

        // Ground Enemies
        enemies.push(new Enemy(900, canvas.height - 40 - 48));

        // Victory Condition
        victoryRect = {x: 2800, y: canvas.height - 190, w: 10, h: 150};
    }

    createLevel();

    const input = new InputHandler();
    let player = new Player(canvas.width, canvas.height); 

    function handleEnemies(deltaTime) {
        enemies.forEach(enemy => {
            enemy.update();
            enemy.draw(ctx);

            if (
                player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y
            ) {
                // Kill enemy
                if (player.vy > 0 && player.y + player.height - player.vy <= enemy.y + enemy.height * 0.7) {
                    enemy.markedForDeletion = true;
                    player.vy = -12; 
                    score += 50;
                    playSound('hit');
                    document.getElementById('score').innerText = 'Score: ' + score;
                } else {
                    lives--;
                    playSound('hit');
                    document.getElementById('lives').innerText = 'Lives: ' + lives;
                    player.x = 100; player.y = canvas.height - 150;
                    
                    if (lives <= 0) {
                        gameOver = true;
                        playSound('gameover');
                        document.getElementById('game-over').querySelector('h1').innerText = "GAME OVER";
                        document.getElementById('game-over').classList.remove('hidden');
                    }
                }
            }
        });
        enemies = enemies.filter(enemy => !enemy.markedForDeletion);
    }

    function handleCoins() {
        coins.forEach(coin => {
            coin.draw(ctx);
             if (
                player.x < coin.x + coin.width &&
                player.x + player.width > coin.x &&
                player.y < coin.y + coin.height &&
                player.y + player.height > coin.y
            ) {
                coin.markedForDeletion = true;
                score += 10;
                playSound('coin');
                document.getElementById('score').innerText = 'Score: ' + score;
            }
        });
        coins = coins.filter(coin => !coin.markedForDeletion);
    }

    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;

        if (!gameOver) ctx.clearRect(0, 0, canvas.width, canvas.height);
        else return;
        
        // Sky Color
        ctx.fillStyle = '#6B8CFF'; // Mario Sky Blue
        ctx.fillRect(0,0, canvas.width, canvas.height);

        let cameraX = 0;
        if (player.x > canvas.width / 3) {
            cameraX = player.x - canvas.width / 3;
        }

        ctx.save();
        ctx.translate(-cameraX, 0);

        // Draw Scenery (Behind platforms)
        decorations.forEach(dec => dec.draw(ctx));

        // Draw Platforms
        platforms.forEach(platform => platform.draw(ctx));

        // Draw Victory Goal
        ctx.fillStyle = '#B8860B'; // Pole
        ctx.fillRect(victoryRect.x, victoryRect.y, victoryRect.w, victoryRect.h);
        ctx.beginPath(); // Flag
        ctx.moveTo(victoryRect.x + victoryRect.w, victoryRect.y);
        ctx.lineTo(victoryRect.x + 50, victoryRect.y + 20);
        ctx.lineTo(victoryRect.x + victoryRect.w, victoryRect.y + 40);
        ctx.fillStyle = 'red';
        ctx.fill();

        handleEnemies(deltaTime);
        handleCoins();

        player.draw(ctx);
        player.update(input, platforms); 

        // Check Victory
        if (player.x > victoryRect.x) {
            gameOver = true;
            playSound('coin');
            document.getElementById('game-over').querySelector('h1').innerText = "YOU WIN!";
            document.getElementById('game-over').classList.remove('hidden');
        }

        // Check if fell off world
        if (player.y > canvas.height) {
            lives--;
            playSound('hit');
            document.getElementById('lives').innerText = 'Lives: ' + lives;
            player.x = 100; player.y = canvas.height - 150;
            player.vy = 0;
            if (lives <= 0) {
                gameOver = true;
                playSound('gameover');
                document.getElementById('game-over').querySelector('h1').innerText = "GAME OVER";
                document.getElementById('game-over').classList.remove('hidden');
            } else {
                
            }
        }

        ctx.restore();

        if (!gameOver) requestAnimationFrame(animate); 
    }
    
    function restartGame() {
        gameOver = false;
        score = 0;
        lives = 3;
        document.getElementById('score').innerText = 'Score: 0';
        document.getElementById('lives').innerText = 'Lives: 3';
        document.getElementById('game-over').classList.add('hidden');
        player = new Player(canvas.width, canvas.height);
        createLevel(); 
        lastTime = performance.now();
        animate(lastTime);
    }

    animate(0);
});
