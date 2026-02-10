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
    let gameWon = false;
    let lives = 3;

    // Power-up State
    let isInvcible = false;
    let speedBoost = false;
    let powerUpTimer = 0;

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
        } else if (type === 'powerup') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(800, now + 0.5);
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start();
            osc.stop(now + 0.5);
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
    const SPRITE_SCALE = 4; 
    
    // Custom Character (Beard, Blue Shirt, Jeans) - IDLE
    const PLAYER_IDLE = [
        [0,0,2,2,2,2,2,2,2,0,0,0], 
        [0,2,2,2,2,2,2,2,2,2,0,0],
        [0,2,2,3,3,3,3,3,2,2,0,0], 
        [0,2,3,3,2,3,2,3,3,2,0,0], 
        [0,2,3,3,3,3,3,3,3,2,0,0],
        [0,0,3,2,2,2,2,2,3,0,0,0], 
        [0,0,0,4,4,1,4,4,0,0,0,0], 
        [0,0,1,1,1,5,1,1,1,0,0,0], 
        [0,4,1,1,1,1,1,1,1,4,0,0], 
        [4,4,3,1,1,1,1,1,3,4,4],   
        [0,0,1,6,6,5,6,6,1,0,0],   
        [0,0,1,1,1,1,1,1,1,0,0],   
        [0,0,1,1,0,0,0,1,1,0,0],
        [0,1,1,1,0,0,0,1,1,1,0],
        [0,2,2,2,0,0,0,2,2,2,0], 
        [2,2,2,2,0,0,0,2,2,2,2]
    ];

    const PLAYER_RUN = [
        [0,0,2,2,2,2,2,2,2,0,0,0], 
        [0,2,2,2,2,2,2,2,2,2,0,0],
        [0,2,2,3,3,3,3,3,2,2,0,0], 
        [0,2,3,3,2,3,2,3,3,2,0,0], 
        [0,2,3,3,3,3,3,3,3,2,0,0],
        [0,0,3,2,2,2,2,2,3,0,0,0], 
        [0,0,0,4,4,1,4,4,0,0,0,0], 
        [0,0,1,1,1,5,1,1,1,0,0,0], 
        [0,4,1,1,1,1,1,1,1,4,0,0], 
        [4,4,3,1,1,1,1,1,3,4,4],   
        [0,0,1,6,6,5,6,6,1,0,0],   
        [0,0,1,1,1,1,1,1,1,0,0],   
        [0,0,1,1,0,0,0,1,1,0,0],
        [0,1,0,0,1,1,0,0,1,1,0],   
        [1,1,0,0,2,2,0,0,2,2,0],   
        [2,2,0,0,2,2,0,0,2,2,0]
    ];

    // Green Orc
    const ENEMY_ORC = [
        [0,0,0,4,0,0,0,0,4,0,0,0], 
        [0,0,2,2,2,2,2,2,2,2,0,0], 
        [0,2,2,3,3,2,2,3,3,2,2,0], 
        [0,1,1,3,3,1,1,3,3,1,1,0], 
        [0,1,1,1,1,1,1,1,1,1,1,0], 
        [0,0,1,4,1,1,1,1,4,1,0,0], 
        [0,0,2,2,2,2,2,2,2,2,0,0], 
        [0,1,2,2,2,2,2,2,2,2,1,0], 
        [0,1,2,5,2,2,2,2,5,2,1,0], 
        [0,0,2,2,2,0,0,2,2,2,0,0], 
        [0,0,2,2,0,0,0,0,2,2,0,0], 
        [0,2,2,2,0,0,0,0,2,2,2,0]
    ];

    // Snail (New)
    const ENEMY_SNAIL = [
        [0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,2,0,0,0,2,0], // Eyes
        [0,0,0,0,0,0,2,0,0,0,2,0],
        [0,0,0,1,1,1,1,3,3,3,3,0], // Shell (1) Head (3)
        [0,0,1,1,1,1,1,3,3,3,3,0],
        [0,0,1,1,4,4,1,3,3,3,3,0], // Spiral(4)
        [0,0,1,1,1,1,1,3,3,3,3,0],
        [0,0,0,1,1,1,1,3,3,3,3,0],
        [0,0,0,0,3,3,3,3,3,3,3,0], // Body
        [0,0,0,3,3,3,3,3,3,3,3,0],
        [0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0]
    ];

    // Plant (Static Hazard)
    const ENEMY_PLANT = [
        [0,0,0,0,1,1,1,1,0,0,0,0], // Mouth
        [0,0,0,1,4,1,1,4,1,0,0,0], // Teeth(4)
        [0,0,1,1,1,1,1,1,1,1,0,0], // Head
        [0,0,1,1,4,1,1,4,1,1,0,0], 
        [0,0,0,1,1,1,1,1,1,0,0,0],
        [0,0,0,0,2,2,2,2,0,0,0,0], // Stem(2)
        [0,0,2,2,2,2,2,2,2,2,0,0], // Leaves
        [0,2,2,2,2,2,2,2,2,2,2,0],
        [0,0,0,0,2,2,2,2,0,0,0,0],
        [0,0,0,0,2,2,2,2,0,0,0,0],
        [3,3,3,3,3,3,3,3,3,3,3,3], // Pot/Pipe(3)
        [3,3,3,3,3,3,3,3,3,3,3,3]
    ];

    function drawSprite(ctx, map, x, y, size, colors, flip = false) {
        if (!map || map.length === 0) return;
        const rows = map.length;
        const cols = map[0].length;
         for (let row = 0; row < rows; row++) {
            const rData = map[row];
            if (!rData) continue;
            for (let col = 0; col < cols; col++) {
                if (col >= rData.length) continue;
                const pixel = rData[col];
                if (pixel > 0 && colors[pixel]) {
                    ctx.fillStyle = colors[pixel];
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
                if ((e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
                     e.key === ' ' || e.key === 'w' || e.key === 'a' || e.key === 's' || e.key === 'd') 
                     && this.keys.indexOf(e.key) === -1) {
                    this.keys.push(e.key);
                }
                if (e.key === 'r' || e.key === 'R') {
                    if (gameOver || gameWon) restartGame();
                }
            });
            window.addEventListener('keyup', e => {
                 if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
                     e.key === ' ' || e.key === 'w' || e.key === 'a' || e.key === 's' || e.key === 'd') {
                    this.keys.splice(this.keys.indexOf(e.key), 1);
                }
            });
        }
    }

    class Platform {
        constructor(x, y, width, height, type = 'jungle') {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.type = type;
        }

        draw(context) {
            const blockSize = 40;
            const cols = Math.ceil(this.width / blockSize);
            const rows = Math.ceil(this.height / blockSize);

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const bx = this.x + c * blockSize;
                    const by = this.y + r * blockSize;
                    if (bx + blockSize > this.x + this.width) continue; 

                    if (this.type === 'jungle') {
                        // Mossy/Jungle Ground
                        if (r === 0) {
                            context.fillStyle = '#2E8B57'; // SeaGreen (Mossy top)
                            context.fillRect(bx, by, blockSize, blockSize);
                            // Highlight
                            context.fillStyle = '#3CB371'; 
                            context.fillRect(bx+5, by+5, 15, 5);
                            // Grass Hanging
                            context.fillStyle = '#006400'; // DarkGreen
                            context.fillRect(bx, by+blockSize-5, blockSize, 5);
                        } else {
                            // Muddy Jungle Earth
                            context.fillStyle = '#5D4037'; // Dark Brown
                            context.fillRect(bx, by, blockSize, blockSize);
                            // Roots/Rocks
                             context.fillStyle = '#3E2723';
                             context.fillRect(bx + 10, by + 10, 8, 20);
                             context.fillRect(bx + 25, by + 5, 6, 6);
                        }
                    } else if(this.type === 'stone') {
                        // Temple Stone
                        context.fillStyle = '#78909C'; // Blue-Grey
                        context.fillRect(bx, by, blockSize, blockSize);
                        context.strokeStyle = '#455A64';
                        context.strokeRect(bx, by, blockSize, blockSize);
                        // Moss on stone
                        if (Math.random() > 0.7) {
                             context.fillStyle = '#2E8B57';
                             context.fillRect(bx, by, 10, 10);
                        }
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
            this.animationTimer = 0;
        }
        draw(ctx) {
            if (this.type === 'cloud') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, 40, 0, Math.PI * 2);
                ctx.arc(this.x + 50, this.y - 15, 50, 0, Math.PI * 2);
                ctx.arc(this.x + 100, this.y, 40, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.type === 'bush') {
                ctx.fillStyle = '#006400';
                ctx.beginPath();
                ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
                ctx.arc(this.x + 35, this.y - 15, 30, 0, Math.PI * 2);
                ctx.arc(this.x + 70, this.y, 25, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.type === 'ruins') {
                 // Jungle Temple Background
                 ctx.fillStyle = '#546E7A';
                 ctx.fillRect(this.x, this.y, 150, 200);
                 ctx.fillStyle = '#455A64'; // Door
                 ctx.fillRect(this.x + 50, this.y + 120, 50, 80);
                 // Vines on ruins
                 ctx.fillStyle = '#2E8B57';
                 ctx.fillRect(this.x + 10, this.y, 5, 80);
                 ctx.fillRect(this.x + 130, this.y + 20, 5, 100);
            } else if (this.type === 'tree') {
                // Jungle Tree
                ctx.fillStyle = '#4E342E'; // Trunk
                ctx.fillRect(this.x + 30, this.y - 100, 40, 100);
                // Canopy
                ctx.fillStyle = '#228B22';
                ctx.beginPath();
                ctx.arc(this.x + 50, this.y - 120, 60, 0, Math.PI*2);
                ctx.arc(this.x + 20, this.y - 100, 50, 0, Math.PI*2);
                ctx.arc(this.x + 80, this.y - 100, 50, 0, Math.PI*2);
                ctx.fill();
            } else if (this.type === 'waterfall') {
                this.animationTimer++;
                const flowOffset = (this.animationTimer % 20) * 2;
                
                ctx.fillStyle = '#4FC3F7'; // Water Blue
                ctx.fillRect(this.x, this.y, 60, 300);
                
                // Foam/Flow
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                for(let i=0; i<5; i++) {
                     ctx.fillRect(this.x + i*10 + 5, this.y + flowOffset + (i*50) % 300, 5, 20);
                }
                // Splash at bottom
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(this.x + 30, this.y + 300, 30 + Math.sin(this.animationTimer*0.2)*5, 0, Math.PI, false);
                ctx.fill();
            }
        }
    }

    class PowerUp {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.width = 32;
            this.height = 32;
            this.markedForDeletion = false;
            this.angle = 0;
        }
        draw(ctx) {
            this.angle += 0.1;
            const floatY = Math.sin(this.angle) * 5;
            
            ctx.save();
            ctx.translate(this.x + 16, this.y + 16 + floatY);
            
            // Draw Lightning Icon
            ctx.fillStyle = '#FFFF00'; // Yellow
            ctx.strokeStyle = '#FFA500'; // Orange
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(5, -10);
            ctx.lineTo(-5, 5);
            ctx.lineTo(0, 5);
            ctx.lineTo(-5, 15);
            ctx.lineTo(5, 0);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Glow
            ctx.shadowColor = '#FFFF00';
            ctx.shadowBlur = 10;
            ctx.stroke(); // Re-stroke for glow
            
            ctx.restore();
        }
    }

    class Enemy {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.width = 48; // 12 * 4
            this.height = 48;
            this.type = type; // 'orc', 'snail', 'plant'
            this.speed = (type === 'snail') ? 1 : 2;
            this.direction = -1; 
            this.markedForDeletion = false;
            if (type === 'plant') this.speed = 0;
        }

        update(platforms) {
            if (this.type !== 'plant') {
                this.x += this.speed * this.direction;
                // Simple bounce bounds
                if (!this.startX) this.startX = this.x;
                if (this.x > this.startX + 100 || this.x < this.startX - 100) this.direction *= -1;
            }
        }

        draw(context) {
            let sprite = ENEMY_ORC;
            let colors = {};
            
            if (this.type === 'orc') {
                colors = { 1: '#4CAF50', 2: '#808080', 3: '#000000', 4: '#F5F5DC', 5: '#8B0000' };
                sprite = ENEMY_ORC;
            } else if (this.type === 'snail') {
                colors = { 1: '#FF5722', 2: '#000000', 3: '#CDB38B', 4: '#FFCCBC' }; // Shell(Orange), Body(Tan)
                sprite = ENEMY_SNAIL;
            } else if (this.type === 'plant') {
                colors = { 1: '#F44336', 2: '#4CAF50', 3: '#2E7D32', 4: '#FFFFFF' }; // Head(Red), Stem(Green)
                sprite = ENEMY_PLANT;
            }
            
            drawSprite(context, sprite, this.x, this.y, SPRITE_SCALE, colors, this.direction === 1); // Flip logic
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
            this.frameTimer++;
            const scale = 1 + Math.sin(this.frameTimer * 0.1) * 0.1;
            const cx = this.x + this.width/2;
            const cy = this.y + this.height/2;

            context.save();
            context.translate(cx, cy);
            context.scale(scale, 1);
            
            context.fillStyle = '#FFD700'; 
            context.beginPath();
            context.ellipse(0, 0, this.width/2, this.height/2, 0, 0, Math.PI * 2);
            context.fill();
            
            context.fillStyle = '#FFA500'; 
            context.beginPath();
            context.ellipse(0, 0, this.width/4, this.height/2 - 4, 0, 0, Math.PI * 2);
            context.fill();

            context.strokeStyle = 'black';
            context.lineWidth = 2;
            context.stroke();
            context.restore();
        }
    }

    class Player {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = 44; 
            this.height = 64; 
            this.x = 100;
            this.y = 300;
            this.speed = 0;
            this.vy = 0;
            this.weight = 1; 
            this.jumpPower = 20; 
            this.baseSpeed = 7;
            this.maxSpeed = 7;
            this.direction = 1; 
            this.frameTimer = 0;
            this.frameInterval = 10; 
            this.frameX = 0; 
        }

        draw(context) {
            const colors = {
                1: '#1a53ff', 2: '#2c1a0e', 3: '#eabb99', 4: '#ffffff', 5: '#FFD700', 6: '#8B4513'
            };
            
            let sprite = PLAYER_IDLE;
            
            if (this.speed !== 0) {
                this.frameTimer++;
                if (this.frameTimer > this.frameInterval) {
                   this.frameX = (this.frameX === 0) ? 1 : 0;
                   this.frameTimer = 0;
                }
                if (this.frameX === 1) sprite = PLAYER_RUN;
                else sprite = PLAYER_IDLE;
            } else {
                sprite = PLAYER_IDLE;
                this.frameX = 0;
            }

            // Invincibility Flash
            if (isInvcible) {
                 if (Math.floor(Date.now() / 100) % 2 === 0) return; // Flash effect
            }

            drawSprite(context, sprite, this.x, this.y, SPRITE_SCALE, colors, this.direction === -1);
        }

        update(input, platforms) {
            // Speed Boost Logic
            if (speedBoost) {
                this.maxSpeed = 12; // Fast!
                this.frameInterval = 5; // Faster animation
            } else {
                this.maxSpeed = this.baseSpeed;
                this.frameInterval = 10;
            }

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
            if (this.x < 0) this.x = 0;

            if ((input.keys.includes('ArrowUp') || input.keys.includes('w') || input.keys.includes(' ')) && this.onGround(platforms)) {
                this.vy -= this.jumpPower;
                playSound('jump');
            }

            this.y += this.vy;
            
            let onPlatform = false;
            // Jungle Floor (Deep pit death)
            if (this.y > this.gameHeight + 100) {
                // Fell in pit
            } else {
                this.vy += this.weight;
            }

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

    // --- LEVEL GENERATION ---
    let platforms = [];
    let enemies = [];
    let coins = [];
    let decorations = [];
    let powerups = [];
    let victoryRect = {};
    
    function createJungleLevel() {
        platforms = [];
        enemies = [];
        coins = [];
        decorations = [];
        powerups = [];
        
        const LEVEL_LENGTH = 15000;
        
        // Background - Parallax Layers equivalent
        for(let i=0; i<LEVEL_LENGTH; i+= Math.random() * 800 + 400) {
            decorations.push(new Decoration(i, canvas.height - 250, 'ruins')); // Ruins in BG
        }
        for(let i=0; i<LEVEL_LENGTH; i+= Math.random() * 200 + 100) {
            decorations.push(new Decoration(i, canvas.height - 100, 'tree'));
            if(Math.random() > 0.5) decorations.push(new Decoration(i+50, canvas.height - 40, 'bush'));
        }
        for(let i=0; i<LEVEL_LENGTH; i+= Math.random() * 400 + 200) {
            decorations.push(new Decoration(i, Math.random() * 150 + 20, 'cloud'));
        }
        // Waterfalls
        for(let i=1000; i<LEVEL_LENGTH; i+= 4000) {
           decorations.push(new Decoration(i, 100, 'waterfall'));
        }

        // Procedural Terrain
        let currentX = 0;
        let groundY = canvas.height - 40;
        
        while(currentX < LEVEL_LENGTH) {
            // Gap?
            if (currentX > 500 && Math.random() < 0.2) {
                currentX += Math.random() * 150 + 100; // Pit
            }
            
            // Platform Length
            let pWidth = Math.random() * 800 + 400;
            
            // Floor
            platforms.push(new Platform(currentX, groundY, pWidth, 40, 'jungle'));
            
            // High Platforms above
            if (Math.random() < 0.7) {
                let hY = groundY - (Math.random() * 150 + 100);
                let hW = Math.random() * 300 + 100;
                let hX = currentX + Math.random() * (pWidth - hW);
                platforms.push(new Platform(hX, hY, hW, 40, 'stone'));
                
                // Enemies/Coins on High Platform
                if (Math.random() > 0.3) coins.push(new Coin(hX + hW/2, hY - 40));
                
                // PowerUp Chance
                if (Math.random() < 0.1) powerups.push(new PowerUp(hX + hW/2, hY - 50));
            }
            
            // Enemies on ground
            let enemyCount = Math.floor(pWidth / 300);
            for(let e=0; e<enemyCount; e++) {
                let ex = currentX + Math.random() * pWidth;
                let typeRand = Math.random();
                let type = 'orc';
                if (typeRand < 0.3) type = 'snail';
                else if (typeRand < 0.5) type = 'plant';
                
                enemies.push(new Enemy(ex, groundY - 48, type));
            }

            currentX += pWidth;
        }

        victoryRect = {x: LEVEL_LENGTH - 200, y: groundY - 150, w: 10, h: 150};
    }

    createJungleLevel();

    const input = new InputHandler();
    let player = new Player(canvas.width, canvas.height); 
    
    // UI Helpers
    function updateLivesDisplay() {
        const livesContainer = document.getElementById('lives');
        let hearts = '';
        for(let i=0; i<lives; i++) hearts += '❤️';
        livesContainer.innerText = 'Lives: ' + hearts;
    }

    function checkCollisions(deltaTime) {
        // ENEMIES
        enemies.forEach(enemy => {
            enemy.update();
            enemy.draw(ctx);

            if (player.x < enemy.x + enemy.width && player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height && player.y + player.height > enemy.y) {
                
                // Jump Kill (Orc/Snail only, Plants hurt always)
                if (enemy.type !== 'plant' && player.vy > 0 && player.y + player.height - player.vy <= enemy.y + enemy.height * 0.7) {
                    enemy.markedForDeletion = true;
                    player.vy = -12; 
                    score += 50;
                    playSound('hit');
                    document.getElementById('score').innerText = 'Score: ' + score;
                } else {
                    if (!isInvcible) {
                        lives--;
                        playSound('hit');
                        updateLivesDisplay();
                        player.x = Math.max(0, player.x - 100); 
                        player.y = canvas.height - 200;
                        player.vy = 0;
                        
                        if (lives <= 0) {
                            gameOver = true;
                            playSound('gameover');
                            document.getElementById('game-over').querySelector('h1').innerText = "GAME OVER";
                            document.getElementById('game-over').classList.remove('hidden');
                        } else {
                            // Temp invincibility after hit
                            isInvcible = true;
                            setTimeout(() => { isInvcible = false; }, 1000);
                        }
                    }
                }
            }
        });
        enemies = enemies.filter(enemy => !enemy.markedForDeletion);
        
        // COINS
        coins.forEach(coin => {
            coin.draw(ctx);
             if (player.x < coin.x + coin.width && player.x + player.width > coin.x &&
                player.y < coin.y + coin.height && player.y + player.height > coin.y) {
                coin.markedForDeletion = true;
                score += 10;
                playSound('coin');
                document.getElementById('score').innerText = 'Score: ' + score;
            }
        });
        coins = coins.filter(coin => !coin.markedForDeletion);
        
        // POWERUPS
        powerups.forEach(p => {
            p.draw(ctx);
             if (player.x < p.x + p.width && player.x + player.width > p.x &&
                player.y < p.y + p.height && player.y + player.height > p.y) {
                p.markedForDeletion = true;
                playSound('powerup');
                activatePowerUp();
            }
        });
        powerups = powerups.filter(p => !p.markedForDeletion);
    }
    
    function activatePowerUp() {
        speedBoost = true;
        isInvcible = true;
        setTimeout(() => {
            speedBoost = false;
            isInvcible = false;
        }, 10000); // 10s duration
    }

    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;

        if (!gameOver && !gameWon) ctx.clearRect(0, 0, canvas.width, canvas.height);
        else return;
        
        // Jungle Sky
        ctx.fillStyle = '#26C6DA'; // Tropical Cyan/Blue
        ctx.fillRect(0,0, canvas.width, canvas.height);

        let cameraX = 0;
        if (player.x > canvas.width / 3) {
            cameraX = player.x - canvas.width / 3;
        }

        ctx.save();
        ctx.translate(-cameraX, 0);

        decorations.forEach(dec => dec.draw(ctx)); // BG
        platforms.forEach(platform => platform.draw(ctx)); // Ground

        // Goal
        ctx.fillStyle = '#B8860B'; 
        ctx.fillRect(victoryRect.x, victoryRect.y, victoryRect.w, victoryRect.h);
        ctx.beginPath(); 
        ctx.moveTo(victoryRect.x + victoryRect.w, victoryRect.y);
        ctx.lineTo(victoryRect.x + 50, victoryRect.y + 20);
        ctx.lineTo(victoryRect.x + victoryRect.w, victoryRect.y + 40);
        ctx.fillStyle = 'red';
        ctx.fill();

        checkCollisions(deltaTime);

        player.draw(ctx);
        player.update(input, platforms); 

        // Victory
        if (player.x > victoryRect.x) {
            gameWon = true;
            playSound('coin');
            document.getElementById('game-over').querySelector('h1').innerText = "JUNGLE CONQUERED!";
            document.getElementById('game-over').classList.remove('hidden');
        }

        // Death Pit
        if (player.y > canvas.height + 200) {
            lives--;
            playSound('hit');
            updateLivesDisplay();
            player.x = Math.max(0, player.x - 200); // Respawn back a bit
            player.y = 100; // Drop from sky
            player.vy = 0;
            if (lives <= 0) {
                gameOver = true;
                playSound('gameover');
                document.getElementById('game-over').querySelector('h1').innerText = "GAME OVER";
                document.getElementById('game-over').classList.remove('hidden');
            }
        }

        ctx.restore();

        if (!gameOver && !gameWon) requestAnimationFrame(animate); 
    }
    
    function restartGame() {
        gameOver = false;
        gameWon = false;
        score = 0;
        lives = 3;
        document.getElementById('score').innerText = 'Score: 0';
        updateLivesDisplay();
        document.getElementById('game-over').classList.add('hidden');
        player = new Player(canvas.width, canvas.height);
        createJungleLevel(); 
        lastTime = performance.now();
        animate(lastTime);
    }
    
    updateLivesDisplay();
    animate(0);
});
