window.addEventListener('load', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800; canvas.height = 500;

    let lastTime = 0; let score = 0; let gameOver = false; let gameWon = false; let gameStarted = false; let lives = 3;
    let bossActive = false; let bossDefeated = false; let musicPlaying = false; let currentMusic = 'none';
    let shakeMagnitude = 0; let isInvcible = false; let speedBoost = false;

    // --- AUDIO SYSTEM ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const gainNode = audioCtx.createGain(); gainNode.connect(audioCtx.destination); gainNode.gain.value = 0.1;
    let musicOscillators = [];
    
    function playMusic(type) {
        if (currentMusic === type) return; stopMusic(); currentMusic = type; musicPlaying = true;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const tempo = (type === 'boss') ? 0.15 : 0.25;
        const melody = (type === 'boss') ? [220, 0, 220, 246, 220, 0, 196, 0, 220, 0, 220, 261, 246, 220, 196] : [261, 329, 392, 523, 392, 329, 261, 0, 293, 349, 440, 587, 440, 349, 293, 0];
        let noteIndex = 0;
        function playNote() { if (!musicPlaying || currentMusic !== type) return; const freq = melody[noteIndex]; if (freq > 0) { const osc = audioCtx.createOscillator(); const noteGain = audioCtx.createGain(); osc.type = (type === 'boss') ? 'sawtooth' : 'square'; osc.frequency.setValueAtTime(freq, audioCtx.currentTime); noteGain.gain.setValueAtTime(0.05, audioCtx.currentTime); noteGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + tempo); osc.connect(noteGain); noteGain.connect(gainNode); osc.start(); osc.stop(audioCtx.currentTime + tempo); musicOscillators.push(osc); } noteIndex = (noteIndex + 1) % melody.length; setTimeout(playNote, tempo * 1000); } playNote();
    }
    function stopMusic() { musicPlaying = false; musicOscillators.forEach(osc => { try { osc.stop(); } catch(e){} }); musicOscillators = []; }
    function playSound(type) { if (audioCtx.state === 'suspended') audioCtx.resume(); const osc = audioCtx.createOscillator(); const soundGain = audioCtx.createGain(); osc.connect(soundGain); soundGain.connect(audioCtx.destination); const now = audioCtx.currentTime; if (type === 'jump') { osc.type = 'square'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.1); soundGain.gain.setValueAtTime(0.05, now); soundGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1); osc.start(); osc.stop(now + 0.1); } else if (type === 'coin') { osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now); osc.frequency.exponentialRampToValueAtTime(2000, now + 0.1); soundGain.gain.setValueAtTime(0.05, now); soundGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1); osc.start(); osc.stop(now + 0.1); } else if (type === 'gem') { osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2); soundGain.gain.setValueAtTime(0.05, now); soundGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2); osc.start(); osc.stop(now + 0.2); } else if (type === 'spring') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(600, now + 0.1); soundGain.gain.setValueAtTime(0.05, now); soundGain.gain.linearRampToValueAtTime(0, now + 0.3); osc.start(); osc.stop(now + 0.3); } else if (type === 'hit') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.2); soundGain.gain.setValueAtTime(0.05, now); soundGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2); osc.start(); osc.stop(now + 0.2); } else if (type === 'boss_hit') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(20, now + 0.4); soundGain.gain.setValueAtTime(0.1, now); soundGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4); osc.start(); osc.stop(now + 0.4); } else if (type === 'win') { osc.type = 'triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(800, now + 1); soundGain.gain.setValueAtTime(0.1, now); soundGain.gain.linearRampToValueAtTime(0, now + 2); osc.start(); osc.stop(now + 2); } else if (type === 'powerup') { osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(800, now + 0.5); soundGain.gain.setValueAtTime(0.05, now); soundGain.gain.linearRampToValueAtTime(0, now + 0.5); osc.start(); osc.stop(now + 0.5); } else if (type === 'gameover') { osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(100, now + 1); soundGain.gain.setValueAtTime(0.1, now); soundGain.gain.linearRampToValueAtTime(0, now + 1); osc.start(); osc.stop(now + 1); } }

    const SPRITE_SCALE = 4; 
    const PLAYER_IDLE = [[0,0,2,2,2,2,2,2,2,0,0,0],[0,2,2,2,2,2,2,2,2,2,0,0],[0,2,2,3,3,3,3,3,2,2,0,0],[0,2,3,3,2,3,2,3,3,2,0,0],[0,2,3,3,3,3,3,3,3,2,0,0],[0,0,3,2,2,2,2,2,3,0,0,0],[0,0,0,4,4,1,4,4,0,0,0,0],[0,0,1,1,1,5,1,1,1,0,0,0],[0,4,1,1,1,1,1,1,1,4,0,0],[4,4,3,1,1,1,1,1,3,4,4],[0,0,1,6,6,5,6,6,1,0,0],[0,0,1,1,1,1,1,1,1,0,0],[0,0,1,1,0,0,0,1,1,0,0],[0,1,1,1,0,0,0,1,1,1,0],[0,2,2,2,0,0,0,2,2,2,0],[2,2,2,2,0,0,0,2,2,2,2]];
    const PLAYER_RUN = [[0,0,2,2,2,2,2,2,2,0,0,0],[0,2,2,2,2,2,2,2,2,2,0,0],[0,2,2,3,3,3,3,3,2,2,0,0],[0,2,3,3,2,3,2,3,3,2,0,0],[0,2,3,3,3,3,3,3,3,2,0,0],[0,0,3,2,2,2,2,2,3,0,0,0],[0,0,0,4,4,1,4,4,0,0,0,0],[0,0,1,1,1,5,1,1,1,0,0,0],[0,4,1,1,1,1,1,1,1,4,0,0],[4,4,3,1,1,1,1,1,3,4,4],[0,0,1,6,6,5,6,6,1,0,0],[0,0,1,1,1,1,1,1,1,0,0],[0,0,1,1,0,0,0,1,1,0,0],[0,1,0,0,1,1,0,0,1,1,0],[1,1,0,0,2,2,0,0,2,2,0],[2,2,0,0,2,2,0,0,2,2,0]];
    const ENEMY_ORC = [[0,0,0,4,0,0,0,0,4,0,0,0],[0,0,2,2,2,2,2,2,2,2,0,0],[0,2,2,3,3,2,2,3,3,2,2,0],[0,1,1,3,3,1,1,3,3,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,0,1,4,1,1,1,1,4,1,0,0],[0,0,2,2,2,2,2,2,2,2,0,0],[0,1,2,2,2,2,2,2,2,2,1,0],[0,1,2,5,2,2,2,2,5,2,1,0],[0,0,2,2,2,0,0,2,2,2,0,0],[0,0,2,2,0,0,0,0,2,2,0,0],[0,2,2,2,0,0,0,0,2,2,2,0]];
    const ENEMY_SNAIL = [[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,2,0,0,0,2,0],[0,0,0,0,0,0,2,0,0,0,2,0],[0,0,0,1,1,1,1,3,3,3,3,0],[0,0,1,1,1,1,1,3,3,3,3,0],[0,0,1,1,4,4,1,3,3,3,3,0],[0,0,1,1,1,1,1,3,3,3,3,0],[0,0,0,1,1,1,1,3,3,3,3,0],[0,0,0,0,3,3,3,3,3,3,3,0],[0,0,0,3,3,3,3,3,3,3,3,0],[0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0]];
    const ENEMY_PLANT = [[0,0,0,0,1,1,1,1,0,0,0,0],[0,0,0,1,4,1,1,4,1,0,0,0],[0,0,1,1,1,1,1,1,1,1,0,0],[0,0,1,1,4,1,1,4,1,1,0,0],[0,0,0,1,1,1,1,1,1,0,0,0],[0,0,0,0,2,2,2,2,0,0,0,0],[0,0,2,2,2,2,2,2,2,2,0,0],[0,2,2,2,2,2,2,2,2,2,2,0],[0,0,0,0,2,2,2,2,0,0,0,0],[0,0,0,0,2,2,2,2,0,0,0,0],[3,3,3,3,3,3,3,3,3,3,3,3],[3,3,3,3,3,3,3,3,3,3,3,3]];
    function drawSprite(ctx, map, x, y, size, colors, flip = false) { if (!map || map.length === 0) return; const rows = map.length; const cols = map[0].length; for (let row = 0; row < rows; row++) { const rData = map[row]; if (!rData) continue; for (let col = 0; col < cols; col++) { if (col >= rData.length) continue; const pixel = rData[col]; if (pixel > 0 && colors[pixel]) { ctx.fillStyle = colors[pixel]; const drawX = flip ? x + (cols - 1 - col) * size : x + col * size; ctx.fillRect(drawX, y + row * size, size, size); } } } }

    class Particle { constructor(x, y, color) { this.x = x; this.y = y; this.size = Math.random() * 5 + 3; this.speedX = Math.random() * 4 - 2; this.speedY = Math.random() * 4 - 2; this.color = color; this.markedForDeletion = false; this.life = 0; this.maxLife = Math.random() * 20 + 20; } update() { this.x += this.speedX; this.y += this.speedY; this.size *= 0.95; this.life++; if (this.life > this.maxLife || this.size < 0.5) this.markedForDeletion = true; } draw(ctx) { ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.size, this.size); } }
    class FloatingText { constructor(x, y, text, color) { this.x = x; this.y = y; this.text = text; this.color = color; this.velocity = -2; this.life = 0; this.alpha = 1; this.markedForDeletion = false; } update() { this.y += this.velocity; this.velocity *= 0.95; this.life++; if (this.life > 30) this.alpha -= 0.05; if (this.alpha <= 0) this.markedForDeletion = true; } draw(ctx) { ctx.save(); ctx.globalAlpha = this.alpha; ctx.font = '20px "Courier New", monospace'; ctx.fillStyle = this.color; ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.strokeText(this.text, this.x, this.y); ctx.fillText(this.text, this.x, this.y); ctx.restore(); } }
    class OrcKing { constructor(x, y) { this.x = x; this.y = y; this.width = 96; this.height = 96; this.hp = 5; this.maxHp = 5; this.state = 'idle'; this.timer = 0; this.vy = 0; this.speed = 1; this.direction = -1; this.groundY = y; this.markedForDeletion = false; } update(player) { this.timer++; const dist = player.x - this.x; this.direction = (dist > 0) ? 1 : -1; if (this.state === 'idle') { if (this.timer > 100) { this.state = 'chase'; this.timer = 0; } } else if (this.state === 'chase') { this.x += this.speed * this.direction; if (this.timer > 200) { this.state = 'jump'; this.vy = -20; this.timer = 0; } } else if (this.state === 'jump') { this.x += (this.speed * 3) * this.direction; this.vy += 1; this.y += this.vy; if (this.y >= this.groundY) { this.y = this.groundY; this.vy = 0; this.state = 'idle'; shakeMagnitude = 20; for(let i=0; i<20; i++) particles.push(new Particle(this.x + this.width/2, this.y + this.height, 'brown')); } } } draw(ctx) { const colors = { 1: '#FF5252', 2: '#FFD700', 3: '#000000', 4: '#FFFFFF', 5: '#000000' }; ctx.save(); ctx.translate(this.x + this.width/2, this.y + this.height); ctx.scale(2, 2); drawSprite(ctx, ENEMY_ORC, -24, -48, SPRITE_SCALE, colors, this.direction === 1); ctx.restore(); } }
    class Spring { constructor(x, y) { this.x = x; this.y = y; this.width = 30; this.height = 20; this.compressed = false; this.compressTimer = 0; } draw(ctx) { ctx.fillStyle = '#C0C0C0'; let h = this.height; let y = this.y; if (this.compressed) { h = 10; y = this.y + 10; this.compressTimer++; if (this.compressTimer > 10) { this.compressed = false; this.compressTimer = 0; } } ctx.fillRect(this.x, this.y + 15, this.width, 5); ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.x, y + h); ctx.lineTo(this.x + 5, y); ctx.lineTo(this.x + 10, y + h); ctx.lineTo(this.x + 15, y); ctx.lineTo(this.x + 20, y + h); ctx.lineTo(this.x + 25, y); ctx.lineTo(this.x + 30, y + h); ctx.stroke(); } }
    class MovingPlatform { constructor(x, y, width, range) { this.startX = x; this.y = y; this.width = width; this.height = 20; this.range = range; this.angle = 0; this.x = x; this.dx = 0; this.type = 'moving'; } update() { this.angle += 0.02; const prevX = this.x; this.x = this.startX + Math.sin(this.angle) * this.range; this.dx = this.x - prevX; } draw(ctx) { ctx.fillStyle = '#FF9800'; ctx.fillRect(this.x, this.y, this.width, this.height); ctx.fillStyle = '#F57C00'; ctx.fillRect(this.x+5, this.y+5, this.width-10, this.height-10); ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(this.x + this.width/2, this.y + this.height/2, 5, 0, Math.PI*2); ctx.fill(); } }
    class Collectible { constructor(x, y, type) { this.x = x; this.y = y; this.type = type; this.width = 30; this.height = 30; this.markedForDeletion = false; this.angle = 0; } draw(ctx) { this.angle += 0.05; const floatY = Math.sin(this.angle) * 5; const cx = this.x + this.width/2; const cy = this.y + this.height/2 + floatY; ctx.save(); ctx.translate(cx, cy); if (this.type === 'gem_red' || this.type === 'gem_blue') { ctx.fillStyle = (this.type === 'gem_red') ? '#F44336' : '#2196F3'; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(12, 0); ctx.lineTo(0, 15); ctx.lineTo(-12, 0); ctx.fill(); } else if (this.type === 'heart') { ctx.fillStyle = 'red'; const s = 10; ctx.beginPath(); ctx.moveTo(0, -s/2); ctx.bezierCurveTo(s/2, -s, s, -s/2, 0, s); ctx.bezierCurveTo(-s, -s/2, -s/2, -s, 0, -s/2); ctx.fill(); } else if (this.type === 'shield') { ctx.fillStyle = '#E91E63'; ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 5, 10, 0, Math.PI*2); ctx.fill(); ctx.stroke(); ctx.fillRect(-4, -15, 8, 10); ctx.strokeRect(-4, -15, 8, 10); } ctx.restore(); } }
    
    // Updated Platform with Animation
    class Platform {
        constructor(x, y, width, height, type = 'ground') { this.x = x; this.y = y; this.width = width; this.height = height; this.type = type; this.animTimer = Math.random()*100; }
        draw(context) { 
            this.animTimer+=0.1;
            const blockSize = 40; const cols = Math.ceil(this.width / blockSize); const rows = Math.ceil(this.height / blockSize); for (let r = 0; r < rows; r++) { for (let c = 0; c < cols; c++) { const bx = this.x + c * blockSize; const by = this.y + r * blockSize; if (bx + blockSize > this.x + this.width) continue; if (this.type === 'ground') { if (r === 0) { context.fillStyle = '#D2B48C'; context.fillRect(bx, by, blockSize, blockSize); context.fillStyle = '#F4A460'; context.fillRect(bx+5, by+5, 15, 5); context.fillStyle = '#8B4513'; context.fillRect(bx + 20, by + 10, 5, 5); context.fillRect(bx + 5, by + 25, 5, 5); 
            // Animated Grass Top
            context.fillStyle = '#00AA00'; 
            context.beginPath(); context.moveTo(bx, by+5);
            for(let g=0; g<=blockSize; g+=5) { 
                let wave = Math.sin(this.animTimer + g*0.1) * 2;
                context.lineTo(bx+g, by + wave); 
            }
            context.lineTo(bx+blockSize, by+5); context.lineTo(bx, by+5); context.fill();
            } else { context.fillStyle = '#8B4513'; context.fillRect(bx, by, blockSize, blockSize); context.fillStyle = '#5D4037'; context.fillRect(bx + 10, by + 10, 8, 20); } } else if(this.type === 'stone') { context.fillStyle = '#90A4AE'; context.fillRect(bx, by, blockSize, blockSize); context.strokeStyle = '#546E7A'; context.strokeRect(bx, by, blockSize, blockSize); if (Math.random() > 0.8) { context.fillStyle = '#2E8B57'; context.fillRect(bx, by, 10, 10); } } else if (this.type === 'mystery') { context.fillStyle = '#FFD700'; context.fillRect(bx, by, blockSize, blockSize); context.strokeStyle = 'black'; context.strokeRect(bx, by, blockSize, blockSize); context.fillStyle = 'black'; context.font = '20px Arial'; context.fillText('?', bx + 12, by + 28); context.fillRect(bx + 2, by + 2, 4, 4); context.fillRect(bx + 34, by + 2, 4, 4); context.fillRect(bx + 2, by + 34, 4, 4); context.fillRect(bx + 34, by + 34, 4, 4); } } } }
    }

    class Decoration {
        constructor(x, y, type) { this.x = x; this.y = y; this.type = type; this.animationTimer = 0; if (type === 'flower') this.color = ['#FF0000', '#FFFF00', '#FFFFFF'][Math.floor(Math.random()*3)]; }
        draw(ctx) { if (this.type === 'flower') { ctx.fillStyle = '#00AA00'; ctx.fillRect(this.x, this.y, 4, 15); ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x + 2, this.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'orange'; ctx.beginPath(); ctx.arc(this.x + 2, this.y, 2, 0, Math.PI * 2); ctx.fill(); } else if (this.type === 'cloud') { ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.beginPath(); ctx.arc(this.x, this.y, 40, 0, Math.PI * 2); ctx.arc(this.x + 50, this.y - 15, 50, 0, Math.PI * 2); ctx.arc(this.x + 100, this.y, 40, 0, Math.PI * 2); ctx.fill(); } else if (this.type === 'bush') { ctx.fillStyle = '#00AA00'; ctx.beginPath(); ctx.arc(this.x, this.y, 25, 0, Math.PI * 2); ctx.arc(this.x + 35, this.y - 15, 30, 0, Math.PI * 2); ctx.arc(this.x + 70, this.y, 25, 0, Math.PI * 2); ctx.fill(); } else if (this.type === 'ruins') { ctx.fillStyle = '#78909C'; ctx.fillRect(this.x, this.y, 150, 200); ctx.fillStyle = '#546E7A'; ctx.fillRect(this.x + 50, this.y + 120, 50, 80); } else if (this.type === 'tree') { ctx.fillStyle = '#8D6E63'; ctx.fillRect(this.x + 30, this.y - 100, 40, 100); ctx.fillStyle = '#228B22'; ctx.beginPath(); ctx.arc(this.x + 50, this.y - 120, 60, 0, Math.PI*2); ctx.arc(this.x + 20, this.y - 100, 50, 0, Math.PI*2); ctx.arc(this.x + 80, this.y - 100, 50, 0, Math.PI*2); ctx.fill(); } else if (this.type === 'waterfall') { this.animationTimer++; const flowOffset = (this.animationTimer % 20) * 2; ctx.fillStyle = '#4FC3F7'; ctx.fillRect(this.x, this.y, 60, 300); ctx.fillStyle = 'rgba(255,255,255,0.5)'; for(let i=0; i<5; i++) ctx.fillRect(this.x + i*10 + 5, this.y + flowOffset + (i*50) % 300, 5, 20); ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(this.x + 30, this.y + 300, 30 + Math.sin(this.animationTimer*0.2)*5, 0, Math.PI, false); ctx.fill(); } 
        else if (this.type === 'mountain') { // New Mountain Decoration
            ctx.fillStyle = '#9FA8DA'; // Light Purple/Blue distant
            ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + 200, this.y - 300); ctx.lineTo(this.x + 400, this.y); ctx.fill();
        } else if (this.type === 'sign') { // Wooden Sign
             ctx.fillStyle = '#8D6E63'; ctx.fillRect(this.x + 10, this.y, 10, 30);
             ctx.fillStyle = '#A1887F'; ctx.fillRect(this.x, this.y - 15, 30, 20); ctx.fillStyle = 'black'; ctx.font = '10px Arial'; ctx.fillText('->', this.x + 8, this.y - 2);
        }
        }
    }
    
    // New Atmospheric Elements
    class Atmosphere {
        constructor() {
            this.fireflies = [];
            this.birds = [];
            for(let i=0; i<30; i++) this.fireflies.push({x: Math.random()*800, y: Math.random()*500, speed: Math.random()*0.5, offset: Math.random()*100});
        }
        update() {
            // Birds Spawn
            if (Math.random() < 0.005) { this.birds.push({x: -50, y: Math.random()*200 + 50, speed: Math.random()*2 + 1}); }
            this.birds.forEach(b => b.x += b.speed);
            this.birds = this.birds.filter(b => b.x < 900);
        }
        draw(ctx) {
            // Fireflies
            ctx.fillStyle = 'rgba(255, 255, 100, 0.6)';
            this.fireflies.forEach(f => {
                let y = f.y + Math.sin((Date.now() + f.offset)/1000) * 20;
                let x = (f.x + Date.now()/50 * f.speed) % 800;
                ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2); ctx.fill();
            });
            // Birds
            ctx.strokeStyle = 'black'; ctx.lineWidth = 2;
            this.birds.forEach(b => {
                ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + 5, b.y + 5); ctx.lineTo(b.x + 10, b.y); ctx.stroke();
            });
            // Sun Shafts
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.rotate(-0.3);
            ctx.fillRect(-200, 0, 100, 1000); ctx.fillRect(100, 0, 150, 1000); ctx.fillRect(500, 0, 80, 1000);
            ctx.restore();
        }
    }

    class Enemy { constructor(x, y, type) { this.x = x; this.y = y; this.width = 48; this.height = 48; this.type = type; this.speed = (type === 'snail') ? 1 : 2; this.direction = -1; this.markedForDeletion = false; if (type === 'plant') this.speed = 0; } update(platforms) { if (this.type !== 'plant') { this.x += this.speed * this.direction; if (!this.startX) this.startX = this.x; if (this.x > this.startX + 100 || this.x < this.startX - 100) this.direction *= -1; } } draw(context) { let sprite = ENEMY_ORC; let colors = {}; if (this.type === 'orc') { colors = { 1: '#4CAF50', 2: '#808080', 3: '#000000', 4: '#F5F5DC', 5: '#8B0000' }; sprite = ENEMY_ORC; } else if (this.type === 'snail') { colors = { 1: '#FF5722', 2: '#000000', 3: '#CDB38B', 4: '#FFCCBC' }; sprite = ENEMY_SNAIL; } else if (this.type === 'plant') { colors = { 1: '#F44336', 2: '#4CAF50', 3: '#2E7D32', 4: '#FFFFFF' }; sprite = ENEMY_PLANT; } drawSprite(context, sprite, this.x, this.y, SPRITE_SCALE, colors, this.direction === 1); } }
    class Coin { constructor(x, y) { this.x = x; this.y = y; this.width = 30; this.height = 30; this.markedForDeletion = false; this.frameTimer = 0; } draw(context) { this.frameTimer++; const scale = 1 + Math.sin(this.frameTimer * 0.1) * 0.1; const cx = this.x + this.width/2; const cy = this.y + this.height/2; context.save(); context.translate(cx, cy); context.scale(scale, 1); ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.ellipse(0, 0, this.width/2, this.height/2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#FFA500'; ctx.beginPath(); ctx.ellipse(0, 0, this.width/4, this.height/2 - 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.stroke(); context.restore(); } }
    class PowerUp { constructor(x, y) { this.x = x; this.y = y; this.width = 32; this.height = 32; this.markedForDeletion = false; this.angle = 0; } draw(ctx) { this.angle += 0.1; const floatY = Math.sin(this.angle) * 5; ctx.save(); ctx.translate(this.x + 16, this.y + 16 + floatY); ctx.fillStyle = '#FFFF00'; ctx.strokeStyle = '#FFA500'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(5, -10); ctx.lineTo(-5, 5); ctx.lineTo(0, 5); ctx.lineTo(-5, 15); ctx.lineTo(5, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); } }
    class Player { constructor(gameWidth, gameHeight) { this.gameWidth = gameWidth; this.gameHeight = gameHeight; this.width = 44; this.height = 64; this.x = 100; this.y = 300; this.speed = 0; this.vy = 0; this.weight = 1; this.jumpPower = 20; this.baseSpeed = 7; this.maxSpeed = 7; this.direction = 1; this.frameTimer = 0; this.frameInterval = 10; this.frameX = 0; this.scaleX = 1; this.scaleY = 1; this.hasShield = false; } draw(context) { const colors = { 1: '#1a53ff', 2: '#2c1a0e', 3: '#eabb99', 4: '#ffffff', 5: '#FFD700', 6: '#8B4513' }; let sprite = PLAYER_IDLE; if (this.speed !== 0) { this.frameTimer++; if (this.frameTimer > this.frameInterval) { this.frameX = (this.frameX === 0) ? 1 : 0; particles.push(new Particle(this.x + this.width/2, this.y + this.height, 'rgba(200,200,200,0.5)')); this.frameTimer = 0; } if (this.frameX === 1) sprite = PLAYER_RUN; else sprite = PLAYER_IDLE; } else { sprite = PLAYER_IDLE; this.frameX = 0; } this.scaleX += (1 - this.scaleX) * 0.1; this.scaleY += (1 - this.scaleY) * 0.1; if (isInvcible && Math.floor(Date.now() / 100) % 2 === 0) return; context.save(); context.translate(this.x + this.width/2, this.y + this.height); context.scale(this.scaleX, this.scaleY); if (this.hasShield) { context.strokeStyle = '#00BFFF'; context.lineWidth = 3; context.beginPath(); context.arc(0, -this.height/2, 40, 0, Math.PI*2); context.stroke(); context.fillStyle = 'rgba(0, 191, 255, 0.2)'; context.fill(); } drawSprite(context, sprite, -this.width/2, -this.height, SPRITE_SCALE, colors, this.direction === -1); context.restore(); } update(input, platforms, movingPlatforms) { if (speedBoost) { this.maxSpeed = 12; this.frameInterval = 5; } else { this.maxSpeed = this.baseSpeed; this.frameInterval = 10; } if (input.keys.includes('ArrowRight') || input.keys.includes('d')) { this.speed = this.maxSpeed; this.direction = 1; } else if (input.keys.includes('ArrowLeft') || input.keys.includes('a')) { this.speed = -this.maxSpeed; this.direction = -1; } else { this.speed = 0; } this.x += this.speed; if (this.x < 0) this.x = 0; if ((input.keys.includes('ArrowUp') || input.keys.includes('w') || input.keys.includes(' ')) && this.onGround(platforms, movingPlatforms)) { this.vy -= this.jumpPower; playSound('jump'); this.scaleX = 0.8; this.scaleY = 1.2; for(let i=0; i<5; i++) particles.push(new Particle(this.x + this.width/2, this.y + this.height, 'white')); } this.y += this.vy; if (this.y > this.gameHeight + 100) {} else { this.vy += this.weight; } let onPlatform = false; platforms.forEach(platform => { if (this.y + this.height <= platform.y && this.y + this.height + this.vy >= platform.y && this.x + this.width > platform.x && this.x < platform.x + platform.width) { if (this.vy > 10) { this.scaleX = 1.2; this.scaleY = 0.8; for(let i=0; i<5; i++) particles.push(new Particle(this.x + this.width/2, this.y + this.height, 'white')); } this.vy = 0; this.y = platform.y - this.height; onPlatform = true; } }); movingPlatforms.forEach(mp => { if (this.y + this.height <= mp.y && this.y + this.height + this.vy >= mp.y && this.x + this.width > mp.x && this.x < mp.x + mp.width) { this.vy = 0; this.y = mp.y - this.height; onPlatform = true; this.x += mp.dx; } }); } onGround(platforms, movingPlatforms) { for (let p of platforms) { if (this.y + this.height === p.y && this.x + this.width > p.x && this.x < p.x + p.width) return true; } for (let mp of movingPlatforms) { if (this.y + this.height === mp.y && this.x + this.width > mp.x && this.x < mp.x + mp.width) return true; } return false; } }
    class InputHandler { constructor() { this.keys = []; window.addEventListener('keydown', e => { if(!gameStarted && e.key === ' ') { startGame(); return; } if (['ArrowDown','ArrowUp','ArrowLeft','ArrowRight',' ','w','a','s','d'].includes(e.key) && this.keys.indexOf(e.key) === -1) this.keys.push(e.key); if (e.key === 'r' || e.key === 'R') if (gameOver || gameWon) restartGame(); }); window.addEventListener('keyup', e => { if (['ArrowDown','ArrowUp','ArrowLeft','ArrowRight',' ','w','a','s','d'].includes(e.key)) this.keys.splice(this.keys.indexOf(e.key), 1); }); } }

    let platforms = [], movingPlatforms = [], enemies = [], coins = [], collectibles = [], springs = [], decorations = [], powerups = [], particles = [], floatingTexts = [];
    let boss = null; let victoryRect = {}; let atmosphericEffects = new Atmosphere();

    function createJungleLevel() {
        platforms = []; movingPlatforms = []; enemies = []; coins = []; collectibles = []; springs = []; decorations = []; powerups = []; particles = []; floatingTexts = [];
        boss = null; bossActive = false; bossDefeated = false;
        
        const LEVEL_LENGTH = 15000;
        
        // Massive Background Details
        // Mountains (Distant)
        for(let i=0; i<LEVEL_LENGTH; i+= 1200) decorations.push(new Decoration(i, canvas.height, 'mountain'));
        // Ruins (Mid)
        for(let i=0; i<LEVEL_LENGTH; i+= Math.random() * 1200 + 400) decorations.push(new Decoration(i, canvas.height - 250, 'ruins'));
        // Trees (Fore)
        for(let i=0; i<LEVEL_LENGTH; i+= Math.random() * 400 + 100) if(Math.random()>0.5) decorations.push(new Decoration(i, canvas.height - 100, 'tree')); else decorations.push(new Decoration(i, canvas.height - 40, 'bush'));
        
        for(let i=0; i<LEVEL_LENGTH; i+= Math.random() * 300 + 100) decorations.push(new Decoration(i, Math.random() * 150 + 20, 'cloud'));
        for(let i=1000; i<LEVEL_LENGTH; i+= 4000) decorations.push(new Decoration(i, 100, 'waterfall'));

        let currentX = 0; let groundY = canvas.height - 40;
        
        while(currentX < LEVEL_LENGTH - 1000) { 
            if (currentX > 500 && Math.random() < 0.2) { 
                if (Math.random() < 0.5) movingPlatforms.push(new MovingPlatform(currentX + 50, groundY, 120, 150));
                currentX += Math.random() * 150 + 100; 
            }
            let pWidth = Math.random() * 800 + 400;
            platforms.push(new Platform(currentX, groundY, pWidth, 40, 'ground'));
            // Signposts
            if (Math.random() < 0.05) decorations.push(new Decoration(currentX + 50, groundY, 'sign'));

            for(let f=0; f < pWidth/100; f++) if(Math.random() > 0.5) decorations.push(new Decoration(currentX + f*100, groundY - 15, 'flower'));
            let enemyCount = Math.floor(pWidth / 300);
            for(let e=0; e<enemyCount; e++) { let ex = currentX + Math.random() * pWidth; let typeRand = Math.random(); let type = 'orc'; if (typeRand < 0.3) type = 'snail'; else if (typeRand < 0.5) type = 'plant'; enemies.push(new Enemy(ex, groundY - 48, type)); }
            if (Math.random() < 0.8) { let hY = groundY - (Math.random() * 150 + 100); let hW = Math.random() * 300 + 100; let hX = currentX + Math.random() * (pWidth - hW); if (Math.random() < 0.2) springs.push(new Spring(hX, groundY - 20)); if (Math.random() > 0.8) { platforms.push(new Platform(hX, hY, 40, 40, 'mystery')); let lootRand = Math.random(); if (lootRand < 0.4) coins.push(new Coin(hX + 5, hY - 50)); else if (lootRand < 0.6) collectibles.push(new Collectible(hX + 5, hY - 50, 'gem_blue')); else if (lootRand < 0.7) collectibles.push(new Collectible(hX + 5, hY - 50, 'shield')); } else { platforms.push(new Platform(hX, hY, hW, 40, 'stone')); if (Math.random() < 0.5) coins.push(new Coin(hX + hW/2, hY - 40)); if (Math.random() < 0.1) collectibles.push(new Collectible(hX + 20, hY - 50, 'gem_red')); if (Math.random() < 0.05) collectibles.push(new Collectible(hX + hW - 40, hY - 50, 'heart')); } }
            currentX += pWidth;
        }

        currentX += 200; const arenaStart = currentX; const arenaWidth = 800;
        platforms.push(new Platform(currentX, groundY, arenaWidth, 40, 'stone')); 
        platforms.push(new Platform(currentX, groundY - 300, 40, 300, 'stone')); platforms.push(new Platform(currentX + arenaWidth, groundY - 300, 40, 300, 'stone'));
        boss = new OrcKing(currentX + 400, groundY - 96); 
        victoryRect = {x: currentX + arenaWidth + 200, y: groundY - 150, w: 10, h: 150};
    }

    createJungleLevel();
    const input = new InputHandler(); let player = new Player(canvas.width, canvas.height); 
    function updateLivesDisplay() { const livesContainer = document.getElementById('lives'); let hearts = ''; for(let i=0; i<Math.min(lives, 5); i++) hearts += '❤️'; livesContainer.innerText = 'Lives: ' + hearts; }
    function spawnExplosion(x, y, color='white') { for(let i=0; i<10; i++) particles.push(new Particle(x, y, color)); }
    function activatePowerUp() { speedBoost = true; isInvcible = true; setTimeout(() => { speedBoost = false; isInvcible = false; }, 10000); }
    function startGame() { gameStarted = true; playMusic('level'); }
    
    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime; lastTime = timeStamp;
        if (shakeMagnitude > 0) { shakeMagnitude *= 0.9; if (shakeMagnitude < 0.5) shakeMagnitude = 0; }
        
        if (!gameStarted) { ctx.fillStyle = '#6B8CFF'; ctx.fillRect(0,0, canvas.width, canvas.height); ctx.fillStyle = 'white'; ctx.font = '40px "Courier New"'; ctx.textAlign = 'center'; ctx.fillText('PIXEL KINGDOM ADVENTURE', canvas.width/2, canvas.height/2 - 50); ctx.font = '20px "Courier New"'; ctx.fillText('Press SPACE to Start', canvas.width/2, canvas.height/2 + 20); requestAnimationFrame(animate); return; }

        if (!gameOver && !gameWon) ctx.clearRect(0, 0, canvas.width, canvas.height); else return;
        ctx.fillStyle = '#5C94FC'; ctx.fillRect(0,0, canvas.width, canvas.height); 
        let cameraX = 0; if (player.x > canvas.width / 3) cameraX = player.x - canvas.width / 3;
        
        ctx.save();
        let shakeX = (Math.random() - 0.5) * shakeMagnitude; let shakeY = (Math.random() - 0.5) * shakeMagnitude;
        ctx.translate(-cameraX + shakeX, shakeY);

        // Draw Atmosphere Behind
        atmosphericEffects.update();
        atmosphericEffects.draw(ctx);

        decorations.forEach(dec => dec.draw(ctx)); 
        platforms.forEach(p => p.draw(ctx)); 
        movingPlatforms.forEach(mp => { mp.update(); mp.draw(ctx); });

        if (boss && !boss.markedForDeletion) { if (!bossActive && player.x > boss.x - 600) { bossActive = true; playMusic('boss'); } if (bossActive) { boss.update(player); boss.draw(ctx); if (player.x < boss.x + boss.width && player.x + player.width > boss.x && player.y < boss.y + boss.height && player.y + player.height > boss.y) { if (player.vy > 0 && player.y + player.height - player.vy <= boss.y + boss.height * 0.5) { boss.hp--; player.vy = -15; score += 500; playSound('boss_hit'); spawnExplosion(boss.x+48, boss.y, 'red'); shakeMagnitude = 15; floatingTexts.push(new FloatingText(boss.x, boss.y - 50, 'HIT!', 'red')); if (boss.hp <= 0) { boss.markedForDeletion = true; bossDefeated = true; playMusic('none'); playSound('win'); gameWon = true; document.getElementById('game-over').querySelector('h1').innerText = "BOSS DEFEATED!"; document.getElementById('game-over').classList.remove('hidden'); } } else { if (!isInvcible) { if (player.hasShield) { player.hasShield = false; isInvcible = true; playSound('hit'); setTimeout(() => { isInvcible = false; }, 1000); } else { lives--; playSound('hit'); shakeMagnitude = 10; updateLivesDisplay(); player.x -= 100; player.vy = -10; isInvcible = true; setTimeout(() => { isInvcible = false; }, 1000); } if (lives <= 0) { gameOver = true; playSound('gameover'); stopMusic(); document.getElementById('game-over').querySelector('h1').innerText = "BOSS VICTORY"; document.getElementById('game-over').classList.remove('hidden'); } } } } } }
        
        enemies.forEach(enemy => { enemy.update(); enemy.draw(ctx); if (player.x < enemy.x + enemy.width && player.x + player.width > enemy.x && player.y < enemy.y + enemy.height && player.y + player.height > enemy.y) { if (enemy.type !== 'plant' && player.vy > 0 && player.y + player.height - player.vy <= enemy.y + enemy.height * 0.7) { enemy.markedForDeletion = true; player.vy = -12; score += 50; playSound('hit'); spawnExplosion(enemy.x+24, enemy.y+24, 'red'); floatingTexts.push(new FloatingText(enemy.x, enemy.y, '+50', '#FFD700')); shakeMagnitude = 5; } else { if (!isInvcible) { if (player.hasShield) { player.hasShield = false; isInvcible = true; playSound('hit'); setTimeout(() => { isInvcible = false; }, 1000); } else { lives--; playSound('hit'); shakeMagnitude = 10; updateLivesDisplay(); player.x -= 100; player.vy = -10; isInvcible = true; setTimeout(() => { isInvcible = false; }, 1000); if (lives <=0) { gameOver=true; stopMusic(); playSound('gameover'); document.getElementById('game-over').querySelector('h1').innerText = "GAME OVER"; document.getElementById('game-over').classList.remove('hidden'); } } } } } }); enemies = enemies.filter(e => !e.markedForDeletion);
        collectibles.forEach(col => { col.draw(ctx); if (player.x < col.x + col.width && player.x + player.width > col.x && player.y < col.y + col.height && player.y + player.height > col.y) { col.markedForDeletion = true; if(col.type=='heart'){lives++;updateLivesDisplay();} if(col.type=='shield')player.hasShield=true; playSound('powerup'); } }); collectibles = collectibles.filter(c => !c.markedForDeletion);
        coins.forEach(c => { c.draw(ctx); if (player.x < c.x + c.width && player.x + player.width > c.x && player.y < c.y + c.height && player.y + player.height > c.y) { c.markedForDeletion = true; score+=10; playSound('coin'); } }); coins = coins.filter(c => !c.markedForDeletion);
        springs.forEach(s => { s.draw(ctx); if (player.x + player.width > s.x && player.x < s.x + s.width && player.y + player.height > s.y+10 && player.y+player.height<s.y+25 && player.vy>0) { player.vy = -25; s.compressed = true; playSound('spring'); } });
        particles.forEach(p => { p.update(); p.draw(ctx); }); particles = particles.filter(p => !p.markedForDeletion);
        floatingTexts.forEach(t => { t.update(); t.draw(ctx); }); floatingTexts = floatingTexts.filter(t => !t.markedForDeletion);

        player.draw(ctx); player.update(input, platforms, movingPlatforms); 
        if (player.y > canvas.height + 200) { lives--; playSound('hit'); player.x -= 200; player.y = 100; player.vy = 0; if(lives<=0) {gameOver=true; stopMusic(); document.getElementById('game-over').classList.remove('hidden');} else updateLivesDisplay(); }

        ctx.restore();
        document.getElementById('score').innerText = 'Score: ' + score;
        if (bossActive && !bossDefeated) { ctx.fillStyle = 'red'; ctx.fillRect(canvas.width/2 - 100, 20, 200 * (boss.hp / boss.maxHp), 20); ctx.strokeStyle = 'white'; ctx.strokeRect(canvas.width/2 - 100, 20, 200, 20); ctx.fillStyle = 'white'; ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.fillText('ORC KING', canvas.width/2, 15); }
        if (!gameOver && !gameWon) requestAnimationFrame(animate); 
    }
    
    function restartGame() { gameOver = false; gameWon = false; score = 0; lives = 3; stopMusic(); document.getElementById('score').innerText = 'Score: 0'; updateLivesDisplay(); document.getElementById('game-over').classList.add('hidden'); player = new Player(canvas.width, canvas.height); createJungleLevel(); lastTime = performance.now(); animate(lastTime); playMusic('level'); }
    
    updateLivesDisplay(); animate(0);
});
