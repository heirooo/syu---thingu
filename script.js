const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('start-button');
const returnButton = document.getElementById('return-button');
const titleScreen = document.getElementById('title-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const gameTimeDisplay = document.getElementById('game-time');
const livesCountDisplay = document.getElementById('lives-count');

// キャンバスのサイズを広げる
canvas.width = 600;
canvas.height = 900;

let gameRunning = false;
let isShooting = false;
let lastTime = 0;
let deltaTime = 0;
let gameStartTime = 0;
let playerYPosition = canvas.height - 100; // プレイヤーのY座標を固定

// キャラクター、弾、敵の画像
const playerImage = new Image();
const playerBulletImage = new Image();
const enemyImage = new Image();
const enemyBulletImage = new Image();
const obstacleImage = new Image();

// 効果音
const enemyShotSound = new Audio('ゲラ.mp3');
const obstacleBreakSound = new Audio('bu.mp3');
const enemyDeathSound = new Audio('mvp.mp3');

// ゲームオブジェクトクラス
class GameObject {
    constructor(x, y, width, height, image, dx = 0, dy = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.image = image;
        this.dx = dx;
        this.dy = dy;
    }

    draw() {
        if (this.image && this.image.complete && this.image.naturalWidth > 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // 画像がない場合は四角形で代用
            ctx.fillStyle = 'blue';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    // 衝突判定
    isColliding(other) {
        return this.x < other.x + other.width &&
               this.x + this.width > other.x &&
               this.y < other.y + other.height &&
               this.y + this.height > other.y;
    }
}

// プレイヤー
let player;
let playerLives = 3;
let isInvincible = false;
let lastShotTime = 0;
const fireRate = 1000 / 5;

// 弾
let playerBullets = [];
let enemyBullets = [];

// 敵と障害物
let enemies = [];
let obstacles = [];
let lastEnemySpawn = 0;
let lastObstacleSpawn = 0;

// 敵と障害物の出現頻度
let enemySpawnInterval = 5000;
let obstacleSpawnInterval = 3000;

// ゲームのリセット
function resetGame() {
    player = new GameObject(canvas.width / 2 - 35, playerYPosition, 70, 70, playerImage);
    playerLives = 3;
    isInvincible = false;
    isShooting = false;
    playerBullets = [];
    enemyBullets = [];
    enemies = [];
    obstacles = [];
    lastShotTime = 0;
    lastEnemySpawn = 0;
    lastObstacleSpawn = 0;
    enemySpawnInterval = 5000;
    obstacleSpawnInterval = 3000;
    livesCountDisplay.textContent = `残機: ${playerLives}`;
}

// ゲーム開始ロジック
function runGame() {
    resetGame();
    titleScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameRunning = true;
    gameStartTime = Date.now();
    requestAnimationFrame(gameLoop);
}

// 画像のロードとゲーム開始
function startGame() {
    let assetsLoaded = 0;
    const totalAssets = 5;

    const assetLoaded = () => {
        assetsLoaded++;
        if (assetsLoaded === totalAssets) {
            runGame();
        }
    };

    playerImage.onload = assetLoaded;
    playerBulletImage.onload = assetLoaded;
    enemyImage.onload = assetLoaded;
    enemyBulletImage.onload = assetLoaded;
    obstacleImage.onload = assetLoaded;

    playerImage.src = 'player.png';
    playerBulletImage.src = 'playertama.png';
    enemyImage.src = 'teki.png';
    enemyBulletImage.src = 'tekitama.png';
    obstacleImage.src = 'obj.png';
}

// ゲームループ
function gameLoop(timestamp) {
    deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!gameRunning) {
        if (player) {
            player.draw();
        }
        requestAnimationFrame(gameLoop);
        return;
    }

    const timeElapsed = Date.now() - gameStartTime;
    // 難易度上昇を早くする (乗数を増やす)
    enemySpawnInterval = Math.max(1000, 5000 - timeElapsed * 0.01);
    obstacleSpawnInterval = Math.max(1000, 3000 - timeElapsed * 0.006);

    // 敵の発射間隔をゲーム時間に合わせて短縮 (1分で1000ms -> 500ms)
    const enemyFireInterval = Math.max(500, 1000 - (timeElapsed / 60000) * 500);

    updatePlayer();
    updatePlayerBullets();
    updateEnemies(enemyFireInterval);
    updateEnemyBullets();
    updateObstacles();
    
    // プレイヤーが射撃中の場合に弾を発射
    if (isShooting && Date.now() - lastShotTime > fireRate) {
        playerBullets.push(new GameObject(player.x + player.width / 2 - 3, player.y, 6, 20, playerBulletImage));
        lastShotTime = Date.now();
    }

    drawObjects();
    
    checkCollisions();

    if (playerLives <= 0) {
        endGame();
        return;
    }

    requestAnimationFrame(gameLoop);
}

function updatePlayer() {
    // プレイヤーの動きはタッチイベントとマウスイベントで処理
}

function updatePlayerBullets() {
    playerBullets.forEach(bullet => bullet.y -= 7);
    playerBullets = playerBullets.filter(bullet => bullet.y > -bullet.height);
}

function updateEnemies(enemyFireInterval) {
    if (Date.now() - lastEnemySpawn > enemySpawnInterval && enemies.length < 3) {
        const x = Math.random() * (canvas.width - 70);
        const y = 50;
        const newEnemy = new GameObject(x, y, 70, 70, enemyImage);
        newEnemy.health = 5;
        newEnemy.lastShot = Date.now();
        enemies.push(newEnemy);
        lastEnemySpawn = Date.now();
    }
    enemies.forEach(enemy => {
        if (Date.now() - enemy.lastShot > enemyFireInterval) {
            const bulletSpeed = 2;
            const spreadAngle = Math.PI / 8; // 敵の弾の散らばりを大きく
            const angleStep = spreadAngle / 2;

            for (let i = -1; i <= 1; i++) {
                const angle = Math.PI / 2 + i * angleStep;
                const dx = Math.cos(angle) * bulletSpeed;
                const dy = Math.sin(angle) * bulletSpeed;
                const bulletWidth = 30;
                const bulletHeight = 30;
                const newEnemyBullet = new GameObject(enemy.x + enemy.width / 2 - bulletWidth / 2, enemy.y + enemy.height, bulletWidth, bulletHeight, enemyBulletImage, dx, dy);
                enemyBullets.push(newEnemyBullet);
            }
            enemy.lastShot = Date.now(); // ここを修正しました
            enemyShotSound.play(); // 敵の弾発射時に効果音を再生
        }
    });

    enemies = enemies.filter(enemy => enemy.y < canvas.height);
}

function updateEnemyBullets() {
    enemyBullets.forEach(bullet => {
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;
    });
    enemyBullets = enemyBullets.filter(bullet => bullet.y < canvas.height);
}

function updateObstacles() {
    if (Date.now() - lastObstacleSpawn > obstacleSpawnInterval) {
        const width = 70 + Math.random() * (canvas.width - 140);
        const x = Math.random() * (canvas.width - width);
        const y = -70;
        const newObstacle = new GameObject(x, y, width, 70, obstacleImage);
        newObstacle.health = 3;
        obstacles.push(newObstacle);
        lastObstacleSpawn = Date.now();
    }
    // 障害物のスピードをランダムに、そして速く
    obstacles.forEach(obstacle => obstacle.y += 2.5 + Math.random() * 3.5);
    obstacles = obstacles.filter(obstacle => obstacle.y < canvas.height);
}

function drawObjects() {
    if (player) player.draw();
    playerBullets.forEach(bullet => bullet.draw());
    enemies.forEach(enemy => enemy.draw());
    enemyBullets.forEach(bullet => bullet.draw());
    obstacles.forEach(obstacle => obstacle.draw());
}

function checkCollisions() {
    if (!player) return;

    if (!isInvincible) {
        enemyBullets.forEach((bullet, bIndex) => {
            if (player.isColliding(bullet)) {
                takeDamage();
                enemyBullets.splice(bIndex, 1);
            }
        });
    }

    if (!isInvincible) {
        obstacles.forEach((obstacle) => {
            if (player.isColliding(obstacle)) {
                takeDamage();
            }
        });
    }

    playerBullets.forEach((pBullet, pbIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (pBullet.isColliding(enemy)) {
                enemy.health--;
                playerBullets.splice(pbIndex, 1);
                if (enemy.health <= 0) {
                    enemies.splice(eIndex, 1);
                    enemyDeathSound.play(); // 敵が破壊されたら効果音を再生
                }
            }
        });
    });

    playerBullets.forEach((pBullet, pbIndex) => {
        obstacles.forEach((obstacle, oIndex) => {
            if (pBullet.isColliding(obstacle)) {
                obstacle.health--;
                playerBullets.splice(pbIndex, 1);
                if (obstacle.health <= 0) {
                    obstacles.splice(oIndex, 1);
                    obstacleBreakSound.play(); // 障害物が破壊されたら効果音を再生
                }
            }
        });
    });
}

function takeDamage() {
    playerLives--;
    livesCountDisplay.textContent = `残機: ${playerLives}`;
    isInvincible = true;
    setTimeout(() => {
        isInvincible = false;
    }, 1000);
}

function endGame() {
    gameRunning = false;
    gameOverScreen.classList.remove('hidden');
    const timeInSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const seconds = (timeInSeconds % 60).toString().padStart(2, '0');
    gameTimeDisplay.textContent = `タイム：${minutes}:${seconds}`;
}

// イベントリスナー
startButton.addEventListener('click', startGame);
returnButton.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    titleScreen.classList.remove('hidden');
});

// マウスイベント
canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (!gameRunning) {
        gameRunning = true;
    }
    isShooting = true;
    
    // マウスダウン時にプレイヤーの位置を更新
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    player.x = mouseX - player.width / 2;
});
canvas.addEventListener('mouseup', () => {
    isShooting = false;
});

canvas.addEventListener('mousemove', (e) => {
    e.preventDefault();
    if (gameRunning) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        player.x = mouseX - player.width / 2;
    }
});

// タッチイベント
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameRunning) {
        gameRunning = true;
    }
    isShooting = true;
    
    // タッチ開始時にプレイヤーの位置を更新
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    player.x = touchX - player.width / 2;
});
canvas.addEventListener('touchend', () => {
    isShooting = false;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (gameRunning) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        player.x = touchX - player.width / 2;
    }
});
