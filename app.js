// Constants
const TOTAL_LEVELS = 30;
const ROUND_TIME = 30; // seconds

const COLORS = [
    { name: 'Kırmızı', class: 'balloon-red' },
    { name: 'Mavi', class: 'balloon-blue' },
    { name: 'Sarı', class: 'balloon-yellow' },
    { name: 'Yeşil', class: 'balloon-green' },
    { name: 'Mor', class: 'balloon-purple' }
];

const SIZES = [
    { name: 'large', class: 'size-large', points: 1 },
    { name: 'medium', class: 'size-medium', points: 2 },
    { name: 'small', class: 'size-small', points: 3 }
];

// Meta-game Data
const STICKERS = [
    { level: 5, icon: '🦁', name: 'Cesur Aslan' },
    { level: 10, icon: '🐰', name: 'Sevimli Tavşan' },
    { level: 15, icon: '🦒', name: 'Akıllı Zürafa' },
    { level: 20, icon: '🐒', name: 'Oyuncu Maymun' },
    { level: 25, icon: '🦅', name: 'Uçan Kartal' },
    { level: 30, icon: '🐉', name: 'Sihirli Ejderha' }
];

const THEMES = [
    { id: 'theme-sky', name: 'Gökyüzü', icon: '☁️', unlockLevel: 1 },
    { id: 'theme-space', name: 'Uzay', icon: '🚀', unlockLevel: 10 },
    { id: 'theme-jungle', name: 'Orman', icon: '🌴', unlockLevel: 20 }
];

// State
let currentLevel = 1;
let score = 0;
let timeLeft = ROUND_TIME;
let gameInterval = null;
let spawnInterval = null;
let balloons = [];
let gameActive = false;
let currentTargetColor = null;

// Persistent State
let highestLevel = 1;
let highestScore = 0;
let currentTheme = 'theme-sky';
let unlockedStickers = [];

// Game Session State
const MAX_LIVES = 5;
let lives = 3;

// Audio State
let isSoundEnabled = true;
let audioCtx = null;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const playScreen = document.getElementById('play-screen');
const endScreen = document.getElementById('end-screen');
const failScreen = document.getElementById('fail-screen');

const startBtn = document.getElementById('start-btn');
const nextLevelBtn = document.getElementById('next-level-btn');
const retryBtn = document.getElementById('retry-btn');
const toggleSoundBtn = document.getElementById('toggle-sound');

const levelDisplay = document.getElementById('level-display');
const currentLevelDisplay = document.getElementById('current-level-display');
const timeDisplay = document.getElementById('time-display');
const scoreDisplay = document.getElementById('score-display');
const balloonArea = document.getElementById('balloon-area');
const finalScoreDisplay = document.getElementById('final-score');
const endTitle = document.getElementById('end-title');
const targetBalloonIcon = document.getElementById('target-balloon-icon');

const collectionBtn = document.getElementById('collection-btn');
const themesBtn = document.getElementById('themes-btn');
const collectionScreen = document.getElementById('collection-screen');
const themesScreen = document.getElementById('themes-screen');
const closeCollectionBtn = document.getElementById('close-collection-btn');
const closeThemesBtn = document.getElementById('close-themes-btn');
const achievementPopup = document.getElementById('achievement-popup');

// Initialize
startBtn.addEventListener('click', startGame);
nextLevelBtn.addEventListener('click', nextLevel);
retryBtn.addEventListener('click', retryLevel);

const homeFromEndBtn = document.getElementById('home-from-end-btn');
const homeFromFailBtn = document.getElementById('home-from-fail-btn');

function returnToHome() {
    endScreen.classList.add('hidden');
    failScreen.classList.add('hidden');
    playScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    updateRankDisplay();
}

if(homeFromEndBtn) homeFromEndBtn.addEventListener('click', returnToHome);
if(homeFromFailBtn) homeFromFailBtn.addEventListener('click', returnToHome);

// --- Audio System (Web Audio API) ---
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

toggleSoundBtn.addEventListener('click', () => {
    initAudio();
    isSoundEnabled = !isSoundEnabled;
    toggleSoundBtn.textContent = isSoundEnabled ? "🔊 Ses: Açık" : "🔇 Ses: Kapalı";
});

function playPopSound() {
    if(!isSoundEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.1);
}

function playWrongSound() {
    if(!isSoundEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.2);
}

function playFailSound() {
    if(!isSoundEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.5);
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.5);
}

// --- Game Logic ---

function setRandomTargetColor() {
    currentTargetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    targetBalloonIcon.className = 'balloon-icon size-medium ' + currentTargetColor.class;
}

function startGame() {
    startBtn.disabled = true; // Spam tıklamayı önle
    initAudio();
    if (currentLevel === 1 || currentLevel > TOTAL_LEVELS || lives <= 0) {
        score = 0;
        currentLevel = 1;
        lives = 3;
    }
    updateLivesDisplay();
    
    // Animation Effect
    startScreen.classList.add('screen-slide-down');
    setTimeout(() => {
        startScreen.classList.remove('screen-slide-down');
        startBtn.disabled = false;
        startLevel();
    }, 800);
}

function retryLevel() {
    score = 0; // Reset score for the level attempt
    startLevel();
}

let animationFrameId = null;

function startLevel() {
    // Önceki seviyeden kalma veya peş peşe tıklamalardan oluşan bug'ları temizle (Memory Leak önlemi)
    gameActive = true;
    clearInterval(gameInterval);
    clearInterval(spawnInterval);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    failScreen.classList.add('hidden');
    playScreen.classList.remove('hidden');
    
    updateLivesDisplay();
    
    timeLeft = ROUND_TIME;
    updateUI();
    setRandomTargetColor();
    
    balloonArea.innerHTML = '';
    balloons = [];
    
    gameInterval = setInterval(gameTick, 1000);
    
    let spawnRate = Math.max(150, 350 - (currentLevel * 10)); 
    spawnInterval = setInterval(spawnBalloon, spawnRate);
    
    updateBalloons();
}

function gameTick() {
    timeLeft--;
    timeDisplay.textContent = timeLeft;
    
    if (timeLeft <= 0) {
        const passScore = Math.min(30, currentLevel * 5); // Minimum pass score grows slowly
        if (score < passScore) {
            handleLevelFail("Süre Doldu!", `Bölümü geçmek için en az ${passScore} puan toplamalıydın. (Puanın: ${score})`);
        } else {
            endLevel();
        }
    }
}

function handleLevelFail(title, desc) {
    gameActive = false;
    clearInterval(gameInterval);
    clearInterval(spawnInterval);
    playFailSound();
    
    lives--;
    updateLivesDisplay();
    
    document.getElementById('fail-title').textContent = title;
    document.getElementById('fail-desc').textContent = desc;
    
    const failLivesDisplay = document.getElementById('fail-lives-display');
    let hearts = '';
    for(let i=0; i<lives; i++) hearts += '❤️';
    for(let i=lives; i<MAX_LIVES; i++) hearts += '🤍';
    if(failLivesDisplay) failLivesDisplay.textContent = hearts;
    
    const failRetryBtn = document.getElementById('retry-btn');
    if(lives <= 0) {
        document.getElementById('fail-title').textContent = "Oyun Bitti!";
        document.getElementById('fail-desc').textContent = "Tüm canlarını kaybettin. Maceraya en baştan başlamalısın.";
        failRetryBtn.textContent = "Baştan Oyna";
        failRetryBtn.onclick = startGame;
    } else {
        failRetryBtn.textContent = "Tekrar Dene";
        failRetryBtn.onclick = retryLevel;
    }
    
    playScreen.classList.add('hidden');
    failScreen.classList.remove('hidden');
}

function endLevel() {
    gameActive = false;
    clearInterval(gameInterval);
    clearInterval(spawnInterval);
    
    playScreen.classList.add('hidden');
    endScreen.classList.remove('hidden');
    finalScoreDisplay.textContent = score;
    
    const highestScoreDisplay = document.getElementById('highest-score-display');
    if (highestScoreDisplay) {
        if (score > highestScore) {
            highestScore = score;
            saveData();
            highestScoreDisplay.innerHTML = `🌟 Yeni Rekor: ${highestScore} 🌟`;
        } else {
            highestScoreDisplay.innerHTML = `En İyi Skor: ${highestScore}`;
        }
    }
    
    if (currentLevel >= TOTAL_LEVELS) {
        endTitle.textContent = "Oyun Bitti! Harikasın!";
        nextLevelBtn.textContent = "Baştan Oyna";
    } else {
        endTitle.textContent = "Bölüm Tamamlandı!";
        nextLevelBtn.textContent = "Sonraki Bölüm";
    }
    
    // Bonus Life Logic
    const targetBonusScore = 30 + (currentLevel * 5);
    if (score >= targetBonusScore && lives < MAX_LIVES) {
        lives++;
        updateLivesDisplay();
        setTimeout(() => showAchievementPopup("Harika Skor!", "❤️"), 500);
    }
    
    // Update persistent state
    if(currentLevel > highestLevel) {
        highestLevel = currentLevel;
        saveData();
        checkAchievements(highestLevel);
    }
}

function nextLevel() {
    if (currentLevel < TOTAL_LEVELS) {
        currentLevel++;
        currentLevelDisplay.textContent = currentLevel;
        startLevel();
    } else {
        currentLevel = 1;
        currentLevelDisplay.textContent = currentLevel;
        startGame();
    }
}

function spawnBalloon() {
    const balloon = document.createElement('div');
    balloon.classList.add('balloon');
    
    // Random color and size
    let isBomb = false;
    let color;
    
    if (currentLevel >= 4 && Math.random() < 0.08) {
        isBomb = true;
        // Bombalar artık kandırmaca için her zaman HEDEF RENKTE çıkacak
        color = currentTargetColor ? currentTargetColor : COLORS[Math.floor(Math.random() * COLORS.length)];
    } else {
        // Hedef rengin çıkma ihtimalini %40 civarına sabitleyelim
        if (currentTargetColor && Math.random() < 0.4) {
            color = currentTargetColor;
        } else {
            color = COLORS[Math.floor(Math.random() * COLORS.length)];
        }
    }
    
    const size = SIZES[Math.floor(Math.random() * SIZES.length)];
    
    // Renk sınıfını her durumda ekliyoruz (Bomba olsa bile hedef renkte görünecek)
    balloon.classList.add(color.class);
    balloon.classList.add(size.class);
    
    if (isBomb) {
        // Artık siyah bir top yerine, sadece ortasında bomba simgesi olan hedef renkli bir balon
        balloon.innerHTML = '<span style="font-size: 2rem; padding-bottom: 15px; text-shadow: 0 0 8px rgba(255,255,255,1);">💣</span>';
        balloon.dataset.points = -30;
    } else {
        balloon.dataset.points = size.points;
    }
    
    // Physics base parameters
    const baseSpeed = 2.5 + (currentLevel * 0.2);
    const speedVariation = Math.random() * 2.0;
    const speed = baseSpeed + speedVariation;
    
    let wobbleSpeed = 0;
    let wobbleAmount = 0;
    
    if (currentLevel >= 3) {
        wobbleAmount = Math.min((currentLevel - 2) * 3, 50);
        wobbleSpeed = 0.02 + (Math.random() * 0.04);
    }

    // Start X position
    const maxWidth = window.innerWidth > 500 ? 500 : window.innerWidth;
    const balloonWidth = size.name === 'large' ? 90 : (size.name === 'medium' ? 70 : 50);
    
    // Sağ ve sol kenarlardan taşmayı engellemek için wobble (sallanma) mesafesini hesaba katalım
    const minX = wobbleAmount + 5;
    const maxX = maxWidth - balloonWidth - wobbleAmount - 5;
    
    // Eğer ekran çok darsa (güvenlik payı)
    const safeMaxX = Math.max(minX, maxX);
    const startX = Math.random() * (safeMaxX - minX) + minX;
    
    balloon.style.left = `${startX}px`;
    
    const bData = {
        element: balloon,
        y: window.innerHeight + 150,
        baseX: startX,
        xOffset: 0,
        speed: speed,
        wobbleSpeed: wobbleSpeed,
        wobbleAmount: wobbleAmount,
        wobbleTime: Math.random() * Math.PI * 2,
        popped: false
    };
    
    const popAction = (e) => {
        if (e.cancelable) e.preventDefault();
        initAudio();
        
        if (bData.popped) return;
        bData.popped = true;
        
        // CHECK BOMB OR COLOR LOGIC
        if (isBomb) {
            score = Math.max(0, score - 30);
            playWrongSound(); // Treat bomb as very wrong
            
            // Floating penalty text
            const pText = document.createElement('div');
            pText.className = 'penalty-text';
            pText.textContent = '-30';
            const clientX = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || bData.baseX;
            const clientY = e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || 200;
            pText.style.left = `${clientX}px`;
            pText.style.top = `${clientY}px`;
            document.body.appendChild(pText);
            setTimeout(() => pText.remove(), 1500);

            boardWipe();
        } else {
            if (color.name === currentTargetColor.name) {
                // Correct Color
                score += parseInt(balloon.dataset.points);
                playPopSound();
                setRandomTargetColor(); // Change target
            } else {
                // Wrong Color
                score -= 5;
                playWrongSound();
            }
        }
        
        updateUI();
        
        // CHECK GAME OVER (FAIL STATE)
        if (score < 0) {
            handleLevelFail("Puanın Çok Düştü!", "Yanlış balonlara tıklayarak tüm puanını kaybettin.");
            return;
        }
        
        createParticles(bData.baseX + bData.xOffset + balloonWidth/2, bData.y - window.innerHeight - 150 + balloonWidth/2);
        
        balloon.classList.add('pop-animation');
        setTimeout(() => {
            if (balloon.parentNode) {
                balloon.parentNode.removeChild(balloon);
            }
        }, 150);
    };

    balloon.addEventListener('touchstart', popAction, { passive: false });
    balloon.addEventListener('mousedown', popAction);
    
    balloonArea.appendChild(balloon);
    balloons.push(bData);
}

function updateBalloons() {
    if (!gameActive) return;
    
    for (let i = balloons.length - 1; i >= 0; i--) {
        const bData = balloons[i];
        
        if (bData.popped) {
            balloons.splice(i, 1);
            continue;
        }
        
        bData.y -= bData.speed;
        
        bData.wobbleTime += bData.wobbleSpeed;
        bData.xOffset = Math.sin(bData.wobbleTime) * bData.wobbleAmount;
        
        // CSS transform update (using translate3d for GPU acceleration)
        bData.element.style.transform = `translate3d(${bData.baseX + bData.xOffset}px, ${bData.y - window.innerHeight - 150}px, 0)`;
        
        // Remove if off screen
        if (bData.y < -150) {
            bData.popped = true;
            if (bData.element.parentNode) {
                bData.element.parentNode.removeChild(bData.element);
            }
            balloons.splice(i, 1);
        }
    }
    
    animationFrameId = requestAnimationFrame(updateBalloons);
}

function updateUI() {
    levelDisplay.textContent = currentLevel;
    scoreDisplay.textContent = score;
}

function createParticles(x, y) {
    // simplified for performance
}

// --- Meta-Game Logic & UI ---

function loadData() {
    const savedData = localStorage.getItem('balloonPopSave');
    if(savedData) {
        const data = JSON.parse(savedData);
        highestLevel = data.highestLevel || 1;
        highestScore = data.highestScore || 0;
        currentTheme = data.currentTheme || 'theme-sky';
        unlockedStickers = data.unlockedStickers || [];
    }
    applyTheme(currentTheme);
    updateRankDisplay();
}

function saveData() {
    localStorage.setItem('balloonPopSave', JSON.stringify({
        highestLevel, highestScore, currentTheme, unlockedStickers
    }));
}

function applyTheme(themeId) {
    const container = document.getElementById('game-container');
    container.className = themeId;
    currentTheme = themeId;
    saveData();
}

function getRank(level) {
    if(level >= 30) return "Efsanevi Balon Ustası 🏆";
    if(level >= 20) return "Usta Patlatıcı 👑";
    if(level >= 10) return "Balon Şövalyesi ⚔️";
    if(level >= 5) return "Balon Avcısı 🏹";
    return "Acemi Patlatıcı 🐣";
}

function updateRankDisplay() {
    const rankEl = document.getElementById('rank-display');
    if(rankEl) rankEl.textContent = getRank(highestLevel);
}

function updateLivesDisplay() {
    const livesDiv = document.getElementById('lives-display');
    if(!livesDiv) return;
    let hearts = '';
    for(let i=0; i<lives; i++) hearts += '❤️';
    for(let i=lives; i<MAX_LIVES; i++) hearts += '🤍';
    livesDiv.textContent = hearts;
}

function checkAchievements(level) {
    // Check for theme
    const newTheme = THEMES.find(t => t.unlockLevel === level);
    if(newTheme) {
        showAchievementPopup("Yeni Tema Açıldı!", newTheme.icon);
        applyTheme(newTheme.id); // Auto apply theme
    }
    
    // Check for new sticker
    const newSticker = STICKERS.find(s => s.level === level);
    if (newSticker && !unlockedStickers.includes(newSticker.name)) {
        unlockedStickers.push(newSticker.name);
        saveData();
        // Delay sticker popup if theme also unlocked
        setTimeout(() => {
            showAchievementPopup("Yeni Çıkartma!", newSticker.icon);
        }, newTheme ? 2000 : 0);
    }
    
    updateRankDisplay();
}

function showAchievementPopup(title, icon) {
    document.getElementById('achievement-title').textContent = title;
    document.getElementById('achievement-icon').textContent = icon;
    achievementPopup.classList.remove('hidden');
    initAudio();
    playPopSound();
}

document.getElementById('achievement-ok-btn').addEventListener('click', () => {
    achievementPopup.classList.add('hidden');
});

// UI Buttons for Collections and Themes
if(collectionBtn) {
    collectionBtn.addEventListener('click', () => {
        renderCollection();
        startScreen.classList.add('hidden');
        collectionScreen.classList.remove('hidden');
    });
}
if(closeCollectionBtn) {
    closeCollectionBtn.addEventListener('click', () => {
        collectionScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
    });
}

if(themesBtn) {
    themesBtn.addEventListener('click', () => {
        renderThemes();
        startScreen.classList.add('hidden');
        themesScreen.classList.remove('hidden');
    });
}
if(closeThemesBtn) {
    closeThemesBtn.addEventListener('click', () => {
        themesScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
    });
}

function renderCollection() {
    const grid = document.getElementById('stickers-grid');
    grid.innerHTML = '';
    STICKERS.forEach(s => {
        const isUnlocked = unlockedStickers.includes(s.name);
        const div = document.createElement('div');
        div.className = `sticker-item ${isUnlocked ? '' : 'locked'}`;
        div.innerHTML = `
            <div class="sticker-icon">${isUnlocked ? s.icon : '❓'}</div>
            <div class="sticker-name">${isUnlocked ? s.name : 'Bölüm ' + s.level}</div>
        `;
        grid.appendChild(div);
    });
}

function renderThemes() {
    const grid = document.getElementById('themes-list');
    grid.innerHTML = '';
    THEMES.forEach(t => {
        const isUnlocked = highestLevel >= t.unlockLevel;
        const div = document.createElement('div');
        div.className = `theme-item ${isUnlocked ? '' : 'locked'}`;
        if(isUnlocked) {
            div.onclick = () => { applyTheme(t.id); renderThemes(); };
        }
        div.innerHTML = `
            <div class="sticker-icon">${isUnlocked ? t.icon : '🔒'}</div>
            <div class="sticker-name">${t.name}</div>
            ${currentTheme === t.id ? '<div style="color:#FF6B6B; font-size:0.8rem; margin-top:5px; font-weight:bold;">Seçili</div>' : ''}
        `;
        grid.appendChild(div);
    });
}

// Initial Load
loadData();

function boardWipe() {
    balloons.forEach(b => {
        if (!b.popped) {
            b.popped = true;
            b.element.classList.add('pop-animation');
            setTimeout(() => {
                if (b.element.parentNode) b.element.parentNode.removeChild(b.element);
            }, 150);
        }
    });
    // clear the balloons array so they don't get updated anymore
    balloons = [];
}

