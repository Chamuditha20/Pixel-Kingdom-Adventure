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
    let gameStarted = false; // Start Screen Logic
    let lives = 3;

    // Game Feel (Juice) Variables
    let shakeMagnitude = 0;
    
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
            gainNode.gain.setValueAtTime(0.05, now); // Slightly quieter
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

    // Snail
    const ENEMY_SNAIL = [
        [0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,2,0,0,0,2,0], 
        [0,0,0,0,0,0,2,0,0,0,2,0],
        [0,0,0,1,1,1,1,3,3,3,3,0], 
        [0,0,1,1,1,1,1,3,3,3,3,0],
        [0,0,1,1,4,4,1,3,3,3,3,0], 
        [0,0,1,1,1,1,1,3,3,3,3,0],
        [0,0,0,1,1,1,1,3,3,3,3,0],
        [0,0,0,0,3,3,3,3,3,3,3,0], 
        [0,0,0,3,3,3,3,3,3,3,3,0],
        [0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0]
    ];

    // Plant 
    const ENEMY_PLANT = [
        [0,0,0,0,1,1,1,1,0,0,0,0], 
        [0,0,0,1,4,1,1,4,1,0,0,0], 
        [0,0,1,1,1,1,1,1,1,1,0,0], 
        [0,0,1,1,4,1,1,4,1,1,0,0], 
        [0,0,0,1,1,1,1,1,1,0,0,0],
        [0,0,0,0,2,2,2,2,0,0,0,0], 
        [0,0,2,2,2,2,2,2,2,2,0,0], 
        [0,2,2,2,2,2,2,2,2,2,2,0], 
        [0,0,0,0,2,2,2,2,0,0,0,0], 
        [0,0,0,0,2,2,2,2,0,0,0,0], 
        [3,3,3,3,3,3,3,3,3,3,3,3], 
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
    
    // --- JUICE SYSTEMS ---
    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.size = Math.random() * 5 + 3;
            // Random direction
            this.speedX = Math.random() * 4 - 2;
            this.speedY = Math.random() * 4 - 2;
            this.color = color;
            this.markedForDeletion = false;
            this.life = 0;
            this.maxLife = Math.random() * 20 + 20; 
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.size *= 0.95; // Shrink
            this.life++;
            if (this.life > this.maxLife || this.size < 0.5) this.markedForDeletion = true;
        }
        draw(ctx) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
    }
    
    class FloatingText {
        constructor(x, y, text, color) {
            this.x = x;
            this.y = y;
            this.text = text;
            this.color = color;
            this.velocity = -2;
            this.life = 0;
            this.alpha = 1;
            this.markedForDeletion = false;
        }
        update() {
            this.y += this.velocity;
            this.velocity *= 0.95; // Slow down
            this.life++;
            if (this.life > 30) this.alpha -= 0.05;
            if (this.alpha <= 0) this.markedForDeletion = true;
        }
        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.font = '20px "Courier New", monospace';
            ctx.fillStyle = this.color;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.strokeText(this.text, this.x, this.y);
            ctx.fillText(this.text, this.x, this.y);
            ctx.restore();
        }
    }

    class InputHandler {
        constructor() {
            this.keys = [];
            window.addEventListener('keydown', e => {
                if(!gameStarted && e.key === ' ') {
                    startGame();
                    return;
                }
                
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
        constructor(x, y, width, height, type = 'ground') {
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

                    if (this.type === 'ground') {
                        // Classic Mario Brown Ground
                        if (r === 0) {
                            context.fillStyle = '#D2B48C'; // Tan Top
                            context.fillRect(bx, by, blockSize, blockSize);
                            // Highlight
                            context.fillStyle = '#F4A460'; 
                            context.fillRect(bx+5, by+5, 15, 5);
                            // Dark Brown details
                            context.fillStyle = '#8B4513';
                            context.fillRect(bx + 20, by + 10, 5, 5);
                            context.fillRect(bx + 5, by + 25, 5, 5);
                            // Grass Top Border
                            context.fillStyle = '#00AA00'; // Vibrant Green
                            context.fillRect(bx, by, blockSize, 5);
                        } else {
                            // Deep Dirt
                            context.fillStyle = '#8B4513'; // Chocolate Brown
                            context.fillRect(bx, by, blockSize, blockSize);
                            // Details
                             context.fillStyle = '#5D4037';
                             context.fillRect(bx + 10, by + 10, 8, 20);
                        }
                    } else if(this.type === 'stone') {
                        // Temple Stone
                        context.fillStyle = '#90A4AE'; 
                        context.fillRect(bx, by, blockSize, blockSize);
                        context.strokeStyle = '#546E7A';
                        context.strokeRect(bx, by, blockSize, blockSize);
                        // Moss on stone
                        if (Math.random() > 0.8) {
                             context.fillStyle = '#2E8B57';
                             context.fillRect(bx, by, 10, 10);
                        }
                    } else if (this.type === 'mystery') {
                        // Gold Mystery Block
                        context.fillStyle = '#FFD700';
                        context.fillRect(bx, by, blockSize, blockSize);
                        context.strokeStyle = 'black';
                        context.strokeRect(bx, by, blockSize, blockSize);
                        // Question Mark
                        context.fillStyle = 'black';
                        context.font = '20px Arial';
                        context.fillText('?', bx + 12, by + 28);
                        // Bolts
                        context.fillStyle = 'black';
                        context.fillRect(bx + 2, by + 2, 4, 4);
                        context.fillRect(bx + 34, by + 2, 4, 4);
                        context.fillRect(bx + 2, by + 34, 4, 4);
                        context.fillRect(bx + 34, by + 34, 4, 4);
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
            // Flower Color
            if (type === 'flower') {
                const colors = ['#FF0000', '#FFFF00', '#FFFFFF'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
        }
        draw(ctx) {
             if (this.type === 'flower') {
                 ctx.fillStyle = '#00AA00'; // Stem
                 ctx.fillRect(this.x, this.y, 4, 15);
                 ctx.fillStyle = this.color; // Petals
                 ctx.beginPath();
                 ctx.arc(this.x + 2, this.y, 6, 0, Math.PI * 2);
                 ctx.fill();
                 ctx.fillStyle = 'orange'; // Center
                 ctx.beginPath();
                 ctx.arc(this.x + 2, this.y, 2, 0, Math.PI * 2);
                 ctx.fill();
             } else if (this.type === 'cloud') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // More opacity
                ctx.beginPath();
                ctx.arc(this.x, this.y, 40, 0, Math.PI * 2);
                ctx.arc(this.x + 50, this.y - 15, 50, 0, Math.PI * 2);
                ctx.arc(this.x + 100, this.y, 40, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.type === 'bush') {
                ctx.fillStyle = '#00AA00'; // Vibrant Green
                ctx.beginPath();
                ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
                ctx.arc(this.x + 35, this.y - 15, 30, 0, Math.PI * 2);
                ctx.arc(this.x + 70, this.y, 25, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.type === 'ruins') {
                 ctx.fillStyle = '#78909C';
                 ctx.fillRect(this.x, this.y, 150, 200);
                 ctx.fillStyle = '#546E7A'; // Door
                 ctx.fillRect(this.x + 50, this.y + 120, 50, 80);
            } else if (this.type === 'tree') {
                ctx.fillStyle = '#8D6E63'; // Lighter Brown Trunk
                ctx.fillRect(this.x + 30, this.y - 100, 40, 100);
                // Canopy
                ctx.fillStyle = '#228B22'; // Forest Green
                ctx.beginPath();
                ctx.arc(this.x + 50, this.y - 120, 60, 0, Math.PI*2);
                ctx.arc(this.x + 20, this.y - 100, 50, 0, Math.PI*2);
                ctx.arc(this.x + 80, this.y - 100, 50, 0, Math.PI*2);
                ctx.fill();
            } else if (this.type === 'waterfall') {
                this.animationTimer++;
                const flowOffset = (this.animationTimer % 20) * 2;
                ctx.fillStyle = '#4FC3F7'; 
                ctx.fillRect(this.x, this.y, 60, 300);
                // Foam
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                for(let i=0; i<5; i++) {
                     ctx.fillRect(this.x + i*10 + 5, this.y + flowOffset + (i*50) % 300, 5, 20);
                }
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(this.x + 30, this.y + 300, 30 + Math.sin(this.animationTimer*0.2)*5, 0, Math.PI, false);
                ctx.fill();
            }
        }
    }

    // Reuse existing PowerUp/Enemy/Coin classes...
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
            
            ctx.fillStyle = '#FFFF00'; 
            ctx.strokeStyle = '#FFA500';
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
                colors = { 1: '#FF5722', 2: '#000000', 3: '#CDB38B', 4: '#FFCCBC' };
                sprite = ENEMY_SNAIL;
            } else if (this.type === 'plant') {
                colors = { 1: '#F44336', 2: '#4CAF50', 3: '#2E7D32', 4: '#FFFFFF' };
                sprite = ENEMY_PLANT;
            }
            drawSprite(context, sprite, this.x, this.y, SPRITE_SCALE, colors, this.direction === 1);
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
            ctx.fillStyle = '#FFD700'; 
            ctx.beginPath();
            ctx.ellipse(0, 0, this.width/2, this.height/2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFA500'; 
            ctx.beginPath();
            ctx.ellipse(0, 0, this.width/4, this.height/2 - 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.stroke();
            context.restore();
        }
    }

    // Player with Squash/Stretch logic
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
            
            // Squash stretch
            this.scaleX = 1;
            this.scaleY = 1;
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
                    // Dust particles on run
                    particles.push(new Particle(this.x + this.width/2, this.y + this.height, 'rgba(200,200,200,0.5)'));
                   this.frameTimer = 0;
                }
                if (this.frameX === 1) sprite = PLAYER_RUN;
                else sprite = PLAYER_IDLE;
            } else {
                sprite = PLAYER_IDLE;
                this.frameX = 0;
            }

            // Lerp scale back to 1
            this.scaleX += (1 - this.scaleX) * 0.1;
            this.scaleY += (1 - this.scaleY) * 0.1;

            if (isInvcible && Math.floor(Date.now() / 100) % 2 === 0) return; 

            // Draw with scale
            context.save();
            context.translate(this.x + this.width/2, this.y + this.height); // Pivot at bottom center
            context.scale(this.scaleX, this.scaleY);
            // Draw relative to pivot
            const relX = -this.width/2;
            const relY = -this.height;
            drawSprite(context, sprite, relX, relY, SPRITE_SCALE, colors, this.direction === -1);
            context.restore();
        }

        update(input, platforms) {
            if (speedBoost) {
                this.maxSpeed = 12; 
                this.frameInterval = 5; 
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
                // Jump Squash
                this.scaleX = 0.8; 
                this.scaleY = 1.2;
                // Dust
                for(let i=0; i<5; i++) particles.push(new Particle(this.x + this.width/2, this.y + this.height, 'white'));
            }

            this.y += this.vy;
            let onPlatform = false;
            if (this.y > this.gameHeight + 100) {
            } else {
                this.vy += this.weight;
            }

            platforms.forEach(platform => {
                if (this.y + this.height <= platform.y && 
                    this.y + this.height + this.vy >= platform.y &&
                    this.x + this.width > platform.x && 
                    this.x < platform.x + platform.width) {
                        // Landing Impact
                        if (this.vy > 10) { 
                             this.scaleX = 1.2;
                             this.scaleY = 0.8;
                             // Dust
                             for(let i=0; i<5; i++) particles.push(new Particle(this.x + this.width/2, this.y + this.height, 'white'));
                        }
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
    let particles = [];
    let floatingTexts = [];
    let victoryRect = {};
    
    function createJungleLevel() {
        platforms = [];
        enemies = [];
        coins = [];
        decorations = [];
        powerups = [];
        particles = [];
        floatingTexts = [];
        
        const LEVEL_LENGTH = 15000;
        
        // Background - Less dense, better colors
        for(let i=0; i<LEVEL_LENGTH; i+= Math.random() * 1200 + 400) {
            decorations.push(new Decoration(i, canvas.height - 250, 'ruins')); 
        }
        for(let i=0; i<LEVEL_LENGTH; i+= Math.random() * 400 + 100) {
             // Less trees, more spacing
             if (Math.random() > 0.5) decorations.push(new Decoration(i, canvas.height - 100, 'tree'));
             else decorations.push(new Decoration(i, canvas.height - 40, 'bush'));
        }
        for(let i=0; i<LEVEL_LENGTH; i+= Math.random() * 300 + 100) {
            decorations.push(new Decoration(i, Math.random() * 150 + 20, 'cloud'));
        }
        // Waterfalls
        for(let i=1000; i<LEVEL_LENGTH; i+= 4000) {
           decorations.push(new Decoration(i, 100, 'waterfall'));
        }

        let currentX = 0;
        let groundY = canvas.height - 40;
        
        while(currentX < LEVEL_LENGTH) {
            if (currentX > 500 && Math.random() < 0.2) {
                currentX += Math.random() * 150 + 100; // Pit
            }
            
            let pWidth = Math.random() * 800 + 400;
            platforms.push(new Platform(currentX, groundY, pWidth, 40, 'ground'));
            
            // Flowers on ground
            for(let f=0; f < pWidth/100; f++) {
                if(Math.random() > 0.5) decorations.push(new Decoration(currentX + f*100, groundY - 15, 'flower'));
            }
            
            if (Math.random() < 0.7) {
                let hY = groundY - (Math.random() * 150 + 100);
                let hW = Math.random() * 300 + 100;
                let hX = currentX + Math.random() * (pWidth - hW);
                
                // Mystery Blocks vs Stone Platforms
                if (Math.random() > 0.8) {
                     // Mystery Block Platform (Small)
                     platforms.push(new Platform(hX, hY, 40, 40, 'mystery'));
                     if (Math.random() > 0.5) powerups.push(new PowerUp(hX + 4, hY - 50));
                     else coins.push(new Coin(hX + 5, hY - 50));
                } else {
                     platforms.push(new Platform(hX, hY, hW, 40, 'stone'));
                     if (Math.random() > 0.3) coins.push(new Coin(hX + hW/2, hY - 40));
                     if (Math.random() < 0.1) powerups.push(new PowerUp(hX + hW/2, hY - 50));
                }
            }
            
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
    
    function updateLivesDisplay() {
        const livesContainer = document.getElementById('lives');
        let hearts = '';
        for(let i=0; i<lives; i++) hearts += '❤️';
        livesContainer.innerText = 'Lives: ' + hearts;
    }

    function spawnExplosion(x, y, color='white') {
        for(let i=0; i<10; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    function checkCollisions(deltaTime) {
        // ENEMIES
        enemies.forEach(enemy => {
            enemy.update();
            enemy.draw(ctx);

            if (player.x < enemy.x + enemy.width && player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height && player.y + player.height > enemy.y) {
                
                // Jump Kill 
                if (enemy.type !== 'plant' && player.vy > 0 && player.y + player.height - player.vy <= enemy.y + enemy.height * 0.7) {
                    enemy.markedForDeletion = true;
                    player.vy = -12; 
                    score += 50;
                    playSound('hit');
                    spawnExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 'red');
                    floatingTexts.push(new FloatingText(enemy.x, enemy.y, '+50', '#FFD700'));
                    document.getElementById('score').innerText = 'Score: ' + score;
                    shakeMagnitude = 5; // Shake!
                } else {
                    if (!isInvcible) {
                        lives--;
                        playSound('hit');
                        shakeMagnitude = 10; // Big Shake!
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
                floatingTexts.push(new FloatingText(coin.x, coin.y, '+10', 'yellow'));
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
                floatingTexts.push(new FloatingText(player.x, player.y - 20, 'SPEED UP!', '#FFFF00'));
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
        }, 10000); 
    }
    
    function startGame() {
        gameStarted = true;
        // Hide Start Overlay (Not implemented in HTML, but logic is here)
        // We will assume space starts game logic if paused
    }

    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;
        
        // Shake decay
        if (shakeMagnitude > 0) shakeMagnitude *= 0.9;
        if (shakeMagnitude < 0.5) shakeMagnitude = 0;
        
        // Start Screen Overlay Render
        if (!gameStarted) {
             ctx.fillStyle = '#6B8CFF';
             ctx.fillRect(0,0, canvas.width, canvas.height);
             ctx.fillStyle = 'white';
             ctx.font = '40px "Courier New"';
             ctx.textAlign = 'center';
             ctx.fillText('PIXEL KINGDOM ADVENTURE', canvas.width/2, canvas.height/2 - 50);
             ctx.font = '20px "Courier New"';
             ctx.fillText('Press SPACE to Start', canvas.width/2, canvas.height/2 + 20);
             requestAnimationFrame(animate);
             return;
        }

        if (!gameOver && !gameWon) ctx.clearRect(0, 0, canvas.width, canvas.height);
        else return;
        
        // Classic Mario Sky
        ctx.fillStyle = '#5C94FC'; 
        ctx.fillRect(0,0, canvas.width, canvas.height);

        let cameraX = 0;
        if (player.x > canvas.width / 3) {
            cameraX = player.x - canvas.width / 3;
        }
        
        // Apply Shake & Camera
        ctx.save();
        let shakeX = (Math.random() - 0.5) * shakeMagnitude;
        let shakeY = (Math.random() - 0.5) * shakeMagnitude;
        ctx.translate(-cameraX + shakeX, shakeY);

        decorations.forEach(dec => dec.draw(ctx)); 
        platforms.forEach(platform => platform.draw(ctx)); 

        // Victory Goal
        ctx.fillStyle = '#B8860B'; 
        ctx.fillRect(victoryRect.x, victoryRect.y, victoryRect.w, victoryRect.h);
        ctx.beginPath(); 
        ctx.moveTo(victoryRect.x + victoryRect.w, victoryRect.y);
        ctx.lineTo(victoryRect.x + 50, victoryRect.y + 20);
        ctx.lineTo(victoryRect.x + victoryRect.w, victoryRect.y + 40);
        ctx.fillStyle = 'red';
        ctx.fill();

        checkCollisions(deltaTime);

        // Particles & Text
        particles.forEach(p => { p.update(); p.draw(ctx); });
        particles = particles.filter(p => !p.markedForDeletion);
        
        floatingTexts.forEach(t => { t.update(); t.draw(ctx); });
        floatingTexts = floatingTexts.filter(t => !t.markedForDeletion);

        player.draw(ctx);
        player.update(input, platforms); 

        // Victory Check
        if (player.x > victoryRect.x) {
            gameWon = true;
            playSound('coin');
            document.getElementById('game-over').querySelector('h1').innerText = "YOU WIN!";
            document.getElementById('game-over').classList.remove('hidden');
        }

        // Death Check
        if (player.y > canvas.height + 200) {
            lives--;
            playSound('hit');
            updateLivesDisplay();
            shakeMagnitude = 20; 
            player.x = Math.max(0, player.x - 200); 
            player.y = 100;
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
