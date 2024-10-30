const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Audio setup
const backgroundMusic = new Audio('assets/sounds/background.mp3');
const explosionSound = new Audio('assets/sounds/explosion.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.3;

// Game state variables
let gameInitialized = false;
let gameStarted = false;
let gameRunning = true;
let waitingForStart = true;
let score = 0;
let particles = [];
let matches = [];

// Welcome screen elements
const welcomeScreen = document.getElementById('welcomeScreen');
const startPrompt = document.getElementById('startPrompt');

// Game constants
const GRAVITY = 0.5;
const FLAP_SPEED = -8;
const MATCH_SPEED = 2;
const MATCH_SPAWN_INTERVAL = 2000;
const MATCH_GAP = 200;
const MIN_MATCH_SPACING = 200;

// Colors
const colors = {
    flame: ['#ff4d00', '#ffd700', '#ff8c00'],
    sparkle: ['#ffd700', '#ff4d00', '#ffffff'],
    background: '#000033'
};

// Bomb object
const bomb = {
    x: 50,
    y: canvas.height / 2,
    velocity: 0,
    radius: 15,
    rotation: 0,
    isExploding: false,
    explosionRadius: 0,
    explosionAlpha: 1,
    sparkTrail: []
};

// Audio functions
function startBackgroundMusic() {
    backgroundMusic.play().catch(error => console.log("Audio play failed:", error));
}

function playExplosionSound() {
    explosionSound.currentTime = 0;
    explosionSound.play().catch(error => console.log("Audio play failed:", error));
}

function toggleMusic() {
    if (backgroundMusic.paused) {
        backgroundMusic.play().catch(error => console.log("Audio play failed:", error));
    } else {
        backgroundMusic.pause();
    }
}

function initAudio() {
    document.addEventListener('click', () => {
        backgroundMusic.load();
        explosionSound.load();
    }, { once: true });
}

// Canvas responsive handling
function resizeCanvas() {
    const maxWidth = window.innerWidth * 0.95;
    const maxHeight = window.innerHeight * 0.7;
    const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    
    canvas.style.width = (canvas.width * scale) + 'px';
    canvas.style.height = (canvas.height * scale) + 'px';
}

// Particle system
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.color = `hsl(${Math.random() * 60 + 30}, 100%, 50%)`;
        this.life = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Game mechanics functions
function createMatch() {
    if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        if (lastMatch.x > canvas.width - MIN_MATCH_SPACING) return;
    }

    const match = {
        x: canvas.width,
        width: 20,
        topHeight: Math.random() * (canvas.height - MATCH_GAP - 100) + 50,
        passed: false,
        flameSize: 0,
        flameAlpha: 1,
        bottomFlameSize: 0,
        bottomFlameAlpha: 1,
        bottomFlameOffset: Math.random() * 10
    };
    matches.push(match);
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000033');
    gradient.addColorStop(1, '#330033');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 2;
        const brightness = Math.random();
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawBomb() {
    if (bomb.isExploding) {
        const gradient = ctx.createRadialGradient(
            bomb.x, bomb.y, 0,
            bomb.x, bomb.y, bomb.explosionRadius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 0, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 77, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.save();
        ctx.globalAlpha = bomb.explosionAlpha;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bomb.x, bomb.y, bomb.explosionRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    } else {
        ctx.save();
        ctx.translate(bomb.x, bomb.y);
        ctx.rotate(bomb.rotation);
        
        const bombGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bomb.radius);
        bombGradient.addColorStop(0, '#666');
        bombGradient.addColorStop(1, '#333');
        
        ctx.fillStyle = bombGradient;
        ctx.beginPath();
        ctx.arc(0, 0, bomb.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 3;
        ctx.moveTo(0, -bomb.radius);
        ctx.quadraticCurveTo(10, -bomb.radius - 10, 20, -bomb.radius - 5);
        ctx.stroke();

        ctx.fillStyle = '#ff4d00';
        ctx.beginPath();
        ctx.arc(20, -bomb.radius - 5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = '#ff4d00';
        ctx.shadowBlur = 10;
        ctx.fill();
        
        ctx.restore();
    }
}

function drawMatch(match) {
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(match.x, 0, match.width, match.topHeight);
    ctx.fillRect(match.x, match.topHeight + MATCH_GAP, match.width, canvas.height);
    
    drawFlame(match.x + match.width/2, match.topHeight, match.flameSize, match.flameAlpha);
    drawFlame(
        match.x + match.width/2,
        match.topHeight + MATCH_GAP,
        match.bottomFlameSize + Math.sin(Date.now() / 200 + match.bottomFlameOffset) * 5,
        match.bottomFlameAlpha
    );
}

function drawFlame(x, y, size, alpha) {
    const flameGradient = ctx.createRadialGradient(x, y, 0, x, y, 20 + size);
    flameGradient.addColorStop(0, colors.flame[0]);
    flameGradient.addColorStop(0.5, colors.flame[1]);
    flameGradient.addColorStop(1, 'rgba(255, 69, 0, 0)');

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = flameGradient;
    
    ctx.beginPath();
    ctx.arc(x, y, 20 + size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.quadraticCurveTo(x, y - (30 + size), x + 10, y);
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.7})`;
    ctx.fill();
    
    ctx.restore();
}

function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    
    ctx.fillStyle = '#ffd700';
    ctx.font = '30px Arial';
    ctx.fillText(`Final Score: ${score}`, canvas.width/2, 100);
    
    ctx.font = 'bold 40px Arial';
    ctx.shadowColor = '#ff4d00';
    ctx.shadowBlur = 20;
    for(let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(255, 215, 0, ${1 - i * 0.2})`;
        ctx.fillText('Happy Diwali', canvas.width/2, canvas.height/2 - 40 + i);
    }
    
    ctx.font = '20px Arial';
    ctx.fillStyle = '#ff8c00';
    ctx.shadowBlur = 10;
    ctx.fillText('By Gaurav Upadhyay', canvas.width/2, canvas.height/2 + 20);
    
    ctx.font = '16px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 5;
    ctx.fillText('Press Space or Tap to restart', canvas.width/2, canvas.height/2 + 60);
}

function update() {
    if (!gameRunning || !gameStarted) return;
    
    if (waitingForStart) {
        bomb.y = canvas.height / 2;
        bomb.velocity = 0;
        bomb.rotation = 0;
        return;
    }

    bomb.velocity += GRAVITY;
    bomb.y += bomb.velocity;
    bomb.rotation = Math.atan(bomb.velocity / 8);

    particles = particles.filter(particle => particle.life > 0);
    particles.forEach(particle => particle.update());

    if (bomb.isExploding) {
        bomb.explosionRadius += 5;
        bomb.explosionAlpha -= 0.05;
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(bomb.x, bomb.y));
        }
        if (bomb.explosionAlpha <= 0) {
            gameRunning = false;
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
        }
    }

    matches.forEach(match => {
        match.x -= MATCH_SPEED;
        match.flameSize = Math.sin(Date.now() / 200) * 5;
        match.bottomFlameSize = Math.sin(Date.now() / 300) * 5;

        if (!bomb.isExploding) {
            const hitBox = 10;
            if (bomb.x + hitBox > match.x && 
                bomb.x - hitBox < match.x + match.width && 
                (bomb.y - hitBox < match.topHeight || 
                bomb.y + hitBox > match.topHeight + MATCH_GAP)) {
                bomb.isExploding = true;
                playExplosionSound();
            }
        }

        if (!match.passed && match.x + match.width < bomb.x) {
            score++;
            match.passed = true;
        }
    });

    matches = matches.filter(match => match.x > -match.width);

    if (bomb.y > canvas.height || bomb.y < 0) {
        bomb.isExploding = true;
        playExplosionSound();
    }
}

function gameLoop() {
    update();
    drawBackground();
    matches.forEach(drawMatch);
    drawBomb();
    particles.forEach(particle => particle.draw());

    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ff4d00';
    ctx.shadowBlur = 10;
    ctx.font = '30px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 40);
    ctx.shadowBlur = 0;

    if (!gameRunning) {
        drawGameOverScreen();
    }

    requestAnimationFrame(gameLoop);
}

function resetGame() {
    bomb.y = canvas.height / 2;
    bomb.velocity = 0;
    bomb.isExploding = false;
    bomb.explosionRadius = 0;
    bomb.explosionAlpha = 1;
    matches = [];
    particles = [];
    score = 0;
    gameRunning = true;
    waitingForStart = true;
    startPrompt.classList.remove('hidden');
    startBackgroundMusic();
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (waitingForStart) {
            waitingForStart = false;
            startPrompt.classList.add('hidden');
            return;
        }
        if (gameRunning && !bomb.isExploding) {
            bomb.velocity = FLAP_SPEED;
            if (backgroundMusic.paused) {
                startBackgroundMusic();
            }
        } else if (!gameRunning) {
            resetGame();
        }
    }
});

document.addEventListener('touchstart', (e) => {
    if (waitingForStart) {
        waitingForStart = false;
        startPrompt.classList.add('hidden');
        return;
    }
    if (!gameRunning) {
        resetGame();
    } else if (!bomb.isExploding) {
        bomb.velocity = FLAP_SPEED;
        if (backgroundMusic.paused) {
            startBackgroundMusic();
        }
    }
});

// Welcome screen handler
welcomeScreen.addEventListener('click', () => {
    welcomeScreen.style.display = 'none';
    gameStarted = true;
    waitingForStart = true;
    startPrompt.classList.remove('hidden');
});

// Initialize game
window.addEventListener('load', () => {
    canvas.width = 400;
    canvas.height = 600;
    resizeCanvas();
    initAudio();
    setInterval(() => {
        if (gameRunning && !bomb.isExploding && gameStarted && !waitingForStart) {
            createMatch();
        }
    }, MATCH_SPAWN_INTERVAL);
    gameLoop();
});

// Handle window resize
window.addEventListener('resize', resizeCanvas);
