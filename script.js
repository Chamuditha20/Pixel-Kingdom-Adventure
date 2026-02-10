/**
 * Pixel Kingdom Adventure
 * A 2D Platformer Game
 */

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
        constructor(x, y, width, height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.color = '#654321'; // Brownish
        }

        draw(context) {
            context.fillStyle = this.color;
            context.fillRect(this.x, this.y, this.width, this.height);
            // Add a grassy top
            context.fillStyle = '#32CD32';
            context.fillRect(this.x, this.y, this.width, 10);
        }
    }

    class Player {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = 40;
            this.height = 40;
            this.x = 100;
            this.y = this.gameHeight - this.height - 100;
            this.image = document.getElementById('playerImage'); 
            this.speed = 0;
            this.vy = 0;
            this.weight = 1; 
            this.jumpPower = 20; 
            this.maxSpeed = 8;
            this.color = '#ff6b6b';
        }

        draw(context) {
            context.fillStyle = this.color;
            context.fillRect(this.x, this.y, this.width, this.height);
        }

        update(input, platforms) {
            // Horizontal Movement
            if (input.keys.includes('ArrowRight') || input.keys.includes('d')) {
                this.speed = this.maxSpeed;
            } else if (input.keys.includes('ArrowLeft') || input.keys.includes('a')) {
                this.speed = -this.maxSpeed;
            } else {
                this.speed = 0;
            }
            
            this.x += this.speed;

            // Boundaries (Left only, right is infinite scrolling effectively)
            if (this.x < 0) this.x = 0;

            // Vertical Movement (Jumping)
            if ((input.keys.includes('ArrowUp') || input.keys.includes('w') || input.keys.includes(' ')) && this.onGround(platforms)) {
                this.vy -= this.jumpPower;
            }

            // Apply Gravity
            this.y += this.vy;
            
            // Collision detection with platforms (Vertical)
            let onPlatform = false;
            if (this.y < this.gameHeight - this.height) {
                this.vy += this.weight;
            } else {
                // Ground level floor fallback (if no invisible floor platform)
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
            
            // Check if standing on a platform
            // We need a slight lookahead or tolerance to allow jumping
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
            this.width = 40;
            this.height = 40;
            this.color = '#8b0000'; // Dark red
            this.speed = Math.random() * 2 + 1;
            this.direction = 1; // 1 = right, -1 = left
            this.markedForDeletion = false;
        }

        update(platforms) {
            this.x += this.speed * this.direction;

            // Simple patrol logic: Turn around at boundaries or random distance check?
            // For now, just turn around if hitting nothing (simulate edge detection) or walking too far.
            // A better way for this simplified version: Turn around after walking 200px
            // Or easier: Just bounce off walls if we had them.
            // Let's implement a range patrol based on start position? 
            // Better: Check platform edges.
        }

        draw(context) {
            context.fillStyle = this.color;
            context.fillRect(this.x, this.y, this.width, this.height);
            // Eyes
            context.fillStyle = 'white';
            context.fillRect(this.x + 5, this.y + 10, 10, 10);
            context.fillRect(this.x + 25, this.y + 10, 10, 10);
            context.fillStyle = 'black';
            context.fillRect(this.x + 7, this.y + 12, 5, 5);
            context.fillRect(this.x + 27, this.y + 12, 5, 5);
        }
    }

    class Coin {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.width = 20;
            this.height = 20;
            this.markedForDeletion = false;
        }

        draw(context) {
            context.fillStyle = '#FFD700'; // Gold
            context.beginPath();
            context.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
            context.fill();
            context.strokeStyle = '#DAA520';
            context.lineWidth = 2;
            context.stroke();
        }
    }

    // Level Generation
    let platforms = [];
    let enemies = [];
    let coins = [];
    let lives = 3;
    
    function createLevel() {
        platforms = [];
        enemies = [];
        coins = [];
        
        // Ground floor (series of blocks or one long block)
        platforms.push(new Platform(0, canvas.height - 50, 2000, 50)); 
        
        // Random Platforms & Entities
        const platformData = [
            {x: 300, y: 350, w: 200},
            {x: 600, y: 250, w: 200},
            {x: 900, y: 350, w: 200},
            {x: 1200, y: 200, w: 150},
            {x: 1500, y: 300, w: 200}
        ];

        platformData.forEach(p => {
            platforms.push(new Platform(p.x, p.y, p.w, 20));
            // Add coin on top
            if(Math.random() > 0.3) {
                coins.push(new Coin(p.x + p.w/2 - 10, p.y - 40));
            }
            // Add enemy on ground below or on platform
            if(Math.random() > 0.5) {
                // Enemy on the platform
                let enemy = new Enemy(p.x + 20, p.y - 40);
                // Assign a patrol range property to the enemy explicitly?
                // Or just let them fall. Let's make them walk back and forth on the platform.
                // We'll update Enemy update logic to handle edges.
                enemy.minX = p.x;
                enemy.maxX = p.x + p.w - 40;
                enemies.push(enemy);
            }
        });

        // Add some ground enemies
        enemies.push(new Enemy(500, canvas.height - 90));
        enemies[enemies.length-1].minX = 400;
        enemies[enemies.length-1].maxX = 700;
    }

    // Update Enemy Class with Patrol Logic
    Enemy.prototype.update = function() {
        this.x += this.speed * this.direction;
        
        if (this.minX && this.maxX) {
            if (this.x < this.minX || this.x > this.maxX) {
                this.direction *= -1;
            }
        } else {
             // Simple timer based or just standard bounce?
             // If no range set, just move 100px from spawn
             if (!this.startX) this.startX = this.x;
             if (this.x > this.startX + 100 || this.x < this.startX - 100) this.direction *= -1;
        }
    }

    createLevel();

    // Main Game Loop
    const input = new InputHandler();
    let player = new Player(canvas.width, canvas.height); 

    function handleEnemies(deltaTime) {
        enemies.forEach(enemy => {
            enemy.update();
            enemy.draw(ctx);

            // Collision with Player
            if (
                player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y
            ) {
                // Collision detected
                // Check if player is landing on top (Kill enemy)
                // Player must be falling (vy > 0) and player bottom must be near enemy top
                if (player.vy > 0 && player.y + player.height - player.vy <= enemy.y + enemy.height * 0.5) {
                    enemy.markedForDeletion = true;
                    player.vy = -15; // Bounce
                    score += 20;
                    document.getElementById('score').innerText = 'Score: ' + score;
                } else {
                    // Player hit from side/bottom (Ouch)
                    lives--;
                    document.getElementById('lives').innerText = 'Lives: ' + lives;
                    player.x = 100; // Reset position
                    player.y = canvas.height - 150;
                    player.image = document.getElementById('playerImage'); // Reset image if we had animation
                    
                    if (lives <= 0) {
                        gameOver = true;
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
             // Collision with Player
             if (
                player.x < coin.x + coin.width &&
                player.x + player.width > coin.x &&
                player.y < coin.y + coin.height &&
                player.y + player.height > coin.y
            ) {
                coin.markedForDeletion = true;
                score += 10;
                document.getElementById('score').innerText = 'Score: ' + score;
            }
        });
        coins = coins.filter(coin => !coin.markedForDeletion);
    }

    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;

        if (!gameOver) ctx.clearRect(0, 0, canvas.width, canvas.height);
        else return; // Stop drawing
        
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0,0, canvas.width, canvas.height);

        // Camera Logic
        let cameraX = 0;
        // Center camera on player if player moves past center
        if (player.x > canvas.width / 3) {
            cameraX = player.x - canvas.width / 3;
        }

        ctx.save();
        ctx.translate(-cameraX, 0);

        // Draw Platforms
        platforms.forEach(platform => platform.draw(ctx));

        // Handle Entities
        handleEnemies(deltaTime);
        handleCoins();

        // Draw Player
        player.draw(ctx);
        player.update(input, platforms); 

        // Check if fell off world
        if (player.y > canvas.height) {
            lives--;
            document.getElementById('lives').innerText = 'Lives: ' + lives;
            player.x = 100; player.y = canvas.height - 150;
            player.vy = 0;
            if (lives <= 0) {
                gameOver = true;
                document.getElementById('game-over').classList.remove('hidden');
            } else {
                // If we fell, we probably need to reset camera too, but camera follows player so safe.
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
